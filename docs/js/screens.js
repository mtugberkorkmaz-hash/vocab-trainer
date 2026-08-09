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
};

const ROUNDS_PER_SESSION = 10;

let session = {};

/* ---------- DOM helpers ---------- */
function $(sel) { return document.querySelector(sel); }
function $all(sel) { return Array.prototype.slice.call(document.querySelectorAll(sel)); }
function mount(html) {
  document.getElementById('screen').innerHTML = html;
  window.scrollTo(0, 0);
}
function setHeader(title) {
  document.getElementById('header-title').textContent = title;
}
function setBackVisible(v) {
  document.getElementById('btn-back').hidden = !v;
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
const MODE_META = [
  { key: 'flashcards', icon: 'book', title: 'Kelime Kartları', sub: 'Öğren, biliyorum / bilmiyorum' },
  { key: 'test', icon: 'target', title: 'Test Modu', sub: 'Çoktan seçmeli sınav' },
  { key: 'fillblank', icon: 'pencil', title: 'Boşluk Doldurma', sub: 'Cümledeki eksik kelime' },
  { key: 'meeting', icon: 'users', title: 'Meeting Modu', sub: '12 gerçekçi toplantı senaryosu' },
  { key: 'patterns', icon: 'sparkle', title: 'Günlük Kalıplar', sub: '25 günlük İngilizce kalıp' },
  { key: 'hizli', icon: 'bolt', title: 'Hızlı Tur', sub: 'Skorlu bonus round' },
];

function renderMenu() {
  setHeader('Kelime Antrenörü');
  const stats = Storage.getStats();
  const weakN = Storage.getWeakPool().length;
  const cards = MODE_META.map((m) => `
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
      <p>Mühendislik, toplantı ve günlük İngilizce pratiği</p>
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
      if (key === 'flashcards') Router.push('categorySelect', { mode: 'flashcards', title: 'Kelime Kartları' });
      else if (key === 'test') Router.push('categorySelect', { mode: 'test', title: 'Test Modu' });
      else if (key === 'fillblank') Router.push('categorySelect', { mode: 'fillblank', title: 'Boşluk Doldurma' });
      else if (key === 'meeting') Router.push('meetingList');
      else if (key === 'patterns') Router.push('patternsMenu');
      else if (key === 'hizli') startHizliTur();
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
function startFlashcards(category, source) {
  const pool = source === 'patterns' ? Data.patternsByCategory(category) : Data.byCategory(category);
  session = { kind: 'flashcards', source, category, queue: shuffle(pool), index: 0 };
  Router.push('flashcardSession');
}

function renderFlashcard() {
  const { queue, index } = session;
  setHeader(`Kart ${index + 1}/${queue.length}`);
  const w = queue[index];
  const showTr = Storage.getSettings().showTranslation;
  const idxs = sample(w.sentences.map((_, i) => i), Math.min(3, w.sentences.length)).sort((a, b) => a - b);
  const sentHtml = idxs.map((i) => {
    const en = w.sentences[i];
    const tr = w.translations ? w.translations[i] : null;
    return `<div class="sent-item"><div class="sent-en">${escapeHtml(en)}</div>${showTr && tr ? `<div class="sent-tr">${escapeHtml(tr)}</div>` : ''}</div>`;
  }).join('');
  mount(`
    <div class="progress-line"><span>${CATEGORY_LABELS[w.category] || 'Kalıp'}</span><span>${index + 1} / ${queue.length}</span></div>
    <div class="card">
      <div class="card-term">${escapeHtml(w.term)}</div>
      <div class="card-pron">[${escapeHtml(w.pronunciation)}]</div>
      <div class="sent-list">${sentHtml}</div>
      <div id="explain-box"></div>
      <button id="btn-learn" class="btn btn-outline btn-block" style="margin-top:16px;">${icon('sparkle', 18)} Öğren (anlam + yapı)</button>
    </div>
    <div class="btn-row">
      <button id="btn-dontknow" class="btn btn-danger">${icon('close', 18)} Bilmiyorum</button>
      <button id="btn-know" class="btn btn-success">${icon('check', 18)} Biliyorum</button>
    </div>
  `);
  $('#btn-learn').addEventListener('click', () => {
    $('#explain-box').innerHTML = `<div class="explain-box"><b>Anlam:</b> ${escapeHtml(w.translation)}<br>${escapeHtml(w.explanation || '')}</div>`;
  });
  $('#btn-dontknow').addEventListener('click', () => answerFlashcard(w, false));
  $('#btn-know').addEventListener('click', () => answerFlashcard(w, true));
}

function answerFlashcard(w, known) {
  if (known) Storage.markKnown(w.id); else Storage.markUnknown(w.id);
  session.index++;
  if (session.index >= session.queue.length) Router.replace('flashcardDone');
  else renderFlashcard();
}

function renderFlashcardDone() {
  const n = Storage.getWeakPool().length;
  renderSummary({
    navTitle: 'Tamamlandı',
    title: 'Kart Seti Tamamlandı',
    iconName: 'trophy',
    sub: `Zayıf havuzunda şu an ${n} kelime/kalıp var.`,
    actions: [
      { label: 'Tekrar', cls: 'btn-primary', icon: 'book', onClick: () => startFlashcards(session.category, session.source) },
      { label: 'Ana Menü', cls: 'btn-outline', onClick: () => Router.reset('menu') },
    ],
  });
}

/* ---------- Test mode ---------- */
function startTest(category) {
  const pool = shuffle(Data.byCategory(category)).slice(0, 12);
  session = { kind: 'test', category, queue: pool, index: 0, score: 0 };
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
  session = { kind: 'fillblank', category, queue: pool, index: 0, score: 0 };
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
  const correct = typed.trim().toLowerCase() === w.term.toLowerCase();
  $('#fb-check').setAttribute('disabled', '');
  $('#fb-input').setAttribute('disabled', '');
  const showTr = Storage.getSettings().showTranslation;
  const tr = w.translations ? w.translations[sentIdx] : null;
  const fb = $('#feedback');
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
  const { score, queue, category } = session;
  const title = kind === 'test' ? 'Test Tamamlandı' : 'Boşluk Doldurma Tamamlandı';
  renderSummary({
    navTitle: 'Sonuç',
    title,
    iconName: 'trophy',
    scoreText: `${score}/${queue.length}`,
    sub: 'Skorun',
    actions: [
      { label: 'Tekrar Dene', cls: 'btn-primary', icon: 'bolt', onClick: () => (kind === 'test' ? startTest(category) : startFillblank(category)) },
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
      case 'hizliTurSession': renderHizliTur(); break;
      case 'hizliTurSummary': renderHizliTurSummary(); break;
      default: renderMenu();
    }
  },
};
