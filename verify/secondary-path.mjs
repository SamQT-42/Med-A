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
const check = (n, ok, d = '') => { results.push({ n, ok, d }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${d ? ' — ' + d : ''}`); };

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });

// --- Secondary path A: noise via Today
await page.locator('#difficulty').fill('The open plan area is noisy and I get interrupted constantly, I cannot focus.');
await page.getByRole('button', { name: 'Continue', exact: true }).click();
await page.getByRole('heading', { name: 'Support conversation' }).waitFor();
const detected = await page.locator('#barrier-correct').inputValue();
check('secondary: noise barrier detected', detected === 'noise_interruptions', detected);
await page.getByRole('button', { name: 'No', exact: true }).click();
check('secondary: reducing-distractions library card shown', await page.getByRole('heading', { name: 'Reducing distractions' }).isVisible());
await page.getByRole('button', { name: /Prepare a request/ }).click();
const noiseDraft = await page.locator('#draft-text').inputValue();
check('secondary: offers quieter area OR agreed focus period as options', /quieter place to work or an agreed focus period/.test(noiseDraft), noiseDraft.slice(0, 80));

// --- Secondary path B: sensory pantry
await page.getByRole('button', { name: 'Support options' }).click();
const pantry = await page.locator('#main').innerText();
check('pantry has three fictional choices', pantry.includes('Quieter desk') && pantry.includes('Noise-reducing headphones') && pantry.includes('Tactile / fidget item'));
check('pantry uses preference-based descriptions, not diagnosis', !/because you have|ADHD|recommended for/i.test(pantry));
check('pantry stock and location labelled fictional', (pantry.match(/fictional demo data/g) || []).length >= 6);
check('pantry request is not a reservation', pantry.includes('not a confirmed reservation'));
check('pathways show "Partner details to be added"', (pantry.match(/Partner details to be added/g) || []).length === 2);
// Exclude the app's own disclaimer, which legitimately uses these words to deny them.
const pantryNoDisclaimer = pantry
  .split('\n')
  .filter((l) => !/No provider, appointment slot/.test(l))
  .join('\n');
check('no invented provider names, times, or bookings', !/\bDr\.|\b\d{1,2}:\d{2}\b|booking confirmed|available slots|book now/i.test(pantryNoDisclaimer));
check('assessment pathway offers no test or score', !/take the test|your score|screening result/i.test(pantryNoDisclaimer));
await page.screenshot({ path: `${SHOTS}/16-support-options.png`, fullPage: true });

await page.getByRole('button', { name: /Noise-reducing headphones/ }).click();
await page.getByRole('button', { name: 'Request this through my support plan' }).click();
await page.getByRole('heading', { name: 'Your draft request' }).waitFor();
check('pantry choice routes into the same support-plan draft', (await page.locator('#draft-text').inputValue()).includes('noise-reducing headphones'));
await page.getByRole('button', { name: 'Continue to review' }).click();
check('pantry request uses the same preview and approval', await page.getByRole('heading', { name: 'Review before sharing' }).isVisible());
await page.getByRole('button', { name: 'Share this request with Sam' }).click();
await page.getByRole('heading', { name: 'My support plan', level: 1 }).waitFor();

// --- Manager: suggest alternative -> employee must confirm (AC6)
await page.getByRole('button', { name: 'Manager — Sam' }).click();
await page.locator('input[id^=dec-][id$=suggest_alternative]').check();
await page.locator('textarea[id^=alt-]').fill('We can offer an agreed focus period from 9 to 11, but not the headphones this month.');
await page.locator('input[id^=step-]').fill('Review the equipment budget at the start of next month.');
await page.locator('select[id^=days-]').selectOption('10');
await page.getByRole('button', { name: 'Record response' }).click();
await page.getByRole('button', { name: 'Employee — Alex' }).click();
await page.getByRole('button', { name: 'My support plan' }).click();
const planTxt = await page.locator('#main').innerText();
check('AC6 alternative terms require employee confirmation', planTxt.includes('Your manager suggested different terms') && planTxt.includes('not in effect'));
check('AC6 alternative state is not "agreed"', planTxt.includes('Alternative suggested — your review needed'));
await page.screenshot({ path: `${SHOTS}/17-alternative.png`, fullPage: true });
await page.getByRole('button', { name: 'Accept the changed terms' }).click();
check('AC6 accepting changed terms moves to agreed', (await page.locator('#main').innerText()).includes('Manager agreed'));

// --- AC6b: failed adjustment can be modified or stopped
await page.getByRole('button', { name: 'No, it was not' }).click();
check('AC6b failed delivery recorded without becoming "delivered"', (await page.locator('#main').innerText()).includes('You confirmed it did not happen'));
await page.getByRole('button', { name: 'Simulate five working days later' }).click();
await page.getByRole('button', { name: 'Simulate five working days later' }).click();
const afterTwo = await page.locator('#main').innerText();
check('AC6b review still reachable after a failed adjustment', afterTwo.includes('Review —') || afterTwo.includes('Review due'));
await page.locator('#happened-no').check();
await page.locator('#helped-worse').check();
await page.locator('#decision-stop').check();
await page.getByRole('button', { name: /Share only the decision/ }).click();
await page.getByRole('button', { name: 'Share this decision' }).click();
check('AC6b unchanged adjustment can be stopped', (await page.locator('#main').innerText()).includes('Reviewed — stopping this adjustment'));

// --- Manager cannot implement path
check('no uncaught page errors', errors.length === 0, errors.slice(0, 3).join(' | '));

// --- reduced motion / zoom reflow
await page.emulateMedia({ reducedMotion: 'reduce' });
await page.setViewportSize({ width: 1024, height: 768 });
const ovf = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
check('layout reflows without horizontal scroll at 1024px (200% zoom of 2048)', ovf <= 0, `${ovf}px`);
await page.setViewportSize({ width: 683, height: 768 });
const ovf2 = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
check('layout reflows at 683px (200% zoom of 1366)', ovf2 <= 0, `${ovf2}px`);
await page.screenshot({ path: `${SHOTS}/18-zoom-reflow.png`, fullPage: true });

await browser.close();
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
if (failed.length) { console.log('FAILURES:'); failed.forEach((f) => console.log(' - ' + f.n + (f.d ? ': ' + f.d : ''))); process.exit(1); }
