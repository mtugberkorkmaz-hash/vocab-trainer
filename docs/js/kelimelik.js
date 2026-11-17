/* Kelimelik: tüm kelimeler seviye (A2–C1, Teknik) ve konuya göre, sayfada 10 kelime.
 * Her kelimede EN, TR, İngilizce anlam ve 2 EN/TR örnek cümle. Veri: data/kelimelik.json
 * (seviye + konu + tanım) + mevcut kelime bankası + kelimelik'e özel ek kelimeler. */
const KEL_PER_PAGE = 10;
const KEL_LEVELS = [
  { id: '*', label: 'Tümü' }, { id: 'A2', label: 'A2' }, { id: 'B1', label: 'B1' },
  { id: 'B2', label: 'B2' }, { id: 'C1', label: 'C1' }, { id: 'TK', label: 'Teknik' },
];
const KEL_LV_ORDER = { A2: 0, B1: 1, B2: 2, C1: 3, TK: 4 };
let kelCache = null;

function kelStore(key, val) {
  try {
    if (val === undefined) return localStorage.getItem('kel.' + key);
    localStorage.setItem('kel.' + key, String(val));
  } catch (e) { /* depolama yoksa yok say */ }
  return null;
}

function kelAll() {
  if (kelCache) return kelCache;
  const K = Data.kel || { meta: {}, extra: [], topics: [] };
  const list = [];
  const add = (w, m) => list.push({
    w, lv: m[0], topic: m[1], def: m[2],
    s: w.sentences.slice(0, 2).map((s, i) => [s, w.translations[i] || '']),
  });
  Data.words.forEach((w) => { const m = K.meta[w.id]; if (m) add(w, m); });
  K.extra.forEach((x) => {
    const w = {
      id: x.id, term: x.term, pronunciation: '', translation: x.translation, explanation: '',
      sentences: x.s.map((p) => p[0]), translations: x.s.map((p) => p[1]), category: 'kel:extra',
    };
    add(w, [x.level, x.topic, x.def]);
  });
  list.sort((a, b) => (KEL_LV_ORDER[a.lv] - KEL_LV_ORDER[b.lv]) || a.w.term.localeCompare(b.w.term, 'en', { sensitivity: 'base' }));
  kelCache = list;
  return list;
}

function kelTopics() {
  const K = Data.kel || { topics: [] };
  return K.topics.map((t) => ({ id: t.id, title: t.title }))
    .concat(Data.engCats.map((c) => ({ id: c.id, title: c.short })));
}
function kelTopicTitle(id) {
  if (id === '*') return 'Tüm konular';
  const t = kelTopics().find((x) => x.id === id);
  return t ? t.title : id;
}
function kelLvLabel(lv) { return lv === 'TK' ? 'Teknik' : lv === '*' ? 'Tümü' : lv; }
function kelFilter(lv, topic) {
  return kelAll().filter((e) => (lv === '*' || e.lv === lv) && (topic === '*' || e.topic === topic));
}
function kelSrc(w) {
  if (w.category === 'kel:extra') return 'Kelimelik ek';
  if (w.category.startsWith('lesson:')) { const l = Data.findLesson(w.category.slice(7)); return l ? 'Ders ' + l.code : 'Ders'; }
  return catLabel(w.category);
}

function kelCard(e, n) {
  const w = e.w;
  return `<div class="kcard" data-id="${escapeHtml(w.id)}">
    <div class="kh">${n ? `<span class="knum">${n}</span>` : ''}<span class="kt" lang="en">${escapeHtml(w.term)}</span><span class="klv lv-${e.lv}">${kelLvLabel(e.lv)}</span></div>
    <div class="ktr tr-only k-hide">${escapeHtml(w.translation)}</div>
    <div class="kdef k-hide" lang="en"><b>Meaning:</b> ${escapeHtml(e.def)}</div>
    ${e.s.map((p) => `<div class="ws"><div class="en" lang="en">${escapeHtml(p[0])}</div><div class="trl tr-only k-hide">${escapeHtml(p[1])}</div></div>`).join('')}
    <div class="wcat">${escapeHtml(kelTopicTitle(e.topic))} · ${escapeHtml(kelSrc(w))}</div>
  </div>`;
}

function renderKelHub() {
  setHeader('Kelimelik');
  let lv = kelStore('lv') || '*';
  if (!KEL_LEVELS.some((l) => l.id === lv)) lv = '*';
  const all = kelAll();
  const cnt = (l) => (l === '*' ? all.length : all.filter((e) => e.lv === l).length);
  const chips = KEL_LEVELS.map((l) => `<button class="chip${l.id === lv ? ' active' : ''}" data-lv="${l.id}" type="button">${l.label} <span class="chip-n">${cnt(l.id)}</span></button>`).join('');
  const pool = lv === '*' ? all : all.filter((e) => e.lv === lv);
  const rows = kelTopics().map((t) => {
    const items = pool.filter((e) => e.topic === t.id);
    if (!items.length) return '';
    const byLv = ['A2', 'B1', 'B2', 'C1'].map((l) => [l, items.filter((e) => e.lv === l).length]).filter((x) => x[1]);
    const sub = `${Math.ceil(items.length / KEL_PER_PAGE)} sayfa${byLv.length && lv === '*' ? ' · ' + byLv.map((x) => x[0] + ' ' + x[1]).join(' · ') : ''}`;
    return listRow('t:' + t.id, null, t.title, sub, items.length);
  }).join('');
  const general = rows.split('data-key="t:V').length > 1;
  mount(`
    <p class="lead">Bütün kelimeler tek yerde: seviyeye ve konuya göre ayrılmış, <b>her sayfada 10 kelime</b>. Her kelimede Türkçesi, İngilizce anlamı ve 2 örnek cümle (TR'leriyle) var. "Kendini sına" modunda Türkçeler gizlenir, karta dokununca açılır.</p>
    <div class="kel-chips">${chips}</div>
    <input id="kel-q" class="fillblank-input" style="margin:6px 0;text-align:left" type="search" placeholder="Kelime, Türkçe ya da anlam ara…" autocomplete="off" autocapitalize="off" spellcheck="false">
    <div id="kel-res"></div>
    <div class="list-group" style="margin-top:8px">${listRow('t:*', 'book', `${kelLvLabel(lv)} — hepsi sayfa sayfa`, `${Math.ceil(pool.length / KEL_PER_PAGE)} sayfa`, pool.length)}</div>
    <div class="section-title">Konular${general ? '' : ''}</div>
    <div class="list-group">${rows}</div>
  `);
  $all('.kel-chips .chip').forEach((b) => b.addEventListener('click', () => { kelStore('lv', b.dataset.lv); Router.replace('kelHub'); }));
  $all('.list-row').forEach((b) => b.addEventListener('click', () => {
    const topic = b.dataset.key.slice(2);
    const page = parseInt(kelStore('p.' + lv + '.' + topic) || '0', 10) || 0;
    Router.push('kelPage', { lv, topic, page });
  }));
  const res = $('#kel-res');
  $('#kel-q').addEventListener('input', (ev) => {
    const q = ev.target.value.trim().toLowerCase();
    if (q.length < 2) { res.innerHTML = ''; return; }
    const m = all.filter((e) => (e.w.term + ' ' + e.w.translation + ' ' + e.def).toLowerCase().includes(q));
    res.innerHTML = `<div class="mut-sub" style="margin:8px 0">${m.length} sonuç${m.length > 30 ? ' (ilk 30 gösteriliyor)' : ''}</div><div class="kgrid">${m.slice(0, 30).map((e) => kelCard(e)).join('')}</div>`;
  });
}

function kelPager(page, nPages) {
  const opts = Array.from({ length: nPages }, (_, i) => `<option value="${i}"${i === page ? ' selected' : ''}>Sayfa ${i + 1} / ${nPages}</option>`).join('');
  return `<div class="kpager">
    <button class="btn btn-outline kprev" type="button"${page <= 0 ? ' disabled' : ''}>‹ Önceki</button>
    <select class="kpsel" aria-label="Sayfa">${opts}</select>
    <button class="btn btn-outline knext" type="button"${page >= nPages - 1 ? ' disabled' : ''}>Sonraki ›</button>
  </div>`;
}

function renderKelPage(params) {
  const { lv, topic } = params;
  const items = kelFilter(lv, topic);
  const nPages = Math.max(1, Math.ceil(items.length / KEL_PER_PAGE));
  const page = Math.min(Math.max(0, params.page || 0), nPages - 1);
  kelStore('p.' + lv + '.' + topic, page);
  const slice = items.slice(page * KEL_PER_PAGE, (page + 1) * KEL_PER_PAGE);
  const quiz = kelStore('quiz') === '1';
  setHeader(`${kelLvLabel(lv)} · ${page + 1}/${nPages}`);
  mount(`
    <div class="hero"><p>${kelLvLabel(lv)} · ${items.length} kelime · sayfa ${page + 1}/${nPages}</p><h2>${escapeHtml(kelTopicTitle(topic))}</h2></div>
    <div class="ktools">
      <button class="chip${quiz ? ' active' : ''}" id="kel-quiz" type="button">Kendini sına</button>
      <button class="chip" id="kel-flash" type="button">Bu sayfayı kartla çalış</button>
    </div>
    ${kelPager(page, nPages)}
    <div class="kgrid${quiz ? ' kquiz' : ''}">${slice.map((e, i) => kelCard(e, page * KEL_PER_PAGE + i + 1)).join('')}</div>
    ${kelPager(page, nPages)}
    <p class="footnote">PC'de ← → ok tuşlarıyla sayfa değiştirebilirsin.</p>
  `);
  const go = (p) => { if (p >= 0 && p < nPages && p !== page) Router.replace('kelPage', { lv, topic, page: p }); };
  $all('.kprev').forEach((b) => b.addEventListener('click', () => go(page - 1)));
  $all('.knext').forEach((b) => b.addEventListener('click', () => go(page + 1)));
  $all('.kpsel').forEach((s) => s.addEventListener('change', () => go(parseInt(s.value, 10))));
  $('#kel-quiz').addEventListener('click', () => { kelStore('quiz', quiz ? '0' : '1'); Router.replace('kelPage', { lv, topic, page }); });
  $('#kel-flash').addEventListener('click', () => startFlashcards('kel', 'words', slice.map((e) => e.w)));
  $all('.kquiz .kcard').forEach((c) => c.addEventListener('click', () => c.classList.toggle('open')));
}

document.addEventListener('keydown', (ev) => {
  const cur = typeof Router !== 'undefined' && Router.current && Router.current();
  if (!cur || cur.screen !== 'kelPage') return;
  if (ev.target && /INPUT|SELECT|TEXTAREA/.test(ev.target.tagName)) return;
  const btn = ev.key === 'ArrowRight' ? $('.knext') : ev.key === 'ArrowLeft' ? $('.kprev') : null;
  if (btn && !btn.disabled) { ev.preventDefault(); btn.click(); }
});
