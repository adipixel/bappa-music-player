/*
 * पंडाल — app logic.
 *
 * Reads the IST clock, picks the rotation that a real pandal would be running
 * at that hour, and drives a hidden YouTube iframe through the IFrame API.
 * The visible transport is ours; YouTube is only the audio source.
 */

const $ = id => document.getElementById(id);

const state = {
  rotation: null,
  scene: null,
  queue: [],
  index: 0,
  playing: false,
  ready: false,
  entered: false,
  seeking: false,
};

let yt = null;
let tickTimer = null;

/* ── Clock ────────────────────────────────────────────────────────────── */

/* Everything is anchored to India regardless of where the visitor is — the
   whole conceit is that the page is running on pandal time, not yours. */
function istParts() {
  const fmt = new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: 'numeric', minute: '2-digit', hour12: true,
    weekday: 'long', day: 'numeric', month: 'long',
  });
  const p = {};
  for (const { type, value } of fmt.formatToParts(new Date())) p[type] = value;

  const h24 = Number(new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata', hour: '2-digit', hour12: false,
  }).format(new Date()));

  return {
    hour24: h24 % 24,
    time: `${p.hour}:${p.minute} ${(p.dayPeriod || '').toLowerCase()}`,
    date: `${p.weekday}, ${p.day} ${p.month} · IST`,
  };
}

function rotationFor(hour) {
  return ROTATIONS.find(r =>
    r.start < r.end
      ? hour >= r.start && hour < r.end
      : hour >= r.start || hour < r.end     /* the wrapping night slot */
  ) || ROTATIONS[0];
}

/* ── Scenery ──────────────────────────────────────────────────────────── */

function buildScenes() {
  const pick = $('scenePick');
  SCENES.forEach(s => {
    const el = document.querySelector(`.scene[data-scene="${s.key}"]`);
    el.style.backgroundImage = `url("${s.img}")`;

    const b = document.createElement('button');
    b.className = 'spick';
    b.type = 'button';
    b.dataset.scene = s.key;
    b.innerHTML =
      `<span class="spick__dev">${s.dev}</span>` +
      `<span class="spick__hint">${s.hint}</span>`;
    b.addEventListener('click', () => setScene(s.key));
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

/* ── Rotation ─────────────────────────────────────────────────────────── */

function applyRotation(force) {
  const { hour24, time, date } = istParts();
  $('clock').textContent = time;
  $('clockDate').textContent = date;

  const rot = rotationFor(hour24);
  if (!force && state.rotation && rot.key === state.rotation.key) return;

  const changed = state.rotation && rot.key !== state.rotation.key;
  state.rotation = rot;
  document.body.dataset.rot = rot.key;

  $('rotDev').textContent = rot.dev;
  $('rotEn').textContent = rot.en;
  $('rotBlurb').textContent = rot.blurb;
  $('rotLabel').textContent = rot.en;
  $('queueTitle').textContent = `${rot.dev} · ${rot.en}`;

  setScene(rot.scene);
  state.queue = QUEUES[rot.key] || [];
  state.index = 0;
  renderQueue();
  renderTrack();

  /* Rolling from one rotation into the next mid-listen should feel like the
     station changing gear, not like the page reloading. */
  if (changed && state.playing) loadCurrent(true);
}

/* ── Track plumbing ───────────────────────────────────────────────────── */

const playable = t => t && typeof t.yt === 'string' && t.yt.trim().length > 0;
const anyPlayable = () => state.queue.some(playable);

function titleHtml(t) {
  return t.dev
    ? `<span class="dev">${t.dev}</span> · ${t.title}`
    : t.title;
}

function renderTrack() {
  const t = state.queue[state.index];
  if (!t) return;

  $('trackTitle').innerHTML = titleHtml(t);
  $('trackArtist').textContent = t.artist || '';
  $('lyricsBtn').hidden = !t.lyrics;

  const none = !anyPlayable();
  $('setup').hidden = !none;
  ['playBtn', 'prevBtn', 'nextBtn'].forEach(id => { $(id).disabled = none; });

  document.querySelectorAll('.qitem').forEach((el, i) =>
    el.classList.toggle('is-current', i === state.index));

  /* A lyrics panel left open should follow the track, not strand you on the
     previous one. */
  if ($('lyrics').classList.contains('is-open')) {
    t.lyrics ? loadLyrics(t) : closePanel('lyrics');
  }
}

function renderQueue() {
  const list = $('queueList');
  list.innerHTML = '';

  state.queue.forEach((t, i) => {
    const li = document.createElement('li');
    const b = document.createElement('button');
    b.className = 'qitem';
    b.type = 'button';
    if (!playable(t)) b.classList.add('is-silent');
    if (i === state.index) b.classList.add('is-current');
    b.innerHTML =
      `<span class="qitem__n">${String(i + 1).padStart(2, '0')}</span>` +
      `<span class="qitem__body">` +
        `<span class="qitem__title">${titleHtml(t)}</span>` +
        `<span class="qitem__artist">${t.artist || ''}${playable(t) ? '' : ' · no video id'}</span>` +
      `</span>`;
    if (playable(t)) {
      b.addEventListener('click', () => { state.index = i; loadCurrent(true); });
    }
    li.appendChild(b);
    list.appendChild(li);
  });
}

/* Walks in `dir` until it lands on a track that has a video ID, so gaps in
   the data are invisible rather than dead-ending playback. */
function step(dir) {
  if (!anyPlayable()) return false;
  let i = state.index;
  for (let n = 0; n < state.queue.length; n++) {
    i = (i + dir + state.queue.length) % state.queue.length;
    if (playable(state.queue[i])) { state.index = i; return true; }
  }
  return false;
}

/* ── YouTube ──────────────────────────────────────────────────────────── */

function bootYouTube() {
  const tag = document.createElement('script');
  tag.src = 'https://www.youtube.com/iframe_api';
  document.head.appendChild(tag);
}

window.onYouTubeIframeAPIReady = function () {
  yt = new YT.Player('ytplayer', {
    height: '1', width: '1',
    playerVars: { autoplay: 0, controls: 0, disablekb: 1, playsinline: 1, rel: 0 },
    events: {
      onReady: () => { state.ready = true; if (state.entered) loadCurrent(true); },
      onStateChange: onYtState,
      onError: () => { if (state.playing) { if (step(1)) loadCurrent(true); } },
    },
  });
};

function onYtState(e) {
  if (e.data === YT.PlayerState.ENDED) {
    if (step(1)) loadCurrent(true); else setPlaying(false);
    return;
  }
  if (e.data === YT.PlayerState.PLAYING) setPlaying(true);
  if (e.data === YT.PlayerState.PAUSED) setPlaying(false);
}

function loadCurrent(autoplay) {
  if (!state.ready || !yt) return;
  const t = state.queue[state.index];
  if (!playable(t)) { if (!step(1)) return; }

  const cur = state.queue[state.index];
  renderTrack();
  autoplay ? yt.loadVideoById(cur.yt) : yt.cueVideoById(cur.yt);
}

function setPlaying(on) {
  state.playing = on;
  $('playBtn').textContent = on ? '❚❚' : '▶';
  $('playBtn').setAttribute('aria-label', on ? 'Pause' : 'Play');
  $('status').textContent = on ? 'चालू आहे · live' : 'थांबलं आहे';
  $('status').classList.toggle('is-live', on);
  if (window.ambience) window.ambience.duck(on);
}

function togglePlay() {
  if (!state.ready || !yt || !anyPlayable()) return;
  state.playing ? yt.pauseVideo() : yt.playVideo();
}

/* ── Seek bar ─────────────────────────────────────────────────────────── */

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

/* ── Lyrics ───────────────────────────────────────────────────────────── */

async function loadLyrics(t) {
  $('lyricsTitle').innerHTML = titleHtml(t);
  $('lyricsBody').textContent = 'उघडत आहे…';
  try {
    const res = await fetch(`content/lyrics/${t.lyrics}`);
    if (!res.ok) throw new Error(res.status);
    $('lyricsBody').textContent = (await res.text()).trim();
  } catch (err) {
    /* Opening index.html straight off disk trips this — fetch() cannot read
       local files. Serving the folder over http fixes it. */
    $('lyricsBody').textContent =
      'गीत मिळालं नाही.\n\nLyrics could not be loaded. If you opened this file '
      + 'directly from disk, run a local server instead:\n\n  python3 -m http.server\n\n'
      + 'then visit http://localhost:8000';
  }
}

/* ── Panels ───────────────────────────────────────────────────────────── */

const PANELS = { lyrics: 'lyricsBtn', mixer: 'mixerBtn', queue: 'queueBtn' };

function openPanel(name) {
  Object.keys(PANELS).forEach(n => { if (n !== name) closePanel(n); });
  $(name).classList.add('is-open');
  $(PANELS[name]).classList.add('is-on');
}

function closePanel(name) {
  $(name).classList.remove('is-open');
  $(PANELS[name]).classList.remove('is-on');
}

function togglePanel(name) {
  $(name).classList.contains('is-open') ? closePanel(name) : openPanel(name);
}

/* ── Entry ────────────────────────────────────────────────────────────── */

function enter() {
  if (state.entered) return;
  state.entered = true;

  $('gate').classList.add('is-open');
  document.body.classList.remove('is-gated');

  /* This click is the only user gesture we are guaranteed, so both audio
     systems have to be unlocked here. */
  if (window.ambience) { window.ambience.init(); window.ambience.resume(); }
  if (state.ready) loadCurrent(true);
}

/* ── Wiring ───────────────────────────────────────────────────────────── */

function wire() {
  $('enterBtn').addEventListener('click', enter);
  $('playBtn').addEventListener('click', togglePlay);
  $('nextBtn').addEventListener('click', () => { if (step(1)) loadCurrent(true); });
  $('prevBtn').addEventListener('click', () => {
    /* Restart the track first, jump back only if already near the top. */
    if (state.ready && yt && yt.getCurrentTime() > 3) { yt.seekTo(0); return; }
    if (step(-1)) loadCurrent(true);
  });

  const seek = $('seek');
  const scrub = () => {
    const dur = state.ready && yt ? yt.getDuration() : 0;
    if (dur) yt.seekTo((seek.value / 1000) * dur, true);
    state.seeking = false;
  };
  seek.addEventListener('input', () => {
    state.seeking = true;
    seek.style.backgroundSize = `${seek.value / 10}% 100%`;
  });
  seek.addEventListener('change', scrub);

  $('lyricsBtn').addEventListener('click', () => {
    const t = state.queue[state.index];
    if (!t || !t.lyrics) return;
    if ($('lyrics').classList.contains('is-open')) { closePanel('lyrics'); return; }
    loadLyrics(t);
    openPanel('lyrics');
  });
  $('mixerBtn').addEventListener('click', () => togglePanel('mixer'));
  $('queueBtn').addEventListener('click', () => togglePanel('queue'));
  $('lyricsClose').addEventListener('click', () => closePanel('lyrics'));
  $('mixerClose').addEventListener('click', () => closePanel('mixer'));
  $('queueClose').addEventListener('click', () => closePanel('queue'));

  /* Ambience — each layer toggles and mixes on its own. */
  const amb = (btn, slider, name) => {
    $(btn).addEventListener('click', () => {
      if (!window.ambience) return;
      window.ambience.init();
      window.ambience.resume();
      const on = window.ambience.toggle(name);
      $(btn).setAttribute('aria-pressed', String(on));
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
    if (e.code === 'ArrowRight' && e.shiftKey) { if (step(1)) loadCurrent(true); }
    if (e.code === 'ArrowLeft' && e.shiftKey) { if (step(-1)) loadCurrent(true); }
    if (e.code === 'ArrowRight' && !e.shiftKey && state.ready && yt) yt.seekTo(yt.getCurrentTime() + 10, true);
    if (e.code === 'ArrowLeft' && !e.shiftKey && state.ready && yt) yt.seekTo(Math.max(0, yt.getCurrentTime() - 10), true);
    if (e.code === 'Escape') Object.keys(PANELS).forEach(closePanel);
    if (e.key === 'l' || e.key === 'L') $('lyricsBtn').click();
  });
}

/* ── Start ────────────────────────────────────────────────────────────── */

function boot() {
  document.body.classList.add('is-gated');
  buildScenes();
  wire();
  applyRotation(true);

  const { time } = istParts();
  $('gateNow').textContent = `${state.rotation.dev} · ${time} in India`;

  /* Cheap enough to just re-check every fifteen seconds; the rotation only
     actually changes four times a day. */
  setInterval(() => applyRotation(false), 15000);
  tickTimer = setInterval(tick, 250);

  bootYouTube();
}

document.addEventListener('DOMContentLoaded', boot);
