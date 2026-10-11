/* ============================================================
   Personal Toolkit — shared utilities
   ============================================================ */


function toolkitToast(message, opts = {}) {
  let el = document.getElementById('toolkit-toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toolkit-toast';
    el.className = 'toast';
    document.body.appendChild(el);
  }
  el.textContent = message;
  el.className = 'toast show' + (opts.danger ? ' danger' : '');
  clearTimeout(el._timer);
  el._timer = setTimeout(() => {
    el.classList.remove('show');
  }, opts.duration || 2200);
}

// Read a File (from <input type=file>) and resize/compress it to a JPEG data URL.
// Keeps IndexedDB entries small — important since everything lives on-device.
function toolkitFileToResizedDataUrl(file, maxDim = 1280, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Could not read image'));
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round(height * (maxDim / width));
            width = maxDim;
          } else {
            width = Math.round(width * (maxDim / height));
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function toolkitFormatDate(ts) {
  const d = new Date(ts);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function toolkitEscapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str == null ? '' : String(str);
  return div.innerHTML;
}

// Register the service worker (called from every page)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    const swPath = document.body.dataset.swPath || '/sw.js';
    navigator.serviceWorker.register(swPath).catch(() => {
      /* offline caching is a nice-to-have, fail silently */
    });
  });
}

// ============================================================
// App chrome — header icon, bottom tab bar, icons, motion
// ============================================================
(function toolkitChrome() {
  const inPages = /\/pages\//.test(location.pathname);
  const root = inPages ? '../' : '';
  const file = typeof TOOLKIT_PAGE_FILE !== 'undefined' ? TOOLKIT_PAGE_FILE : '';
  const page = typeof TOOLKIT_PAGE !== 'undefined' ? TOOLKIT_PAGE : null;

  function decorate() {
    const icon = (name, size, stroke) => (typeof toolkitIcon === 'function' ? toolkitIcon(name, size, stroke) : '');

    // Header: real back icon + the tool's colored icon chip
    const header = document.querySelector('.app-header');
    if (header && !header.dataset.decorated) {
      header.dataset.decorated = '1';
      const back = header.querySelector('.back-link');
      if (back && /^\s*←\s*$/.test(back.textContent)) back.innerHTML = icon('chevron-left', 22, 2.4);
      const h1 = header.querySelector('h1');
      if (h1 && page && page[1]) {
        const chip = document.createElement('span');
        chip.className = 'hdr-chip';
        chip.innerHTML = icon(page[1], 18, 2.2);
        h1.parentNode.insertBefore(chip, h1.parentNode.firstChild);
        h1.parentNode.classList.add('hdr-title');
      }
    }

    // Bottom tab bar (not on the full-screen highlights feed)
    if (file !== 'highlights.html' && !document.querySelector('.tabbar')) {
      const group = page ? page[0] : null;
      const active = file === 'index.html' || file === '' ? 'home'
        : file === 'settings.html' ? 'settings'
        : group === 'sports' ? 'sports'
        : group === 'family' ? 'family' : 'home';
      const tabs = [
        ['home', 'Home', 'house', root + 'index.html'],
        ['sports', 'Sports', 'goal', root + 'pages/sports.html'],
        ['family', 'Family', 'users', root + 'pages/family.html'],
        ['settings', 'Settings', 'settings', root + 'pages/settings.html'],
      ];
      const bar = document.createElement('nav');
      bar.className = 'tabbar';
      bar.setAttribute('aria-label', 'Main');
      bar.innerHTML = tabs.map(([k, label, ic, href]) =>
        `<a href="${href}" class="${k === active ? 'on' : ''}" ${k === active ? 'aria-current="page"' : ''}>${icon(ic, 22, k === active ? 2.4 : 2)}<span>${label}</span></a>`).join('');
      document.body.appendChild(bar);
      document.body.classList.add('has-tabbar');
    }
    if (typeof toolkitHydrateIcons === 'function') toolkitHydrateIcons();
  }

  // Icons added later by page scripts ([data-icon] placeholders) get drawn automatically
  function watch() {
    if (typeof toolkitHydrateIcons !== 'function' || !window.MutationObserver) return;
    let queued = false;
    new MutationObserver(() => {
      if (queued) return;
      queued = true;
      (window.requestAnimationFrame || ((f) => setTimeout(f, 16)))(() => { queued = false; toolkitHydrateIcons(); });
    }).observe(document.body, { childList: true, subtree: true });
  }

  const run = () => { decorate(); watch(); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
  else setTimeout(run, 0);
})();
