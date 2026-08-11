/*
 * बाप्पा — everything you need to fill in, in one file.
 *
 * The page runs with all of this empty. Each feature checks its own config and
 * quietly hides itself if unset, so nothing renders broken or fake while you
 * gather the pieces.
 */

const CONFIG = {

  /* ── YouTube playlists ────────────────────────────────────────────────
     Just the ID — the part after `list=` in the URL, before any `&`.
     A modern playlist ID is `PL` followed by 32 characters (34 total).

     These are YouTube Music playlists. The `PL` prefix means user-created,
     which normally resolves fine on youtube.com with the same ID, but the
     IFrame API can only play videos whose owner permits embedding. Tracks
     that refuse to embed are skipped automatically. */
  playlists: {
    /* Confirmed by hand from music.youtube.com. Note this is 13 characters
       where YouTube playlist IDs are normally 18 or 34 — if the संगीत channel
       fails to load, this is the first thing to re-check, by copying the
       `list=` value straight out of the browser address bar. The player names
       the channel and the ID in its error, so a bad ID says so out loud. */
    sangeet: 'PLMeCLr1IOg2o',
    aarti: 'PLvrdjNni17MkwaA0URia5QFiDO4X6_ngY',
  },

  /* ── Live listener count ──────────────────────────────────────────────
     Firebase Realtime Database. Create a project at console.firebase.google.com,
     add a Web app, enable Realtime Database, and paste its config here.
     The counter does not render at all while this is blank — no placeholder
     number is ever shown.

     Database rules for an anonymous presence counter:
       { "rules": { "presence": { ".read": true, ".write": true } } }
     Lock the API key to your domain under APIs & Services → Credentials. */
  firebase: null,
  /* Example:
  firebase: {
    apiKey: '…',
    databaseURL: 'https://<project>-default-rtdb.firebaseio.com',
    projectId: '…',
  },
  */

  /* ── Support links ────────────────────────────────────────────────────
     Any left blank are omitted from the panel. If all are blank the support
     button disappears entirely. */
  support: {
    razorpay: 'https://razorpay.me/@adityamhamunkar',
    kofi: '',
    upi: '',            /* a upi:// link or a VPA like name@bank */
  },

  /* ── Share ────────────────────────────────────────────────────────────
     Absolute origin, no trailing slash, e.g. 'https://bappa.fm'. Needed for
     the Open Graph image URL, which must be absolute to work in previews.
     While blank, sharing falls back to whatever URL the page is served from
     and the OG tags stay relative. */
  siteUrl: 'https://bappa-pandal.netlify.app',
  shareText: 'गणपती बाप्पा मोरया — this is playing right now.',
};
