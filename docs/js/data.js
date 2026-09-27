/* Loads and flattens the vocabulary bank (replaces data_loader.py). */
const Data = {
  words: [],
  patterns: [],
  meetings: [],
  lessons: [],
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
    // B2 course lessons: optional file, so the app still works if it's missing.
    this.lessons = [];
    try {
      const l = await fetch('data/lessons.json').then((r) => (r.ok ? r.json() : []));
      this.lessons = Array.isArray(l) ? l : [];
    } catch (e) {
      this.lessons = [];
    }
    this.lessons.forEach((lesson) => {
      (lesson.words || []).forEach((item) => {
        this.words.push(Object.assign({}, item, { category: 'lesson:' + lesson.id }));
      });
    });
    this.loaded = true;
  },

  byCategory(cat) {
    if (cat === 'weak') {
      const pool = Storage.getWeakPool();
      return this.words.filter((w) => pool.includes(w.id));
    }
    if (cat === 'mixed') return this.words.filter((w) => !w.category.startsWith('lesson:'));
    if (cat === 'lessons') return this.words.filter((w) => w.category.startsWith('lesson:'));
    return this.words.filter((w) => w.category === cat);
  },

  patternsByCategory(cat) {
    if (cat === 'weak') {
      const pool = Storage.getWeakPool();
      return this.patterns.filter((p) => pool.includes(p.id));
    }
    return this.patterns.slice();
  },

  findLesson(id) {
    return this.lessons.find((l) => l.id === id);
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
  specify: ['specify', 'specifies', 'specified', 'specifying'],
  comply: ['comply', 'complies', 'complied', 'complying'],
  apply: ['apply', 'applies', 'applied', 'applying'],
  qualify: ['qualify', 'qualifies', 'qualified', 'qualifying'],
  identify: ['identify', 'identifies', 'identified', 'identifying'],
  verify: ['verify', 'verifies', 'verified', 'verifying'],
  notify: ['notify', 'notifies', 'notified', 'notifying'],
  bathe: ['bathe', 'bathes', 'bathed', 'bathing'],
  write: ['write', 'writes', 'wrote', 'written', 'writing'],
};

// For terms like "finite element analysis (FEA)" or "bill of materials (BOM)",
// example sentences often use only the abbreviation. Matching the abbreviation
// too (not just the spelled-out phrase) keeps the blank meaningful in both cases.
function extractAbbreviation(term) {
  const m = term.match(/\(([A-Za-z0-9]{2,8})\)\s*$/);
  return m ? m[1] : null;
}

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
  let pattern = parts.join('\\s+');
  const abbr = extractAbbreviation(term);
  if (abbr) pattern = '(?:' + pattern + '|\\b' + reEscape(abbr) + '\\b)';
  try {
    return new RegExp(pattern, 'i');
  } catch (e) {
    return null;
  }
}

function buildBlank(term, sentence) {
  const re = buildTermRegex(term);
  const m = re && re.exec(sentence);
  if (m) return sentence.slice(0, m.index) + '_____' + sentence.slice(m.index + m[0].length);
  // Fallback: try each meaningful keyword (in order) and blank the first one
  // that actually appears in this sentence, so a blank always appears even
  // when the full phrase doesn't match verbatim.
  const core = term.replace(/^to\s+/i, '').replace(/^(?:get|be)\s+/i, '')
    .replace(/\s*\([^)]*\)/g, '').replace(/\.\.\.\??$/, '').replace(/\?$/, '').trim();
  const tokens = core.split(/\s+/)
    .filter((t) => !/^someone'?s?$/i.test(t) && !/^something$/i.test(t));
  const abbr = extractAbbreviation(term);
  const candidates = (abbr ? [abbr] : []).concat(tokens.length ? tokens : [term]);
  for (const tok of candidates) {
    const clean = tok.replace(/[^a-zA-Z'-]/g, '');
    if (!clean) continue;
    const kwRe = new RegExp(wordAltPattern(clean), 'i');
    const m2 = kwRe.exec(sentence);
    if (m2) return sentence.slice(0, m2.index) + '_____' + sentence.slice(m2.index + m2[0].length);
  }
  return sentence + ' (_____)';
}
