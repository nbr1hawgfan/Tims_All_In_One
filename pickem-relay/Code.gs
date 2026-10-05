/**
 * Family Pick'em — backend for the All-In-One app's pickem.html.
 *
 * Lives in a Google Sheet (Extensions → Apps Script). The Sheet is the
 * database: Players, Picks and Games tabs are created automatically.
 *
 * Script Properties (Project Settings → Script Properties):
 *   GROUP_CODE     required — the invite code people type to join (e.g. JENNINGS26)
 *   GROUP_NAME     optional — shown at the top of the app (e.g. "Jennings Family Pick'em")
 *   ADMIN_PIN      optional — lets you reset someone's PIN from the app's Invite tab
 *   COLLEGE_GAMES  optional — how many big college games to add each week (default 5, 0 = none)
 *
 * Deploy → New deployment → Web app → Execute as: Me, Who has access: Anyone.
 *
 * Rules:
 *   - Every NFL game that week + the top college games (by AP ranking).
 *   - 1 point per correct pick. Ties (rare) count as wrong for everyone.
 *   - Picks lock at each game's kickoff — the server checks the time, so
 *     nobody can sneak a pick in late. Other people's picks stay hidden
 *     until that game locks.
 */

const ESPN = 'https://site.api.espn.com/apis/site/v2/sports/football';
const TZ = 'America/Chicago';
const SHEETS = {
  Players: ['key', 'name', 'salt', 'hash', 'joined'],
  Picks:   ['weekKey', 'gameId', 'playerKey', 'pick', 'updated'],
  Games:   ['weekKey', 'gameId', 'json', 'updated'],
};

// ============================================================
// Entry points
// ============================================================
function doGet() {
  return out_({ ok: true, app: 'pickem', group: groupName_() });
}

function doPost(e) {
  let req;
  try { req = JSON.parse((e && e.postData && e.postData.contents) || '{}'); }
  catch (err) { return out_({ error: 'Bad request.' }); }
  try {
    return out_(handle_(req));
  } catch (err) {
    return out_({ error: String(err && err.message ? err.message : err) });
  }
}

function handle_(req) {
  const action = String(req.action || '');
  checkCode_(req.code);
  if (action === 'join') return join_(req);
  if (action === 'resetPin') return resetPin_(req);
  const player = auth_(req);
  if (action === 'week') return week_(req, player);
  if (action === 'save') return save_(req, player);
  if (action === 'leaderboard') return leaderboard_(req, player);
  throw new Error('Unknown action.');
}

function out_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// ============================================================
// Players & PINs
// ============================================================
function props_() { return PropertiesService.getScriptProperties(); }
function groupName_() { return props_().getProperty('GROUP_NAME') || "Family Pick'em"; }

function checkCode_(code) {
  const real = String(props_().getProperty('GROUP_CODE') || '').trim().toUpperCase();
  if (!real) throw new Error('Pick\'em isn\'t set up yet: add GROUP_CODE in Script Properties.');
  if (String(code || '').trim().toUpperCase() !== real) throw new Error('That group code isn\'t right.');
}

function nameKey_(name) { return String(name || '').trim().replace(/\s+/g, ' ').toLowerCase(); }

function hashPin_(salt, pin) {
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, salt + ':' + pin, Utilities.Charset.UTF_8);
  return Utilities.base64Encode(bytes);
}

function validPin_(pin) { return /^\d{4}$/.test(String(pin || '')); }

function findPlayer_(key) {
  const rows = rows_('Players');
  for (let i = 0; i < rows.length; i++) if (String(rows[i][0]) === key) return { row: i + 2, key: rows[i][0], name: rows[i][1], salt: rows[i][2], hash: rows[i][3] };
  return null;
}

// Slow down PIN guessing: 6 wrong tries locks that name for 10 minutes
function guardAttempts_(key, failed) {
  const cache = CacheService.getScriptCache();
  const ck = 'fail_' + key;
  const n = parseInt(cache.get(ck) || '0', 10);
  if (!failed) { if (n >= 6) throw new Error('Too many wrong PINs — wait 10 minutes and try again.'); return; }
  cache.put(ck, String(n + 1), 600);
}

function auth_(req) {
  const key = nameKey_(req.name);
  if (!key) throw new Error('Enter your name.');
  guardAttempts_(key, false);
  const p = findPlayer_(key);
  if (!p) throw new Error('No player named "' + String(req.name).trim() + '" — join first.');
  if (hashPin_(p.salt, String(req.pin)) !== p.hash) { guardAttempts_(key, true); throw new Error('Wrong PIN.'); }
  return p;
}

function join_(req) {
  const name = String(req.name || '').trim().replace(/\s+/g, ' ');
  const key = nameKey_(name);
  if (!key || name.length > 20) throw new Error('Pick a name up to 20 characters.');
  if (!validPin_(req.pin)) throw new Error('PIN must be 4 digits.');
  guardAttempts_(key, false);
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const existing = findPlayer_(key);
    if (existing) {
      if (hashPin_(existing.salt, String(req.pin)) === existing.hash) return { ok: true, player: existing.name, group: groupName_(), returning: true };
      guardAttempts_(key, true);
      throw new Error('"' + existing.name + '" is already playing. If that\'s you, check your PIN — otherwise pick a different name.');
    }
    const salt = Utilities.getUuid();
    sheet_('Players').appendRow([key, name, salt, hashPin_(salt, String(req.pin)), new Date()]);
    return { ok: true, player: name, group: groupName_(), returning: false };
  } finally {
    lock.releaseLock();
  }
}

function resetPin_(req) {
  const admin = props_().getProperty('ADMIN_PIN');
  if (!admin) throw new Error('No ADMIN_PIN set in Script Properties.');
  if (String(req.adminPin || '') !== String(admin)) throw new Error('Admin PIN is wrong.');
  if (!validPin_(req.newPin)) throw new Error('New PIN must be 4 digits.');
  const p = findPlayer_(nameKey_(req.target));
  if (!p) throw new Error('No player with that name.');
  const salt = Utilities.getUuid();
  sheet_('Players').getRange(p.row, 3, 1, 2).setValues([[salt, hashPin_(salt, String(req.newPin))]]);
  CacheService.getScriptCache().remove('fail_' + p.key);
  return { ok: true, message: 'PIN reset for ' + p.name + '.' };
}

// ============================================================
// Sheets helpers
// ============================================================
function sheet_(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    // Plain text everywhere so Sheets never turns keys or IDs into numbers/dates
    sh.getRange(1, 1, sh.getMaxRows(), SHEETS[name].length).setNumberFormat('@');
    sh.getRange(1, 1, 1, SHEETS[name].length).setValues([SHEETS[name]]).setFontWeight('bold');
    sh.setFrozenRows(1);
  }
  return sh;
}

function rows_(name) {
  const sh = sheet_(name);
  const last = sh.getLastRow();
  if (last < 2) return [];
  return sh.getRange(2, 1, last - 1, SHEETS[name].length).getValues();
}

// ============================================================
// Weeks & games (from ESPN)
// ============================================================
const POST_LABELS = { 1: 'Wild Card', 2: 'Divisional Round', 3: 'Conference Championships', 4: 'Pro Bowl', 5: 'Super Bowl' };

function weekLabel_(type, week) {
  if (type === 1) return 'Preseason Week ' + week;
  if (type === 3) return POST_LABELS[week] || 'Playoffs Week ' + week;
  return 'Week ' + week;
}

function weekKey_(year, type, week) { return 'W' + year + '_' + type + '_' + week; }

function parseWeekKey_(k) {
  const p = String(k).replace(/^W/, '').split('_').map(Number);
  if (p.length !== 3 || p.some(isNaN)) throw new Error('Bad week.');
  return { year: p[0], type: p[1], week: p[2] };
}

// Regular season weeks 1–18, then playoffs (skipping the Pro Bowl week)
function neighbors_(type, week) {
  const seq = [];
  for (let w = 1; w <= 18; w++) seq.push([2, w]);
  [1, 2, 3, 5].forEach(function (w) { seq.push([3, w]); });
  const i = seq.findIndex(function (s) { return s[0] === type && s[1] === week; });
  return {
    prev: i > 0 ? { type: seq[i - 1][0], week: seq[i - 1][1] } : null,
    next: i >= 0 && i < seq.length - 1 ? { type: seq[i + 1][0], week: seq[i + 1][1] } : null,
  };
}

function fetchJson_(url) {
  const res = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
  if (res.getResponseCode() !== 200) throw new Error('ESPN is not responding right now — try again in a minute.');
  return JSON.parse(res.getContentText());
}

function trimGame_(ev, league) {
  const comp = (ev.competitions || [])[0] || {};
  const st = (comp.status || ev.status || {}).type || {};
  const side = function (c) {
    if (!c) return null;
    const t = c.team || {};
    const rank = c.curatedRank && c.curatedRank.current && c.curatedRank.current < 99 ? c.curatedRank.current : null;
    const rec = c.records && c.records[0] ? c.records[0].summary : '';
    return { id: String(t.id || ''), abbr: t.abbreviation || '', name: t.shortDisplayName || t.displayName || '', logo: t.logo || '', rank: rank, record: rec, score: c.score != null ? String(c.score) : '' };
  };
  const cs = comp.competitors || [];
  const home = cs.filter(function (c) { return c.homeAway === 'home'; })[0];
  const away = cs.filter(function (c) { return c.homeAway === 'away'; })[0];
  let winner = null;
  if (st.state === 'post' && home && away) {
    if (home.winner === true) winner = 'home';
    else if (away.winner === true) winner = 'away';
    else {
      const hs = parseFloat(home.score), as = parseFloat(away.score);
      winner = hs > as ? 'home' : (as > hs ? 'away' : 'tie');
    }
  }
  return { id: String(ev.id), league: league, kickoff: ev.date, state: st.state || 'pre', detail: st.shortDetail || '', home: side(home), away: side(away), winner: winner };
}

function ymd_(d) { return Utilities.formatDate(d, 'America/New_York', 'yyyyMMdd'); }

function collegeGames_(nflEvents) {
  const howMany = parseInt(props_().getProperty('COLLEGE_GAMES') || '5', 10);
  if (!howMany || !nflEvents.length) return [];
  const times = nflEvents.map(function (e) { return new Date(e.date).getTime(); });
  const start = new Date(Math.min.apply(null, times) - 2 * 86400000);
  const end = new Date(Math.max.apply(null, times));
  let data;
  try { data = fetchJson_(ESPN + '/college-football/scoreboard?groups=80&limit=400&dates=' + ymd_(start) + '-' + ymd_(end)); }
  catch (err) { return []; }
  const scored = (data.events || []).map(function (ev) {
    const g = trimGame_(ev, 'ncaaf');
    if (!g.home || !g.away) return null;
    const r1 = g.home.rank, r2 = g.away.rank;
    if (!r1 && !r2) return null;
    // Two ranked teams beat one; lower combined rank = bigger game
    const score = r1 && r2 ? r1 + r2 : 60 + (r1 || r2);
    return { g: g, score: score };
  }).filter(Boolean);
  scored.sort(function (a, b) { return a.score - b.score; });
  return scored.slice(0, howMany).map(function (s) { return s.g; });
}

/**
 * The games for a week. year/type/week may be blank → the current NFL week.
 * Cached briefly so a whole family refreshing doesn't hammer ESPN.
 */
function getWeek_(year, type, week) {
  const cache = CacheService.getScriptCache();
  const ck = year && type && week ? 'wk_' + weekKey_(year, type, week) : 'wk_current';
  const hit = cache.get(ck);
  if (hit) return JSON.parse(hit);

  const url = year && type && week
    ? ESPN + '/nfl/scoreboard?seasontype=' + type + '&week=' + week + '&dates=' + year
    : ESPN + '/nfl/scoreboard';
  const data = fetchJson_(url);
  const y = (data.season && data.season.year) || year;
  const t = (data.season && data.season.type) || type || 2;
  const w = (data.week && data.week.number) || week || 1;
  const events = data.events || [];
  const games = events.map(function (ev) { return trimGame_(ev, 'nfl'); });
  const college = collegeGames_(events);
  const all = games.concat(college).sort(function (a, b) { return new Date(a.kickoff) - new Date(b.kickoff); });
  const info = { year: y, type: t, week: w, weekKey: weekKey_(y, t, w), label: weekLabel_(t, w), games: all };

  saveGames_(info.weekKey, all);
  const active = all.some(function (g) { return g.state !== 'post'; });
  const json = JSON.stringify(info);
  if (json.length < 95000) cache.put(ck, json, active ? 90 : 21600);
  if (ck === 'wk_current' && json.length < 95000) cache.put('wk_' + info.weekKey, json, active ? 90 : 21600);
  return info;
}

function saveGames_(weekKey, games) {
  const sh = sheet_('Games');
  const rows = rows_('Games');
  const index = {};
  rows.forEach(function (r, i) { index[r[0] + '|' + r[1]] = i + 2; });
  const now = new Date();
  const appends = [];
  games.forEach(function (g) {
    const k = weekKey + '|' + g.id;
    const row = [weekKey, g.id, JSON.stringify(g), now];
    if (index[k]) sh.getRange(index[k], 1, 1, 4).setValues([row]);
    else appends.push(row);
  });
  if (appends.length) sh.getRange(sh.getLastRow() + 1, 1, appends.length, 4).setNumberFormat('@').setValues(appends);
}

function isLocked_(g) {
  return g.state !== 'pre' || new Date().getTime() >= new Date(g.kickoff).getTime();
}

// ============================================================
// Actions
// ============================================================
function week_(req, player) {
  const info = req.weekKey ? (function () { const p = parseWeekKey_(req.weekKey); return getWeek_(p.year, p.type, p.week); })() : getWeek_();
  const players = rows_('Players');
  const nameOf = {};
  players.forEach(function (r) { nameOf[r[0]] = r[1]; });
  const picks = rows_('Picks').filter(function (r) { return String(r[0]) === info.weekKey; });

  const myPicks = {};
  const byGame = {};     // revealed picks for locked games
  const counts = {};     // how many people have picked each side (no names) for open games
  const score = {};      // weekly standings
  const gameById = {};
  info.games.forEach(function (g) { gameById[g.id] = g; });

  picks.forEach(function (r) {
    const gid = String(r[1]), pk = String(r[2]), side = String(r[3] || '');
    const g = gameById[gid];
    if (!g) return;
    if (pk === player.key && side) myPicks[gid] = side;
    if (!side) return;
    if (isLocked_(g)) {
      (byGame[gid] = byGame[gid] || []).push({ name: nameOf[pk] || pk, pick: side });
    } else {
      counts[gid] = counts[gid] || { home: 0, away: 0 };
      if (side === 'home' || side === 'away') counts[gid][side]++;
    }
    if (!score[pk]) score[pk] = { name: nameOf[pk] || pk, correct: 0, decided: 0, picked: 0 };
    score[pk].picked++;
    if (g.winner) { score[pk].decided++; if (g.winner === side) score[pk].correct++; }
  });

  const standings = Object.keys(score).map(function (k) { return score[k]; })
    .sort(function (a, b) { return b.correct - a.correct || a.name.localeCompare(b.name); });
  const nb = neighbors_(info.type, info.week);
  return {
    ok: true, group: groupName_(), player: player.name, now: new Date().toISOString(),
    weekKey: info.weekKey, label: info.label, year: info.year, type: info.type, week: info.week,
    prev: nb.prev ? weekKey_(info.year, nb.prev.type, nb.prev.week) : null,
    next: nb.next ? weekKey_(info.year, nb.next.type, nb.next.week) : null,
    games: info.games, myPicks: myPicks, revealed: byGame, counts: counts, standings: standings,
    playerCount: players.length,
  };
}

function save_(req, player) {
  if (!req.weekKey) throw new Error('Missing week.');
  const p = parseWeekKey_(req.weekKey);
  const info = getWeek_(p.year, p.type, p.week);
  const gameById = {};
  info.games.forEach(function (g) { gameById[g.id] = g; });
  const wanted = req.picks || {};

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sh = sheet_('Picks');
    const rows = rows_('Picks');
    const index = {};
    rows.forEach(function (r, i) { if (String(r[0]) === info.weekKey && String(r[2]) === player.key) index[String(r[1])] = i + 2; });
    const now = new Date();
    const saved = [], rejected = [], appends = [];
    Object.keys(wanted).forEach(function (gid) {
      const side = wanted[gid];
      const g = gameById[gid];
      if (!g || (side !== 'home' && side !== 'away' && side !== '')) { rejected.push({ gameId: gid, reason: 'Not in this week' }); return; }
      if (isLocked_(g)) { rejected.push({ gameId: gid, reason: 'Locked — game already started' }); return; }
      if (index[gid]) sh.getRange(index[gid], 4, 1, 2).setValues([[side, now]]);
      else if (side) appends.push([info.weekKey, gid, player.key, side, now]);
      saved.push(gid);
    });
    if (appends.length) sh.getRange(sh.getLastRow() + 1, 1, appends.length, 5).setNumberFormat('@').setValues(appends);
    return { ok: true, saved: saved, rejected: rejected };
  } finally {
    lock.releaseLock();
  }
}

function leaderboard_(req, player) {
  const players = rows_('Players');
  const nameOf = {};
  players.forEach(function (r) { nameOf[r[0]] = r[1]; });
  const allPicks = rows_('Picks');
  const year = req.year ? String(req.year) : null;
  const weekKeys = {};
  allPicks.forEach(function (r) { if (r[3] && (!year || String(r[0]).indexOf('W' + year + '_') === 0)) weekKeys[r[0]] = true; });

  // Results per week: stored games, refreshed from ESPN if a started game has no result yet
  const stored = {};
  rows_('Games').forEach(function (r) { (stored[r[0]] = stored[r[0]] || {})[String(r[1])] = JSON.parse(r[2]); });
  const results = {};
  Object.keys(weekKeys).forEach(function (wk) {
    let games = stored[wk] || {};
    const stale = Object.keys(games).some(function (id) { const g = games[id]; return !g.winner && isLocked_(g); });
    if (stale || !Object.keys(games).length) {
      try {
        const p = parseWeekKey_(wk);
        const info = getWeek_(p.year, p.type, p.week);
        games = {};
        info.games.forEach(function (g) { games[g.id] = g; });
      } catch (err) { /* keep what we have */ }
    }
    results[wk] = games;
  });

  const totals = {};
  const weekly = {}; // wk -> {playerKey: correct}
  players.forEach(function (r) { totals[r[0]] = { name: r[1], correct: 0, decided: 0, picked: 0, weekWins: 0 }; });
  allPicks.forEach(function (r) {
    const wk = String(r[0]), gid = String(r[1]), pk = String(r[2]), side = String(r[3] || '');
    if (!weekKeys[wk] || !totals[pk] || !side) return;
    const g = results[wk] && results[wk][gid];
    totals[pk].picked++;
    weekly[wk] = weekly[wk] || {};
    weekly[wk][pk] = weekly[wk][pk] || 0;
    if (g && g.winner) {
      totals[pk].decided++;
      if (g.winner === side) { totals[pk].correct++; weekly[wk][pk]++; }
    }
  });

  // Weekly wins: most correct picks in a week where every game is final (ties share it)
  const weeks = [];
  Object.keys(weekly).sort(function (a, b) {
    const x = parseWeekKey_(a), y = parseWeekKey_(b);
    return x.year - y.year || x.type - y.type || x.week - y.week;
  }).forEach(function (wk) {
    const games = results[wk] || {};
    const ids = Object.keys(games);
    const complete = ids.length > 0 && ids.every(function (id) { return !!games[id].winner; });
    const best = Math.max.apply(null, Object.keys(weekly[wk]).map(function (k) { return weekly[wk][k]; }));
    const winners = complete && best > 0 ? Object.keys(weekly[wk]).filter(function (k) { return weekly[wk][k] === best; }) : [];
    winners.forEach(function (k) { if (totals[k]) totals[k].weekWins++; });
    const p = parseWeekKey_(wk);
    weeks.push({ weekKey: wk, label: weekLabel_(p.type, p.week), complete: complete, best: best, winners: winners.map(function (k) { return nameOf[k] || k; }) });
  });

  const table = Object.keys(totals).map(function (k) { return totals[k]; })
    .sort(function (a, b) { return b.correct - a.correct || b.weekWins - a.weekWins || a.name.localeCompare(b.name); });
  return { ok: true, group: groupName_(), player: player.name, table: table, weeks: weeks };
}

/** Run once from the editor to check setup before deploying (approve permissions when asked). */
function testSetup() {
  Object.keys(SHEETS).forEach(sheet_);
  const code = props_().getProperty('GROUP_CODE');
  Logger.log(code ? 'GROUP_CODE is set: ' + code : 'Add GROUP_CODE in Project Settings → Script Properties.');
  const info = getWeek_();
  Logger.log(info.label + ' — ' + info.games.length + ' games (' + info.games.filter(function (g) { return g.league === 'ncaaf'; }).length + ' college)');
}
