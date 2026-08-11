/*
 * Live listener count, over Firebase Realtime Database.
 *
 * The whole module is a no-op unless CONFIG.firebase is filled in, and it
 * never renders a number it did not get from the server — an invented count
 * of real people is the one thing this feature must not do.
 *
 * Uses the REST endpoint plus a heartbeat rather than the Firebase SDK: no
 * bundle, no build step, and nothing else on the page depends on it loading.
 * Each visitor writes a timestamped key and refreshes it every 20s; the count
 * is everyone whose stamp is under a minute old. That tolerates closed tabs
 * and lost connections without needing onDisconnect().
 */

class Presence {
  constructor(cfg, onCount) {
    this.cfg = cfg;
    this.onCount = onCount;
    this.id = Math.random().toString(36).slice(2, 12);
    this.timer = null;
    this.alive = false;
  }

  get base() {
    return `${this.cfg.databaseURL.replace(/\/$/, '')}/presence`;
  }

  get key() {
    return this.cfg.apiKey ? `?auth=${encodeURIComponent(this.cfg.apiKey)}` : '';
  }

  start() {
    if (!this.cfg || !this.cfg.databaseURL) return;
    this.alive = true;
    this._beat();
    this.timer = setInterval(() => this._beat(), 20000);

    /* A clean exit removes the entry immediately; a crash just ages out. */
    window.addEventListener('pagehide', () => this._leave());
  }

  async _beat() {
    if (!this.alive) return;
    try {
      await fetch(`${this.base}/${this.id}.json${this.key}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(Date.now()),
      });
      await this._count();
    } catch (err) {
      /* Offline, blocked, or misconfigured — stay silent and keep the counter
         hidden rather than showing a stale or wrong number. */
      this.onCount(null);
    }
  }

  async _count() {
    const res = await fetch(`${this.base}.json${this.key}`);
    if (!res.ok) throw new Error(res.status);
    const all = await res.json();
    if (!all) { this.onCount(0); return; }

    const cutoff = Date.now() - 60000;
    const live = Object.values(all).filter(t => typeof t === 'number' && t > cutoff);
    this.onCount(live.length);

    /* Opportunistic cleanup so the node does not grow without bound. Only
       prunes entries well past expiry, and only occasionally. */
    if (Math.random() < 0.1) {
      const stale = Object.entries(all)
        .filter(([, t]) => typeof t !== 'number' || t < Date.now() - 300000)
        .slice(0, 20);
      stale.forEach(([k]) =>
        fetch(`${this.base}/${k}.json${this.key}`, { method: 'DELETE' }).catch(() => {}));
    }
  }

  _leave() {
    this.alive = false;
    clearInterval(this.timer);
    const url = `${this.base}/${this.id}.json${this.key}`;
    /* keepalive lets the request outlive the page being closed. */
    fetch(url, { method: 'DELETE', keepalive: true }).catch(() => {});
  }
}

window.Presence = Presence;
