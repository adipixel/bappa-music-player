/*
 * पंडाल — station data.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ADDING AUDIO — READ THIS FIRST
 * ─────────────────────────────────────────────────────────────────────────
 * Every track below has an empty `yt` field. The page plays nothing until
 * they are filled in. This is deliberate: the session that built this page
 * had no network egress and could not verify a single YouTube ID, and a
 * wrong 11-character ID does not fail loudly — it plays the wrong song, on
 * a devotional page. Empty was the honest default.
 *
 * To fill one: open the video on YouTube, copy the 11 characters after
 * `v=` in the URL, paste it into `yt`. That is the whole process.
 *
 *   { title: "Sukhakarta Dukhaharta", yt: "" }          ← silent, greyed out
 *   { title: "Sukhakarta Dukhaharta", yt: "dQw4w9WgXcQ" } ← plays
 *
 * Tracks with an empty `yt` are skipped by the player and shown dimmed in
 * the queue. The page works the moment the first one is filled — you do not
 * need to complete the list. Prefer official label uploads; they are least
 * likely to be region-locked or taken down. Verify embedding is allowed by
 * clicking Share → Embed on the video.
 * ─────────────────────────────────────────────────────────────────────────
 */

/* Scenes. Both point at placeholder SVGs until real artwork lands —
   see README.md for the commissioning spec (dimensions, framing, focal point). */
const SCENES = [
  {
    key: 'galli',
    dev: 'गल्ली',
    en: 'Street',
    hint: 'the pandal from the road',
    img: 'assets/scene-galli.svg',
  },
  {
    key: 'darshan',
    dev: 'दर्शन',
    en: 'Darshan',
    hint: 'front of the queue',
    img: 'assets/scene-darshan.svg',
  },
];

/* Four rotations on the IST clock, tracking an actual pandal day.
   `start` is inclusive, `end` exclusive, 24h IST. The night rotation wraps. */
const ROTATIONS = [
  {
    key: 'kakad',
    dev: 'काकड आरती',
    en: 'Kakad Aarti',
    blurb: 'First light. The mandap is still half asleep and someone has already started.',
    start: 5,
    end: 9,
    scene: 'darshan',
  },
  {
    key: 'divas',
    dev: 'दिवसभर',
    en: 'Day Darshan',
    blurb: 'The queue moves slow. The speaker outside has been going since morning.',
    start: 9,
    end: 18,
    scene: 'galli',
  },
  {
    key: 'sandhya',
    dev: 'संध्या आरती',
    en: 'Sandhya Aarti',
    blurb: 'Seven in the evening. Every taat in the lane is ringing at once.',
    start: 18,
    end: 21,
    scene: 'darshan',
  },
  {
    key: 'dhol',
    dev: 'ढोल-ताशा',
    en: 'Dhol-Tasha',
    blurb: 'The loud half. Generator on, speakers out, nobody going home.',
    start: 21,
    end: 5,
    scene: 'galli',
  },
];

/* ── Tracks ───────────────────────────────────────────────────────────────
   `lyrics` names a file in content/lyrics/. Only the aartis have them; the
   panel button hides itself when lyrics is null. Titles carry `dev` where
   the Devanagari is the name people actually use. */

const AARTI_MORNING = [
  { title: 'Sukhakarta Dukhaharta', dev: 'सुखकर्ता दुखहर्ता', artist: 'Traditional · Ganpati aarti', yt: '', lyrics: 'sukhakarta.txt' },
  { title: 'Lavthavti Vikrala',     dev: 'लवथवती विक्राळा',  artist: 'Traditional · Shankar aarti', yt: '', lyrics: 'lavthavti_vikrala.txt' },
  { title: 'Durge Durghat',         dev: 'दुर्गे दुर्घट',      artist: 'Traditional · Devi aarti',   yt: '', lyrics: 'durge-durgahat.txt' },
  { title: 'Yuge Athhavis',         dev: 'युगे अठ्ठावीस',    artist: 'Traditional · Vitthal aarti', yt: '', lyrics: 'yuge-athhavis.txt' },
  { title: 'Trighunatmak Trimurti', dev: 'त्रिगुणात्मक त्रिमूर्ती', artist: 'Traditional · Datta aarti', yt: '', lyrics: 'trighunatmak-trimurti.txt' },
  { title: 'Aata Swami Sukhe Nidra', dev: 'आता स्वामी सुखे निद्रा', artist: 'Traditional · shejaarti', yt: '', lyrics: 'aata-swami-sukhe-nidra.txt' },
  { title: 'Dhupadipa Jhala Aata',  dev: 'धूपदीप झाला आता',  artist: 'Traditional',                yt: '', lyrics: 'dhupadipa-jhala-aata.txt' },
  { title: 'Om Jaya Jagadhish',     dev: 'ॐ जय जगदीश',      artist: 'Traditional · universal aarti', yt: '', lyrics: 'om-jaya-jagadhish.txt' },
];

const AARTI_EVENING = [
  { title: 'Sukhakarta Dukhaharta', dev: 'सुखकर्ता दुखहर्ता', artist: 'Traditional · Ganpati aarti', yt: '', lyrics: 'sukhakarta.txt' },
  { title: 'Ganaraya Aarti Hi Tujala', dev: 'गणराया आरती ही तुजला', artist: 'Traditional',          yt: '', lyrics: 'ganaraya-aarti-hi-tujala.txt' },
  { title: 'Shendurlal Chadhao',    dev: 'शेंदुरलाल चढ़ायो',  artist: 'Traditional · Ganpati aarti', yt: '', lyrics: 'shendurlal-chadhao.txt' },
  { title: 'Tuch Sukhakarta',       dev: 'तूच सुखकर्ता',     artist: 'Traditional',                yt: '', lyrics: 'tuch-sukhakarta.txt' },
  { title: 'Yei Ho Vithhale',       dev: 'येई हो विठ्ठले',    artist: 'Traditional · Vitthal aarti', yt: '', lyrics: 'yeio-vithhale.txt' },
  { title: 'Dhanya Dhanya Ho',      dev: 'धन्य धन्य हो',     artist: 'Traditional',                yt: '', lyrics: 'dhanya-dhanya-ho.txt' },
  { title: 'Shree Swami Samartha',  dev: 'श्री स्वामी समर्थ',  artist: 'Traditional',                yt: '', lyrics: 'shree-swami-samartha.txt' },
  { title: 'Vithal Vithal Vithala', dev: 'विठ्ठल विठ्ठल विठ्ठला', artist: 'Traditional',             yt: '', lyrics: 'vithal-vithal-vithala.txt' },
  { title: 'Shevat Goad Kari',      dev: 'शेवट गोड करी',    artist: 'Traditional',                yt: '', lyrics: 'shevat-god-kari.txt' },
  /* Ghalin Lotangan closes every aarti. It stays last on purpose. */
  { title: 'Ghalin Lotangan',       dev: 'घालीन लोटांगण',    artist: 'Traditional · the closing',   yt: '', lyrics: 'ghalin-lotangan.txt' },
];

const DAY_BOLLYWOOD = [
  { title: 'Deva Shree Ganesha',   artist: 'Ajay–Atul · Agneepath (2012)',        yt: '', lyrics: null },
  { title: 'Shendur Laal Chadhayo', artist: 'Shankar Mahadevan',                  yt: '', lyrics: null },
  { title: 'Mourya Re',            artist: 'Shankar–Ehsaan–Loy · Don (2006)',     yt: '', lyrics: null },
  { title: 'Sadda Dil Vi Tu (Ga Ga Ganpati)', artist: 'ABCD: Any Body Can Dance (2013)', yt: '', lyrics: null },
  { title: 'Shri Ganeshay Dheemahi', artist: 'Ajay–Atul · Viruddh (2005)',        yt: '', lyrics: null },
  { title: 'Ganpati Bappa Morya',  artist: 'Traditional gajar',                   yt: '', lyrics: null },
  { title: 'Sukhkarta Dukhharta (film version)', artist: 'Ajay–Atul',             yt: '', lyrics: null },
  { title: 'Ashthavinayak Darshan', artist: 'Traditional · the eight temples',    yt: '', lyrics: null },
];

const DHOL_TASHA = [
  { title: 'Dhol Tasha Pathak',    artist: 'Pune · live recording',               yt: '', lyrics: null },
  { title: 'Ganpati Bappa Morya (dhol mix)', artist: 'Visarjan gajar',            yt: '', lyrics: null },
  { title: 'Morya Morya',          dev: 'मोरया मोरया', artist: 'Visarjan chant',   yt: '', lyrics: null },
  { title: 'Jai Dev Jai Dev (dhol)', artist: 'Procession version',                yt: '', lyrics: null },
  { title: 'Deva Shree Ganesha (dhol tasha)', artist: 'Pathak cover',             yt: '', lyrics: null },
  { title: 'Pudhchya Varshi Lavkar Ya', artist: 'The farewell',                   yt: '', lyrics: null },
];

const QUEUES = {
  kakad:   AARTI_MORNING,
  divas:   DAY_BOLLYWOOD,
  sandhya: AARTI_EVENING,
  dhol:    DHOL_TASHA,
};
