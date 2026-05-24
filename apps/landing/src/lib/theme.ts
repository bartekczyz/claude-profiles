/**
 * No-flash theme script. Runs synchronously in <head> before the body
 * paints. Reads localStorage first (for a future explicit toggle),
 * falls back to prefers-color-scheme.
 *
 * Also preloads both app-screenshot variants — high priority on the
 * current theme, low on the other — so the first theme toggle doesn't
 * blink while the off-theme PNG is fetched on demand.
 */
export const themeScript = `
(function() {
  var theme = 'light';
  try {
    var stored = localStorage.getItem('theme');
    var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    theme = stored === 'light' || stored === 'dark' ? stored : (prefersDark ? 'dark' : 'light');
  } catch (error) { /* fall through with 'light' */ }
  document.documentElement.setAttribute('data-theme', theme);
  var other = theme === 'dark' ? 'light' : 'dark';
  function preload(name, priority) {
    var link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = '/screenshot-' + name + '.png';
    link.fetchPriority = priority;
    document.head.appendChild(link);
  }
  preload(theme, 'high');
  preload(other, 'low');
})();
`.trim()
