# Verification walkthroughs

Two scripted browser walkthroughs that drive the real app and assert the
acceptance criteria from the build brief. They are the evidence behind the
"what was verified" section of the main README.

## Run them

```bash
npm run build
npm run preview        # in one terminal, serves http://localhost:4173
npm run verify         # in another terminal
```

`npm run verify` runs both files and exits non-zero if any check fails.
Screenshots of every step land in `verify/screenshots/`.

Override the target with `MEDA_URL=http://localhost:5173 npm run verify` to run
them against the dev server instead.

## What each file covers

| File | Covers |
| --- | --- |
| `golden-path.mjs` | The competing-priorities golden path end to end, the consent boundary, approval invalidation, private-data separation, the AI failure path, reset, and keyboard/viewport checks |
| `secondary-path.mjs` | Noise and interruptions, the sensory pantry, the manager "suggest alternative" route, stopping a failed adjustment, and zoom reflow |

## Requirement

`playwright` must be resolvable. It is not a dependency of the app itself — the
app ships with only React — so install it once where you run the checks:

```bash
npm install --no-save playwright
```

If Chromium is not already present, `npx playwright install chromium` fetches it.
