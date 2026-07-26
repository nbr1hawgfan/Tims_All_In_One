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

## Shopping List export

Three buttons on the Shopping List: **Share** (uses your phone's native share
sheet — Messages, Mail, whatever you pick — falls back to opening an email
draft on desktop), **Print** (clean checklist, no app chrome, works great as
"Save as PDF" from the print dialog too), and **Copy** (plain text to
clipboard).

## Home Inventory

Photos, room, estimated value, purchase date, and serial/model number per
item, grouped by room with running totals — built for insurance
documentation. **Print report** gives a photo-inclusive printable/PDF-able
summary; **Export CSV** gives a plain spreadsheet (no photos) of the same
data. This is a personal record-keeping tool, not a substitute for an actual
appraisal or your insurance policy's documentation requirements.

## Age Calculator extras

Two additions pulled in automatically once a birth date is entered:

- **On this day in history** — a few real historical events that happened on
  that calendar date (any year), via Wikipedia's free "on this day" feed. If
  something happened on that exact date in the birth year itself, it's
  called out separately.
- **Estimated remaining years** — uses actual published Social Security
  actuarial data (period life table), interpolated for the current age.
  There's an optional sex selector since the table differs meaningfully by
  sex; it defaults to a blended average if skipped. This is a population
  statistic, not a prediction about any individual — the page says so.

Both need an internet connection; if either fails to load, the rest of the
calculator still works normally.

## Quick Utilities

- **Timer & Stopwatch** — countdown with a real audible alarm (three tones via
  Web Audio, no sound file needed) plus vibration, and a stopwatch with laps.
- **Flashlight** — tries your camera's actual LED torch first (works on
  Android Chrome); if the browser won't allow that (all iPhones, some other
  browsers), it automatically falls back to a full white screen as a light
  source instead, so it always does *something* usable.
- **Scan Anything** — same scanner as Pantry, but general-purpose: any QR
  code or barcode, with Copy and (for links) Open buttons. Same iPhone
  camera-resolution caveats apply as noted above.
- **Dice & Random** — d4 through d20, 1–12 dice at once, plus a min/max
  random number generator. Uses the browser's cryptographic random source,
  not `Math.random()`.

## Health Tracker

Six tabs, one page: **Body** (weight, BMI, body fat % including the Navy
method estimator), **Sleep** (hours + quality rating, one entry per night),
**Blood Pressure** (systolic/diastolic/pulse, multiple readings per day,
shown with the standard AHA reference category — Normal / Elevated / Stage 1
/ Stage 2 / Crisis — as a public-guideline label only, not medical advice),
**Steps** (one log per day), **Water**, and **Protein** (quick-add buttons
plus custom amounts, with a daily goal and progress bar). All local, same as
everything else — nothing leaves the device, and there's no employer or
account tied to any of it.

## Meal Picker

A spinning wheel pre-populated with ~45 national chain restaurants across
seven categories (fast food, pizza, Mexican, sandwiches, sit-down/casual,
breakfast & coffee, Asian) — toggle categories on/off, add your own local
favorites (saved permanently), then spin. Recent picks are kept so the same
place can't quietly "win" three nights in a row without anyone noticing.

## Open Food Facts integration

The Pantry Scanner pulls from [Open Food Facts](https://world.openfoodfacts.org),
a free, keyless public product database, in three ways:

- **Scanning a barcode** looks up the exact product.
- **"Add manually"** has an optional "Search product database" box — search
  by name (e.g. "peanut butter") and pick from real matches instead of typing
  everything by hand.
- Either path pulls in **nutrition facts (per 100g), ingredients, and
  allergen warnings** when available, shown in the item's edit screen, with
  an allergen chip surfaced right in the pantry list for a quick glance.

None of this is guaranteed to exist for every product — smaller or local
brands are often missing data, sometimes entirely. When that happens, the
name/brand fields are just left blank for manual entry, same as always.

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
