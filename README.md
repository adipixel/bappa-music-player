# बाप्पा · Bappa

> The speaker outside the pandal, all eleven days.

A single-page Ganpati festival music site. Plain HTML/CSS/JS, no build step, no
dependencies to install.

Two channels — **संगीत** (gajar and film songs) and **आरती** (the aartis, with
lyrics) — each backed by a YouTube playlist. Your own clock decides which one
the page opens on: aarti around dawn and around seven in the evening, music the
rest of the day. Switching channel also moves the scene, from the street outside
the pandal to the front of the darshan queue.

```
index.html      markup
config.js       ← everything you need to fill in
data.js         scenes, channels, lyrics index
app.js          clock, channels, YouTube transport
presence.js     live listener count (inert until configured)
ambience.js     synthesised ghanti and dhol-tasha
styles.css      all styling
assets/         logo mark and placeholder scene art
content/        songs.json and the 30 aarti lyrics
```

## Run it

`fetch()` cannot read lyrics off `file://`, so use a server:

```sh
python3 -m http.server
# then http://localhost:8000
```

Deploy by pointing Netlify, Vercel, or GitHub Pages at the repo root. No build
command, no output directory.

## What you still need to supply

Everything below lives in `config.js`. **The page runs with all of it empty** —
each feature checks its own config and hides itself when unset, so nothing ever
renders broken, dead, or fake while you gather the pieces.

### 1. The संगीत playlist ID — required for that channel

The ID supplied was `PLMeCLr1IOg2o`. That is 13 characters (`PL` + 11), and no
YouTube playlist ID has that shape — they are `PL` + 32 (34 total) or `PL` + 16
(18 total). It looks truncated at the copy step, so it was left empty rather
than guessed. The संगीत channel button is disabled until it is filled.

The आरती playlist, `PLvrdjNni17MkwaA0URia5QFiDO4X6_ngY`, is a valid 34-character
ID and is wired up.

> Neither playlist could be verified — youtube.com is blocked from the network
> this was built on. They are unconfirmed as public, populated, or embeddable.

**Embedding is the risk to watch.** These are YouTube *Music* playlists. The
`PL` prefix means user-created, which normally resolves on youtube.com with the
same ID, but the IFrame API can only play videos whose owner permits embedding,
and label-uploaded music is embed-restricted more often than average. Blocked
tracks (error 101/150) are skipped automatically. If most of a playlist skips,
the fallback is a hand-picked list of embeddable uploads.

### 2. Firebase config — for the live listener count

Nothing renders until this is set; no placeholder number is ever shown. Create a
project at console.firebase.google.com, add a Web app, enable Realtime Database,
and paste the config into `CONFIG.firebase`.

Database rules for an anonymous counter:

```json
{ "rules": { "presence": { ".read": true, ".write": true } } }
```

Then restrict the API key to your domain under APIs & Services → Credentials.

This uses the REST endpoint plus a 20-second heartbeat rather than the Firebase
SDK — no bundle, no build step, and the rest of the page does not depend on it
loading. A visitor counts as present while their stamp is under a minute old,
which tolerates closed tabs and dropped connections.

### 3. Support links

Fill any of `razorpay`, `kofi`, or `upi` in `CONFIG.support`. Blank ones are
omitted; if all three are blank the मदत button disappears.

### 4. Site URL

Set `CONFIG.siteUrl` to the deployed origin. Social previews reject relative
image paths, so the Open Graph image is promoted to an absolute URL from it.

A proper **1200 × 630** share card is still worth making — `og:image` currently
points at the logo mark, which will letterbox awkwardly in a link preview.

### 5. The background art

Two scenes, currently obvious placeholder SVGs in `assets/` that encode the
intended composition. Open them to see the framing.

| | file | what it shows |
|---|---|---|
| **गल्ली** Street | `assets/scene-galli.svg` | the pandal from the road — crowd, lights, decorated archway |
| **दर्शन** Darshan | `assets/scene-darshan.svg` | front of the queue, face to face with the idol |

**Deliver:** 2560 × 1600 (16:10), AVIF plus WebP, JPEG fallback, under 400 KB
each. Replace the files and update the `img` paths in `SCENES` in `data.js`.

**Framing rules**, driven by how the page crops and what sits on top:

- The art is `background-size: cover`, centred, fixed. It is cropped on every
  screen — never letterboxed — so nothing essential can sit near an edge.
- **Keep the subject inside the central 30% of the width.** This is the strict
  one. A 390 px phone crops a 16:10 image to roughly its central 29%, so an idol
  placed a third of the way across vanishes on mobile.
- Vertically, keep the subject between **15% and 70%**. The bottom ~190 px on
  desktop (~340 px on mobile) sits under the player and the switchers.
- **Leave the lower-left quiet** — the large Devanagari channel heading is
  anchored there, up to 30 rem wide.
- Top-left carries the wordmark and channel switch; the right edge carries the
  scene switch. Both want calm, low-contrast art behind them.
- White text sits on this art with only a vignette for help. Mid-to-dark values
  read best; avoid large bright areas under the corners.

**Style:** illustrated or painterly, not photographic — that is what makes the
reference sites feel like a memory rather than a stock photo. Warm palette
(vermillion, marigold, haldi) to sit with the logo mark. The two scenes should
read as the same evening from two positions, so keep the light consistent.

The page grades the art per channel with blend-mode washes, so supply one
neutral master per scene rather than separate times of day.

If mobile cropping proves too tight once real art lands, the fix is a portrait
variant per scene plus a media query — a few lines in `styles.css`.

## How the pieces work

### Lyrics without an API key

Playlist mode never exposes which song is queued — the IFrame API gives a video
ID and the title of whatever is currently playing, nothing more. So lyrics are
matched against that title at runtime, against the token index in `data.js`.

Scoring weights long distinctive tokens double and requires a score of 2, so a
title has to earn its lyrics; deliberately excludes filler that appears in
nearly every upload (`aarti`, `ganpati`, `marathi`) which would otherwise match
everything. A `phrase` outweighs any token total, which is what separates
near-anagram aartis — "Tuch Sukhakarta" shares both distinctive words with
"Sukhakarta Dukhaharta" while being a different song.

Verified against 14 representative titles: 10 correct matches, 4 correct
rejections. When nothing scores high enough the lyrics button simply hides —
showing the wrong aarti's words is worse than showing none.

### Why there is no queue panel

Without the YouTube Data API there are no upcoming titles to list — only video
IDs. A panel of "Track 08" eleven times is not worth opening, so playlist
position appears in the player bar as `07 / 42` instead. Adding a Data API key
later would make a real browsable catalogue possible.

### Ambience

Ghanti and dhol-tasha are **synthesised in the browser** with the Web Audio API —
no sample files, nothing to license, nothing to fail to load. The bell is
additive synthesis over inharmonic partials; the dhol-tasha is a scheduled
16-step pattern with a pitch-swept membrane and filtered-noise cracks.

Each layer has its own gain node, so they are independently mixable, and both
duck under a playing track. Tune in `ambience.js` — `PATTERN` and `STEP` for the
rhythm, the `partials` array for the bell's character.

## Keyboard

`Space` play/pause · `←` `→` seek 10 s · `Shift` + `←` `→` track · `C` switch
channel · `L` lyrics · `Esc` close panels

## Notes on the preserved content

`content/` came from the previous Node/Express + AngularJS app, removed in
`d7d781e`. Its full history remains in git.

- `content/lyrics/` — 30 aarti lyrics. These are **Devanagari script**, not
  transliterated as previously documented; the lyrics panel renders them
  directly.
- `content/songs.json` — the original 33-track list with categories and intended
  audio filenames under `legacyAudio`. Kept as the source record; playback now
  comes from the playlists.
- Audio was never committed; the old `resources/bappamusic/` was gitignored.
- `Ashthavinayak` (id 30) references a lyrics file that never existed.
- The two shlok entries (ids 31–32) are placeholders pointing at aarti content.
