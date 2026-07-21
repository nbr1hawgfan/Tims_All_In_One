# Personal Toolkit

A personal-use PWA: pantry scanning → shopping list, calculators, notes with
photos, a weight/BMI/body-fat tracker, and an encrypted vault for logins and
insurance/ID cards. Built as a static site so it can host on GitHub Pages,
same as your warehouse toolkit.

## How data storage works (read this first)

There is **no server or database** — GitHub Pages only serves files. All data
(pantry items, notes, photos, health logs, vault entries) is stored in your
browser's IndexedDB, **on that one device only**:

- Nothing syncs between your phone and laptop unless you manually export/import.
- Clearing your browser's site data, or uninstalling/reinstalling as a PWA in
  some browsers, deletes everything. There's no cloud backup.
- If you want cross-device sync later, that's a bigger step (a Supabase
  backend, similar to what you've used for PTO/attendance) — happy to help
  with that as a phase 2, but it's a different architecture, not a small add-on.

## The Secure Vault (Logins + ID Cards)

- Protected by **one passphrase** you set the first time you open Secure Logins.
  The same passphrase unlocks ID Cards.
- Entries are encrypted with AES-GCM, using a key derived from your passphrase
  (PBKDF2, 210,000 iterations). The key only ever lives in memory for that
  page load — it's never written to disk.
- **There is no password reset.** If you forget the passphrase, the only
  option is wiping the vault and starting over (there's a "wipe vault" link
  for this). Nothing else in the app is affected.
- ID Cards are for your own reference only — explicitly not a legal or
  insurance-accepted document, just a way to have the info on hand.

## New tools added since v1

A few tools pull live data from small free public APIs (no accounts or keys
needed). None of these save anything to your device — they're live lookups
only:

- **Currency Converter** — [Frankfurter.dev](https://frankfurter.dev) (ECB rates)
- **Sun & Moon** — sunrise-sunset.org and farmsense.net, plus Open-Meteo's
  free geocoding to turn a typed city into coordinates
- **Public Holidays** — [date.nager.at](https://date.nager.at)
- **What's My IP** — ipapi.co, falling back to ipify.org if that's unreachable
- **Distance & Travel Time** — Open-Meteo geocoding to resolve place names, then
  [OSRM's public routing demo server](https://project-osrm.org) for driving
  distance/time, with a locally-computed straight-line distance as a backup.
  Note: OSRM's demo server is free and keyless but is a shared public
  instance, not an SLA-backed service — if it's ever slow or down, the page
  still shows straight-line distance.
- **QR Code Generator** — fully offline/client-side, no API (the `qrcode` library, loaded from unpkg)
- **Age Calculator** and **Perpetual Calendar** — pure date math, no API, fully offline

Because these hit external services, they need an internet connection to
work — unlike the rest of the app, which works fully offline once loaded.

## Deploying to GitHub Pages

1. Create a new repo on GitHub (e.g. `personal-toolkit`), public or private
   (Pages works on private repos too, on paid plans — public is simplest).
2. Upload everything in this folder to the repo root (keep the folder
   structure: `css/`, `js/`, `pages/`, `icons/`, plus `index.html`,
   `manifest.json`, `sw.js`).
3. In the repo: **Settings → Pages → Source → Deploy from a branch**, pick
   `main` and `/ (root)`, save.
4. After a minute or two it'll be live at
   `https://<your-username>.github.io/personal-toolkit/`.
5. On your phone, open that URL in the browser and use "Add to Home Screen"
   (iOS Safari) or the install prompt (Android Chrome) to get the app-icon,
   full-screen experience.

## Camera barcode scanning

Uses **html5-qrcode** (pinned at `2.3.8` via unpkg) — the same library that's
proven reliable on iPhone/Safari in the warehouse Toolkit, rather than the
native `BarcodeDetector` API that Safari doesn't support. It tries to pick
the rear camera by label first, and falls back to a generic
`facingMode: 'environment'` request if that fails. If the library itself
can't load (e.g. no internet on first visit, before it's cached), tapping
"Scan barcode" falls back to the manual-entry form instead of failing
silently. Barcode lookups pull from Open Food Facts, a free public product
database — it won't have every item, especially smaller or local brands.

## Adding features later

Each tool is a self-contained HTML page under `pages/`, sharing only three
small files: `js/db.js` (storage), `js/app.js` (small helpers), and
`js/secure.js` (vault encryption). That separation is deliberate — a new
feature can be added as its own page without touching the others, so a bug
in one tool can't take down the rest of the app.
