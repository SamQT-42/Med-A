# Med-A

A working prototype for the RMIT Accessibility Design Contest 2026.

**Core promise:** Understand your work difficulty. Choose support. See what changes.

Med-A proves one workplace outcome end to end: an employee can turn a difficulty
into a specific, **consented** work adjustment that has an owner, a response
expectation, and a review date. Clinical resources support the experience; they
are never a gate in front of workplace help.

> This is a demonstration with fictional adult users, fictional employer policy,
> and no real health records. The role switch is a presentation device, not
> authentication. It does not provide production security, clinical validation,
> or anonymous data collection.

## Start it locally

```bash
npm install
npm run dev
```

Then open **http://localhost:5173**. That is all that is required — the whole
demo runs with the scripted provider and needs no key, no server, and no
network.

Other commands:

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server with hot reload |
| `npm run build` | Type-check and build to `dist/` |
| `npm run preview` | Serve the built app on http://localhost:4173 |
| `npm run verify` | Run both browser walkthroughs against the preview server |
| `npm run server` | Start the **optional** AI server (see below) |

Designed for a desktop browser at 1366×768 and larger.

## The demo in one line

Open Today → describe a difficulty → answer one question → edit the draft →
review exactly what will be shared → share → switch to Manager and respond →
switch back and confirm delivery → simulate five days → review.

The 90-second walkthrough is in [DEMO_SCRIPT.md](DEMO_SCRIPT.md).

## How the privacy boundary is built

This is the part of the code worth reading. Six typed objects in
[`src/types.ts`](src/types.ts) are kept genuinely separate rather than being one
record with visibility flags:

| Object | Lives where | Reaches the manager? |
| --- | --- | --- |
| `PrivateConversation` | Employee only | Never |
| `SupportDraft` | Employee only, versioned | Only through an approval |
| `ShareApproval` | Record of one exact approved version | — |
| `SharedRequest` | Employer space | Yes, this *is* what they see |
| `WorkTrial` | Employer space | Yes |
| `PrivateFeedback` | Employee only | Never |
| `IllustrativeCohort` | Separate synthetic fixture | Aggregate only, above threshold |

Three rules enforce it:

1. **One door.** `buildSharedRequest()` in
   [`src/state/logic.ts`](src/state/logic.ts) is the only function that copies
   anything into employer space, and it copies field by field from the
   `SHARED_REQUEST_FIELDS` allowlist — not with a spread. Adding a private field
   to `SupportDraft` therefore cannot silently leak it.
2. **Approval is version-bound.** Every edit bumps `draft.version` and changes
   its content fingerprint. `confirmShare` refuses unless the open preview still
   matches the exact current version, so an approval can never be applied to
   text that changed afterwards.
3. **AI decides nothing.** The providers in [`src/ai/provider.ts`](src/ai/provider.ts)
   return text. Every share, approval, state transition, and employer decision
   happens in the reducer in [`src/state/store.tsx`](src/state/store.tsx).

The manager view reads only `state.sharedRequests` and `state.trials`. It has no
reference to `state.conversation` or `state.feedback` anywhere in the file.

## State machine

```
private_draft → pending_response → agreed → delivered → review_due → keep / modify / stop
                      ↑                ↑
                      └── alternative_proposed (employee must confirm changed terms)
                      └── cannot_implement (reason + proposed next step)
```

`agreed` and `delivered` are deliberately different states. A manager agreeing
does not mean the employee received anything; only the employee can move a trial
to `delivered`.

## Optional live AI

The app ships with a clearly labelled **scripted** provider that always works.
A real model is optional and entirely behind a server-side interface.

```bash
cp .env.example .env        # .env is git-ignored
# fill in HF_TOKEN and HF_MODEL
npm run server              # terminal 1
npm run dev                 # terminal 2
```

Then pick **Live AI** in the sidebar. The app probes `/api/health` at that moment;
if no server is configured it says so and stays scripted. Scripted text is never
labelled as a live AI response.

The server ([`server/ai-server.mjs`](server/ai-server.mjs)) uses Hugging Face
[Inference Providers](https://huggingface.co/docs/inference-providers/index)
through their OpenAI-compatible chat-completions route. No weights are downloaded
or fine-tuned. The model id is configurable. Hosting and inference still cost
money; open weights do not mean free operation.

Whatever the model returns is validated before it reaches the UI: barrier must be
one of four known values, the draft has length bounds, clinical vocabulary is
rejected outright, source ids are filtered against an allowlist, and **recap task
facts are rebuilt from the employee's own notes**, so a model cannot invent a
deadline or a task. A system prompt is a behaviour instruction, not a privacy
boundary.

Secrets stay in `.env`, server-side. No key reaches the browser bundle and no
`VITE_`-prefixed variable holds a secret.

## Project layout

```
src/
  types.ts              the six separated data objects + the share allowlist
  state/logic.ts        deterministic logic: recap, drafts, fingerprints, the one door
  state/store.tsx       reducer, sessionStorage, all state transitions
  ai/provider.ts        scripted + live providers, and the response validator
  content/copy.ts       all UI wording in one place
  data/                 library records and fictional fixtures
  styles/tokens.css     every colour, space, font and asset reference
  components/           chrome, shared UI, the consent preview
  views/                Today, SupportPlan, Manager, Organization, Library, SupportOptions
server/ai-server.mjs    optional, credential stays here
verify/                 two browser walkthroughs asserting the acceptance criteria
public/assets/          where team artwork goes (see its README)
```

Copy lives in `src/content/copy.ts` and design tokens in
`src/styles/tokens.css`, so the team can restyle and reword without touching the
consent logic.

## What was verified

`npm run verify` drives a real Chromium browser through the app and asserts
**87 checks across two files**, all passing, with no uncaught page errors:

- The golden path completes after a reset, with the exact wording from the brief.
- The manager sees nothing while a draft is private, and nothing after it is cancelled.
- The fictional ADHD disclosure appears in `PrivateConversation` but in **no**
  `SharedRequest` or `WorkTrial` object, and nowhere in the manager or organization DOM.
- Editing after a preview disables sharing and shows why; re-reviewing re-enables it.
- A manager response updates the employee view; `agreed` and `delivered` are distinguishable.
- Alternative terms are not in effect until the employee accepts; a failed adjustment can be stopped.
- The private clarity rating is stored in `PrivateFeedback` and absent from shared objects.
- The 4-participant cohort shows "Not enough participants to display outcomes".
- Simulated time, scripted text and live AI are visibly labelled.
- A simulated AI failure shares nothing, keeps the typed text, and recovers via the scripted fallback.
- Tab reaches the skip link, the role switch is keyboard-reachable, every form control is labelled,
  there is one `h1` per view, and there is no horizontal scroll at 1366px, 1024px or 683px.
- Quick recap keeps task facts, marks unknowns "Not specified" and priorities "Needs clarification".
- The human-support route is reachable without chatting; pantry choices imply no diagnosis
  and make no booking.

See [KNOWN_LIMITATIONS.md](KNOWN_LIMITATIONS.md) for what is implemented, what is
simulated, and what is future work.

## Not in this build

No Electron, mobile packaging, database, authentication, IoT, booking
integration, or payment processing. No landing page — the public website is a
separate team workstream.
