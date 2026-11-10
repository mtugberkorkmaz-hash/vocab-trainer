/* Zaman Çizelgesi, Gramer Yapıları ve Mühendislik Kelimeleri ekranları.
 * Veri: data/tenses.json (12 zaman + 9 yapı) ve data/engvocab.json (KEY BCT / RET
 * belgelerinden çıkarılan piping & proje yönetimi kelimeleri). Testler practice.js'te. */

const ZC = { past: '#4f6bd8', present: '#1f7a6a', future: '#8a55c9' };
const ZR = { past: 170, present: 320, future: 470 };
const ZL = { past: 'geçmişte bir an', present: 'şimdi', future: 'gelecekte bir an' };
const ZN = { past: 'GEÇMİŞ', present: 'ŞİMDİ', future: 'GELECEK' };
const STRUCT_TESTS = { COND: ['COND12', 'COND03'] };

/* ---------- zaman çizgisi SVG (mini = yazısız önizleme) ---------- */
function tlSvg(t, mini) {
  const y = 92; const c = ZC[t.zone]; const R = ZR[t.zone];
  const tx = (x, yy, s, size) => (mini ? '' : `<text x="${x}" y="${yy}" text-anchor="middle" font-size="${size || 16}" fill="currentColor">${s}</text>`);
  let s = `<svg class="tl-svg" viewBox="0 0 640 150" role="img" aria-label="${escapeHtml(t.en)} zaman çizgisi">`;
  s += `<line x1="14" y1="${y}" x2="616" y2="${y}" stroke="currentColor" stroke-opacity=".45" stroke-width="3"/><polygon points="632,${y} 614,${y - 8} 614,${y + 8}" fill="currentColor" fill-opacity=".45"/>`;
  s += tx(90, 138, 'GEÇMİŞ', 14) + tx(320, 138, 'ŞİMDİ', 14) + tx(550, 138, 'GELECEK', 14);
  s += `<line x1="320" y1="34" x2="320" y2="${y + 12}" stroke="currentColor" stroke-opacity=".5" stroke-dasharray="4 4"/>`;
  const A = t.aspect;
  if (A === 'simple') {
    if (t.k === 'PSI') { [245, 320, 395].forEach((x) => { s += `<circle cx="${x}" cy="${y}" r="8" fill="${c}"/>`; }); s += tx(320, y - 24, 'alışkanlık · genel doğru'); }
    else { s += `<circle cx="${R}" cy="${y}" r="10" fill="${c}"/>` + tx(R, y - 24, t.zone === 'future' ? 'olacak olay' : 'bitmiş olay'); }
  } else if (A === 'continuous') {
    s += `<rect x="${R - 72}" y="${y - 9}" width="144" height="18" rx="9" fill="${c}" fill-opacity=".3" stroke="${c}" stroke-dasharray="5 4"/><circle cx="${R}" cy="${y}" r="7" fill="${c}"/>` + tx(R, y - 24, 'süren eylem') + tx(R, y + 28, 'o an', 14);
  } else if (A === 'perfect') {
    const ax = R - 120;
    s += `<circle cx="${ax}" cy="${y}" r="9" fill="${c}"/><line x1="${ax + 12}" y1="${y - 18}" x2="${R - 8}" y2="${y - 18}" stroke="${c}" stroke-width="2.5"/><polygon points="${R},${y - 18} ${R - 12},${y - 25} ${R - 12},${y - 11}" fill="${c}"/>`;
    s += `<line x1="${R}" y1="${y - 34}" x2="${R}" y2="${y + 10}" stroke="${c}" stroke-width="4"/>` + tx(ax, y + 28, 'tamamlandı', 14) + tx(R, y - 42, ZL[t.zone], 14);
  } else {
    const st = R - 165;
    s += `<rect x="${st}" y="${y - 9}" width="${R - st}" height="18" rx="9" fill="${c}" fill-opacity=".35" stroke="${c}"/><line x1="${R}" y1="${y - 34}" x2="${R}" y2="${y + 10}" stroke="${c}" stroke-width="4"/>` + tx((st + R) / 2, y - 18, 'o ana kadar süren') + tx(R, y - 42, ZL[t.zone], 14);
  }
  return s + '</svg>';
}

function exListHtml(arr) {
  return `<ul class="exl">${arr.map((e) => `<li><div class="en">${escapeHtml(e[0])}</div><div class="trl tr-only">${escapeHtml(e[1])}</div></li>`).join('')}</ul>`;
}

/* ---------- Zaman Çizelgesi ---------- */
function renderTenseHub() {
  setHeader('Zaman Çizelgesi');
  const T = Data.tenses.tenses;
  const zones = ['past', 'present', 'future'].map((z) => `
    <div class="zone" style="color:${ZC[z]}"><i style="background:${ZC[z]}"></i>${ZN[z]} ZAMANLAR</div>
    <div class="cells">${T.filter((t) => t.zone === z).map((t) => `
      <button class="cell ${z}" data-k="${t.k}" type="button">
        <div class="nm">${escapeHtml(t.en)}</div><div class="tr1">${escapeHtml(t.tr)}</div>
        <div class="fm">${escapeHtml(t.pos)}</div>${tlSvg(t, true)}
        <div class="eg">${escapeHtml(t.ex[0][0])}</div>
      </button>`).join('')}</div>`).join('');
  const work = Data.tenses.work.map((w) => {
    const t = T.find((x) => x.k === w[0]);
    return `<tr><td><span class="zchip ${t.zone}">${ZN[t.zone]}</span> ${escapeHtml(t.en)}</td><td><b>${escapeHtml(w[1])}</b></td><td class="tr-only dim">${escapeHtml(w[2])}</td></tr>`;
  }).join('');
  mount(`
    <p class="lead">3 zaman dilimi × 4 görünüş = 12 zaman. Bir kutuya dokun: formül, kullanım, çizgi üzerinde gösterim ve 5 örnek (Türkçesiyle).</p>
    <div class="tbar"><div class="p">GEÇMİŞ ←</div><div class="n">ŞİMDİ</div><div class="f">→ GELECEK</div></div><div class="tarrow"></div>
    <div class="g-card"><div class="g-title" style="font-size:16px">Dört görünüş (aspect) ne anlatır?</div>
      <table class="v-table"><tr><td><b>Simple</b></td><td>Olay, alışkanlık, genel doğru — “ne oldu / ne olur?”</td></tr>
      <tr><td><b>Continuous</b></td><td>O anda <b>süren</b> eylem — “o sırada ne yapıyordu?”</td></tr>
      <tr><td><b>Perfect</b></td><td>O andan <b>önce tamamlanmış</b> eylem / sonuç — “bitti mi?”</td></tr>
      <tr><td><b>Perfect Continuous</b></td><td>O ana kadar <b>süregelen</b> eylem, süre vurgusu — “ne zamandır?”</td></tr></table></div>
    ${zones}
    <div class="section-title">Aynı fiil 12 zamanda</div>
    <div class="g-card"><table class="v-table"><tr><th>Zaman</th><th>work</th><th class="tr-only">Anlamı</th></tr>${work}</table></div>
    <div class="list-group" style="margin-top:14px">${listRow('tests', 'target', 'Zaman testleri', `${PRACTICE_TENSE_MIX} karma · her zaman için ayrı test`)}</div>
  `);
  $all('.cell').forEach((b) => b.addEventListener('click', () => Router.push('tenseDetail', { key: b.dataset.k })));
  $('.list-row').addEventListener('click', () => Router.push('tenseTests'));
}

function renderTenseDetail(params) {
  const T = Data.tenses.tenses; const i = T.findIndex((x) => x.k === params.key); const t = T[i];
  setHeader(t.en);
  const n = Data.grammar.bank.filter((b) => b.topic === 'TENSE' && b.k === t.k).length;
  mount(`
    <div class="hero"><p><span class="zchip ${t.zone}">${ZN[t.zone]}</span></p><h2>${escapeHtml(t.en)}</h2><p class="tr-only">${escapeHtml(t.tr)}</p></div>
    <div class="g-card">${tlSvg(t)}</div>
    <div class="g-card">
      <table class="ftab"><tr><td>Olumlu (+)</td><td><code>${escapeHtml(t.pos)}</code></td></tr>
      <tr><td>Olumsuz (−)</td><td><code>${escapeHtml(t.neg)}</code></td></tr>
      <tr><td>Soru (?)</td><td><code>${escapeHtml(t.q)}</code></td></tr></table>
      <p class="g-note"><b>Ne zaman kullanılır?</b> ${escapeHtml(t.use)}</p>
      <div class="tags">${t.sig.map((s) => `<span class="tagc">${escapeHtml(s)}</span>`).join('')}</div>
      ${t.note ? `<div class="tip"><b>Dikkat:</b> ${escapeHtml(t.note)}</div>` : ''}
    </div>
    <div class="section-title">5 örnek</div>
    <div class="g-card">${exListHtml(t.ex)}</div>
    <button id="btn-test" class="btn btn-primary btn-block">${icon('target', 18)} Bu zamanın testi (${n} soru) ${bestBadge('tn:' + t.k)}</button>
    <div class="nav-row" style="margin-top:12px">
      <button id="btn-prev" class="btn btn-ghost" ${i === 0 ? 'disabled' : ''}>${icon('back', 16)} ${i > 0 ? escapeHtml(T[i - 1].en) : ''}</button>
      <button id="btn-next" class="btn btn-ghost" ${i === T.length - 1 ? 'disabled' : ''}>${i < T.length - 1 ? escapeHtml(T[i + 1].en) : ''} ${icon('chevronRight', 16)}</button>
    </div>
  `);
  $('#btn-test').addEventListener('click', () => Router.push('practiceTest', { kind: 'tn:' + t.k }));
  $('#btn-prev').addEventListener('click', () => Router.replace('tenseDetail', { key: T[i - 1].k }));
  $('#btn-next').addEventListener('click', () => Router.replace('tenseDetail', { key: T[i + 1].k }));
}

function renderTenseTests() {
  setHeader('Zaman Testleri');
  const T = Data.tenses.tenses;
  const mixArr = Array.from({ length: PRACTICE_TENSE_MIX }, (_, k) => `<button class="p-testbtn" data-kind="tmix:${k}"><span>Karma ${k + 1}</span>${bestBadge('tmix:' + k)}</button>`);
  const nName = Data.grammar.bank.filter((b) => b.topic === 'TENSE' && b.k === 'NAME').length;
  const nForm = Data.grammar.bank.filter((b) => b.topic === 'TENSE' && b.k === 'FORM').length;
  mount(`
    <p class="lead">Karma testler 30 çoktan seçmeli soru + 10 cümle kurma içerir. Tek tek zaman testleri o zamanın formunu ve ipuçlarını pekiştirir.</p>
    <div class="p-unit"><div class="p-unit-head"><div><div class="p-unit-title">Karma zaman testleri</div><div class="p-unit-sub">40'ar soru</div></div></div>
      <div class="p-tests p-tests-3">${mixArr.slice(0, 3).join('')}</div>
      <div class="p-tests p-tests-3" style="margin-top:8px">${mixArr.slice(3).join('')}</div></div>
    <div class="list-group">
      ${listRow('tn:NAME', 'sparkle', 'Zaman ismini bul', `${nName} soru`, '', bestBadge('tn:NAME'))}
      ${listRow('tn:FORM', 'pencil', 'Doğru zamanı seç', `${nForm} soru`, '', bestBadge('tn:FORM'))}
    </div>
    <div class="section-title">Tek tek zamanlar</div>
    <div class="list-group">${T.map((t) => listRow('tn:' + t.k, null, t.en, t.tr, `${Data.grammar.bank.filter((b) => b.topic === 'TENSE' && b.k === t.k).length} soru`, bestBadge('tn:' + t.k))).join('')}</div>
  `);
  $all('.p-testbtn').forEach((b) => b.addEventListener('click', () => Router.push('practiceTest', { kind: b.dataset.kind })));
  $all('.list-row').forEach((b) => b.addEventListener('click', () => Router.push('practiceTest', { kind: b.dataset.key })));
}

/* ---------- Gramer Yapıları ---------- */
function renderStructs() {
  setHeader('Gramer Yapıları');
  const S = Data.tenses.structs;
  const cards = S.map((s) => `
    <div class="g-card" id="st-${s.k}">
      <div class="g-title">${escapeHtml(s.title)}</div>
      <div class="mut-sub">${escapeHtml(s.sub)}</div>
      <p class="g-note">${escapeHtml(s.def)}</p>
      <table class="ftab">${s.forms.map((f) => `<tr><td>${escapeHtml(f[0])}</td><td><code>${escapeHtml(f[1])}</code></td></tr>`).join('')}</table>
      <div class="section-title" style="margin-top:12px">5 örnek</div>
      ${exListHtml(s.ex)}
      <div class="tip"><b>Dikkat:</b> ${escapeHtml(s.tip)}</div>
      ${(STRUCT_TESTS[s.k] || [s.k]).map((k) => { const tp = findTopic(k); return tp ? `<button class="btn btn-outline btn-block st-test" data-kind="topic:${k}" style="margin-top:8px">${icon('target', 16)} ${escapeHtml(tp.title)} testi</button>` : ''; }).join('')}
    </div>`).join('');
  mount(`
    <p class="lead">Kursta işlenen yapılar: tanım, kalıplar, 5 örnek ve test bağlantıları. Zamanlar için Zaman Çizelgesi'ne bak.</p>
    <div class="idx">${S.map((s) => `<button class="chip" data-st="${s.k}" type="button">${escapeHtml(s.title.split(' · ')[0])}</button>`).join('')}</div>
    <button class="btn btn-primary btn-block" id="btn-tl" style="margin:8px 0 4px">${icon('clock', 18)} Zaman Çizelgesi</button>
    ${cards}
  `);
  $all('[data-st]').forEach((b) => b.addEventListener('click', () => { const e = document.getElementById('st-' + b.dataset.st); if (e) e.scrollIntoView({ behavior: 'smooth', block: 'start' }); }));
  $all('.st-test').forEach((b) => b.addEventListener('click', () => Router.push('practiceTest', { kind: b.dataset.kind })));
  $('#btn-tl').addEventListener('click', () => Router.push('tenseHub'));
}

/* ---------- Mühendislik Kelimeleri ---------- */
function engWordCard(w, showCat) {
  const cat = showCat ? Data.engCats.find((c) => c.id === w.category.slice(4)) : null;
  return `<div class="wcard"><div class="wh"><span class="wt">${escapeHtml(w.term)}</span> <span class="wtr">${escapeHtml(w.translation)}</span>${w.docHits ? `<span class="wbadge" title="Kaynak belgelerde geçiş sayısı">📄 ${w.docHits}</span>` : ''}</div>
    ${w.sentences.map((s, i) => `<div class="ws"><div class="en">${escapeHtml(s)}</div><div class="trl tr-only">${escapeHtml(w.translations[i])}</div></div>`).join('')}
    ${cat ? `<div class="wcat">${escapeHtml(cat.short)}</div>` : ''}</div>`;
}

function renderEngHub() {
  setHeader('Mühendislik Kelimeleri');
  const all = Data.byCategory('engall');
  const nDoc = all.filter((w) => w.docHits > 0).length;
  const rows = Data.engCats.map((c) => listRow('c:' + c.id, null, c.short, '', c.words.length, c.words.some((w) => w.docHits) ? '' : '')).join('');
  const mix = Array.from({ length: PRACTICE_EVAL_TESTS }, (_, k) => `<button class="p-testbtn" data-kind="evall:${k}"><span>${k + 1}</span>${bestBadge('evall:' + k)}</button>`).join('');
  mount(`
    <p class="lead">BCT Urenco ve RET UFC proje belgelerinden (boru tasarım esası, PMS, vana tanımları, izolasyon, plot plan, 3D model review, hat/tie-in/ekipman listeleri, maliyet kriterleri) çıkarılan piping ve proje yönetimi kelimeleri. ${all.length} terim, her birinde Türkçe karşılık ve 2'şer EN/TR cümle. 📄 işareti terimin belgelerde birebir geçtiğini gösterir (${nDoc} terim).</p>
    <input id="eng-q" class="fillblank-input" style="margin:0 0 6px;text-align:left" type="search" placeholder="Terim veya Türkçe karşılığı ara…" autocomplete="off" autocapitalize="off" spellcheck="false">
    <div id="eng-res"></div>
    <div class="section-title">Kategoriler</div>
    <div class="list-group">${rows}</div>
    <div class="list-group" style="margin-top:12px">${listRow('flash', 'book', 'Tüm kelimeler — kart olarak çalış', `${all.length} kart`)}</div>
    <div class="section-title">Karma testler (tüm kategoriler, 40 soru)</div>
    <div class="p-tests p-tests-mini">${mix}</div>
  `);
  const res = $('#eng-res');
  $('#eng-q').addEventListener('input', (e) => {
    const q = e.target.value.trim().toLowerCase();
    if (q.length < 2) { res.innerHTML = ''; return; }
    const m = all.filter((w) => (w.term + ' ' + w.translation).toLowerCase().includes(q));
    res.innerHTML = `<div class="mut-sub" style="margin:8px 0">${m.length} sonuç${m.length > 30 ? ' (ilk 30 gösteriliyor)' : ''}</div>` + m.slice(0, 30).map((w) => engWordCard(w, true)).join('');
  });
  $all('.list-row').forEach((b) => b.addEventListener('click', () => {
    const k = b.dataset.key;
    if (k === 'flash') startFlashcards('engall', 'words');
    else Router.push('engCat', { id: k.slice(2) });
  }));
  $all('.p-testbtn').forEach((b) => b.addEventListener('click', () => Router.push('practiceTest', { kind: b.dataset.kind })));
}

function renderEngCat(params) {
  const c = Data.engCats.find((x) => x.id === params.id);
  setHeader(c.short);
  const cat = 'eng:' + c.id;
  const nDoc = c.words.filter((w) => w.docHits > 0).length;
  const tests = [0, 1, 2].map((t) => `<button class="p-testbtn" data-kind="ev:${c.id}:${t}"><span>Test ${t + 1}</span>${bestBadge(`ev:${c.id}:${t}`)}</button>`).join('');
  mount(`
    <div class="hero"><p>${c.words.length} terim · ${nDoc} tanesi belgelerde geçiyor</p><h2>${escapeHtml(c.title)}</h2></div>
    <div class="list-group">
      ${listRow('flashcards', 'book', 'Kelime Kartları', 'Öğren · biliyorum / bilmiyorum', c.words.length)}
      ${listRow('test', 'target', 'Çeviri Testi', 'Çoktan seçmeli anlam', Math.min(12, c.words.length))}
      ${listRow('fillblank', 'pencil', 'Boşluk Doldurma', 'Cümledeki eksik terimi yaz', Math.min(12, c.words.length))}
    </div>
    <div class="section-title">40 soruluk testler</div>
    <div class="p-tests p-tests-3">${tests}</div>
    <div class="section-title">Kelimeler</div>
    ${c.words.map((w) => engWordCard(w)).join('')}
  `);
  $all('.list-row').forEach((b) => b.addEventListener('click', () => {
    const k = b.dataset.key;
    if (k === 'flashcards') startFlashcards(cat, 'words');
    else if (k === 'test') startTest(cat);
    else startFillblank(cat);
  }));
  $all('.p-testbtn').forEach((b) => b.addEventListener('click', () => Router.push('practiceTest', { kind: b.dataset.kind })));
}
