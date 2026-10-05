/* ============================================================
   Sports — shared helpers for the sports pages
   (scores, team, standings, news, highlights, pick'em)
   Loads after app.js.
   ============================================================ */

const SPORTS_LEAGUES = {
  nfl:   { sport: 'football',   league: 'nfl',                     label: 'NFL', icon: '🏈' },
  nba:   { sport: 'basketball', league: 'nba',                     label: 'NBA', icon: '🏀' },
  mlb:   { sport: 'baseball',   league: 'mlb',                     label: 'MLB', icon: '⚾' },
  ncaaf: { sport: 'football',   league: 'college-football',        label: 'CFB', icon: '🏈' },
  ncaab: { sport: 'basketball', league: 'mens-college-basketball', label: 'CBB', icon: '🏀' },
};
const SPORTS_API = 'https://site.api.espn.com/apis/site/v2/sports';
const SPORTS_API_V2 = 'https://site.api.espn.com/apis/v2/sports';
const SPORTS_API_WEB = 'https://site.web.api.espn.com/apis/common/v3/sports';

function sportsBase(leagueKey) {
  const L = SPORTS_LEAGUES[leagueKey];
  return `${SPORTS_API}/${L.sport}/${L.league}`;
}

async function sportsGetJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error('HTTP ' + res.status);
  return res.json();
}

function sportsImg(src, cls = '', alt = '') {
  const e = toolkitEscapeHtml;
  return src ? `<img src="${e(src)}" class="${cls}" alt="${e(alt)}" loading="lazy" onerror="this.style.visibility='hidden'">` : '';
}

function sportsTeamLogo(team) {
  if (!team) return '';
  return team.logo || (team.logos && team.logos[0] && team.logos[0].href) || '';
}

// ESPN sends scores as "24" on scoreboards and {displayValue:"24"} on schedules
function sportsScore(s) {
  if (s == null) return '';
  if (typeof s === 'object') return s.displayValue != null ? s.displayValue : (s.value != null ? s.value : '');
  return s;
}

function sportsTimeAgo(iso) {
  const t = new Date(iso).getTime();
  if (!t) return '';
  const mins = Math.round((Date.now() - t) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return mins + 'm ago';
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return hrs + 'h ago';
  const days = Math.round(hrs / 24);
  if (days < 7) return days + 'd ago';
  return new Date(t).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

// ---------- Favorite teams (this device only) ----------
const SPORTS_FAV_KEY = 'toolkit-fav-teams';

function sportsGetFavs() {
  try { return JSON.parse(localStorage.getItem(SPORTS_FAV_KEY)) || []; } catch (e) { return []; }
}
function sportsSetFavs(list) {
  try { localStorage.setItem(SPORTS_FAV_KEY, JSON.stringify(list)); } catch (e) {}
}
function sportsIsFav(leagueKey, teamId) {
  return sportsGetFavs().some((f) => f.league === leagueKey && String(f.id) === String(teamId));
}
function sportsToggleFav(leagueKey, team) {
  const favs = sportsGetFavs();
  const i = favs.findIndex((f) => f.league === leagueKey && String(f.id) === String(team.id));
  if (i >= 0) favs.splice(i, 1);
  else favs.push({ league: leagueKey, id: String(team.id), name: team.displayName || team.name || '', abbr: team.abbreviation || '', logo: sportsTeamLogo(team) });
  sportsSetFavs(favs);
  return i < 0; // true = now a favorite
}
function sportsFavIds(leagueKey) {
  return new Set(sportsGetFavs().filter((f) => f.league === leagueKey).map((f) => String(f.id)));
}
function sportsTeamUrl(leagueKey, teamId) {
  return `team.html?league=${encodeURIComponent(leagueKey)}&id=${encodeURIComponent(teamId)}`;
}

// ---------- Section nav strip shown at the top of every sports page ----------
function sportsRenderNav(active) {
  const items = [
    ['scores', 'Scores', 'sports.html'],
    ['standings', 'Standings', 'standings.html'],
    ['news', 'News', 'news.html'],
    ['highlights', 'Highlights', 'highlights.html'],
    ['pickem', "Pick'em", 'pickem.html'],
    ['fantasy', 'Fantasy', 'fantasy.html'],
  ];
  const nav = document.createElement('nav');
  nav.className = 'sports-nav';
  nav.innerHTML = items.map(([k, label, href]) => `<a href="${href}" class="${k === active ? 'active' : ''}">${label}</a>`).join('');
  return nav;
}

// ---------- Favorite-teams picker (bottom sheet) ----------
const sportsTeamListCache = {};

async function sportsLoadTeams(leagueKey) {
  if (sportsTeamListCache[leagueKey]) return sportsTeamListCache[leagueKey];
  const college = leagueKey === 'ncaaf' || leagueKey === 'ncaab';
  const data = await sportsGetJson(`${sportsBase(leagueKey)}/teams?limit=${college ? 1000 : 100}`);
  const teams = (((data.sports || [])[0] || {}).leagues || [])[0];
  const list = ((teams && teams.teams) || []).map((t) => t.team).filter(Boolean);
  list.sort((a, b) => (a.displayName || '').localeCompare(b.displayName || ''));
  sportsTeamListCache[leagueKey] = list;
  return list;
}

function sportsOpenTeamPicker(onDone) {
  const e = toolkitEscapeHtml;
  let league = 'nfl';
  const backdrop = document.createElement('div');
  backdrop.className = 'sheet-backdrop';
  backdrop.innerHTML = `
    <div class="sheet" role="dialog" aria-label="Pick favorite teams">
      <div class="sheet-head">
        <div>
          <div class="sheet-title">My Teams</div>
          <div class="helper-text" style="margin:0;">Tap ☆ to follow a team. Saved on this device.</div>
        </div>
        <button class="icon-btn" data-close aria-label="Close">✕</button>
      </div>
      <div class="pick-tabs">${Object.entries(SPORTS_LEAGUES).map(([k, L]) => `<button data-l="${k}" class="${k === league ? 'active' : ''}">${L.label}</button>`).join('')}</div>
      <input type="search" class="team-search" placeholder="Search teams…" autocomplete="off">
      <div class="team-pick-list"><p class="helper-text">Loading teams…</p></div>
      <button class="btn block" data-close style="margin-top:12px;">Done</button>
    </div>`;
  document.body.appendChild(backdrop);
  document.body.style.overflow = 'hidden';
  const listEl = backdrop.querySelector('.team-pick-list');
  const search = backdrop.querySelector('.team-search');

  const close = () => { backdrop.remove(); document.body.style.overflow = ''; if (onDone) onDone(); };
  backdrop.addEventListener('click', (ev) => { if (ev.target === backdrop || ev.target.closest('[data-close]')) close(); });

  async function render() {
    let teams;
    try { teams = await sportsLoadTeams(league); } catch (err) { listEl.innerHTML = `<p class="helper-text">Couldn’t load teams — check your connection.</p>`; return; }
    const q = search.value.trim().toLowerCase();
    const favs = sportsFavIds(league);
    let shown = teams.filter((t) => !q || (t.displayName || '').toLowerCase().includes(q) || (t.abbreviation || '').toLowerCase() === q || (t.location || '').toLowerCase().includes(q));
    // followed teams first
    shown = shown.filter((t) => favs.has(String(t.id))).concat(shown.filter((t) => !favs.has(String(t.id))));
    const capped = shown.slice(0, 120);
    listEl.innerHTML = capped.map((t) => `
      <div class="team-pick-row" data-id="${e(t.id)}">
        ${sportsImg(sportsTeamLogo(t))}
        <div class="tp-name">${e(t.displayName)}</div>
        <button class="star ${favs.has(String(t.id)) ? 'on' : ''}" aria-label="Follow">${favs.has(String(t.id)) ? '★' : '☆'}</button>
      </div>`).join('') + (shown.length > capped.length ? `<p class="helper-text">Showing ${capped.length} of ${shown.length} — type to search.</p>` : '') + (!shown.length ? `<p class="helper-text">No teams match.</p>` : '');
    listEl.querySelectorAll('.team-pick-row').forEach((row) => {
      row.addEventListener('click', () => {
        const t = teams.find((x) => String(x.id) === row.dataset.id);
        const on = sportsToggleFav(league, t);
        const star = row.querySelector('.star');
        star.classList.toggle('on', on);
        star.textContent = on ? '★' : '☆';
      });
    });
  }

  backdrop.querySelectorAll('.pick-tabs button').forEach((b) => b.addEventListener('click', () => {
    league = b.dataset.l;
    backdrop.querySelectorAll('.pick-tabs button').forEach((x) => x.classList.toggle('active', x === b));
    search.value = '';
    listEl.innerHTML = `<p class="helper-text">Loading teams…</p>`;
    render();
  }));
  search.addEventListener('input', render);
  render();
}

// ---------- Shared styles for the sports pages ----------
(function injectSportsStyles() {
  const css = `
  .hidden { display: none !important; }
  .sports-nav { display: flex; gap: 6px; overflow-x: auto; margin: 0 -18px 14px; padding: 0 18px 2px; scrollbar-width: none; }
  .sports-nav::-webkit-scrollbar { display: none; }
  .sports-nav a { flex-shrink: 0; padding: 7px 13px; border-radius: 999px; border: 1px solid var(--border); background: var(--surface); color: var(--text); text-decoration: none; font-weight: 700; font-size: 0.78rem; }
  .sports-nav a.active { background: var(--primary); color: #fff; border-color: transparent; }
  .league-tabs { display: flex; gap: 6px; margin-bottom: 14px; overflow-x: auto; padding-bottom: 2px; }
  .league-tabs button { flex: 1; min-width: 58px; padding: 9px 6px; border-radius: var(--radius-sm); border: 1px solid var(--border); background: var(--surface); color: var(--text); font-family: var(--font-display); font-weight: 700; font-size: 0.8rem; cursor: pointer; white-space: nowrap; }
  .league-tabs button.active { background: var(--primary); color: #fff; border-color: transparent; }
  .sheet-backdrop { position: fixed; inset: 0; background: rgba(10, 30, 40, 0.45); z-index: 50; display: flex; align-items: flex-end; justify-content: center; }
  .sheet { background: var(--bg); width: 100%; max-width: var(--max-w); max-height: 88vh; overflow-y: auto; border-radius: var(--radius-lg) var(--radius-lg) 0 0; padding: 18px 16px calc(24px + env(safe-area-inset-bottom)); box-shadow: var(--shadow-lg); }
  .sheet-head { display: flex; align-items: flex-start; gap: 10px; margin-bottom: 12px; }
  .sheet-head > div { flex: 1; }
  .sheet-title { font-family: var(--font-display); font-weight: 800; font-size: 1.1rem; }
  .pick-tabs { display: flex; gap: 6px; margin-bottom: 10px; }
  .pick-tabs button { flex: 1; padding: 8px 4px; border-radius: var(--radius-sm); border: 1px solid var(--border); background: var(--surface); color: var(--text); font-weight: 700; font-size: 0.76rem; cursor: pointer; }
  .pick-tabs button.active { background: var(--primary); color: #fff; border-color: transparent; }
  .team-search { width: 100%; padding: 10px 12px; border-radius: var(--radius-sm); border: 1px solid var(--border); font-size: 0.95rem; margin-bottom: 8px; background: var(--surface); color: var(--text); }
  .team-pick-row { display: flex; align-items: center; gap: 10px; padding: 8px 4px; border-bottom: 1px solid var(--border); cursor: pointer; }
  .team-pick-row img { width: 28px; height: 28px; object-fit: contain; }
  .team-pick-row .tp-name { flex: 1; font-weight: 600; font-size: 0.9rem; }
  .star { background: none; border: 0; font-size: 1.3rem; color: var(--text-muted); cursor: pointer; padding: 2px 6px; }
  .star.on { color: var(--accent); }
  .fav-badge { color: var(--accent); font-size: 0.8rem; margin-right: 2px; }
  `;
  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);
})();
