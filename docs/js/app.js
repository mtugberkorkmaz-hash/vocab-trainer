/* App bootstrap: load data, wire the header controls, start the router. */
(async function () {
  const backBtn = document.getElementById('btn-back');
  const trBtn = document.getElementById('btn-translate');
  const homeBtn = document.getElementById('btn-home');
  const toast = document.getElementById('toast');

  backBtn.innerHTML = icon('back', 20) + '<span>Geri</span>';
  homeBtn.innerHTML = icon('home', 21);
  backBtn.addEventListener('click', () => Router.back());
  homeBtn.addEventListener('click', () => Router.reset('menu'));

  let toastTimer = null;
  function showToast(text) {
    toast.textContent = text;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 1600);
  }

  // TR switch: one setting for the whole app. Screens that build their text
  // at render time re-render; long test pages just toggle a body class
  // (.tr-only elements) so in-progress answers are kept.
  function syncTranslate() {
    const on = !!Storage.getSettings().showTranslation;
    trBtn.classList.toggle('on', on);
    trBtn.setAttribute('aria-checked', on ? 'true' : 'false');
    document.body.classList.toggle('tr-off', !on);
    return on;
  }
  trBtn.addEventListener('click', () => {
    const settings = Storage.getSettings();
    settings.showTranslation = !settings.showTranslation;
    Storage.saveSettings(settings);
    const on = syncTranslate();
    showToast(on ? 'Türkçe çeviriler açık' : 'Türkçe çeviriler kapalı');
    const cur = Router.current();
    if (cur && cur.screen !== 'practiceTest') Router.rerender();
  });
  syncTranslate();

  mount('<div class="footnote" style="margin-top:40px;">Yükleniyor…</div>');
  try {
    await Data.load();
  } catch (err) {
    mount('<div class="footnote" style="margin-top:40px;">Veri yüklenemedi. Sayfayı yenilemeyi dene.</div>');
    return;
  }

  Router.init();
  Router.reset('menu');

  if ('serviceWorker' in navigator) {
    // Registered directly (not via window 'load') because by the time the
    // data fetch above resolves, the load event has often already fired.
    navigator.serviceWorker.register('service-worker.js').catch(() => {});
  }
})();
