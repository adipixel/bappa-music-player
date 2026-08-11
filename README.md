# पंडाल · Pandal

> The speaker outside the pandal, all eleven days.

A single-page Ganpati festival music site. Plain HTML/CSS/JS, no build step, no
dependencies to install. Open `index.html` behind any static server and it runs.

The page reads the clock in India and plays what a real pandal would be playing
at that hour — aartis at dawn and at seven in the evening, Bollywood and gajar
through the day, dhol-tasha after dark.

```
index.html      markup
styles.css      all styling
data.js         rotations, scenes, and the track list  ← edit this
app.js          clock, rotation logic, YouTube transport
ambience.js     synthesised ghanti and dhol-tasha
assets/         logo mark and placeholder scene art
content/        songs.json and the 30 aarti lyrics (preserved from the old app)
```

## Run it

`fetch()` cannot read lyrics off `file://`, so use a server rather than opening
the file directly:

```sh
python3 -m http.server
# then http://localhost:8000
```

Deploy by pointing Netlify, Vercel, or GitHub Pages at the repo root. There is
no build command and no output directory.

## Before it makes any sound: add video IDs

**Every track in `data.js` has an empty `yt` field, so nothing plays yet.**

The session that built this had no network access and could not verify a single
YouTube ID. Inventing them was the one thing worth avoiding — a wrong
11-character ID does not fail loudly, it plays the wrong song on a devotional
page. Empty was the honest default.

To fill one, open the video on YouTube and copy the 11 characters after `v=`:

```js
{ title: "Sukhakarta Dukhaharta", yt: "" }             // silent, dimmed in the queue
{ title: "Sukhakarta Dukhaharta", yt: "dQw4w9WgXcQ" }  // plays
```

You do not need to complete the list. The page starts working from the first ID
you fill; tracks still empty are skipped automatically and shown dimmed in the
queue. Prefer official label uploads — least likely to be region-locked or
pulled — and confirm embedding is allowed via Share → Embed on the video.

## The background art

Two scenes are needed. Both currently point at obvious placeholder SVGs in
`assets/`, which encode the composition described below — open them to see the
intended framing.

| | file | what it shows |
|---|---|---|
| **गल्ली** Street | `assets/scene-galli.svg` | the pandal from the road — crowd, lights, decorated archway, the lane it sits in |
| **दर्शन** Darshan | `assets/scene-darshan.svg` | front of the queue, face to face with the idol inside the mandap |

**Deliver:** 2560 × 1600 px (16:10), AVIF plus WebP, JPEG fallback. Under 400 KB
each after compression. Replace the files and update the `img` paths in the
`SCENES` array in `data.js`.

**Framing rules**, driven by how the page actually crops and what sits on top:

- The art is `background-size: cover`, centred, fixed to the viewport. It is
  cropped on every screen — never letterboxed — so nothing essential can live
  near an edge.
- **Keep the subject inside the central 30% of the width.** This is the strict
  one. A 390 px-wide phone crops a 16:10 image down to roughly its central 29%,
  so an idol placed a third of the way across vanishes on mobile.
- Vertically, keep the subject between **15% and 70%** of the frame height. The
  bottom ~190 px on desktop (~286 px on mobile) sits under the player bar.
- **Leave the lower-left quiet.** The rotation heading — large Devanagari, up to
  30 rem wide — is anchored there. Busy detail behind it will fight the type.
- The top-left ~14 rem carries the logo and station name; the right edge ~14 rem
  carries the scene switcher. Both want calm, low-contrast art behind them.
- White text sits on this art with only a soft vignette for help. Mid-to-dark
  values in those regions read best; avoid large bright areas under the corners.

**Style:** illustrated or painterly, not photographic — that is what makes the
reference sites feel like a memory rather than a stock photo. Warm palette
(vermillion, marigold, haldi) to sit with the logo mark. The two scenes should
feel like the same evening from two positions, so keep the light consistent.

The page grades the art per rotation using blend-mode washes, warming it at dawn
and cooling it at night, so supply a single neutral master per scene rather than
separate times of day.

If mobile cropping proves too tight once real art lands, the fix is a portrait
variant per scene plus a media query — a few lines in `styles.css`.

## Decisions, and how to change them

Each was made to a stated default and isolated so it can be flipped cheaply.

**Four rotations on the IST clock** — edit `ROTATIONS` in `data.js` to change
hours, names, or copy. The night slot wraps past midnight; `app.js` handles
that. For a simple always-on playlist instead, give one rotation `start: 0,
end: 24` and delete the rest.

| | | |
|---|---|---|
| काकड आरती | 05:00–09:00 | morning aartis |
| दिवसभर | 09:00–18:00 | Ganpati Bollywood and gajar |
| संध्या आरती | 18:00–21:00 | the evening canon, closing on Ghalin Lotangan |
| ढोल-ताशा | 21:00–05:00 | dhol-tasha and visarjan |

**Hidden YouTube iframe** for audio, matching three of the four reference sites.
Sidesteps hosting and licensing, and works with no audio in this repo. Swapping
to local mp3s means replacing the transport section of `app.js` with an
`<audio>` element; the rest of the page is source-agnostic.

**Two scenes on a toggle**, 1.5 s crossfade — not a one-way transition on play.
This follows what deluxebus.tech actually does: its backgrounds are view modes
on buttons, orthogonal to play state. Add or remove entries in `SCENES`; the
switcher builds itself from that array.

**Name and hook** live in `index.html` (the `.wordmark` and `.gate__hook`
elements) and the `<title>`.

**Evergreen, not date-gated.** Nothing checks the Ganesh Chaturthi calendar, so
the page works year-round. Hooking it to festival dates would go in
`applyRotation()`.

## Ambience

Ghanti and dhol-tasha are **synthesised in the browser** with the Web Audio API —
no sample files, nothing to license, nothing to fail to load. The bell is
additive synthesis over inharmonic partials; the dhol-tasha is a scheduled
16-step pattern with a pitch-swept membrane and filtered-noise cracks.

Each layer has its own gain node, so they are independently mixable as separate
toggles and sliders in the ambience panel. Both duck automatically under a
playing track. Tune them in `ambience.js` — `PATTERN` and `STEP` for the rhythm,
the `partials` array for the bell's character.

## Keyboard

`Space` play/pause · `←` `→` seek 10 s · `Shift` + `←` `→` track · `L` lyrics ·
`Esc` close panels

## Notes on the preserved content

`content/` came from the previous Node/Express + AngularJS app, which was removed
in `d7d781e`. Its full history remains in git.

- `content/lyrics/` — 30 aarti lyrics. These are **Devanagari script**, not
  transliterated as previously documented; the lyrics panel renders them
  directly.
- `content/songs.json` — the original 33-track list with categories and the
  intended audio filenames under `legacyAudio`. `data.js` supersedes it for
  playback but it is kept as the source record.
- Audio was never committed; the old `resources/bappamusic/` was gitignored.
- `Ashthavinayak` (id 30) references a lyrics file that never existed.
- The two shlok entries (ids 31–32) are placeholders pointing at aarti content.

Tracks in `data.js` carry a `lyrics` field only where a real file backs it, so
the lyrics button hides itself rather than opening an empty panel.
