/* Runs in <head> before the page draws, so it opens in the right
   light/dark mode with no flash. Choice is made in Settings → Appearance. */
(function () {
  var mode = 'dark';
  try { mode = localStorage.getItem('personal-toolkit-mode') || 'dark'; } catch (e) {}
  if (mode === 'auto') {
    mode = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  }
  document.documentElement.setAttribute('data-mode', mode === 'light' ? 'light' : 'dark');
})();
