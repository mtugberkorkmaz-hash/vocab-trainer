/* App bootstrap: load data, wire the header controls, start the router. */
(async function () {
  const backBtn = document.getElementById('btn-back');
  const trBtn = document.getElementById('btn-translate');

  backBtn.innerHTML = icon('back', 20);
  trBtn.textContent = '';
  trBtn.appendChild(document.createTextNode('TR'));

  function syncTranslateChip() {
    const settings = Storage.getSettings();
    trBtn.classList.toggle('active', !!settings.showTranslation);
  }

  backBtn.addEventListener('click', () => Router.back());
  trBtn.addEventListener('click', () => {
    const settings = Storage.getSettings();
    settings.showTranslation = !settings.showTranslation;
    Storage.saveSettings(settings);
    syncTranslateChip();
    Router.rerender();
  });

  syncTranslateChip();

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
