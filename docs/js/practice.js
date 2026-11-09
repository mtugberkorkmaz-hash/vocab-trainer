/* "Genel Tekrar & Test" + Gramer Merkezi.
 * Builds 40-question unit tests from the lesson words (translation MCQ,
 * fill-in-the-blank, sentence building, matching) plus grammar questions
 * from data/grammar.json and review.json's typed quiz. A test is one long
 * scrolling page: answers colour instantly, a sticky bar shows the score,
 * and the answer key can be opened/closed. Test content is deterministic
 * per unit + test number (seeded), option order is re-shuffled on reset. */

const PRACTICE_TESTS_PER_UNIT = 4;
const PRACTICE_QUOTA = { tr: 10, en: 5, fill: 9, scr: 5, match: 4, gram: 7 };
const PRACTICE_SEC = {
  A: 'Kelime çevirisi',
  B: 'Boşluk doldurma',
  C: 'Dağınık cümleyi topla',
  D: 'Eşleştirme',
  E: 'Gramer',
};

/* ---------- seeded helpers ---------- */
function pHash(s) { let x = 2166136261; for (let i = 0; i < s.length; i++) { x ^= s.charCodeAt(i); x = Math.imul(x, 16777619); } return x >>> 0; }
function pRng(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0; let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function pShuffle(arr, r) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const x = a[i]; a[i] = a[j]; a[j] = x; } return a; }
const BLANK = '<span class="p-blank"></span>';

/* ---------- units / topics ---------- */
function lessonUnit(l) { const m = /^(\d)[A-Z]$/.exec(l.code || ''); return m ? +m[1] : 1; }
function practiceUnits() {
  const map = {};
  Data.lessons.forEach((l) => { const u = lessonUnit(l); (map[u] = map[u] || []).push(l); });
  return Object.keys(map).map(Number).sort((a, b) => a - b).map((n) => ({ n, lessons: map[n] }));
}
function unitSub(u) { return u.lessons.map((l) => l.code).join(' · '); }
function unitWords(u) {
  const out = [];
  u.lessons.forEach((l) => (l.words || []).forEach((w) => out.push(Object.assign({ lessonId: l.id, category: 'lesson:' + l.id }, w))));
  return out;
}
function findTopic(key) { return Data.grammar.topics.find((t) => t.key === key); }
function topicGrammar(t) {
  if (t.grammar) return t.grammar;
  const l = t.lesson && Data.findLesson(t.lesson);
  return l && l.grammar;
}
function bankItem(b) {
  return { id: b.id, type: 'mcq', sec: 'E', prompt: escapeHtml(b.q).replace('___', BLANK), o: b.o, e: b.e };
}
function typedItems(filter) {
  return Data.review.quiz.filter(filter).map((q) => ({ id: q.id, type: 'typed', sec: 'E', prompt: escapeHtml(q.question), a: q.answers }));
}
function quizTopicKey(q) { return Data.grammar.quizTopics[q.topic] || null; }
function quizUnit(q) {
  const k = quizTopicKey(q);
  if (k) { const t = findTopic(k); return t ? t.units : []; }
  const m = /(\d)[A-D]/.exec(q.topic || ''); return m ? [+m[1]] : [];
}

/* ---------- question pools ---------- */
function unitPools(u) {
  const r = pRng(pHash('pool' + u.n));
  const words = pShuffle(unitWords(u), r);
  const P = { tr: [], en: [], fill: [], scr: [], match: [], gram: [] };
  const nWords = (t) => t.split(/\s+/).length;
  function distractors(w, field) {
    const others = words.filter((x) => x.id !== w.id && x[field] !== w[field]);
    const same = others.filter((x) => nWords(x.term) === nWords(w.term));
    const pool = pShuffle(same.length >= 6 ? same : others, r);
    const out = []; const seen = new Set([w[field]]);
    for (const x of pool) { if (seen.has(x[field])) continue; seen.add(x[field]); out.push(x); if (out.length === 3) break; }
    return out;
  }
  words.forEach((w) => {
    const d = distractors(w, 'translation');
    if (d.length === 3) {
      P.tr.push({ id: 'tr:' + w.id, type: 'mcq', sec: 'A', word: w, prompt: `<b>${escapeHtml(w.term)}</b> ne demek?`, o: [w.translation].concat(d.map((x) => x.translation)), e: w.sentences[0] });
      P.en.push({ id: 'en:' + w.id, type: 'mcq', sec: 'A', word: w, prompt: `“${escapeHtml(w.translation)}” — İngilizcesi hangisi?`, o: [w.term].concat(d.map((x) => x.term)), e: w.sentences[0] });
    }
    const order = pShuffle(w.sentences.map((_, i) => i), r);
    for (const i of order) {
      const b = buildBlank(w.term, w.sentences[i]);
      if (b.endsWith(' (_____)') || b.indexOf('_____') < 0) continue;
      const d2 = distractors(w, 'term');
      if (d2.length === 3) {
        P.fill.push({ id: 'fi:' + w.id, type: 'mcq', sec: 'B', word: w, prompt: escapeHtml(b).replace('_____', BLANK), o: [w.term].concat(d2.map((x) => x.term)), e: w.translations ? w.translations[i] : '' });
      }
      break;
    }
    for (const i of order) {
      const n = nWords(w.sentences[i]);
      if (n >= 5 && n <= 12) { P.scr.push({ id: 'sc:' + w.id, type: 'scr', sec: 'C', word: w, sentence: w.sentences[i], tr: w.translations ? w.translations[i] : '' }); break; }
    }
  });
  for (let i = 0; i + 5 <= words.length; i += 5) {
    P.match.push({ id: 'mt:' + i, type: 'match', sec: 'D', pairs: words.slice(i, i + 5).map((w) => [w.term, w.translation]) });
  }
  const keys = Data.grammar.topics.filter((t) => t.units.includes(u.n)).map((t) => t.key);
  Data.grammar.bank.filter((b) => keys.includes(b.topic)).forEach((b) => P.gram.push(bankItem(b)));
  P.gram = P.gram.concat(typedItems((q) => quizUnit(q).includes(u.n)));
  P.gram = pShuffle(P.gram, r);
  return P;
}

function buildUnitTest(u, t) {
  const P = unitPools(u);
  const chosen = []; const used = new Set();
  Object.keys(PRACTICE_QUOTA).forEach((k) => {
    const arr = P[k]; const q = PRACTICE_QUOTA[k]; const n = arr.length;
    let c = 0;
    for (let i = 0; n && c < q && i < n; i++) {
      const x = arr[(t * q + i) % n];
      if (used.has(x.id)) continue; used.add(x.id); chosen.push(x); c++;
    }
  });
  if (chosen.length < 40) {
    const rest = [].concat(P.gram, P.fill, P.tr, P.en, P.scr).filter((x) => !used.has(x.id));
    for (const x of pShuffle(rest, pRng(pHash('pad' + u.n + t)))) { if (chosen.length >= 40) break; used.add(x.id); chosen.push(x); }
  }
  chosen.sort((a, b) => a.sec.localeCompare(b.sec));
  return chosen.slice(0, 40);
}

function buildGrammarTest(kind) {
  if (kind === 'err') {
    return pShuffle(Data.review.corrections, pRng(pHash('err'))).map((c) => ({
      id: c.id, type: 'reveal', sec: 'E',
      prompt: `<span class="p-tag">${escapeHtml(c.page || c.id)}</span> Hatalı cümleyi düzelt:<br><b>${escapeHtml(c.wrong)}</b>`,
      a: c.correct, e: c.rule_tr || c.rule,
    }));
  }
  if (kind.startsWith('mix:')) {
    const k = +kind.slice(4);
    const all = Data.grammar.bank.map(bankItem).concat(typedItems((q) => !!quizTopicKey(q)));
    const sh = pShuffle(all, pRng(pHash('gmix')));
    const out = []; const seen = new Set();
    for (let i = 0; i < 40 && i < sh.length; i++) { const x = sh[(k * 40 + i) % sh.length]; if (!seen.has(x.id)) { seen.add(x.id); out.push(x); } }
    return out;
  }
  const key = kind.slice(6); // topic:KEY
  return Data.grammar.bank.filter((b) => b.topic === key).map(bankItem)
    .concat(typedItems((q) => quizTopicKey(q) === key));
}

function practiceTitle(kind) {
  if (kind.startsWith('unit:')) { const p = kind.split(':'); return `Unit ${p[1]} · Test ${+p[2] + 1}`; }
  if (kind.startsWith('mix:')) return `Karma Gramer ${+kind.slice(4) + 1}`;
  if (kind === 'err') return 'Hata Düzeltme';
  const t = findTopic(kind.slice(6)); return t ? t.title : 'Konu Testi';
}

/* ---------- best scores ---------- */
function getBest() { try { return JSON.parse(localStorage.getItem('vt_practice_best') || '{}'); } catch (e) { return {}; } }
function saveBest(kind, pct) {
  try { const b = getBest(); if (!(b[kind] >= pct)) { b[kind] = pct; localStorage.setItem('vt_practice_best', JSON.stringify(b)); } } catch (e) { /* ignore */ }
}
function bestBadge(kind) { const b = getBest()[kind]; return b == null ? '' : `<span class="p-best ${b >= 85 ? 'hi' : b >= 60 ? 'mid' : 'lo'}">%${b}</span>`; }

/* ---------- hub screens ---------- */
function renderPracticeHub() {
  setHeader('Genel Tekrar & Test');
  const units = practiceUnits();
  const unitCards = units.map((u) => {
    const nW = unitWords(u).length;
    const tests = Array.from({ length: PRACTICE_TESTS_PER_UNIT }, (_, t) =>
      `<button class="p-testbtn" data-kind="unit:${u.n}:${t}"><span>Test ${t + 1}</span>${bestBadge(`unit:${u.n}:${t}`)}</button>`).join('');
    return `<div class="p-unit">
      <div class="p-unit-head"><div><div class="p-unit-title">Unit ${u.n}</div><div class="p-unit-sub">${escapeHtml(unitSub(u))} · ${nW} kelime</div></div></div>
      <div class="p-tests">${tests}</div>
    </div>`;
  }).join('');
  const mix = [0, 1, 2].map((k) => `<button class="p-testbtn" data-kind="mix:${k}"><span>Karma ${k + 1}</span>${bestBadge('mix:' + k)}</button>`).join('');
  mount(`
    <p class="lead">Her test 40 soru: kelime çevirisi, boşluk doldurma, cümle kurma, eşleştirme ve gramer. Cevaplar anında renklenir; cevap anahtarını üst çubuktan açıp kapatabilirsin.</p>
    <div class="section-title">Ünite testleri</div>
    ${unitCards}
    <div class="section-title">Gramer</div>
    <div class="p-unit">
      <div class="p-unit-head"><div><div class="p-unit-title">Karma gramer testleri</div><div class="p-unit-sub">Tüm konulardan 40'ar soru</div></div></div>
      <div class="p-tests p-tests-3">${mix}</div>
    </div>
    <div class="list-group">
      ${listRow('grammar', 'sparkle', 'Gramer Merkezi', `${Data.grammar.topics.length} konu özeti + konu testleri`)}
      ${listRow('err', 'pencil', 'Hata Düzeltme Testi', `${Data.review.corrections.length} hatalı cümle`)}
    </div>
  `);
  $all('.p-testbtn').forEach((b) => b.addEventListener('click', () => Router.push('practiceTest', { kind: b.dataset.kind })));
  $all('.list-row').forEach((b) => b.addEventListener('click', () => {
    if (b.dataset.key === 'grammar') Router.push('grammarHub');
    else Router.push('practiceTest', { kind: 'err' });
  }));
}

function renderGrammarHub() {
  setHeader('Gramer Merkezi');
  const byUnit = {};
  Data.grammar.topics.forEach((t) => { const u = t.units[0]; (byUnit[u] = byUnit[u] || []).push(t); });
  const groups = Object.keys(byUnit).sort().map((u) => `
    <div class="section-title" lang="en">Unit ${u}</div>
    <div class="list-group">${byUnit[u].map((t) => {
      const g = topicGrammar(t);
      const n = buildGrammarTest('topic:' + t.key).length;
      return listRow('topic:' + t.key, null, t.title, g ? g.formula : '', `${n} soru`, bestBadge('topic:' + t.key));
    }).join('')}</div>`).join('');
  const mix = [0, 1, 2].map((k) => `<button class="p-testbtn" data-kind="mix:${k}"><span>Karma ${k + 1}</span>${bestBadge('mix:' + k)}</button>`).join('');
  mount(`
    <div class="list-group">
      ${listRow('err', 'pencil', 'Hata Düzeltme Testi', `${Data.review.corrections.length} hatalı cümle — tek sayfada, cevap anahtarlı`)}
      ${listRow('cards', 'book', 'Hata Kartları', 'Tek tek: oku, düzelt, doğrusunu aç')}
      ${listRow('quiz', 'target', 'Yazarak Gramer Quiz', `${Data.review.quiz.length} soru — cevabı yaz`)}
    </div>
    <div class="section-title">Karma testler (40 soru)</div>
    <div class="p-tests p-tests-3" style="margin-bottom:6px">${mix}</div>
    ${groups}
  `);
  $all('.p-testbtn').forEach((b) => b.addEventListener('click', () => Router.push('practiceTest', { kind: b.dataset.kind })));
  $all('.list-row').forEach((b) => b.addEventListener('click', () => {
    const k = b.dataset.key;
    if (k === 'err') Router.push('practiceTest', { kind: 'err' });
    else if (k === 'cards') startCorrections();
    else if (k === 'quiz') startReviewQuiz();
    else Router.push('grammarTopic', { key: k.slice(6) });
  }));
}

function grammarCardHtml(g, label) {
  if (!g) return '';
  return `<div class="g-card">
    ${label ? `<div class="g-label">${escapeHtml(label)}</div>` : ''}
    <div class="g-title">${escapeHtml(g.title)}</div>
    ${g.formula ? `<div class="g-formula">${escapeHtml(g.formula)}</div>` : ''}
    ${g.note ? `<p class="g-note">${escapeHtml(g.note)}</p>` : ''}
    ${(g.examples || []).length ? `<ul class="g-ex">${g.examples.map((e) => `<li>${escapeHtml(e)}</li>`).join('')}</ul>` : ''}
  </div>`;
}

function renderGrammarTopic(params) {
  const t = findTopic(params.key);
  setHeader(t.title);
  const l2 = t.lesson2 && Data.findLesson(t.lesson2);
  const l = t.lesson && Data.findLesson(t.lesson);
  const n = buildGrammarTest('topic:' + t.key).length;
  mount(`
    ${grammarCardHtml(topicGrammar(t), l ? `Ders ${l.code}` : 'Ön çalışma')}
    ${l2 ? grammarCardHtml(l2.grammar, `Ek · Ders ${l2.code}`) : ''}
    <div class="tip"><b>Hatırlatma:</b> ${escapeHtml(t.tip)}</div>
    <button id="btn-go" class="btn btn-primary btn-block">${icon('target', 18)} Konu testini çöz (${n} soru) ${bestBadge('topic:' + t.key)}</button>
    ${l ? `<button id="btn-lesson" class="btn btn-outline btn-block" style="margin-top:10px">${icon('book', 18)} Ders ${escapeHtml(l.code)} kelimeleri</button>` : ''}
  `);
  $('#btn-go').addEventListener('click', () => Router.push('practiceTest', { kind: 'topic:' + t.key }));
  if (l) $('#btn-lesson').addEventListener('click', () => Router.push('lessonDetail', { id: l.id }));
}

/* ---------- the test page ---------- */
function renderPracticeTest(params) {
  const kind = params.kind;
  setHeader(practiceTitle(kind));
  let items;
  if (kind.startsWith('unit:')) {
    const p = kind.split(':'); const u = practiceUnits().find((x) => x.n === +p[1]);
    items = u ? buildUnitTest(u, +p[2]) : [];
  } else items = buildGrammarTest(kind);

  const st = { score: 0, done: 0, total: items.length, wrongWords: [] };
  mount(`
    <div class="p-bar">
      <div class="p-bar-score"><span id="p-done">0</span>/${items.length} <small>cevaplandı</small> · <b id="p-score">0</b> <small>doğru</small></div>
      <div class="p-bar-btns">
        <button id="p-key" class="p-chip">Cevap anahtarı</button>
        <button id="p-fin" class="p-chip p-chip-acc">Bitir</button>
      </div>
      <div class="p-bar-progress"><i id="p-prog"></i></div>
    </div>
    <div id="p-res"></div>
    <div id="p-keybox" class="p-key" hidden></div>
    <div id="p-body"></div>
    <button id="p-fin2" class="btn btn-primary btn-block" style="margin-top:18px">Sonucu göster</button>
    <button id="p-reset" class="btn btn-outline btn-block" style="margin-top:10px">Sıfırla ve baştan çöz</button>
  `);
  const body = $('#p-body');
  const r = pRng((Date.now() >>> 0) ^ pHash(kind));
  const keys = [];
  let lastSec = '';
  function upd() {
    $('#p-done').textContent = st.done;
    $('#p-score').textContent = Math.round(st.score * 10) / 10;
    $('#p-prog').style.width = (st.total ? (100 * st.done) / st.total : 0) + '%';
    if (st.done === st.total && st.total) finish();
  }
  function mark(q, s, word) {
    if (q.classList.contains('done')) return false;
    q.classList.add('done', s >= 1 ? 'ok' : 'bad');
    st.done++; st.score += s;
    if (word) { Storage.recordAnswer(word.id, s >= 1); if (s < 1) { Storage.markUnknown(word.id); st.wrongWords.push(word); } }
    upd();
    return true;
  }
  function finish() {
    const pct = st.total ? Math.round((100 * st.score) / st.total) : 0;
    saveBest(kind, pct);
    const msg = pct >= 85 ? 'Harika! Bu konu oturmuş.' : pct >= 60 ? 'İyi gidiyorsun; yanlışlarını tekrar et.' : 'Önce özeti tekrar oku, sonra testi sıfırlayıp yeniden çöz.';
    $('#p-res').innerHTML = `<div class="p-result">
      <div class="p-result-num">%${pct}</div>
      <div><b>${Math.round(st.score * 10) / 10} / ${st.total}</b> · cevaplanan ${st.done}<br><span>${msg}</span></div>
      ${st.wrongWords.length ? `<button id="p-drill" class="btn btn-primary btn-block" style="margin-top:12px">${icon('book', 18)} Yanlış kelimeleri kartla çalış (${st.wrongWords.length})</button>` : ''}
    </div>`;
    if (st.wrongWords.length) $('#p-drill').addEventListener('click', () => startFlashcards('lessons', 'words', st.wrongWords.slice()));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  items.forEach((it, idx) => {
    if (it.sec !== lastSec && kind.startsWith('unit:')) { lastSec = it.sec; body.insertAdjacentHTML('beforeend', `<div class="section-title">${PRACTICE_SEC[it.sec]}</div>`); }
    const q = document.createElement('div');
    q.className = 'p-q';
    q.innerHTML = `<div class="p-q-head"><span class="p-n">${idx + 1}</span><div class="p-prompt">${it.prompt || ''}</div></div>`;
    body.appendChild(q);
    keys.push(buildQuestion(q, it, r, mark));
  });
  $('#p-keybox').innerHTML = `<div class="p-key-title">Cevap anahtarı</div><ol>${keys.map((k) => `<li>${k}</li>`).join('')}</ol>`;
  $('#p-key').addEventListener('click', () => {
    const kb = $('#p-keybox'); kb.hidden = !kb.hidden;
    $('#p-key').classList.toggle('on', !kb.hidden);
    if (!kb.hidden) kb.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  $('#p-fin').addEventListener('click', finish);
  $('#p-fin2').addEventListener('click', finish);
  $('#p-reset').addEventListener('click', () => Router.replace('practiceTest', { kind }));
  upd();
}

function addFeedback(q, html, ok) {
  q.insertAdjacentHTML('beforeend', `<div class="p-fb ${ok == null ? '' : ok ? 'ok' : 'bad'}">${html}</div>`);
}

function buildQuestion(q, it, r, mark) {
  if (it.type === 'mcq') {
    const correct = it.o[0];
    const box = document.createElement('div'); box.className = 'option-list p-opts';
    pShuffle(it.o, r).forEach((o, i) => {
      const b = document.createElement('button');
      b.className = 'option'; b.type = 'button';
      b.innerHTML = `<span class="letter">${'ABCD'[i]}</span><span class="opt-text">${escapeHtml(o)}</span>`;
      b.addEventListener('click', () => {
        if (q.classList.contains('done')) return;
        const ok = o === correct;
        Array.prototype.forEach.call(box.children, (x) => {
          x.setAttribute('disabled', '');
          if (x === b) x.classList.add(ok ? 'correct' : 'wrong');
          else if (x.querySelector('.opt-text').textContent === correct) x.classList.add('correct');
          else x.classList.add('dim');
        });
        mark(q, ok ? 1 : 0, it.word);
        if (it.e) addFeedback(q, escapeHtml(it.e));
      });
      box.appendChild(b);
    });
    q.appendChild(box);
    return `<b>${escapeHtml(correct)}</b>`;
  }
  if (it.type === 'typed') {
    q.insertAdjacentHTML('beforeend', `<div class="p-typed"><input class="fillblank-input" type="text" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="Cevabı yaz"><button class="btn btn-primary" type="button">Kontrol</button></div>`);
    const inp = q.querySelector('input'); const btn = q.querySelector('.p-typed .btn');
    const norm = (x) => ' ' + String(x).toLowerCase().replace(/[‘’`]/g, "'").replace(/[^a-z0-9' ]/g, ' ').replace(/\s+/g, ' ').trim() + ' ';
    const go = () => {
      if (q.classList.contains('done')) return;
      const u = norm(inp.value);
      const ok = u.trim() !== '' && it.a.some((a) => { const n = norm(a); return u === n || u.includes(n); });
      inp.disabled = true; btn.disabled = true;
      mark(q, ok ? 1 : 0);
      addFeedback(q, `${ok ? 'Doğru.' : 'Doğru cevap:'} <b>${escapeHtml(it.a[0])}</b>${it.a.length > 1 ? `<br><small>Kabul: ${it.a.slice(1).map(escapeHtml).join(' · ')}</small>` : ''}`, ok);
    };
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
    btn.addEventListener('click', go);
    return `<b>${escapeHtml(it.a[0])}</b>`;
  }
  if (it.type === 'reveal') {
    q.insertAdjacentHTML('beforeend', `<button class="btn btn-outline btn-block p-reveal" type="button">Doğrusunu göster</button>`);
    const show = q.querySelector('.p-reveal');
    show.addEventListener('click', () => {
      show.remove();
      addFeedback(q, `<b>${escapeHtml(it.a)}</b>${it.e ? `<br><small>${escapeHtml(it.e)}</small>` : ''}`, true);
      q.insertAdjacentHTML('beforeend', `<div class="btn-row" style="margin-top:10px"><button class="btn btn-danger" type="button">${icon('close', 16)} Bilemedim</button><button class="btn btn-success" type="button">${icon('check', 16)} Bildim</button></div>`);
      const row = q.lastElementChild;
      row.children[0].addEventListener('click', () => { mark(q, 0); row.remove(); });
      row.children[1].addEventListener('click', () => { mark(q, 1); row.remove(); });
    });
    return `<b>${escapeHtml(it.a)}</b>`;
  }
  if (it.type === 'scr') {
    const toks = it.sentence.split(/\s+/);
    const disp = toks.map((t, i) => (i === 0 && !/^I($|['’])/.test(t) ? t.charAt(0).toLowerCase() + t.slice(1) : t));
    q.insertAdjacentHTML('beforeend', `${it.tr ? `<div class="p-hint">${escapeHtml(it.tr)}</div>` : ''}<div class="p-built"></div><div class="p-pool"></div>`);
    const built = q.querySelector('.p-built'); const pool = q.querySelector('.p-pool');
    const chosen = [];
    const nf = (s) => s.toLowerCase().replace(/[.,!?;:"“”]/g, '').replace(/\s+/g, ' ').trim();
    pShuffle(disp.map((t, i) => ({ t, i })), r).forEach((o) => {
      const c = document.createElement('button'); c.type = 'button'; c.className = 'p-tok'; c.textContent = o.t;
      c.addEventListener('click', () => {
        if (q.classList.contains('done')) return;
        if (c.parentNode === pool) {
          built.appendChild(c); chosen.push(o);
          if (chosen.length === disp.length) {
            const ok = nf(chosen.map((x) => x.t).join(' ')) === nf(disp.join(' '));
            built.classList.add(ok ? 'ok' : 'bad');
            mark(q, ok ? 1 : 0, it.word);
            if (!ok) addFeedback(q, `Doğru cümle: <b>${escapeHtml(it.sentence)}</b>`, false);
          }
        } else { pool.appendChild(c); chosen.splice(chosen.indexOf(o), 1); }
      });
      pool.appendChild(c);
    });
    return `<b>${escapeHtml(it.sentence)}</b>`;
  }
  if (it.type === 'match') {
    q.querySelector('.p-prompt').innerHTML = 'Eşleştir: önce soldan, sonra sağdan seç.';
    q.insertAdjacentHTML('beforeend', '<div class="p-match"><div></div><div></div></div>');
    const [lc, rc] = q.querySelectorAll('.p-match > div');
    let sel = null; let mist = 0; let left = it.pairs.length;
    const lb = it.pairs.map((p, i) => {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'p-m'; b.textContent = p[0];
      b.addEventListener('click', () => { if (b.classList.contains('lock') || q.classList.contains('done')) return; lb.forEach((x) => x.classList.remove('sel')); b.classList.add('sel'); sel = i; });
      lc.appendChild(b); return b;
    });
    pShuffle(it.pairs.map((p, i) => ({ t: p[1], i })), r).forEach((o) => {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'p-m'; b.textContent = o.t;
      b.addEventListener('click', () => {
        if (sel == null || b.classList.contains('lock') || q.classList.contains('done')) return;
        if (sel === o.i) {
          lb[sel].classList.remove('sel'); lb[sel].classList.add('lock'); b.classList.add('lock'); sel = null; left--;
          if (!left) { mark(q, Math.max(0, 1 - mist / it.pairs.length)); addFeedback(q, mist ? `${mist} yanlış deneme` : 'Hatasız!', !mist); }
        } else { mist++; b.classList.add('flash'); setTimeout(() => b.classList.remove('flash'), 450); }
      });
      rc.appendChild(b);
    });
    return it.pairs.map((p) => `<b>${escapeHtml(p[0])}</b> = ${escapeHtml(p[1])}`).join('<br>');
  }
  return '';
}

/* shared list-row markup (menu + hubs) */
function listRow(key, iconName, title, sub, count, extra) {
  return `<button class="list-row" data-key="${escapeHtml(key)}" type="button">
    ${iconName ? `<span class="lr-icon">${icon(iconName, 20)}</span>` : ''}
    <span class="lr-text"><span class="lr-title">${escapeHtml(title)}</span>${sub ? `<span class="lr-sub">${escapeHtml(sub)}</span>` : ''}</span>
    ${extra || ''}${count != null && count !== '' ? `<span class="count">${escapeHtml(String(count))}</span>` : ''}
    <span class="chev">${icon('chevronRight', 16)}</span>
  </button>`;
}
