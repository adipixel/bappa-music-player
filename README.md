# Bappa

A single-page Ganpati festival music site.

The previous Node/Express + AngularJS application has been removed to make room
for a fresh build. Its full history remains in git.

## What was kept

Content, not code:

- `content/lyrics/` — 30 aarti lyrics (Marathi, transliterated)
- `content/songs.json` — the curated 33-track list: titles, categories, and the
  original audio filenames under `legacyAudio`
- `assets/` — the vermillion Ganesha logo mark

## Known gaps in the preserved data

- `Ashthavinayak` (id 30) references a lyrics file that never existed in the
  repo; its `lyrics` field is `null`.
- The two shlok entries (ids 31–32, "Moraya Moraya" and "Devadi deva") are
  placeholders — both point at aarti lyrics and audio rather than their own.
- Audio was never committed; the old `resources/bappamusic/` directory was
  gitignored. `legacyAudio` records the intended filenames only.
