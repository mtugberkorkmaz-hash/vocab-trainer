/* Loads and flattens the vocabulary bank (replaces data_loader.py). */
const Data = {
  words: [],
  patterns: [],
  meetings: [],
  loaded: false,

  async load() {
    const [w, p, m] = await Promise.all([
      fetch('data/words.json').then((r) => r.json()),
      fetch('data/patterns.json').then((r) => r.json()),
      fetch('data/meetings.json').then((r) => r.json()),
    ]);
    this.words = [];
    Object.keys(w).forEach((category) => {
      w[category].forEach((item) => {
        this.words.push(Object.assign({}, item, { category }));
      });
    });
    this.patterns = p.map((item) => Object.assign({}, item, { category: 'patterns' }));
    this.meetings = m;
    this.loaded = true;
  },

  byCategory(cat) {
    if (cat === 'weak') {
      const pool = Storage.getWeakPool();
      return this.words.filter((w) => pool.includes(w.id));
    }
    if (cat === 'mixed') return this.words.slice();
    return this.words.filter((w) => w.category === cat);
  },

  patternsByCategory(cat) {
    if (cat === 'weak') {
      const pool = Storage.getWeakPool();
      return this.patterns.filter((p) => pool.includes(p.id));
    }
    return this.patterns.slice();
  },

  findMeeting(id) {
    return this.meetings.find((m) => m.id === id);
  },
};

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function sample(arr, n) {
  return shuffle(arr).slice(0, n);
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

/* ---------- Fill-in-the-blank matching ----------
 * Terms are dictionary-form idioms ("to give someone a hand") but example
 * sentences use inflected/substituted real usage ("gave my neighbor a
 * hand"). A naive literal substring match misses most of them, leaving the
 * sentence with no blank at all. This builds a forgiving regex: drops the
 * infinitive/copula prefix, tolerates common irregular verb forms, and
 * lets "someone/something" match whatever word(s) were actually used. */
const IRREGULAR_VERBS = {
  give: ['give', 'gives', 'gave', 'given', 'giving'],
  make: ['make', 'makes', 'made', 'making'],
  bring: ['bring', 'brings', 'brought', 'bringing'],
  get: ['get', 'gets', 'got', 'getting'],
  run: ['run', 'runs', 'ran', 'running'],
  figure: ['figure', 'figures', 'figured', 'figuring'],
  grab: ['grab', 'grabs', 'grabbed', 'grabbing'],
  push: ['push', 'pushes', 'pushed', 'pushing'],
  table: ['table', 'tables', 'tabled', 'tabling'],
  loop: ['loop', 'loops', 'looped', 'looping'],
  follow: ['follow', 'follows', 'followed', 'following'],
  touch: ['touch', 'touches', 'touched', 'touching'],
  circle: ['circle', 'circles', 'circled', 'circling'],
  clarify: ['clarify', 'clarifies', 'clarified', 'clarifying'],
  keep: ['keep', 'keeps', 'kept', 'keeping'],
};

function reEscape(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function wordAltPattern(word) {
  const forms = IRREGULAR_VERBS[word.toLowerCase()];
  if (forms) {
    // Longest form first so "gives"/"giving" aren't cut short by an earlier "give" match.
    const sorted = forms.slice().sort((a, b) => b.length - a.length);
    return '(?:' + sorted.join('|') + ')';
  }
  return reEscape(word) + '\\w*';
}

function buildTermRegex(term) {
  let core = term.replace(/^to\s+/i, '').replace(/^(?:get|be)\s+/i, '');
  core = core.replace(/\s*\([^)]*\)/g, '').replace(/\.\.\.\??$/, '').replace(/\?$/, '').trim();
  const parts = core.split(/\s+/).map((tok) => {
    const clean = tok.replace(/[^a-zA-Z'-]/g, '');
    if (!clean) return null;
    if (/^someone'?s?$/i.test(clean) || /^something$/i.test(clean)) {
      return "(?:[a-zA-Z']+(?:\\s+[a-zA-Z']+){0,2})";
    }
    return wordAltPattern(clean);
  }).filter(Boolean);
  if (!parts.length) return null;
  try {
    return new RegExp(parts.join('\\s+'), 'i');
  } catch (e) {
    return null;
  }
}

function buildBlank(term, sentence) {
  const re = buildTermRegex(term);
  const m = re && re.exec(sentence);
  if (m) return sentence.slice(0, m.index) + '_____' + sentence.slice(m.index + m[0].length);
  // Fallback: blank just the first meaningful keyword so a blank always appears.
  const core = term.replace(/^to\s+/i, '').replace(/^(?:get|be)\s+/i, '')
    .replace(/\s*\([^)]*\)/g, '').replace(/\.\.\.\??$/, '').replace(/\?$/, '').trim();
  const tokens = core.split(/\s+/);
  const firstTok = tokens.find((t) => !/^someone'?s?$/i.test(t) && !/^something$/i.test(t)) || tokens[0] || term;
  const clean = firstTok.replace(/[^a-zA-Z'-]/g, '');
  const kwRe = clean ? new RegExp(wordAltPattern(clean), 'i') : null;
  const m2 = kwRe && kwRe.exec(sentence);
  if (m2) return sentence.slice(0, m2.index) + '_____' + sentence.slice(m2.index + m2[0].length);
  return sentence + ' (_____)';
}
