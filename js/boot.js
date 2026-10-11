/* ============================================================
   Jennings Hub — runs in <head> on every page, before anything draws:
   light/dark mode, color theme, and each tool's own color.
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

// ---------- Light / dark mode ----------
const TOOLKIT_MODE_KEY = 'personal-toolkit-mode'; // 'dark' (default) | 'light' | 'auto'

function toolkitGetMode() {
  try { return localStorage.getItem(TOOLKIT_MODE_KEY) || 'dark'; } catch (e) { return 'dark'; }
}
function toolkitEffectiveMode() {
  const m = toolkitGetMode();
  if (m === 'auto') return window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  return m === 'light' ? 'light' : 'dark';
}
function toolkitSetMode(mode) {
  try { localStorage.setItem(TOOLKIT_MODE_KEY, mode); } catch (e) {}
  toolkitApplyTheme(toolkitGetTheme());
}
if (window.matchMedia) {
  const mq = window.matchMedia('(prefers-color-scheme: light)');
  const onChange = () => { if (toolkitGetMode() === 'auto') toolkitApplyTheme(toolkitGetTheme()); };
  if (mq.addEventListener) mq.addEventListener('change', onChange); else if (mq.addListener) mq.addListener(onChange);
}

// Blend two #rrggbb colors (t = share of b)
function toolkitMix(a, b, t) {
  const p = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  if (!/^#[0-9a-f]{6}$/i.test(a) || !/^#[0-9a-f]{6}$/i.test(b)) return a;
  const x = p(a), y = p(b);
  return '#' + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, '0')).join('');
}

const TOOLKIT_THEME_KEYS = ['--primary', '--primary-dark', '--primary-light', '--primary-wash', '--accent', '--accent-wash'];

// ---------- Per-tool colors ----------
// Each section has its own color pair, matching its home-screen icon.
const TOOLKIT_GROUPS = {
  sports:   { c1: '#ff6a45', c2: '#e0245e', solid: '#e0245e' },
  family:   { c1: '#ff79bd', c2: '#d0367f', solid: '#d0367f' },
  kitchen:  { c1: '#ffb52e', c2: '#f2681f', solid: '#e8590c' },
  everyday: { c1: '#4c95ff', c2: '#2754d4', solid: '#2f66e8' },
  money:    { c1: '#36d399', c2: '#0f9a7c', solid: '#0f9a7c' },
  notes:    { c1: '#f8cf4a', c2: '#e09a00', solid: '#c77d00' },
  utility:  { c1: '#94a0b2', c2: '#566173', solid: '#5b6b80' },
  vault:    { c1: '#9b7bff', c2: '#5a3dd8', solid: '#6a4be0' },
  fun:      { c1: '#ff79bd', c2: '#b93fd6', solid: '#b93fd6' },
};
// page file → [group, icon]
const TOOLKIT_PAGES = {
  'sports.html': ['sports', 'goal'], 'highlights.html': ['sports', 'clapperboard'], 'pickem.html': ['sports', 'target'],
  'trivia.html': ['sports', 'brain'], 'players.html': ['sports', 'user-search'], 'fantasy.html': ['sports', 'trophy'],
  'standings.html': ['sports', 'list-ordered'], 'news.html': ['sports', 'newspaper'], 'team.html': ['sports', 'goal'],
  'family.html': ['family', 'users'], 'family-calendar.html': ['family', 'calendar-days'], 'family-tasks.html': ['family', 'list-checks'],
  'family-list.html': ['family', 'shopping-basket'], 'birthdays.html': ['family', 'cake'],
  'pantry.html': ['kitchen', 'package'], 'shopping-list.html': ['kitchen', 'shopping-cart'], 'meal-picker.html': ['kitchen', 'utensils'],
  'calculator.html': ['everyday', 'calculator'], 'convert.html': ['everyday', 'ruler'], 'tip.html': ['everyday', 'hand-coins'],
  'translate.html': ['everyday', 'languages'], 'calendar.html': ['everyday', 'calendar-clock'], 'age.html': ['everyday', 'calendar-heart'],
  'currency.html': ['everyday', 'arrow-right-left'], 'sky.html': ['everyday', 'sunrise'], 'holidays.html': ['everyday', 'party-popper'],
  'distance.html': ['everyday', 'car'], 'qr.html': ['everyday', 'qr-code'], 'myip.html': ['everyday', 'globe'],
  'loan.html': ['money', 'landmark'], 'health.html': ['money', 'heart-pulse'],
  'notes.html': ['notes', 'notebook-pen'], 'home-inventory.html': ['notes', 'house'],
  'timer.html': ['utility', 'timer'], 'flashlight.html': ['utility', 'flashlight'], 'scan-anything.html': ['utility', 'scan-line'],
  'password-gen.html': ['vault', 'key-round'], 'vault.html': ['vault', 'lock'], 'cards.html': ['vault', 'id-card'],
  'dice.html': ['fun', 'dices'], 'cats.html': ['fun', 'rainbow'],
  'settings.html': [null, 'settings'],
};
const TOOLKIT_PAGE_FILE = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
const TOOLKIT_PAGE = TOOLKIT_PAGES[TOOLKIT_PAGE_FILE] || null;
const TOOLKIT_COLORFUL_KEY = 'toolkit-colorful';
function toolkitColorful() {
  try { return localStorage.getItem(TOOLKIT_COLORFUL_KEY) !== 'off'; } catch (e) { return true; }
}

function toolkitApplyTheme(themeId) {
  const theme = TOOLKIT_THEMES[themeId] || TOOLKIT_THEMES.teal;
  const root = document.documentElement;
  const mode = toolkitEffectiveMode();
  root.setAttribute('data-mode', mode);
  const isGradient = String(theme['--primary']).includes('gradient');
  const group = TOOLKIT_PAGE && TOOLKIT_PAGE[0] && toolkitColorful() ? TOOLKIT_GROUPS[TOOLKIT_PAGE[0]] : null;
  const surface = mode === 'dark' ? '#141922' : '#ffffff';
  let vars;
  if (group) {
    vars = mode === 'dark' ? {
      '--primary': group.solid,
      '--primary-dark': toolkitMix(group.solid, '#000000', 0.25),
      '--primary-light': toolkitMix(group.c1, '#ffffff', 0.25),
      '--primary-wash': toolkitMix(surface, group.c1, 0.18),
    } : {
      '--primary': group.solid,
      '--primary-dark': toolkitMix(group.solid, '#000000', 0.3),
      '--primary-light': group.c2,
      '--primary-wash': toolkitMix(surface, group.c1, 0.14),
    };
    vars['--accent'] = theme['--accent'];
    vars['--accent-wash'] = toolkitMix(surface, String(theme['--accent']), mode === 'dark' ? 0.16 : 0.18);
    root.setAttribute('data-group', TOOLKIT_PAGE[0]);
  } else if (mode === 'dark') {
    // On a dark background the brighter shade leads, and the "wash" tints get dark
    const solidLight = String(theme['--primary-light']);
    vars = {
      '--primary': isGradient ? theme['--primary'] : solidLight,
      '--primary-dark': isGradient ? theme['--primary-dark'] : theme['--primary'],
      '--primary-light': toolkitMix(solidLight, '#ffffff', 0.35),
      '--primary-wash': toolkitMix(surface, solidLight, 0.18),
      '--accent': theme['--accent'],
      '--accent-wash': toolkitMix(surface, String(theme['--accent']), 0.16),
    };
    root.removeAttribute('data-group');
  } else {
    vars = {};
    TOOLKIT_THEME_KEYS.forEach((k) => { vars[k] = theme[k]; });
    root.removeAttribute('data-group');
  }
  TOOLKIT_THEME_KEYS.forEach((k) => root.style.setProperty(k, vars[k]));
  // Gradient pair used by page headers, hero panels and the ambient glow
  const solid = isGradient ? '#8a5cc4' : String(theme['--primary-light']);
  root.style.setProperty('--c1', group ? group.c1 : toolkitMix(solid, '#ffffff', 0.15));
  root.style.setProperty('--c2', group ? group.c2 : (isGradient ? '#6b3fa0' : String(theme['--primary'])));
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', mode === 'dark' ? '#0b0e13' : '#f3f6f8');
}

function toolkitSetTheme(themeId) {
  try { localStorage.setItem(TOOLKIT_THEME_KEY, themeId); } catch (e) {}
  toolkitApplyTheme(themeId);
}

// Apply immediately on every page load, before anything else runs.
toolkitApplyTheme(toolkitGetTheme());

function toolkitSetColorful(on) {
  try { localStorage.setItem(TOOLKIT_COLORFUL_KEY, on ? 'on' : 'off'); } catch (e) {}
  toolkitApplyTheme(toolkitGetTheme());
}
