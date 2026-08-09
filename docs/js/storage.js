/* localStorage-backed settings, weak pool and stats (replaces weak_pool.py / srs.py progress). */
const Storage = {
  KEYS: { settings: 'vt_settings', weak: 'vt_weakpool', stats: 'vt_stats' },

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
};
