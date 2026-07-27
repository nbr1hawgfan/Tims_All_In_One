/* ============================================================
   Personal Toolkit — shared utilities
   ============================================================ */

// ---------- Color themes ----------
// Stored in localStorage (not IndexedDB) so every page — even ones that
// don't load db.js — can apply the chosen theme instantly on load.
const TOOLKIT_THEMES = {
  teal:   { name: 'Teal',   swatch: '#0a5870', '--primary': '#0a5870', '--primary-dark': '#073e50', '--primary-light': '#128aa3', '--primary-wash': '#e4f2f5', '--accent': '#d9a441', '--accent-wash': '#fbf1dd' },
  purple: { name: 'Plum',   swatch: '#6b3fa0', '--primary': '#6b3fa0', '--primary-dark': '#4a2b70', '--primary-light': '#8a5cc4', '--primary-wash': '#f0e8f7', '--accent': '#c9506b', '--accent-wash': '#fbe9ee' },
  forest: { name: 'Forest', swatch: '#1f6f4a', '--primary': '#1f6f4a', '--primary-dark': '#144d33', '--primary-light': '#3a9e6f', '--primary-wash': '#e6f5ee', '--accent': '#d9a441', '--accent-wash': '#fbf1dd' },
  sunset: { name: 'Sunset', swatch: '#c15a2e', '--primary': '#c15a2e', '--primary-dark': '#8f3f1e', '--primary-light': '#e07b45', '--primary-wash': '#fbe9e0', '--accent': '#3a7ca5', '--accent-wash': '#e3eef5' },
  berry:  { name: 'Berry',  swatch: '#a13058', '--primary': '#a13058', '--primary-dark': '#74213f', '--primary-light': '#c94d76', '--primary-wash': '#f9e5ec', '--accent': '#d9a441', '--accent-wash': '#fbf1dd' },
  slate:  { name: 'Slate',  swatch: '#34495e', '--primary': '#34495e', '--primary-dark': '#22303d', '--primary-light': '#5c7a91', '--primary-wash': '#e8edf1', '--accent': '#d9a441', '--accent-wash': '#fbf1dd' },
  rainbow: {
    name: 'Rainbow',
    swatch: 'linear-gradient(90deg,#ff4d4d,#ff9f4d,#ffe14d,#6ee06e,#4dd6ff,#6e7bff,#c76eff)',
    '--primary': 'linear-gradient(90deg,#ff4d4d,#ff9f4d,#ffe14d,#6ee06e,#4dd6ff,#6e7bff,#c76eff)',
    '--primary-dark': 'linear-gradient(90deg,#e6394f,#f4813f,#e0bd2f,#4fae65,#3fa9e6,#5c62d6,#a94fe0)',
    '--primary-light': '#8a5cc4',
    '--primary-wash': '#f5eefc',
    '--accent': '#ff6fae',
    '--accent-wash': '#fff0f6',
  },
};
const TOOLKIT_THEME_KEY = 'personal-toolkit-theme';

function toolkitGetTheme() {
  try { return localStorage.getItem(TOOLKIT_THEME_KEY) || 'teal'; } catch (e) { return 'teal'; }
}

function toolkitApplyTheme(themeId) {
  const theme = TOOLKIT_THEMES[themeId] || TOOLKIT_THEMES.teal;
  const root = document.documentElement;
  Object.keys(theme).forEach((key) => {
    if (key.startsWith('--')) root.style.setProperty(key, theme[key]);
  });
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta && !String(theme['--primary']).includes('gradient')) meta.setAttribute('content', theme['--primary']);
}

function toolkitSetTheme(themeId) {
  try { localStorage.setItem(TOOLKIT_THEME_KEY, themeId); } catch (e) {}
  toolkitApplyTheme(themeId);
}

// Apply immediately on every page load, before anything else runs.
toolkitApplyTheme(toolkitGetTheme());

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
