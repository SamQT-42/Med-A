# Known limitations

Written so nobody demoing Med-A overstates it. Three sections: what genuinely
works, what is simulated for the demo, and what does not exist yet.

---

## 1. Implemented and verified

These behaviours are real code, exercised by `npm run verify` (87 browser checks).

- **The consent boundary.** `PrivateConversation`, `SupportDraft`,
  `ShareApproval`, `SharedRequest`, `WorkTrial` and `PrivateFeedback` are separate
  typed objects. One function copies between employee and employer space, from an
  explicit field allowlist.
- **Version-bound approval.** Editing a draft bumps its version and changes its
  fingerprint; an earlier approval stops applying and sharing is blocked until the
  current version is reviewed.
- **The golden path**, competing priorities, end to end, including the manager
  response and the employee's separate delivery confirmation.
- **A real state machine** with `alternative_proposed` and `cannot_implement`
  branches. Changed terms are not in effect until the employee accepts them.
- **Private ratings stay private.** They are stored in `PrivateFeedback` and are
  absent from every shared object. Sharing the *decision* alone needs its own preview.
- **Deterministic quick recap** that extracts only what the notes say and marks
  everything else "Not specified".
- **An explicit AI failure path.** Timeout, retry, and a scripted fallback that
  preserves the draft and shares nothing.
- **Accessibility basics**: skip link, semantic headings, labelled controls,
  visible focus, text status labels alongside colour, reordering by buttons and a
  position select rather than drag-only, reduced-motion support, and reflow at
  1366px / 1024px / 683px without horizontal scroll.
- **Reset** clears all app-owned fixture and interaction data from `sessionStorage`.

## 2. Simulated — a presentation device, not a real capability

| What you see | What it really is |
| --- | --- |
| **Demo view** role switch | A view toggle. **Not authentication.** Anyone with the browser tab is every role. |
| **Simulate five working days later** | Advances a demo counter. No real time passes; the badge says so. |
| **Scripted demo** responses | Deterministic templates and keyword matching. Never labelled as live AI. |
| Sam, Alex, the three tasks, the sample policy | Fictional. The one-working-day response expectation is labelled *sample company policy*, not a real one. |
| Sensory pantry stock and locations | Fictional demo data. A request is a request — **not a confirmed reservation**. |
| Organization counts | Derived from this browser session's fictional workflow only. |
| Illustrative cohort | A separate synthetic fixture of 4 participants, unrelated to Alex. |
| Withdrawing access | Removes in-app visibility. It cannot undo what a recipient already read or copied, and the UI says so. |

**The separation between roles is a data-model demonstration, not a secure
multi-user architecture.** Everything lives in one browser's `sessionStorage`.
A determined person with developer tools can read all of it. What the code
demonstrates is that the *intended* boundary is built into the types and enforced
by one function — the thing you would carry into a real backend.

## 3. Deliberately absent

### Clinical
- **No diagnosis, screening, scoring, or assessment of any kind.** There is no
  questionnaire in this app and no path that produces one.
- No medication advice, symptom prediction, or inferred burnout detection.
- No medical reviewer, credential, partner logo, review date, certificate, or
  quotation is claimed. Library cards read *Public guidance summary; partner
  review pending* until the team supplies approved partner content.
- The five-working-day trial is **our product design choice**, not a clinically
  validated duration.
- Library sources are used within their scope only: workplace-adjustment examples
  vary by person, a questionnaire alone cannot establish a diagnosis, and UK
  guidance (Acas, NICE) is reference material — **not a statement of Vietnamese
  employment law**.

### Evidence
- One fictional response is **not** evidence of efficacy, reduced burnout, or
  productivity ROI. The app refuses to make that claim and says so on screen.
- The 10-participant suppression threshold is a **prototype display rule, not an
  anonymity guarantee**. There are no demographic slices and no employee drill-down.

### Safety
- No comprehensive crisis monitoring. If someone reports immediate danger, the
  correct response is a human or emergency service, and the prototype does not
  invent local hotline numbers.
- No camera access, attention surveillance, automated HR alerts, or unsupervised
  environmental control. Nothing changes shared-room temperature, lighting, or humidity.

### Partnerships
- No provider, appointment slot, clinical test, screening score, or completed
  booking appears anywhere, because none has been verified. Both support pathways
  read *Partner details to be added* with the intended next step stated.
- The "independent support contact" in the human-support route is an explicit
  placeholder. No real clinician or mentor is available in this prototype.

### Engineering
- No database, authentication, backend persistence, Electron, mobile packaging,
  IoT, booking integration, or payment processing.
- No public landing page — a separate team workstream.
- State is per browser tab. Closing the tab ends the demo.
- The optional live AI path has been implemented and its failure path verified,
  but **it has not been run against a real Hugging Face endpoint** in this build,
  because no credential was configured. Budget ten minutes to test it with a real
  token before relying on it in front of an audience. The scripted path is the
  one that has been exercised end to end.

## 4. Honest next steps

1. Run the live AI path once with a real token and model id, then re-run `npm run verify`.
2. Replace the three Library summaries with partner-approved content and update `reviewStatus`.
3. Move state behind a real backend with per-user authorization — the allowlist
   copy in `buildSharedRequest()` is the function to port first.
4. Supply real partner details for the two support pathways, or keep the honest
   placeholder.
5. Team artwork goes in `public/assets/` and tokens in `src/styles/tokens.css`.
   Neither should change consent behaviour.
