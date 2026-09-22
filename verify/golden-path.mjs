import { execSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

/** Resolves Playwright from the project, or from a global install. */
async function loadChromium() {
  for (const spec of ['playwright', 'playwright-core', '@playwright/test']) {
    try {
      return (await import(spec)).chromium;
    } catch { /* try the next one */ }
  }
  try {
    const root = execSync('npm root -g', { encoding: 'utf8' }).trim();
    for (const name of ['playwright', 'playwright-core']) {
      const entry = join(root, name, 'index.mjs');
      if (existsSync(entry)) return (await import(pathToFileURL(entry).href)).chromium;
    }
  } catch { /* fall through */ }
  console.error('Playwright is not installed. Run:  npm install --no-save playwright');
  process.exit(2);
}

const chromium = await loadChromium();

const BASE = process.env.MEDA_URL || 'http://localhost:4173';

const SHOTS = process.env.MEDA_SHOTS || new URL('./screenshots/', import.meta.url).pathname;
await (await import('node:fs/promises')).mkdir(SHOTS, { recursive: true });
const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });

// --- 1. App starts, employee default
check('AC1a app starts on Employee/Today', await page.getByRole('heading', { name: 'Today', level: 1 }).isVisible());
check('badges present', (await page.getByText('Prototype · fictional data').isVisible()) && (await page.getByText('Scripted demo').first().isVisible()));
await page.screenshot({ path: `${SHOTS}/01-today.png` });

// --- AC2 / AC11: manager sees nothing while private; human route reachable without chatting
await page.getByRole('button', { name: 'Talk with a person' }).isVisible().catch(() => {});
const humanHeadingVisible = await page.getByRole('heading', { name: 'Talk with a person' }).isVisible();
check('AC11b human-support route reachable without chatting', humanHeadingVisible);
await page.getByRole('button', { name: 'Show options' }).click();
check('AC11b human contacts listed', await page.getByText('Independent support contact').isVisible());

// Quick recap preserves facts and unknowns
await page.getByRole('button', { name: 'Make a quick recap' }).click();
const recapText = await page.locator('table').first().innerText();
check('AC11a recap keeps task facts', recapText.includes('Prepare the client report') && recapText.includes('Revise the budget') && recapText.includes('Update the internal slides'));
check('AC11a recap marks unknowns "Not specified"', (recapText.match(/Not specified/g) || []).length >= 6);
check('AC11a priorities "Needs clarification"', (recapText.match(/Needs clarification/g) || []).length === 3);
await page.screenshot({ path: `${SHOTS}/02-recap.png`, fullPage: true });

// --- Golden path step 2: load example (fills, does not submit)
await page.getByRole('button', { name: 'Load Alex example' }).click();
const filled = await page.locator('#difficulty').inputValue();
check('golden 2 example fills box', filled.includes('Three urgent requests arrived at once'));
check('golden 2 example does NOT submit', await page.getByRole('heading', { name: 'Support conversation' }).isHidden());

// Manager sees nothing yet
await page.getByRole('button', { name: 'Manager — Sam' }).click();
check('AC2 manager sees no request while private', await page.getByRole('heading', { name: 'No requests' }).isVisible());
await page.getByRole('button', { name: 'Employee — Alex' }).click();

// --- step 3: continue -> assistant asks one question
await page.getByRole('button', { name: 'Continue', exact: true }).click();
await page.getByRole('heading', { name: 'Support conversation' }).waitFor();
const transcript = await page.locator('.card-private').first().innerText();
check('golden 3 assistant asks the one question', transcript.includes('Has your manager specified which request comes first?'));
// Only the ASSISTANT's own words: Alex's message legitimately contains "ADHD".
const assistantSaid = await page.evaluate(() => {
  const blocks = [...document.querySelectorAll('.card-private .stack > div')];
  const b = blocks.find((d) => d.textContent.includes('Support assistant'));
  return b ? b.textContent.replace('Support assistant', '').replace(/Scripted demo|Live AI/g, '') : '';
});
check('golden 3 assistant does not diagnose or interpret symptoms', assistantSaid.length > 20 && !/diagnos|disorder|ADHD|symptom|condition|medicat/i.test(assistantSaid), assistantSaid.slice(0, 90));
check('golden 3 barrier correctable', await page.locator('#barrier-correct').isVisible());
await page.screenshot({ path: `${SHOTS}/03-assistant.png`, fullPage: true });

// --- step 4: answer No
await page.getByRole('button', { name: 'No', exact: true }).click();
await page.getByRole('heading', { name: 'What would you like to do?' }).waitFor();
check('golden 4 offers prepare-request option', await page.getByText('Prepare a request for clear priorities').isVisible());
check('golden 4 offers keep-private option', await page.getByText('Keep this private for now').isVisible());
check('golden 4 shows one related library card', await page.getByRole('heading', { name: 'Clear work instructions' }).isVisible());
await page.screenshot({ path: `${SHOTS}/04-options.png`, fullPage: true });

// --- step 5: draft
await page.getByRole('button', { name: /Prepare a request for clear priorities/ }).click();
await page.getByRole('heading', { name: 'Your draft request' }).waitFor();
const draftText = await page.locator('#draft-text').inputValue();
check('golden 5 draft matches specified wording', draftText.startsWith('When several urgent tasks arrive together, a written priority order helps me get started.'));
await page.screenshot({ path: `${SHOTS}/05-draft.png`, fullPage: true });

// --- step 6: review screen
await page.getByRole('button', { name: 'Continue to review' }).click();
await page.getByRole('heading', { name: 'Review before sharing' }).waitFor();
const preview = await page.locator('.card-accent').first().innerText();
for (const k of ['WHO', 'HOW', 'WHEN', 'REVIEW', 'WHAT IS SHARED', 'WHAT IS NOT SHARED']) {
  check(`golden 6 preview shows ${k}`, preview.includes(k));
}
check('golden 6 exclusions listed', preview.includes('private chat') && preview.includes('diagnosis') && preview.includes('screening') && preview.includes('private ratings'));
check('golden 6 response expectation labelled sample policy', preview.includes('Sample company policy'));
await page.screenshot({ path: `${SHOTS}/06-preview.png`, fullPage: true });

// --- AC4: edit after preview invalidates approval
await page.evaluate(() => {
  const d = [...document.querySelectorAll('details')].find((x) => x.textContent.includes('Change the wording'));
  if (d) d.open = true;
});
await page.locator('#preview-edit').fill(draftText + ' Please also confirm in writing.');
const shareBtn = page.getByRole('button', { name: 'Share this request with Sam' });
check('AC4 share disabled after edit invalidates preview', await shareBtn.isDisabled());
check('AC4 invalidation message shown', await page.getByText(/no longer applies/).isVisible());
await page.screenshot({ path: `${SHOTS}/07-invalidated.png`, fullPage: true });

// revert to the specified wording and re-review
await page.locator('#preview-edit').fill(draftText);
await page.getByRole('button', { name: /^Review version/ }).click();
check('AC4 share re-enabled after reviewing current version', await shareBtn.isEnabled());

// --- step 7: share
await shareBtn.click();
await page.getByRole('heading', { name: 'My support plan', level: 1 }).waitFor();
check('golden 7 shared -> support plan', await page.getByText(/shared with Sam/).first().isVisible());
await page.screenshot({ path: `${SHOTS}/08-shared.png`, fullPage: true });

// --- AC3: private ADHD disclosure never reaches manager
await page.getByRole('button', { name: 'Manager — Sam' }).click();
await page.getByRole('heading', { name: /Work-adjustment request/ }).waitFor();
const managerDom = await page.locator('body').innerText();
check('AC3 manager view contains no "ADHD"', !/ADHD/i.test(managerDom), managerDom.match(/ADHD/i) ? 'FOUND' : '');
check('AC3 manager view contains no "look incapable"', !/incapable/i.test(managerDom));
check('AC3 manager sees the approved request text', managerDom.includes('a written priority order helps me get started'));
// also check the serialized session state the manager view could read
const leak = await page.evaluate(() => {
  const raw = sessionStorage.getItem('med-a.demo.v1');
  const s = JSON.parse(raw);
  const shared = JSON.stringify({ sharedRequests: s.sharedRequests, trials: s.trials });
  return { inShared: /ADHD|incapable/i.test(shared), inPrivate: /ADHD/i.test(JSON.stringify(s.conversation)) };
});
check('AC3 SharedRequest/WorkTrial objects contain no private disclosure', !leak.inShared);
check('AC3 the disclosure does still exist in the private object', leak.inPrivate);
await page.screenshot({ path: `${SHOTS}/09-manager.png`, fullPage: true });

// --- step 8: manager orders A -> C -> B, notes, confirms
// Reorder with the accessible keyboard-usable control, not drag and drop.
const readOrder = () => page.evaluate(() =>
  [...document.querySelectorAll('.order-list li')].map((li) => li.textContent.trim().replace(/^\d+/, '').split('—')[0].trim()).join(' → '));
check('golden 8 default order is A → B → C', (await readOrder()) === 'A → B → C', await readOrder());
await page.getByRole('button', { name: 'Move B — Budget revision down' }).focus();
await page.keyboard.press('Enter');
const orderNow = await readOrder();
check('golden 8 order set to A → C → B with accessible controls', orderNow === 'A → C → B', orderNow);
check('golden 8 order summary announced', (await page.locator('p[aria-live=polite]').innerText()).includes('A → C → B'));
await page.getByRole('button', { name: 'Use the demo note' }).click();
await page.getByRole('button', { name: 'Record response' }).click();
check('golden 8 response recorded', await page.getByRole('heading', { name: 'Your recorded response' }).isVisible());
await page.screenshot({ path: `${SHOTS}/10-manager-responded.png`, fullPage: true });

// --- step 9: employee sees agreed, distinguishes delivered
await page.getByRole('button', { name: 'Employee — Alex' }).click();
await page.getByRole('button', { name: 'My support plan' }).click();
const planText = await page.locator('#main').innerText();
check('AC5 manager response updates employee view', planText.includes('A — Client report') && planText.includes('Start with the client report'));
check('AC5 agreed distinguished from delivered', planText.includes('Manager agreed — not yet confirmed as delivered'));
check('golden 9 first step shown', planText.includes('Your first step:'));
await page.screenshot({ path: `${SHOTS}/11-employee-agreed.png`, fullPage: true });

await page.getByRole('button', { name: 'Yes, it was available' }).click();
check('golden 9 delivery confirmation changes state', (await page.locator('#main').innerText()).includes('Adjustment delivered — confirmed by you'));

// --- step 10: simulate 5 days
await page.getByRole('button', { name: 'Simulate five working days later' }).click();
check('AC8 simulated time labelled', await page.getByText(/no real time has passed/i).first().isVisible());
const afterSim = await page.locator('#main').innerText();
check('golden 10 review due', afterSim.includes('Review due') || afterSim.includes('Review —'));
await page.screenshot({ path: `${SHOTS}/12-review.png`, fullPage: true });

await page.locator('#happened-yes').check();
await page.locator('#helped-better').check();
await page.locator('[id^=clarity-]').selectOption('4');
await page.locator('#decision-keep').check();
check('AC7 ratings recorded privately', await page.getByText('Private by default').isVisible());

// AC7: private ratings never reach manager or org
const privacy = await page.evaluate(() => {
  const s = JSON.parse(sessionStorage.getItem('med-a.demo.v1'));
  return {
    feedbackHasRating: s.feedback.some((f) => f.clarityRating === 4),
    sharedHasRating: JSON.stringify({ sr: s.sharedRequests, tr: s.trials }).includes('clarityRating'),
  };
});
check('AC7 rating stored in PrivateFeedback', privacy.feedbackHasRating);
check('AC7 rating absent from shared objects', !privacy.sharedHasRating);

await page.getByRole('button', { name: /Share only the decision/ }).click();
check('AC: new operational decision requires its own preview', await page.getByRole('heading', { name: 'Review before sharing this decision' }).isVisible());
await page.getByRole('button', { name: 'Share this decision' }).click();
check('golden 11 loop complete', await page.getByRole('heading', { name: 'Support loop complete' }).isVisible());
check('golden 11 no efficacy claim', await page.getByText(/does not demonstrate efficacy/).isVisible());
await page.screenshot({ path: `${SHOTS}/13-loop-complete.png`, fullPage: true });

// --- AC7b: org low-count cohort
await page.getByRole('button', { name: 'Organization — overview' }).click();
const org = await page.locator('#main').innerText();
check('AC7b low-count cohort shows no outcome statistics', org.includes('Not enough participants to display outcomes'));
check('org shows denominator and period', org.includes('4 distinct opt-in participants') && org.includes('Fictional period'));
check('AC3b org view contains no private text', !/ADHD|incapable|clarityRating/i.test(org));
await page.screenshot({ path: `${SHOTS}/14-org.png`, fullPage: true });

// --- AC9: AI failure does not share data or lose the draft
await page.getByRole('button', { name: 'Employee — Alex' }).click();
await page.locator('#sim-fail').check();
await page.getByRole('button', { name: 'Today' }).first().click();
// reset conversation state by starting a fresh demo first
await page.getByRole('button', { name: 'Reset demo' }).click();
check('AC1b reset clears interaction data', await page.getByRole('heading', { name: 'Today', level: 1 }).isVisible() && (await page.locator('#difficulty').inputValue()) === '');
await page.locator('#sim-fail').check();
await page.getByRole('button', { name: 'Load Alex example' }).click();
await page.getByRole('button', { name: 'Continue', exact: true }).click();
check('AC9 failure surfaced explicitly', await page.getByText(/The AI step did not complete/).isVisible());
check('AC9 draft text preserved on failure', (await page.locator('#difficulty').inputValue()).includes('Three urgent requests'));
await page.getByRole('button', { name: 'Manager — Sam' }).click();
check('AC9 nothing shared because AI failed', await page.getByRole('heading', { name: 'No requests' }).isVisible());
await page.getByRole('button', { name: 'Employee — Alex' }).click();
await page.getByRole('button', { name: 'Use scripted example' }).click();
check('AC9 scripted fallback recovers the flow', await page.getByRole('heading', { name: 'Support conversation' }).isVisible());
await page.screenshot({ path: `${SHOTS}/15-ai-failure.png`, fullPage: true });

// --- AC2b: cancelled draft never reaches manager
await page.getByRole('button', { name: 'No', exact: true }).click();
await page.getByRole('button', { name: /Prepare a request for clear priorities/ }).click();
await page.getByRole('button', { name: 'Cancel' }).click();
await page.getByRole('button', { name: 'Manager — Sam' }).click();
check('AC2b manager sees nothing for a cancelled draft', await page.getByRole('heading', { name: 'No requests' }).isVisible());

// --- AC10: keyboard reachability
await page.getByRole('button', { name: 'Employee — Alex' }).click();
// Skip link is checked from a clean load, where nothing else holds focus.
const fresh = await browser.newPage({ viewport: { width: 1366, height: 768 } });
await fresh.goto(`${BASE}/`, { waitUntil: 'networkidle' });
await fresh.keyboard.press('Tab');
const firstFocus = await fresh.evaluate(() => document.activeElement?.className || document.activeElement?.tagName);
check('AC10 first Tab reaches the skip link', String(firstFocus).includes('skip-link'), String(firstFocus));
await fresh.keyboard.press('Enter');
check('AC10 skip link moves focus to main', await fresh.evaluate(() => document.activeElement?.id === 'main'));
await fresh.close();
let reached = false;
for (let i = 0; i < 40; i += 1) {
  await page.keyboard.press('Tab');
  const t = await page.evaluate(() => document.activeElement?.textContent?.trim().slice(0, 40) || '');
  if (t.includes('Employee — Alex')) { reached = true; break; }
}
check('AC10 role switch reachable by keyboard', reached);

// headings / labels
const a11y = await page.evaluate(() => {
  const h1 = document.querySelectorAll('h1').length;
  const controls = [...document.querySelectorAll('input:not([type=hidden]), textarea, select')];
  const unlabelled = controls.filter((c) => {
    if (c.getAttribute('aria-label') || c.getAttribute('aria-labelledby')) return false;
    if (c.id && document.querySelector(`label[for="${CSS.escape(c.id)}"]`)) return false;
    return !c.closest('label');
  }).map((c) => c.id || c.tagName);
  return { h1, unlabelled };
});
check('AC10 exactly one h1 per view', a11y.h1 === 1, `found ${a11y.h1}`);
check('AC10 every form control is labelled', a11y.unlabelled.length === 0, a11y.unlabelled.join(','));

// --- viewport: no horizontal scroll at 1366x768
const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
check('AC10 no horizontal overflow at 1366x768', overflow <= 0, `overflow ${overflow}px`);

check('no uncaught page errors', errors.length === 0, errors.slice(0, 3).join(' | '));

await browser.close();

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
if (failed.length) {
  console.log('FAILURES:');
  for (const f of failed) console.log(' - ' + f.name + (f.detail ? ': ' + f.detail : ''));
  process.exit(1);
}
