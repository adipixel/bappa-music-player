/*
 * बाप्पा — scenes, channels, and the lyrics index.
 * User-supplied values live in config.js; this file is structure.
 */

/* Scenes. Placeholder SVGs until artwork lands — see README for the spec. */
const SCENES = [
  { key: 'galli',   dev: 'गल्ली', en: 'Street',  hint: 'the pandal from the road', img: 'assets/scene-galli.svg' },
  { key: 'darshan', dev: 'दर्शन', en: 'Darshan', hint: 'front of the queue',       img: 'assets/scene-darshan.svg' },
];

/* Two channels. `hours` are local to the viewer and decide which channel the
   page opens on — aarti around dawn and around seven in the evening, music
   the rest of the day. Switching is always manual afterwards. */
const CHANNELS = [
  {
    key: 'sangeet',
    dev: 'संगीत',
    en: 'Music',
    blurb: 'The speaker outside the pandal. Gajar, film songs, whatever the mandal put on.',
    scene: 'galli',
    hours: null,                       /* the default when no aarti window is open */
  },
  {
    key: 'aarti',
    dev: 'आरती',
    en: 'Aarti',
    blurb: 'Front of the queue, taat in hand. Sing along — the words are here.',
    scene: 'darshan',
    hours: [[5, 9], [18, 21]],         /* [start, end) in local time */
  },
];

/* ── Lyrics index ─────────────────────────────────────────────────────────
   Playlist mode never tells us which song is queued — the IFrame API gives a
   video ID and the title of whatever is playing, nothing more. So lyrics are
   matched against that title at runtime.

   `tokens` are the distinctive words to look for, lowercase and stripped of
   punctuation. Deliberately excludes filler that appears in nearly every
   upload ('aarti', 'ganpati', 'marathi', 'song') — those match everything and
   would mis-attribute lyrics. Two or more token hits wins; ties go to the
   entry with more matches, so longer specific names beat short ones. */
const LYRICS_INDEX = [
  { file: 'sukhakarta.txt',              dev: 'सुखकर्ता दुखहर्ता',      tokens: ['sukhakarta', 'sukhkarta', 'dukhaharta', 'dukhharta'] },
  { file: 'lavthavti_vikrala.txt',       dev: 'लवथवती विक्राळा',       tokens: ['lavthavti', 'lavthavati', 'vikrala', 'vikraala'] },
  { file: 'durge-durgahat.txt',          dev: 'दुर्गे दुर्घट',            tokens: ['durge', 'durghat', 'durgahat'] },
  { file: 'yuge-athhavis.txt',           dev: 'युगे अठ्ठावीस',          tokens: ['yuge', 'athhavis', 'atthavis', 'athavis'] },
  { file: 'trighunatmak-trimurti.txt',   dev: 'त्रिगुणात्मक त्रिमूर्ती',   tokens: ['trighunatmak', 'trigunatmak', 'trimurti'] },
  { file: 'nana-marimal.txt',            dev: 'नाना परिमळ',            tokens: ['nana', 'parimal', 'parimal', 'marimal'] },
  { file: 'shendurlal-chadhao.txt',      dev: 'शेंदुरलाल चढ़ायो',        tokens: ['shendurlal', 'shendur', 'chadhao', 'chadhayo'] },
  { file: 'yeio-vithhale.txt',           dev: 'येई हो विठ्ठले',          tokens: ['yei', 'yeio', 'vithhale', 'vitthale'] },
  /* 'tu' alone is dropped as a token — far too common to be evidence of
     anything, and this aarti is separated from Tuch Sukhakarta by phrase. */
  { file: 'tu-shukhatarta.txt',          dev: 'तू सुखकर्ता',             tokens: ['sukhatarta', 'shukhatarta'], phrase: 'tu sukhatarta' },
  { file: 'aarti-dyanaraja.txt',         dev: 'आरती ज्ञानराजा',         tokens: ['dyanaraja', 'dnyanaraja', 'gyanaraja', 'dnyanraj'] },
  { file: 'aarti-saibaba.txt',           dev: 'आरती साईबाबा',          tokens: ['saibaba', 'sainath', 'sai'] },
  { file: 'aarti-saprem.txt',            dev: 'आरती सप्रेम',            tokens: ['saprem', 'sapremu'] },
  { file: 'om-jaya-jagadhish.txt',       dev: 'ॐ जय जगदीश',           tokens: ['jagadhish', 'jagdish', 'jagadish'] },
  { file: 'aata-swami-sukhe-nidra.txt',  dev: 'आता स्वामी सुखे निद्रा',  tokens: ['aata', 'swami', 'sukhe', 'nidra'] },
  { file: 'dhanya-dhanya-ho.txt',        dev: 'धन्य धन्य हो',           tokens: ['dhanya'] },
  { file: 'rijo-rijo.txt',               dev: 'रिजो रिजो',              tokens: ['rijo'] },
  { file: 'mujhe-sache-dilse.txt',       dev: 'मुझे सच्चे दिलसे',        tokens: ['mujhe', 'sache', 'dilse'] },
  { file: 'jai-jai-din-dayala.txt',      dev: 'जय जय दीनदयाळा',       tokens: ['dindayala', 'dindayal', 'dayala', 'satyanarayan'] },
  { file: 'kabhi-ram-banke.txt',         dev: 'कभी राम बनके',          tokens: ['kabhi', 'banke'] },
  { file: 'rama-rama-rama.txt',          dev: 'राम राम राम',           tokens: ['rama'] },
  { file: 'ganaraya-aarti-hi-tujala.txt', dev: 'गणराया आरती ही तुजला', tokens: ['ganaraya', 'tujala', 'tujhala'] },
  { file: 'shree-swami-samartha.txt',    dev: 'श्री स्वामी समर्थ',       tokens: ['samartha', 'samarth'] },
  { file: 'tuch-sukhakarta.txt',         dev: 'तूच सुखकर्ता',            tokens: ['tuch'], phrase: 'tuch sukhakarta' },
  { file: 'tula-khandyavar.txt',         dev: 'तुला खांद्यावर',          tokens: ['khandyavar', 'khandyawar'] },
  { file: 'vithal-vithal-vithala.txt',   dev: 'विठ्ठल विठ्ठल विठ्ठला',    tokens: ['vithal', 'vitthal', 'vithala'] },
  { file: 'hari-chala-mandira.txt',      dev: 'हरी चला मंदिरा',         tokens: ['hari', 'chala', 'mandira'] },
  { file: 'aarti-ramji-tumhari.txt',     dev: 'आरती रामजी तुम्हारी',     tokens: ['ramji', 'tumhari'] },
  { file: 'dhupadipa-jhala-aata.txt',    dev: 'धूपदीप झाला आता',       tokens: ['dhupadipa', 'dhoopdeep', 'jhala'] },
  { file: 'shevat-god-kari.txt',         dev: 'शेवट गोड करी',          tokens: ['shevat', 'goad', 'god', 'kari'] },
  { file: 'ghalin-lotangan.txt',         dev: 'घालीन लोटांगण',          tokens: ['ghalin', 'lotangan', 'lotaangan'] },
];
