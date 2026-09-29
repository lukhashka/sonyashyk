// Runs before first paint (same-origin script, allowed by the CSP) to avoid a light-theme flash.
(function () {
  try {
    var mode = localStorage.getItem('theme') || 'light';
    var dark =
      mode === 'dark' || (mode === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', dark ? '#221819' : '#FFFBF9');
  } catch {
    /* storage unavailable: keep the default light theme */
  }
})();
