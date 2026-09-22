# Team-supplied visual assets

Put logos, illustrations, icons, and photography in this folder. Files here are
served from the site root, so `public/assets/logo.svg` is available at
`/assets/logo.svg`.

## Where to hook an asset into the app

All colour, spacing, type, and asset references live in **one** file:
`src/styles/tokens.css`. Point a token at your file and the app picks it up:

```css
:root {
  --asset-logo: url("/assets/your-logo.svg");
}
```

`logo.svg` in this folder is a placeholder mark so the token resolves during a
build. Replace it with the team's real artwork.

## The rule that matters

Visual assets must not change consent behaviour or the working flow. Nothing in
this folder is imported by `src/state/logic.ts`, `src/state/store.tsx`, or
`src/components/ConsentPreview.tsx` — the sharing boundary is deliberately
independent of how the app looks.

## Suggested files

| File | Used for |
| --- | --- |
| `logo.svg` | Product mark in the top bar |
| `favicon.svg` | Browser tab icon (add a `<link>` in `index.html`) |
| `illustration-*.svg` | Optional supporting imagery |

Keep images small; this is a demo that must start quickly on a conference
network. No photograph of a real person should be used as a fictional employee.
