/*
 * Ambience — ghanti and dhol-tasha, synthesised in the browser.
 *
 * No audio files. Nothing to host, nothing to license, nothing to fail to
 * load. Both layers are built from oscillators and shaped noise, and each
 * runs on its own gain node so it stays mixable against the music
 * independently — bell up, dhol off, or the reverse.
 */

class Ambience {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.layers = {};
    this.noiseBuf = null;
  }

  /* Must be called from a user gesture — browsers refuse to start an
     AudioContext otherwise. The entry gate is that gesture. */
  init() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;

    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 1;
    this.master.connect(this.ctx.destination);

    /* One buffer of white noise, reused for every tasha crack. */
    const len = this.ctx.sampleRate * 2;
    this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;

    this.layers.ghanti = this._makeLayer(0.45);
    this.layers.dhol = this._makeLayer(0.30);

    this._ghantiTimer = null;
    this._dholTimer = null;
    this._dholStep = 0;
    this._dholNext = 0;
  }

  _makeLayer(vol) {
    const gain = this.ctx.createGain();
    gain.gain.value = vol;
    gain.connect(this.master);
    return { gain, on: false, vol };
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  }

  setVolume(name, v) {
    const l = this.layers[name];
    if (!l) return;
    l.vol = v;
    l.gain.gain.setTargetAtTime(v, this.ctx.currentTime, 0.05);
  }

  toggle(name) {
    const l = this.layers[name];
    if (!l) return false;
    l.on = !l.on;
    if (name === 'ghanti') l.on ? this._startGhanti() : this._stopGhanti();
    if (name === 'dhol') l.on ? this._startDhol() : this._stopDhol();
    return l.on;
  }

  /* ── Ghanti ──────────────────────────────────────────────────────────
     A bell is inharmonic — its partials are not integer multiples, which is
     why it reads as metal rather than as a note. These ratios and their
     staggered decays are what separate a temple bell from a sine beep. */
  _strikeGhanti() {
    const t = this.ctx.currentTime;
    const base = 620 + Math.random() * 40;
    const partials = [
      { r: 1.00, g: 1.00, d: 3.4 },
      { r: 2.02, g: 0.62, d: 2.6 },
      { r: 2.98, g: 0.40, d: 1.9 },
      { r: 4.12, g: 0.26, d: 1.3 },
      { r: 5.43, g: 0.16, d: 0.9 },
      { r: 6.79, g: 0.09, d: 0.6 },
    ];

    const bus = this.ctx.createGain();
    bus.gain.value = 0.22;
    bus.connect(this.layers.ghanti.gain);

    partials.forEach(p => {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = base * p.r;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(p.g, t + 0.004);   /* strike transient */
      g.gain.exponentialRampToValueAtTime(0.0001, t + p.d);
      osc.connect(g).connect(bus);
      osc.start(t);
      osc.stop(t + p.d + 0.1);
    });

    /* The clapper hitting the metal, before the tone blooms. */
    const clack = this.ctx.createBufferSource();
    const cg = this.ctx.createGain();
    const cf = this.ctx.createBiquadFilter();
    clack.buffer = this.noiseBuf;
    cf.type = 'bandpass';
    cf.frequency.value = 3200;
    cg.gain.setValueAtTime(0.16, t);
    cg.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
    clack.connect(cf).connect(cg).connect(bus);
    clack.start(t);
    clack.stop(t + 0.1);
  }

  _startGhanti() {
    const loop = () => {
      if (!this.layers.ghanti.on) return;
      this._strikeGhanti();
      /* Irregular on purpose — a metronome would read as a machine. */
      this._ghantiTimer = setTimeout(loop, 18000 + Math.random() * 26000);
    };
    this._strikeGhanti();
    this._ghantiTimer = setTimeout(loop, 6000 + Math.random() * 8000);
  }

  _stopGhanti() { clearTimeout(this._ghantiTimer); }

  /* ── Dhol-tasha ──────────────────────────────────────────────────────
     Dhol carries the low pulse, tasha the crack on top. The pattern is a
     16-step cycle: 1 = dhol, 2 = tasha, 3 = both, 0 = rest. */
  _dholHit(t) {
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(190, t);
    osc.frequency.exponentialRampToValueAtTime(58, t + 0.16);
    g.gain.setValueAtTime(0.9, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
    osc.connect(g).connect(this.layers.dhol.gain);
    osc.start(t);
    osc.stop(t + 0.3);

    /* Skin slap over the tone, or it sounds like a synth kick. */
    const n = this.ctx.createBufferSource();
    const nf = this.ctx.createBiquadFilter();
    const ng = this.ctx.createGain();
    n.buffer = this.noiseBuf;
    nf.type = 'lowpass';
    nf.frequency.value = 1400;
    ng.gain.setValueAtTime(0.3, t);
    ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
    n.connect(nf).connect(ng).connect(this.layers.dhol.gain);
    n.start(t);
    n.stop(t + 0.06);
  }

  _tashaHit(t) {
    const n = this.ctx.createBufferSource();
    const bp = this.ctx.createBiquadFilter();
    const hp = this.ctx.createBiquadFilter();
    const g = this.ctx.createGain();
    n.buffer = this.noiseBuf;
    n.playbackRate.value = 1 + Math.random() * 0.3;
    bp.type = 'bandpass';
    bp.frequency.value = 2600;
    bp.Q.value = 1.4;
    hp.type = 'highpass';
    hp.frequency.value = 1200;
    g.gain.setValueAtTime(0.5, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
    n.connect(bp).connect(hp).connect(g).connect(this.layers.dhol.gain);
    n.start(t);
    n.stop(t + 0.12);
  }

  _startDhol() {
    const PATTERN = [3, 0, 2, 0, 1, 0, 2, 2, 3, 0, 2, 0, 1, 2, 2, 2];
    const STEP = 60 / 112 / 2;          /* ~112 BPM, eighth notes */
    this._dholStep = 0;
    this._dholNext = this.ctx.currentTime + 0.05;

    /* Lookahead scheduler: setInterval is too jittery to place hits on, so
       it only queues them and the audio clock does the timing. */
    const tick = () => {
      if (!this.layers.dhol.on) return;
      while (this._dholNext < this.ctx.currentTime + 0.2) {
        const hit = PATTERN[this._dholStep % PATTERN.length];
        if (hit === 1 || hit === 3) this._dholHit(this._dholNext);
        if (hit === 2 || hit === 3) this._tashaHit(this._dholNext);
        this._dholNext += STEP;
        this._dholStep++;
      }
    };
    tick();
    this._dholTimer = setInterval(tick, 60);
  }

  _stopDhol() { clearInterval(this._dholTimer); }

  /* Ducked while a track plays so ambience sits under the music. */
  duck(on) {
    if (!this.ctx) return;
    this.master.gain.setTargetAtTime(on ? 0.42 : 1, this.ctx.currentTime, 0.4);
  }
}

window.ambience = new Ambience();
