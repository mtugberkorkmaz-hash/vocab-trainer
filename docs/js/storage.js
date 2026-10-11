/* localStorage-backed settings, weak pool and stats (replaces weak_pool.py / srs.py progress). */
const Storage = {
  KEYS: { settings: 'vt_settings', weak: 'vt_weakpool', stats: 'vt_stats', wordStats: 'vt_wordstats' },

  getSettings() {
    try {
      return Object.assign({ showTranslation: true, theme: 'system' },
        JSON.parse(localStorage.getItem(this.KEYS.settings) || '{}'));
    } catch (e) {
      return { showTranslation: true, theme: 'system' };
    }
  },
  saveSettings(s) {
    localStorage.setItem(this.KEYS.settings, JSON.stringify(s));
  },

  getWeakPool() {
    try {
      return JSON.parse(localStorage.getItem(this.KEYS.weak) || '[]');
    } catch (e) {
      return [];
    }
  },
  saveWeakPool(pool) {
    localStorage.setItem(this.KEYS.weak, JSON.stringify(pool));
  },
  markUnknown(id) {
    const pool = this.getWeakPool();
    if (!pool.includes(id)) {
      pool.push(id);
      this.saveWeakPool(pool);
    }
  },
  markKnown(id) {
    const pool = this.getWeakPool();
    const next = pool.filter((x) => x !== id);
    if (next.length !== pool.length) this.saveWeakPool(next);
  },

  getStats() {
    try {
      return Object.assign({ totalCorrect: 0, totalWrong: 0, bestStreak: 0, sessions: 0 },
        JSON.parse(localStorage.getItem(this.KEYS.stats) || '{}'));
    } catch (e) {
      return { totalCorrect: 0, totalWrong: 0, bestStreak: 0, sessions: 0 };
    }
  },
  saveStats(s) {
    localStorage.setItem(this.KEYS.stats, JSON.stringify(s));
  },

  // Per-word answer counts: { id: { ok, bad, last } }.
  getWordStats() {
    try {
      return JSON.parse(localStorage.getItem(this.KEYS.wordStats) || '{}');
    } catch (e) {
      return {};
    }
  },
  // delta -1 undoes an earlier answer (flashcard answer changed after going back).
  // countTotals=false when the caller already updates the global totals (Hızlı Tur).
  recordAnswer(id, correct, delta, countTotals) {
    delta = delta || 1;
    const all = this.getWordStats();
    const s = all[id] || { ok: 0, bad: 0 };
    const field = correct ? 'ok' : 'bad';
    s[field] = Math.max(0, (s[field] || 0) + delta);
    s.last = Date.now();
    all[id] = s;
    localStorage.setItem(this.KEYS.wordStats, JSON.stringify(all));
    if (countTotals !== false) {
      const st = this.getStats();
      const key = correct ? 'totalCorrect' : 'totalWrong';
      st[key] = Math.max(0, (st[key] || 0) + delta);
      this.saveStats(st);
    }
  },
};
