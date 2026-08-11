/*
 * बाप्पा — app logic.
 *
 * Two channels backed by two YouTube playlists, driven through the IFrame API.
 * The viewer's own clock decides which channel the page opens on. Everything
 * user-supplied lives in config.js and every feature that depends on it hides
 * itself when unset.
 */

const $ = id => document.getElementById(id);

const state = {
  channel: null,
  scene: null,
  sceneLocked: false,   /* set once the viewer picks a scene by hand */
  playing: false,
  ready: false,
  entered: false,
  seeking: false,
  total: 0,
};

let yt = null;
let presence = null;

/* ── Clock ────────────────────────────────────────────────────────────── */

function localParts() {
  const now = new Date();
  return {
    hour: now.getHours(),
    time: now.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }).toLowerCase(),
    date: now.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' }),
  };
}

const inWindow = (h, win) => win.some(([a, b]) => h >= a && h < b);

/* The channel the page should open on, given the hour. Falls back to the
   channel with no hours defined. */
function channelForHour(h) {
  return CHANNELS.find(c => c.hours && inWindow(h, c.hours))
      || CHANNELS.find(c => !c.hours)
      || CHANNELS[0];
}

const hasPlaylist = c => Boolean((CONFIG.playlists[c.key] || '').trim());

/* ── Scenery ──────────────────────────────────────────────────────────── */

function buildScenes() {
  const pick = $('scenePick');
  SCENES.forEach(s => {
    document.querySelector(`.scene[data-scene="${s.key}"]`)
      .style.backgroundImage = `url("${s.img}")`;

    const b = document.createElement('button');
    b.className = 'spick';
    b.type = 'button';
    b.dataset.scene = s.key;
    b.innerHTML = `<span class="spick__dev">${s.dev}</span>`
                + `<span class="spick__hint">${s.hint}</span>`;
    /* A manual pick stops the channel from moving the scene from here on —
       otherwise switching channel would silently undo the viewer's choice. */
    b.addEventListener('click', () => { state.sceneLocked = true; setScene(s.key); });
    pick.appendChild(b);
  });
}

function setScene(key) {
  state.scene = key;
  document.querySelectorAll('.scene').forEach(el =>
    el.classList.toggle('is-live', el.dataset.scene === key));
  document.querySelectorAll('.spick').forEach(b =>
    b.classList.toggle('is-on', b.dataset.scene === key));
}

/* ── Channels ─────────────────────────────────────────────────────────── */

function buildChannels() {
  const wrap = $('chanPick');
  CHANNELS.forEach(c => {
    const b = document.createElement('button');
    b.className = 'chan';
    b.type = 'button';
    b.dataset.channel = c.key;
    b.disabled = !hasPlaylist(c);
    b.innerHTML = `<span class="chan__dev">${c.dev}</span>`
                + `<span class="chan__en">${hasPlaylist(c) ? c.en : 'no playlist'}</span>`;
    if (hasPlaylist(c)) b.addEventListener('click', () => setChannel(c.key, true));
    wrap.appendChild(b);
  });
}

function setChannel(key, autoplay) {
  const c = CHANNELS.find(x => x.key === key);
  if (!c || !hasPlaylist(c)) return;

  const switching = state.channel && state.channel.key !== key;
  state.channel = c;
  document.body.dataset.channel = c.key;

  document.querySelectorAll('.chan').forEach(b =>
    b.classList.toggle('is-on', b.dataset.channel === key));

  $('chanDev').textContent = c.dev;
  $('chanEn').textContent = c.en;
  $('chanBlurb').textContent = c.blurb;
  $('topChan').textContent = c.en;

  if (!state.sceneLocked) setScene(c.scene);

  if (state.ready && (switching || autoplay)) loadChannel(autoplay);
}

/* ── YouTube ──────────────────────────────────────────────────────────── */

function bootYouTube() {
  const tag = document.createElement('script');
  tag.src = 'https://www.youtube.com/iframe_api';
  tag.onerror = () => showFault('YouTube could not be reached.');
  document.head.appendChild(tag);
}

window.onYouTubeIframeAPIReady = function () {
  yt = new YT.Player('ytplayer', {
    height: '1', width: '1',
    playerVars: { autoplay: 0, controls: 0, disablekb: 1, playsinline: 1, rel: 0 },
    events: {
      onReady: () => {
        state.ready = true;
        if (state.entered) loadChannel(true);
      },
      onStateChange: onYtState,
      /* 101/150 mean the owner disallows embedding. Skipping is the only
         sane response — the track simply is not playable here. */
      onError: e => {
        if ([101, 150].includes(e.data) && state.playing) yt.nextVideo();
        else if ([2, 5, 100].includes(e.data)) showFault('That playlist could not be loaded.');
      },
    },
  });
};

function onYtState(e) {
  if (e.data === YT.PlayerState.PLAYING) { setPlaying(true); readTrack(); }
  if (e.data === YT.PlayerState.PAUSED) setPlaying(false);
  if (e.data === YT.PlayerState.ENDED) setPlaying(false);
  if (e.data === YT.PlayerState.CUED) readTrack();
}

function loadChannel(autoplay) {
  const id = (CONFIG.playlists[state.channel.key] || '').trim();
  if (!id || !state.ready) return;

  const opts = { list: id, listType: 'playlist', index: 0 };
  autoplay ? yt.loadPlaylist(opts) : yt.cuePlaylist(opts);
  setTimeout(readTrack, 900);
}

/* Playlist mode gives us the current video's title and nothing about the
   rest, so the display is rebuilt from the player on every change. */
function readTrack() {
  if (!state.ready || !yt || !yt.getVideoData) return;

  const data = yt.getVideoData() || {};
  const title = (data.title || '').trim();
  const list = (yt.getPlaylist && yt.getPlaylist()) || [];
  const idx = (yt.getPlaylistIndex && yt.getPlaylistIndex()) || 0;

  state.total = list.length;
  $('trackTitle').textContent = title || '—';
  $('trackArtist').textContent = data.author || '';
  $('trackPos').textContent = list.length
    ? `${String(idx + 1).padStart(2, '0')} / ${String(list.length).padStart(2, '0')}`
    : '';

  const hit = matchLyrics(title);
  $('lyricsBtn').hidden = !hit;
  $('lyricsBtn').dataset.file = hit ? hit.file : '';
  $('lyricsBtn').dataset.dev = hit ? hit.dev : '';

  if ($('lyrics').classList.contains('is-open')) {
    hit ? loadLyrics(hit) : closePanel('lyrics');
  }
}

/* ── Lyrics ───────────────────────────────────────────────────────────── */

const normalise = s => s.toLowerCase()
  .replace(/[^a-z0-9\s]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

/* Scores each index entry by how many of its distinctive tokens appear in the
   YouTube title. Two hits, or one hit on a token long enough to be unambiguous,
   is enough — below that the risk of showing the wrong aarti's words outweighs
   showing none.

   A `phrase` outweighs any token total. Some aartis are near-anagrams of each
   other by keyword — "Tuch Sukhakarta" shares both its distinctive words with
   "Sukhakarta Dukhaharta" while being a different song — and only the ordered
   phrase separates them. */
function matchLyrics(title) {
  if (!title) return null;
  const norm = normalise(title);
  const words = new Set(norm.split(' '));

  let best = null;
  let bestScore = 0;
  for (const entry of LYRICS_INDEX) {
    let score = 0;
    for (const tok of entry.tokens) if (words.has(tok)) score += tok.length >= 7 ? 2 : 1;
    if (entry.phrase && norm.includes(entry.phrase)) score += 6;
    if (score > bestScore) { bestScore = score; best = entry; }
  }
  return bestScore >= 2 ? best : null;
}

async function loadLyrics(entry) {
  $('lyricsTitle').textContent = entry.dev;
  $('lyricsBody').textContent = 'उघडत आहे…';
  try {
    const res = await fetch(`content/lyrics/${entry.file}`);
    if (!res.ok) throw new Error(res.status);
    $('lyricsBody').textContent = (await res.text()).trim();
  } catch (err) {
    $('lyricsBody').textContent =
      'गीत मिळालं नाही.\n\nLyrics could not be loaded. If you opened this file '
      + 'directly from disk, run a local server instead:\n\n  python3 -m http.server';
  }
}

/* ── Transport ────────────────────────────────────────────────────────── */

function setPlaying(on) {
  state.playing = on;
  $('playBtn').textContent = on ? '❚❚' : '▶';
  $('playBtn').setAttribute('aria-label', on ? 'Pause' : 'Play');
  $('status').textContent = on ? 'चालू आहे' : 'थांबलं आहे';
  $('status').classList.toggle('is-live', on);
  if (window.ambience) window.ambience.duck(on);
}

function togglePlay() {
  if (!state.ready || !yt) return;
  state.playing ? yt.pauseVideo() : yt.playVideo();
}

const mmss = s => {
  if (!isFinite(s) || s < 0) s = 0;
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
};

function tick() {
  if (!state.ready || !yt || !yt.getDuration) return;
  const dur = yt.getDuration() || 0;
  const now = yt.getCurrentTime() || 0;

  $('timeNow').textContent = mmss(now);
  $('timeEnd').textContent = mmss(dur);

  if (!state.seeking) {
    const pct = dur ? (now / dur) * 100 : 0;
    $('seek').value = dur ? (now / dur) * 1000 : 0;
    $('seek').style.backgroundSize = `${pct}% 100%`;
  }
}

/* ── Share ────────────────────────────────────────────────────────────── */

async function share() {
  const url = CONFIG.siteUrl || location.href;
  const text = CONFIG.shareText;

  if (navigator.share) {
    try { await navigator.share({ title: 'बाप्पा', text, url }); return; } catch (e) { /* dismissed */ }
  }
  try {
    await navigator.clipboard.writeText(`${text} ${url}`);
    flash($('shareBtn'), 'कॉपी झालं');
  } catch (e) {
    flash($('shareBtn'), url);
  }
}

function flash(btn, msg) {
  const was = btn.textContent;
  btn.textContent = msg;
  setTimeout(() => { btn.textContent = was; }, 1800);
}

/* ── Support ──────────────────────────────────────────────────────────── */

function buildSupport() {
  const links = [
    ['Razorpay', CONFIG.support.razorpay],
    ['Ko-fi', CONFIG.support.kofi],
    ['UPI', CONFIG.support.upi],
  ].filter(([, v]) => v && v.trim());

  if (!links.length) { $('supportBtn').hidden = true; return; }

  const wrap = $('supportLinks');
  links.forEach(([label, href]) => {
    const a = document.createElement('a');
    a.className = 'slink';
    a.href = href.startsWith('http') || href.startsWith('upi:') ? href : `upi://pay?pa=${href}`;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.textContent = label;
    wrap.appendChild(a);
  });
}

/* ── Faults ───────────────────────────────────────────────────────────── */

function showFault(msg) {
  $('fault').hidden = false;
  $('faultMsg').textContent = msg;
}

function checkSetup() {
  const missing = CHANNELS.filter(c => !hasPlaylist(c));
  if (missing.length === CHANNELS.length) {
    showFault('No playlist IDs are set. Add them in config.js — nothing can play until then.');
  } else if (missing.length) {
    showFault(`The ${missing.map(c => c.dev).join(' and ')} channel has no playlist ID yet. Add it in config.js.`);
  }
}

/* ── Panels ───────────────────────────────────────────────────────────── */

const PANELS = { lyrics: 'lyricsBtn', mixer: 'mixerBtn', support: 'supportBtn' };

function openPanel(n) {
  Object.keys(PANELS).forEach(o => { if (o !== n) closePanel(o); });
  $(n).classList.add('is-open');
  $(PANELS[n]).classList.add('is-on');
}
function closePanel(n) {
  $(n).classList.remove('is-open');
  $(PANELS[n]).classList.remove('is-on');
}
function togglePanel(n) {
  $(n).classList.contains('is-open') ? closePanel(n) : openPanel(n);
}

/* ── Entry ────────────────────────────────────────────────────────────── */

function enter() {
  if (state.entered) return;
  state.entered = true;

  $('gate').classList.add('is-open');
  document.body.classList.remove('is-gated');

  /* The only guaranteed user gesture — both audio systems unlock here. */
  if (window.ambience) { window.ambience.init(); window.ambience.resume(); }
  if (state.ready) loadChannel(true);
}

/* ── Wiring ───────────────────────────────────────────────────────────── */

function wire() {
  $('enterBtn').addEventListener('click', enter);
  $('playBtn').addEventListener('click', togglePlay);
  $('nextBtn').addEventListener('click', () => { if (state.ready) { yt.nextVideo(); setTimeout(readTrack, 700); } });
  $('prevBtn').addEventListener('click', () => {
    if (!state.ready) return;
    if (yt.getCurrentTime() > 3) { yt.seekTo(0); return; }
    yt.previousVideo();
    setTimeout(readTrack, 700);
  });
  $('shuffleBtn').addEventListener('click', e => {
    if (!state.ready) return;
    const on = !e.currentTarget.classList.contains('is-on');
    yt.setShuffle(on);
    e.currentTarget.classList.toggle('is-on', on);
    e.currentTarget.setAttribute('aria-pressed', String(on));
  });

  const seek = $('seek');
  seek.addEventListener('input', () => {
    state.seeking = true;
    seek.style.backgroundSize = `${seek.value / 10}% 100%`;
  });
  seek.addEventListener('change', () => {
    const dur = state.ready ? yt.getDuration() : 0;
    if (dur) yt.seekTo((seek.value / 1000) * dur, true);
    state.seeking = false;
  });

  $('lyricsBtn').addEventListener('click', e => {
    const file = e.currentTarget.dataset.file;
    if (!file) return;
    if ($('lyrics').classList.contains('is-open')) { closePanel('lyrics'); return; }
    loadLyrics({ file, dev: e.currentTarget.dataset.dev });
    openPanel('lyrics');
  });
  $('mixerBtn').addEventListener('click', () => togglePanel('mixer'));
  $('supportBtn').addEventListener('click', () => togglePanel('support'));
  $('shareBtn').addEventListener('click', share);
  $('lyricsClose').addEventListener('click', () => closePanel('lyrics'));
  $('mixerClose').addEventListener('click', () => closePanel('mixer'));
  $('supportClose').addEventListener('click', () => closePanel('support'));
  $('faultClose').addEventListener('click', () => { $('fault').hidden = true; });

  const amb = (btn, slider, name) => {
    $(btn).addEventListener('click', () => {
      if (!window.ambience) return;
      window.ambience.init();
      window.ambience.resume();
      $(btn).setAttribute('aria-pressed', String(window.ambience.toggle(name)));
    });
    $(slider).addEventListener('input', e => {
      if (window.ambience) window.ambience.setVolume(name, e.target.value / 100);
    });
  };
  amb('ghantiToggle', 'ghantiVol', 'ghanti');
  amb('dholToggle', 'dholVol', 'dhol');

  document.addEventListener('keydown', e => {
    if (e.target.matches('input, textarea')) return;
    if (!state.entered) {
      if (e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); enter(); }
      return;
    }
    if (e.code === 'Space') { e.preventDefault(); togglePlay(); }
    if (!state.ready) return;
    if (e.code === 'ArrowRight') e.shiftKey ? yt.nextVideo() : yt.seekTo(yt.getCurrentTime() + 10, true);
    if (e.code === 'ArrowLeft') e.shiftKey ? yt.previousVideo() : yt.seekTo(Math.max(0, yt.getCurrentTime() - 10), true);
    if (e.code === 'Escape') Object.keys(PANELS).forEach(closePanel);
    if (e.key === 'l' || e.key === 'L') $('lyricsBtn').click();
    if (e.key === 'c' || e.key === 'C') {
      const other = CHANNELS.find(c => c.key !== state.channel.key && hasPlaylist(c));
      if (other) setChannel(other.key, state.playing);
    }
  });
}

/* ── Start ────────────────────────────────────────────────────────────── */

function paintClock() {
  const { time, date } = localParts();
  $('clock').textContent = time;
  $('clockDate').textContent = date;
}

function boot() {
  document.body.classList.add('is-gated');
  buildScenes();
  buildChannels();
  buildSupport();
  wire();
  paintClock();

  /* Social previews reject relative image paths, so promote it once we know
     the origin. Harmless when siteUrl is blank. */
  if (CONFIG.siteUrl) {
    const og = $('ogImage');
    og.setAttribute('content', `${CONFIG.siteUrl.replace(/\/$/, '')}/${og.getAttribute('content')}`);
  }

  const { hour, time } = localParts();
  const opening = channelForHour(hour);
  /* If the hour's channel has no playlist, fall back to one that does rather
     than opening on a dead channel. */
  const usable = hasPlaylist(opening) ? opening : CHANNELS.find(hasPlaylist) || opening;
  setChannel(usable.key, false);

  $('gateNow').textContent = `${usable.dev} · ${time}`;
  checkSetup();

  if (CONFIG.firebase && CONFIG.firebase.databaseURL) {
    presence = new Presence(CONFIG.firebase, n => {
      $('listeners').hidden = n === null;
      if (n !== null) $('listeners').textContent = `${n} ऐकत आहेत`;
    });
    presence.start();
  }

  setInterval(paintClock, 15000);
  setInterval(tick, 250);
  bootYouTube();
}

document.addEventListener('DOMContentLoaded', boot);
