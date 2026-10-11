/* All screen builders. Session state for the *currently active* mode lives
 * in the `session` object below; the Router only tracks which screen we're
 * on, not the full quiz state — going back always abandons the in-progress
 * activity and returns to the screen that started it (category list,
 * meeting list, patterns menu, or the main menu). */

const CATEGORY_LABELS = {
  engineering: 'Mühendislik & Boru Hattı',
  meeting: 'Toplantı İngilizcesi',
  daily: 'Günlük Hayat',
  mixed: 'Karışık (Hepsi)',
  weak: 'Zayıf Havuz',
  patterns: 'Günlük Kalıp',
  lessons: 'Tüm Dersler',
};

function catLabel(cat) {
  if (cat && cat.startsWith('lesson:')) {
    const l = Data.findLesson(cat.slice(7));
    return l ? `Ders ${l.code}: ${l.title}` : 'Ders';
  }
  return CATEGORY_LABELS[cat] || 'Kalıp';
}

const ROUNDS_PER_SESSION = 10;

let session = {};

/* ---------- DOM helpers ---------- */
function $(sel) { return document.querySelector(sel); }
function $all(sel) { return Array.prototype.slice.call(document.querySelectorAll(sel)); }
function mount(html) {
  document.getElementById('screen').innerHTML = html;
  window.scrollTo(0, 0);
  // Fill the progress bar of any session screen that shows a progress line.
  const pl = document.querySelector('.progress-line');
  if (pl && session.queue && session.queue.length) {
    pl.style.setProperty('--p', Math.min(100, ((session.index + 1) / session.queue.length) * 100) + '%');
  }
}
function setHeader(title) {
  document.getElementById('header-title').textContent = title;
}
function setBackVisible(v) {
  document.getElementById('btn-back').hidden = !v;
  document.getElementById('btn-home').hidden = !v;
}
function renderSummary(opts) {
  setHeader(opts.navTitle || 'Sonuç');
  const btns = opts.actions.map((a, i) =>
    `<button class="btn ${a.cls} btn-block" data-i="${i}">${a.icon ? icon(a.icon, 18) : ''} ${escapeHtml(a.label)}</button>`
  ).join('');
  mount(`
    <div class="summary-wrap">
      <div class="summary-icon">${icon(opts.iconName || 'trophy', 34)}</div>
      <h2>${escapeHtml(opts.title)}</h2>
      ${opts.scoreText ? `<div class="summary-score">${escapeHtml(opts.scoreText)}</div>` : ''}
      ${opts.sub ? `<div class="summary-sub">${opts.sub}</div>` : ''}
      <div class="summary-actions">${btns}</div>
    </div>
  `);
  $all('.summary-actions .btn').forEach((btn, i) => {
    btn.addEventListener('click', opts.actions[i].onClick);
  });
}

/* ---------- Main menu ---------- */
function modeMeta() {
  return [
    { key: 'lessons', icon: 'flame', title: 'B2 Dersleri', sub: `${Data.lessons.length} ders — ${Data.byCategory('lessons').length} kelime, derse göre çalış` },
    { key: 'review', icon: 'check', title: 'Hatalar & Quiz', sub: `${Data.review.corrections.length} hata düzeltme — ${Data.review.quiz.length} gramer sorusu` },
    { key: 'flashcards', icon: 'book', title: 'Kelime Kartları', sub: `${Data.words.length} kelime — öğren, biliyorum / bilmiyorum` },
    { key: 'test', icon: 'target', title: 'Test Modu', sub: 'Çoktan seçmeli sınav' },
    { key: 'fillblank', icon: 'pencil', title: 'Boşluk Doldurma', sub: 'Cümledeki eksik kelime' },
    { key: 'meeting', icon: 'users', title: 'Meeting Modu', sub: `${Data.meetings.length} gerçekçi toplantı senaryosu` },
    { key: 'patterns', icon: 'sparkle', title: 'Günlük Kalıplar', sub: `${Data.patterns.length} günlük İngilizce kalıp` },
    { key: 'hizli', icon: 'bolt', title: 'Hızlı Tur', sub: 'Skorlu bonus round' },
    { key: 'stats', icon: 'chart', title: 'İstatistikler', sub: `${Object.keys(Storage.getWordStats()).length} kelime çalışıldı — en çok yanlışlar` },
  ];
}

function renderMenu() {
  setHeader('Kelime Antrenörü');
  const stats = Storage.getStats();
  const weakN = Storage.getWeakPool().length;
  const cards = modeMeta().map((m) => `
    <button class="mode-card" data-key="${m.key}">
      <span class="mode-icon">${icon(m.icon, 22)}</span>
      <span class="mode-text">
        <span class="mode-title">${m.title}</span>
        <span class="mode-sub">${m.sub}</span>
      </span>
      <span class="chev">${icon('chevronRight', 18)}</span>
    </button>`).join('');
  mount(`
    <div class="hero">
      <h2>Hazır mısın?</h2>
      <p>B2 dersleri, mühendislik ve toplantı İngilizcesi</p>
    </div>
    <div class="stat-row">
      <div class="stat-pill"><div class="num">${weakN}</div><div class="label">Zayıf Havuz</div></div>
      <div class="stat-pill"><div class="num">${stats.totalCorrect}</div><div class="label">Toplam Doğru</div></div>
      <div class="stat-pill"><div class="num">${stats.bestStreak}</div><div class="label">En İyi Seri</div></div>
    </div>
    <div class="mode-grid">${cards}</div>
    <p class="footnote">Bu cihazda tamamen offline çalışır. İlerlemen sadece bu telefonda saklanır.</p>
  `);
  $all('.mode-card').forEach((btn) => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.key;
      if (key === 'lessons') Router.push('lessonList');
      else if (key === 'review') Router.push('reviewMenu');
      else if (key === 'flashcards') Router.push('categorySelect', { mode: 'flashcards', title: 'Kelime Kartları' });
      else if (key === 'test') Router.push('categorySelect', { mode: 'test', title: 'Test Modu' });
      else if (key === 'fillblank') Router.push('categorySelect', { mode: 'fillblank', title: 'Boşluk Doldurma' });
      else if (key === 'meeting') Router.push('meetingList');
      else if (key === 'patterns') Router.push('patternsMenu');
      else if (key === 'hizli') startHizliTur();
      else if (key === 'stats') Router.push('stats');
    });
  });
}

/* ---------- Category select (words: flashcards / test / fillblank) ---------- */
function renderCategorySelect(params) {
  setHeader(params.title);
  const cats = ['engineering', 'meeting', 'daily', 'mixed', 'weak'];
  const rows = cats.map((cat) => {
    const n = Data.byCategory(cat).length;
    return `<button class="cat-item" ${n === 0 ? 'disabled' : ''} data-cat="${cat}">
      <span>${CATEGORY_LABELS[cat]}</span><span class="count">${n}</span>
    </button>`;
  }).join('');
  mount(`<div class="cat-list">${rows}</div>`);
  $all('.cat-item').forEach((btn) => {
    btn.addEventListener('click', () => {
      const cat = btn.dataset.cat;
      if (params.mode === 'flashcards') startFlashcards(cat, 'words');
      else if (params.mode === 'test') startTest(cat);
      else if (params.mode === 'fillblank') startFillblank(cat);
    });
  });
}

/* ---------- Flashcards (words + patterns share this) ---------- */
const ANSWER_LABELS = { known: 'Biliyorum', unknown: 'Bilmiyorum', skipped: 'Pas geçildi' };

// `list` (optional) studies exactly these items, e.g. "repeat the ones I missed".
function startFlashcards(category, source, list) {
  const pool = list || (source === 'patterns' ? Data.patternsByCategory(category) : Data.byCategory(category));
  session = { kind: 'flashcards', source, category, queue: shuffle(pool), index: 0, answers: {}, sentIdx: {} };
  Router.push('flashcardSession');
}

function wordStatHtml(id) {
  const s = Storage.getWordStats()[id];
  return s && (s.ok || s.bad) ? `<div class="word-stat"><span class="ok">✓ ${s.ok || 0}</span><span class="bad">✗ ${s.bad || 0}</span></div>` : '';
}

function renderFlashcard() {
  const { queue, index } = session;
  setHeader(`Kart ${index + 1}/${queue.length}`);
  const w = queue[index];
  const showTr = Storage.getSettings().showTranslation;
  // Keep the same sentences when coming back to a card (or toggling TR).
  if (!session.sentIdx[w.id]) {
    session.sentIdx[w.id] = sample(w.sentences.map((_, i) => i), Math.min(3, w.sentences.length)).sort((a, b) => a - b);
  }
  const sentHtml = session.sentIdx[w.id].map((i) => {
    const en = w.sentences[i];
    const tr = w.translations ? w.translations[i] : null;
    return `<div class="sent-item"><div class="sent-en">${escapeHtml(en)}</div>${showTr && tr ? `<div class="sent-tr">${escapeHtml(tr)}</div>` : ''}</div>`;
  }).join('');
  const prev = session.answers[w.id];
  mount(`
    <div class="progress-line"><span>${escapeHtml(catLabel(w.category))}</span><span>${index + 1} / ${queue.length}</span></div>
    <div class="card">
      ${prev ? `<span class="ans-badge ${prev}">${ANSWER_LABELS[prev]}</span>` : ''}
      <div class="card-term">${escapeHtml(w.term)}</div>
      <div class="card-pron">[${escapeHtml(w.pronunciation)}]</div>
      ${wordStatHtml(w.id)}
      <div class="sent-list">${sentHtml}</div>
      <div id="explain-box"></div>
      <button id="btn-learn" class="btn btn-outline btn-block" style="margin-top:16px;">${icon('sparkle', 18)} Öğren (anlam + yapı)</button>
    </div>
    <div class="btn-row">
      <button id="btn-dontknow" class="btn btn-danger">${icon('close', 18)} Bilmiyorum</button>
      <button id="btn-know" class="btn btn-success">${icon('check', 18)} Biliyorum</button>
    </div>
    <div class="nav-row">
      <button id="btn-prev" class="btn btn-ghost" ${index === 0 ? 'disabled' : ''}>${icon('back', 16)} Önceki</button>
      <button id="btn-finish" class="btn btn-ghost">Bitir</button>
      <button id="btn-skip" class="btn btn-ghost">Pas geç ${icon('chevronRight', 16)}</button>
    </div>
  `);
  $('#btn-learn').addEventListener('click', () => {
    $('#explain-box').innerHTML = `<div class="explain-box"><b>Anlam:</b> ${escapeHtml(w.translation)}<br>${escapeHtml(w.explanation || '')}</div>`;
  });
  $('#btn-dontknow').addEventListener('click', () => answerFlashcard(w, 'unknown'));
  $('#btn-know').addEventListener('click', () => answerFlashcard(w, 'known'));
  $('#btn-skip').addEventListener('click', () => answerFlashcard(w, 'skipped'));
  $('#btn-prev').addEventListener('click', () => goFlashcard(index - 1));
  $('#btn-finish').addEventListener('click', () => Router.replace('flashcardDone'));
}

function answerFlashcard(w, verdict) {
  const prev = session.answers[w.id];
  // Skipping a card that already has an answer keeps that answer.
  if (!(verdict === 'skipped' && prev) && prev !== verdict) {
    // Changing an earlier answer replaces its count instead of adding a second one.
    if (prev === 'known' || prev === 'unknown') Storage.recordAnswer(w.id, prev === 'known', -1);
    if (verdict === 'known') { Storage.recordAnswer(w.id, true); Storage.markKnown(w.id); }
    if (verdict === 'unknown') { Storage.recordAnswer(w.id, false); Storage.markUnknown(w.id); }
    session.answers[w.id] = verdict;
  }
  goFlashcard(session.index + 1);
}

function goFlashcard(i) {
  session.index = Math.max(0, i);
  if (session.index >= session.queue.length) Router.replace('flashcardDone');
  else renderFlashcard();
}

function wordListHtml(words) {
  const ws = Storage.getWordStats();
  return words.map((w) => {
    const bad = (ws[w.id] && ws[w.id].bad) || 0;
    return `<li><span><b>${escapeHtml(w.term)}</b> — ${escapeHtml(w.translation)}</span>${bad ? `<span class="miss">✗ ${bad}</span>` : ''}</li>`;
  }).join('');
}

function renderFlashcardDone() {
  setHeader('Tamamlandı');
  const groups = { known: [], unknown: [], skipped: [] };
  // Cards never reached (finished early) count as skipped.
  session.queue.forEach((w) => groups[session.answers[w.id] || 'skipped'].push(w));
  const again = groups.unknown.concat(groups.skipped);
  const group = (key, title, open) => (groups[key].length ? `
    <details class="word-group ${key}" ${open ? 'open' : ''}>
      <summary>${title} <span class="count">${groups[key].length}</span></summary>
      <ul>${wordListHtml(groups[key])}</ul>
    </details>` : '');
  mount(`
    <div class="summary-wrap" style="padding-top:10px;">
      <div class="summary-icon">${icon('trophy', 34)}</div>
      <h2>Kart Seti Tamamlandı</h2>
    </div>
    <div class="stat-row">
      <div class="stat-pill"><div class="num" style="color:var(--success)">${groups.known.length}</div><div class="label">Biliyorum</div></div>
      <div class="stat-pill"><div class="num" style="color:var(--danger)">${groups.unknown.length}</div><div class="label">Bilmiyorum</div></div>
      <div class="stat-pill"><div class="num" style="color:var(--text-dim)">${groups.skipped.length}</div><div class="label">Pas / Görülmedi</div></div>
    </div>
    ${group('unknown', 'Bilmediklerin', true)}
    ${group('skipped', 'Pas geçtiklerin', true)}
    ${group('known', 'Bildiklerin', false)}
    <div class="summary-actions">
      ${again.length ? `<button id="btn-again" class="btn btn-primary btn-block">${icon('book', 18)} Bilmediklerimi Tekrar Et (${again.length})</button>` : ''}
      <button id="btn-all" class="btn btn-outline btn-block">Tümünü Tekrar</button>
      <button id="btn-menu" class="btn btn-outline btn-block">Ana Menü</button>
    </div>
  `);
  const { category, source, queue } = session;
  if (again.length) $('#btn-again').addEventListener('click', () => startFlashcards(category, source, again));
  $('#btn-all').addEventListener('click', () => startFlashcards(category, source, queue));
  $('#btn-menu').addEventListener('click', () => Router.reset('menu'));
}

/* ---------- Test mode ---------- */
function startTest(category) {
  const pool = shuffle(Data.byCategory(category)).slice(0, 12);
  session = { kind: 'test', category, queue: pool, index: 0, score: 0, wrongs: [] };
  Router.push('testSession');
}

function closeDistractors(word, n) {
  const sameCat = shuffle(Data.words.filter((w) => w.category === word.category && w.id !== word.id));
  let chosen = sameCat.slice(0, n);
  if (chosen.length < n) {
    const rest = shuffle(Data.words.filter((w) => w.id !== word.id && !chosen.includes(w)));
    chosen = chosen.concat(rest.slice(0, n - chosen.length));
  }
  return chosen;
}

function renderTestQuestion() {
  const { queue, index, score } = session;
  setHeader(`Soru ${index + 1}/${queue.length}`);
  const w = queue[index];
  const distractors = closeDistractors(w, 3);
  const options = shuffle(distractors.map((d) => ({ text: d.translation, correct: false })).concat([{ text: w.translation, correct: true }]));
  const letters = 'ABCD';
  const optHtml = options.map((o, i) => `
    <div class="option" data-i="${i}"><span class="letter">${letters[i]}</span><span class="opt-text">${escapeHtml(o.text)}</span></div>
  `).join('');
  mount(`
    <div class="progress-line"><span>Skor ${score}</span><span>${index + 1} / ${queue.length}</span></div>
    <div class="question-box">
      <div class="question-text">"${escapeHtml(w.term)}" ne anlama gelir?</div>
      <div class="option-list">${optHtml}</div>
      <div id="feedback"></div>
    </div>
  `);
  $all('.option').forEach((el, i) => el.addEventListener('click', () => answerTest(w, options, i)));
}

function answerTest(w, options, chosenIdx) {
  $all('.option').forEach((el, i) => {
    el.setAttribute('disabled', '');
    if (options[i].correct) el.classList.add('correct');
    else if (i === chosenIdx) el.classList.add('wrong');
    else el.classList.add('dim');
  });
  const fb = $('#feedback');
  Storage.recordAnswer(w.id, options[chosenIdx].correct);
  if (!options[chosenIdx].correct) session.wrongs.push(w);
  if (options[chosenIdx].correct) {
    session.score++;
    fb.innerHTML = `<div class="feedback ok">${icon('check', 16)} Doğru!</div>`;
    setTimeout(() => { session.index++; goNextTest(); }, 700);
  } else {
    fb.innerHTML = `
      <div class="feedback bad">Yanlış. Doğru cevap: ${escapeHtml(w.translation)}<div id="expl-holder"></div></div>
      <div class="btn-row" style="margin-top:10px;">
        <button id="btn-learn2" class="btn btn-outline">${icon('sparkle', 16)} Öğren</button>
        <button id="btn-next2" class="btn btn-primary">Geç ${icon('chevronRight', 16)}</button>
      </div>`;
    $('#btn-learn2').addEventListener('click', () => {
      $('#expl-holder').innerHTML = `<div class="expl">${escapeHtml(w.explanation || '')}</div>`;
    });
    $('#btn-next2').addEventListener('click', () => { session.index++; goNextTest(); });
  }
}

function goNextTest() {
  if (session.index >= session.queue.length) Router.replace('testSummary');
  else renderTestQuestion();
}

/* ---------- Fill in the blank ---------- */
function startFillblank(category) {
  const pool = shuffle(Data.byCategory(category)).slice(0, 12);
  session = { kind: 'fillblank', category, queue: pool, index: 0, score: 0, wrongs: [] };
  Router.push('fillblankSession');
}

function renderFillblank() {
  const { queue, index, score } = session;
  setHeader(`Soru ${index + 1}/${queue.length}`);
  const w = queue[index];
  const sentIdx = Math.floor(Math.random() * w.sentences.length);
  session.currentSentIdx = sentIdx;
  const sentence = w.sentences[sentIdx];
  const blanked = buildBlank(w.term, sentence);
  mount(`
    <div class="progress-line"><span>Skor ${score}</span><span>${index + 1} / ${queue.length}</span></div>
    <div class="question-box">
      <div class="question-text">${escapeHtml(blanked)}</div>
      <input id="fb-input" class="fillblank-input" type="text" autocomplete="off" autocapitalize="off" autocorrect="off" placeholder="Eksik kelimeyi yaz">
      <button id="fb-check" class="btn btn-primary btn-block" style="margin-top:14px;">Kontrol Et</button>
      <div id="feedback"></div>
    </div>
  `);
  const input = $('#fb-input');
  input.focus();
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') checkFillblank(w, sentIdx, input.value); });
  $('#fb-check').addEventListener('click', () => checkFillblank(w, sentIdx, input.value));
}

function checkFillblank(w, sentIdx, typed) {
  // Accept either the dictionary form ("kill time") or exactly the words that
  // were blanked out of this sentence ("killed time"); ignore case/punctuation.
  const norm = (x) => String(x).toLowerCase().replace(/[^a-z0-9' -]/g, '').replace(/\s+/g, ' ').trim();
  const original = w.sentences[sentIdx];
  const filled = buildBlank(w.term, original).replace('_____', typed.trim());
  const correct = norm(typed) === norm(w.term) || (norm(typed) !== '' && norm(filled) === norm(original));
  $('#fb-check').setAttribute('disabled', '');
  $('#fb-input').setAttribute('disabled', '');
  const showTr = Storage.getSettings().showTranslation;
  const tr = w.translations ? w.translations[sentIdx] : null;
  const fb = $('#feedback');
  Storage.recordAnswer(w.id, correct);
  if (!correct) session.wrongs.push(w);
  if (correct) {
    session.score++;
    fb.innerHTML = `<div class="feedback ok">${icon('check', 16)} Doğru!</div>`;
    setTimeout(() => { session.index++; goNextFillblank(); }, 700);
  } else {
    fb.innerHTML = `
      <div class="feedback bad">Yanlış. Doğru kelime: "${escapeHtml(w.term)}"
        ${showTr && tr ? `<div class="expl">${escapeHtml(tr)}</div>` : ''}
        <div id="expl-holder"></div>
      </div>
      <div class="btn-row" style="margin-top:10px;">
        <button id="btn-learn2" class="btn btn-outline">${icon('sparkle', 16)} Öğren</button>
        <button id="btn-next2" class="btn btn-primary">Geç ${icon('chevronRight', 16)}</button>
      </div>`;
    $('#btn-learn2').addEventListener('click', () => {
      $('#expl-holder').innerHTML = `<div class="expl">${escapeHtml(w.explanation || '')}</div>`;
    });
    $('#btn-next2').addEventListener('click', () => { session.index++; goNextFillblank(); });
  }
}

function goNextFillblank() {
  if (session.index >= session.queue.length) Router.replace('fillblankSummary');
  else renderFillblank();
}

function renderQuizSummary(kind) {
  const { score, queue, category, wrongs } = session;
  const title = kind === 'test' ? 'Test Tamamlandı' : 'Boşluk Doldurma Tamamlandı';
  const wrongHtml = wrongs && wrongs.length ? `
    <details class="word-group unknown" open style="text-align:left;margin-top:18px;">
      <summary>Yanlış yaptıkların <span class="count">${wrongs.length}</span></summary>
      <ul>${wordListHtml(wrongs)}</ul>
    </details>` : '';
  renderSummary({
    navTitle: 'Sonuç',
    title,
    iconName: 'trophy',
    scoreText: `${score}/${queue.length}`,
    sub: 'Skorun' + wrongHtml,
    actions: [
      ...(wrongs && wrongs.length ? [{ label: `Yanlışları Kartla Çalış (${wrongs.length})`, cls: 'btn-primary', icon: 'book', onClick: () => startFlashcards(category, 'words', wrongs) }] : []),
      { label: 'Tekrar Dene', cls: wrongs && wrongs.length ? 'btn-outline' : 'btn-primary', icon: 'bolt', onClick: () => (kind === 'test' ? startTest(category) : startFillblank(category)) },
      { label: 'Ana Menü', cls: 'btn-outline', onClick: () => Router.reset('menu') },
    ],
  });
}

/* ---------- Meeting mode ---------- */
function renderMeetingList() {
  setHeader('Meeting Modu');
  const rows = Data.meetings.map((m) => `
    <div class="meeting-item" data-id="${m.id}">
      <div class="m-title">${escapeHtml(m.title_tr)}</div>
      <div class="m-sub">${escapeHtml(m.title_en)}</div>
    </div>`).join('');
  mount(`<p class="footnote" style="margin:0 0 14px;text-align:left;">Bir toplantı senaryosu seç:</p>${rows}`);
  $all('.meeting-item').forEach((el) => el.addEventListener('click', () => startMeeting(el.dataset.id)));
}

function startMeeting(id) {
  const meeting = Data.findMeeting(id);
  session = { kind: 'meeting', meeting, qIndex: 0, transcript: [] };
  Router.push('meetingSession');
}

function renderMeetingQuestion() {
  const { meeting, qIndex } = session;
  setHeader(`${meeting.title_tr} · ${qIndex + 1}/${meeting.questions.length}`);
  const q = meeting.questions[qIndex];
  const showTr = Storage.getSettings().showTranslation;
  const options = shuffle(q.options);
  const optHtml = options.map((o, i) => `
    <div class="option" data-i="${i}">
      <span class="letter">${'ABC'[i]}</span>
      <div style="flex:1;min-width:0;">
        <div class="opt-text">${escapeHtml(o.text)}</div>
        ${showTr ? `<div class="opt-tr">${escapeHtml(o.text_tr || '')}</div>` : ''}
      </div>
    </div>`).join('');
  mount(`
    <span class="speaker-tag">${escapeHtml(meeting.speaker_role || 'Client')}</span>
    <div class="prompt-en">${escapeHtml(q.prompt_en)}</div>
    <div class="prompt-tr">${escapeHtml(q.prompt_tr)}</div>
    <div class="option-list">${optHtml}</div>
    <div id="feedback"></div>
  `);
  $all('.option').forEach((el, i) => el.addEventListener('click', () => answerMeeting(q, options, i)));
}

function answerMeeting(q, options, chosenIdx) {
  $all('.option').forEach((el) => el.setAttribute('disabled', ''));
  const chosen = options[chosenIdx];
  const fb = $('#feedback');
  if (chosen.correct) {
    $all('.option')[chosenIdx].classList.add('correct');
    session.transcript.push({ en: q.prompt_en, tr: q.prompt_tr, ansEn: chosen.text, ansTr: chosen.text_tr });
    fb.innerHTML = `<div class="feedback ok">${icon('check', 16)} Doğru cevap! Sonraki soruya geçiliyor…</div>`;
    setTimeout(() => { session.qIndex++; goNextMeeting(); }, 900);
  } else {
    $all('.option')[chosenIdx].classList.add('wrong');
    fb.innerHTML = `
      <div class="feedback bad">${escapeHtml(chosen.note_tr)}</div>
      <div class="btn-row" style="margin-top:10px;">
        <button id="btn-retry" class="btn btn-outline">Tekrar Dene</button>
        <button id="btn-reveal" class="btn btn-primary">Cevabı Göster</button>
      </div>`;
    $('#btn-retry').addEventListener('click', () => renderMeetingQuestion());
    $('#btn-reveal').addEventListener('click', () => {
      const correctOpt = q.options.find((o) => o.correct);
      session.transcript.push({ en: q.prompt_en, tr: q.prompt_tr, ansEn: correctOpt.text, ansTr: correctOpt.text_tr });
      session.qIndex++;
      goNextMeeting();
    });
  }
}

function goNextMeeting() {
  if (session.qIndex >= session.meeting.questions.length) Router.replace('meetingTranscript');
  else renderMeetingQuestion();
}

function renderMeetingTranscript() {
  const { meeting, transcript } = session;
  setHeader('Toplantı Tamamlandı');
  const blocks = transcript.map((t, i) => `
    <div class="transcript-block">
      <div class="t-role">${escapeHtml(meeting.speaker_role || 'Client')} — Soru ${i + 1}</div>
      <div class="t-en">${escapeHtml(t.en)}</div>
      <div class="t-tr">${escapeHtml(t.tr)}</div>
      <div class="t-me">SEN</div>
      <div class="t-en">${escapeHtml(t.ansEn)}</div>
      <div class="t-tr" style="margin-bottom:0;">${escapeHtml(t.ansTr || '')}</div>
    </div>`).join('');
  mount(`
    <p class="footnote" style="margin:0 0 14px;">${escapeHtml(meeting.title_en)} / ${escapeHtml(meeting.title_tr)}</p>
    ${blocks}
    <button id="btn-menu" class="btn btn-primary btn-block" style="margin-top:6px;">Ana Menü</button>
  `);
  $('#btn-menu').addEventListener('click', () => Router.reset('menu'));
}

/* ---------- B2 course lessons ---------- */
function renderLessonList() {
  setHeader('B2 Dersleri');
  const lessons = Data.lessons.slice().reverse(); // newest first
  if (!lessons.length) {
    mount('<p class="footnote" style="margin-top:40px;">Henüz ders eklenmedi.</p>');
    return;
  }
  const nAll = Data.byCategory('lessons').length;
  const rows = lessons.map((l) => `
    <button class="cat-item" data-id="${escapeHtml(l.id)}">
      <span>Ders ${escapeHtml(l.code)}: ${escapeHtml(l.title)}<br><small style="opacity:.7">${escapeHtml(l.date || '')}${l.grammar ? ' · ' + escapeHtml(l.grammar.title) : ''}</small></span>
      <span class="count">${(l.words || []).length}</span>
    </button>`).join('');
  mount(`
    <div class="cat-list">
      ${rows}
      <button class="cat-item" data-id="__all"><span>${CATEGORY_LABELS.lessons}</span><span class="count">${nAll}</span></button>
    </div>
  `);
  $all('.cat-item').forEach((btn) => btn.addEventListener('click', () => {
    Router.push('lessonDetail', { id: btn.dataset.id });
  }));
}

function renderLessonDetail(params) {
  const all = params.id === '__all';
  const lesson = all ? null : Data.findLesson(params.id);
  const cat = all ? 'lessons' : 'lesson:' + params.id;
  setHeader(all ? 'Tüm Dersler' : `Ders ${lesson.code}`);
  const n = Data.byCategory(cat).length;
  const g = lesson && lesson.grammar;
  const grammarHtml = g ? `
    <div class="card" style="margin-bottom:16px;">
      <div class="card-pron" style="margin-bottom:6px;">Gramer</div>
      <div class="card-term" style="font-size:1.2rem;">${escapeHtml(g.title)}</div>
      ${g.formula ? `<div class="explain-box" style="margin-top:10px;"><b>Formül:</b> ${escapeHtml(g.formula)}<br>${escapeHtml(g.note || '')}</div>` : ''}
      ${(g.examples || []).map((e) => `<div class="sent-item"><div class="sent-en">${escapeHtml(e)}</div></div>`).join('')}
    </div>` : '';
  mount(`
    ${lesson ? `<div class="hero"><h2>${escapeHtml(lesson.title)}</h2><p>${escapeHtml(lesson.date || '')}${lesson.pages ? ' · Sayfa ' + escapeHtml(lesson.pages) : ''} · ${n} kelime</p></div>` : ''}
    ${grammarHtml}
    <div class="cat-list">
      <button class="cat-item" data-mode="flashcards"><span style="display:flex;align-items:center;gap:10px;">${icon('book', 18)} Kelime Kartları</span><span class="count">${n}</span></button>
      <button class="cat-item" data-mode="test"><span style="display:flex;align-items:center;gap:10px;">${icon('target', 18)} Test Modu</span><span class="count">${Math.min(n, 12)}</span></button>
      <button class="cat-item" data-mode="fillblank"><span style="display:flex;align-items:center;gap:10px;">${icon('pencil', 18)} Boşluk Doldurma</span><span class="count">${Math.min(n, 12)}</span></button>
      <button class="cat-item" data-mode="stats"><span style="display:flex;align-items:center;gap:10px;">${icon('chart', 18)} İstatistik</span><span class="count">${Data.byCategory(cat).filter((w) => Storage.getWordStats()[w.id]).length}/${n}</span></button>
    </div>
  `);
  $all('.cat-item').forEach((btn) => btn.addEventListener('click', () => {
    const mode = btn.dataset.mode;
    if (mode === 'flashcards') startFlashcards(cat, 'words');
    else if (mode === 'stats') Router.push('stats', { cat });
    else if (mode === 'test') startTest(cat);
    else startFillblank(cat);
  }));
}

/* ---------- Corrections + grammar quiz (course review) ---------- */
function renderReviewMenu() {
  setHeader('Hatalar & Quiz');
  const nC = Data.review.corrections.length;
  const nQ = Data.review.quiz.length;
  mount(`
    <div class="cat-list">
      <button class="cat-item" ${nC ? '' : 'disabled'} data-kind="corrections"><span style="display:flex;align-items:center;gap:10px;">${icon('pencil', 18)} Hata Düzeltme</span><span class="count">${nC}</span></button>
      <button class="cat-item" ${nQ ? '' : 'disabled'} data-kind="quiz"><span style="display:flex;align-items:center;gap:10px;">${icon('target', 18)} Gramer Quiz</span><span class="count">${nQ}</span></button>
    </div>
    <p class="footnote">Hata Düzeltme: kitabındaki yanlış cümleyi oku, kafanda düzelt, sonra doğrusunu aç. Quiz: boşluğa cevabı yaz.</p>
  `);
  $all('.cat-item').forEach((btn) => btn.addEventListener('click', () => {
    if (btn.dataset.kind === 'corrections') startCorrections();
    else startReviewQuiz();
  }));
}

function startCorrections() {
  session = { kind: 'corrections', queue: shuffle(Data.review.corrections), index: 0, score: 0 };
  Router.push('correctionSession');
}

function renderCorrection() {
  const { queue, index, score } = session;
  setHeader(`Hata ${index + 1}/${queue.length}`);
  const c = queue[index];
  mount(`
    <div class="progress-line"><span>Skor ${score}</span><span>${escapeHtml(c.id)} · ${escapeHtml(c.page || '')}</span></div>
    <div class="question-box">
      <div class="card-pron" style="margin-bottom:6px;">Bu cümlede ne yanlış?</div>
      <div class="question-text">${escapeHtml(c.wrong)}</div>
      <div id="corr-answer"></div>
      <button id="btn-reveal" class="btn btn-primary btn-block" style="margin-top:14px;">Doğrusunu Göster</button>
    </div>
  `);
  $('#btn-reveal').addEventListener('click', () => {
    $('#btn-reveal').remove();
    $('#corr-answer').innerHTML = `
      <div class="feedback ok">${icon('check', 16)} ${escapeHtml(c.correct)}</div>
      <div class="explain-box" style="margin-top:10px;"><b>Kural:</b> ${escapeHtml(c.rule_tr || c.rule)}${c.rule_tr && c.rule ? `<br><span style="opacity:.75">${escapeHtml(c.rule)}</span>` : ''}</div>
      <div class="btn-row" style="margin-top:12px;">
        <button id="btn-missed" class="btn btn-danger">${icon('close', 18)} Bilemedim</button>
        <button id="btn-got" class="btn btn-success">${icon('check', 18)} Bildim</button>
      </div>`;
    $('#btn-missed').addEventListener('click', () => answerCorrection(false));
    $('#btn-got').addEventListener('click', () => answerCorrection(true));
  });
}

function answerCorrection(got) {
  if (got) session.score++;
  session.index++;
  if (session.index >= session.queue.length) Router.replace('correctionSummary');
  else renderCorrection();
}

function startReviewQuiz() {
  session = { kind: 'reviewQuiz', queue: shuffle(Data.review.quiz), index: 0, score: 0 };
  Router.push('reviewQuizSession');
}

function renderReviewQuiz() {
  const { queue, index, score } = session;
  setHeader(`Soru ${index + 1}/${queue.length}`);
  const q = queue[index];
  mount(`
    <div class="progress-line"><span>Skor ${score}</span><span>${escapeHtml(q.topic || '')}</span></div>
    <div class="question-box">
      <div class="question-text">${escapeHtml(q.question)}</div>
      <input id="fb-input" class="fillblank-input" type="text" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="Cevabı yaz">
      <button id="fb-check" class="btn btn-primary btn-block" style="margin-top:14px;">Kontrol Et</button>
      <div id="feedback"></div>
    </div>
  `);
  const input = $('#fb-input');
  input.focus();
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') checkReviewQuiz(q, input.value); });
  $('#fb-check').addEventListener('click', () => checkReviewQuiz(q, input.value));
}

function checkReviewQuiz(q, typed) {
  // iOS types curly apostrophes ("I’ve"), so fold them before comparing.
  const norm = (x) => String(x).toLowerCase().replace(/[‘’]/g, "'")
    .replace(/[^a-z0-9' ]/g, ' ').replace(/\s+/g, ' ').trim();
  const t = norm(typed);
  const correct = t !== '' && q.answers.some((a) => norm(a) === t);
  $('#fb-check').setAttribute('disabled', '');
  $('#fb-input').setAttribute('disabled', '');
  const fb = $('#feedback');
  if (correct) {
    session.score++;
    fb.innerHTML = `<div class="feedback ok">${icon('check', 16)} Doğru!</div>`;
    setTimeout(() => { session.index++; goNextReviewQuiz(); }, 700);
  } else {
    fb.innerHTML = `
      <div class="feedback bad">Yanlış. Doğru cevap: "${escapeHtml(q.answers[0])}"${q.answers.length > 1 ? `<div class="expl">Kabul edilenler: ${q.answers.map(escapeHtml).join(' · ')}</div>` : ''}</div>
      <button id="btn-next2" class="btn btn-primary btn-block" style="margin-top:10px;">Geç ${icon('chevronRight', 16)}</button>`;
    $('#btn-next2').addEventListener('click', () => { session.index++; goNextReviewQuiz(); });
  }
}

function goNextReviewQuiz() {
  if (session.index >= session.queue.length) Router.replace('reviewQuizSummary');
  else renderReviewQuiz();
}

function renderReviewSummary(kind) {
  const { score, queue } = session;
  renderSummary({
    navTitle: 'Sonuç',
    title: kind === 'corrections' ? 'Hata Düzeltme Tamamlandı' : 'Gramer Quiz Tamamlandı',
    iconName: 'trophy',
    scoreText: `${score}/${queue.length}`,
    sub: 'Skorun',
    actions: [
      { label: 'Tekrar', cls: 'btn-primary', icon: 'bolt', onClick: () => (kind === 'corrections' ? startCorrections() : startReviewQuiz()) },
      { label: 'Ana Menü', cls: 'btn-outline', onClick: () => Router.reset('menu') },
    ],
  });
}

/* ---------- Per-word statistics ---------- */
function renderStats(params) {
  const cat = params && params.cat;
  setHeader(cat ? `İstatistik · ${catLabel(cat)}` : 'İstatistikler');
  const ws = Storage.getWordStats();
  const pool = cat ? Data.byCategory(cat) : Data.words.concat(Data.patterns);
  const rows = pool.filter((w) => ws[w.id] && (ws[w.id].ok || ws[w.id].bad))
    .map((w) => ({ w, ok: ws[w.id].ok || 0, bad: ws[w.id].bad || 0 }))
    .sort((a, b) => b.bad - a.bad || a.ok - b.ok);
  const ok = rows.reduce((n, r) => n + r.ok, 0);
  const bad = rows.reduce((n, r) => n + r.bad, 0);
  const missed = rows.filter((r) => r.bad > 0);
  const list = rows.map((r) => {
    const acc = Math.round((100 * r.ok) / (r.ok + r.bad));
    return `<li><span><b>${escapeHtml(r.w.term)}</b><small>${escapeHtml(r.w.translation)}</small></span>
      <span class="stat-nums"><span class="ok">✓ ${r.ok}</span><span class="bad">✗ ${r.bad}</span><span class="acc">%${acc}</span></span></li>`;
  }).join('');
  mount(`
    <div class="stat-row">
      <div class="stat-pill"><div class="num">${rows.length}/${pool.length}</div><div class="label">Çalışılan</div></div>
      <div class="stat-pill"><div class="num" style="color:var(--success)">${ok}</div><div class="label">Doğru</div></div>
      <div class="stat-pill"><div class="num" style="color:var(--danger)">${bad}</div><div class="label">Yanlış</div></div>
    </div>
    ${missed.length ? `<button id="btn-drill" class="btn btn-primary btn-block" style="margin-bottom:16px;">${icon('book', 18)} En Çok Yanlış Yaptıklarını Çalış (${Math.min(20, missed.length)})</button>` : ''}
    ${rows.length ? `<div class="section-title">En çok yanlış yapılan üstte</div><ul class="stat-list">${list}</ul>`
      : '<p class="footnote">Henüz istatistik yok. Kart, test veya boşluk doldurma çözdükçe burada her kelime için doğru/yanlış sayın görünecek.</p>'}
  `);
  if (missed.length) {
    $('#btn-drill').addEventListener('click', () => startFlashcards(cat || 'mixed', 'words', missed.slice(0, 20).map((r) => r.w)));
  }
}

/* ---------- Patterns menu ---------- */
function renderPatternsMenu() {
  setHeader('Günlük Kalıplar');
  const nAll = Data.patterns.length;
  const nWeak = Data.patternsByCategory('weak').length;
  mount(`
    <div class="cat-list">
      <button class="cat-item" data-cat="mixed"><span>Tüm Kalıplar</span><span class="count">${nAll}</span></button>
      <button class="cat-item" ${nWeak ? '' : 'disabled'} data-cat="weak"><span>Zayıf Havuz (Kalıplar)</span><span class="count">${nWeak}</span></button>
    </div>
  `);
  $all('.cat-item').forEach((btn) => btn.addEventListener('click', () => startFlashcards(btn.dataset.cat, 'patterns')));
}

/* ---------- Hızlı Tur ---------- */
function prepareHizliRound() {
  session.round++;
  if (session.round > ROUNDS_PER_SESSION) return false;
  session.isHard = session.round % 2 === 1;
  const pool = session.isHard ? session.hardPool : session.easyPool;
  session.currentWord = pool[Math.floor(Math.random() * pool.length)];
  if (session.isHard) {
    const sentIdx = Math.floor(Math.random() * session.currentWord.sentences.length);
    session.questionText = buildBlank(session.currentWord.term, session.currentWord.sentences[sentIdx]);
    const others = shuffle(Data.words.filter((x) => x.id !== session.currentWord.id)).slice(0, 4);
    session.options = shuffle(others.map((o) => o.term).concat([session.currentWord.term]));
    session.correctAnswer = session.currentWord.term;
  } else {
    session.questionText = `"${session.currentWord.term}" ne anlama gelir?`;
    const others = shuffle(Data.words.filter((x) => x.id !== session.currentWord.id)).slice(0, 3);
    session.options = shuffle(others.map((o) => o.translation).concat([session.currentWord.translation]));
    session.correctAnswer = session.currentWord.translation;
  }
  return true;
}

function startHizliTur() {
  session = {
    kind: 'hizli', score: 0, correct: 0, wrong: 0, streak: 0, round: 0,
    easyPool: Data.words.filter((w) => w.category === 'daily'),
    hardPool: Data.words.filter((w) => w.category === 'engineering' || w.category === 'meeting'),
  };
  prepareHizliRound();
  Router.push('hizliTurSession');
}

function renderHizliTur() {
  const s = session;
  setHeader(`Round ${s.round}/${ROUNDS_PER_SESSION}`);
  const letters = s.isHard ? 'ABCDE' : 'ABCD';
  const optHtml = s.options.map((o, i) => `
    <div class="option" data-i="${i}"><span class="letter">${letters[i]}</span><span class="opt-text">${escapeHtml(o)}</span></div>
  `).join('');
  mount(`
    <div class="ht-top">
      <span class="ht-badge ${s.isHard ? 'hard' : 'easy'}">${s.isHard ? 'HARD' : 'EASY'}</span>
      <span class="ht-score">${icon('flame', 14)} x${s.streak} &nbsp; ${icon('bolt', 14)} ${s.score}</span>
    </div>
    <div class="question-box">
      <div class="question-text">${escapeHtml(s.questionText)}</div>
      <div class="option-list">${optHtml}</div>
      <div id="feedback"></div>
    </div>
  `);
  $all('.option').forEach((el, i) => el.addEventListener('click', () => answerHizli(s.options[i])));
}

function answerHizli(chosen) {
  const s = session;
  $all('.option').forEach((el) => el.setAttribute('disabled', ''));
  const correct = chosen === s.correctAnswer;
  Storage.recordAnswer(s.currentWord.id, correct, 1, false); // totals are updated below
  const stats = Storage.getStats();
  const fb = $('#feedback');
  if (correct) {
    s.correct++; s.streak++;
    const gained = 10 + (s.isHard ? 2 * s.streak : s.streak);
    s.score += gained;
    stats.totalCorrect = (stats.totalCorrect || 0) + 1;
    stats.bestStreak = Math.max(stats.bestStreak || 0, s.streak);
    fb.innerHTML = `<div class="feedback ok">${icon('check', 16)} Doğru! +${gained}</div>`;
  } else {
    s.wrong++; s.streak = 0;
    stats.totalWrong = (stats.totalWrong || 0) + 1;
    fb.innerHTML = `<div class="feedback bad">Yanlış — doğru cevap: ${escapeHtml(s.correctAnswer)}</div>`;
  }
  Storage.saveStats(stats);
  setTimeout(() => {
    const has = prepareHizliRound();
    if (has) {
      renderHizliTur();
    } else {
      const st = Storage.getStats();
      st.sessions = (st.sessions || 0) + 1;
      Storage.saveStats(st);
      Router.replace('hizliTurSummary');
    }
  }, 1100);
}

function renderHizliTurSummary() {
  const s = session;
  const total = s.correct + s.wrong;
  const acc = total ? Math.round((100 * s.correct) / total) : 0;
  renderSummary({
    navTitle: 'Sonuç',
    title: 'Hızlı Tur Tamamlandı',
    iconName: 'trophy',
    scoreText: String(s.score),
    sub: `Doğru/Yanlış: ${s.correct}/${s.wrong} · İsabet: %${acc}`,
    actions: [
      { label: 'Tekrar', cls: 'btn-primary', icon: 'bolt', onClick: () => startHizliTur() },
      { label: 'Ana Menü', cls: 'btn-outline', onClick: () => Router.reset('menu') },
    ],
  });
}

/* ---------- Dispatcher ---------- */
const Screens = {
  render(state, canGoBack) {
    setBackVisible(canGoBack);
    switch (state.screen) {
      case 'menu': renderMenu(); break;
      case 'categorySelect': renderCategorySelect(state.params); break;
      case 'flashcardSession': renderFlashcard(); break;
      case 'flashcardDone': renderFlashcardDone(); break;
      case 'testSession': renderTestQuestion(); break;
      case 'testSummary': renderQuizSummary('test'); break;
      case 'fillblankSession': renderFillblank(); break;
      case 'fillblankSummary': renderQuizSummary('fillblank'); break;
      case 'meetingList': renderMeetingList(); break;
      case 'meetingSession': renderMeetingQuestion(); break;
      case 'meetingTranscript': renderMeetingTranscript(); break;
      case 'patternsMenu': renderPatternsMenu(); break;
      case 'lessonList': renderLessonList(); break;
      case 'lessonDetail': renderLessonDetail(state.params); break;
      case 'reviewMenu': renderReviewMenu(); break;
      case 'stats': renderStats(state.params); break;
      case 'correctionSession': renderCorrection(); break;
      case 'correctionSummary': renderReviewSummary('corrections'); break;
      case 'reviewQuizSession': renderReviewQuiz(); break;
      case 'reviewQuizSummary': renderReviewSummary('quiz'); break;
      case 'hizliTurSession': renderHizliTur(); break;
      case 'hizliTurSummary': renderHizliTurSummary(); break;
      default: renderMenu();
    }
  },
};
