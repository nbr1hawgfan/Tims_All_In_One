/**
 * ESPN Fantasy relay for Tim's All-In-One toolkit.
 *
 * Why this exists: ESPN won't hand league data straight to a browser app
 * for private leagues (and sometimes not even for public ones). This script
 * fetches it server-side from Google, then passes the JSON back to the app.
 *
 * Setup (one time):
 *   1. script.google.com → New project → paste this file in as Code.gs.
 *   2. Project Settings (gear) → Script Properties → add:
 *        LEAGUE_ID   your league number (required — the relay only serves this league)
 *        ESPN_S2     espn_s2 cookie value   (only for private leagues)
 *        SWID        SWID cookie value, including the { } braces (only for private leagues)
 *   3. Deploy → New deployment → Web app
 *        Execute as: Me    Who has access: Anyone
 *   4. Copy the /exec URL into the app's Fantasy settings → Relay URL.
 *
 * The cookies stay in Script Properties on Google's side; they never go to the
 * app or the GitHub repo.
 */

const VIEWS = ['mSettings', 'mTeam', 'mRoster', 'mMatchup', 'mMatchupScore', 'mScoreboard', 'mBoxscore', 'mStatus'];

function doGet(e) {
  const props = PropertiesService.getScriptProperties();
  const allowedLeague = String(props.getProperty('LEAGUE_ID') || '').trim();
  const p = (e && e.parameter) || {};
  const leagueId = String(p.leagueId || '').replace(/\D/g, '');
  const season = String(p.season || '').replace(/\D/g, '') || String(new Date().getFullYear());
  const week = String(p.week || '').replace(/\D/g, '');

  if (!allowedLeague) return json_({ error: 'Relay not set up: add LEAGUE_ID in Script Properties.' });
  if (!leagueId || leagueId !== allowedLeague) return json_({ error: 'This relay is only set up for league ' + allowedLeague + '.' });

  let url = 'https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/' + season +
            '/segments/0/leagues/' + leagueId + '?' + VIEWS.map(function (v) { return 'view=' + v; }).join('&');
  if (week) url += '&scoringPeriodId=' + week;

  const headers = { 'Accept': 'application/json' };
  const s2 = props.getProperty('ESPN_S2');
  const swid = props.getProperty('SWID');
  if (s2 && swid) headers['Cookie'] = 'espn_s2=' + s2 + '; SWID=' + swid;

  // Short cache so several family members refreshing at once don't hammer ESPN
  const cache = CacheService.getScriptCache();
  const cacheKey = 'ff_' + leagueId + '_' + season + '_' + (week || 'cur');
  const cached = cache.get(cacheKey);
  if (cached) return ContentService.createTextOutput(cached).setMimeType(ContentService.MimeType.JSON);

  let res;
  try {
    res = UrlFetchApp.fetch(url, { headers: headers, muteHttpExceptions: true, followRedirects: true });
  } catch (err) {
    return json_({ error: 'Relay could not reach ESPN: ' + err });
  }
  const code = res.getResponseCode();
  const body = res.getContentText();
  if (code === 401) return json_({ error: 'ESPN says this league is private. Add (or refresh) ESPN_S2 and SWID in Script Properties.' });
  if (code !== 200) return json_({ error: 'ESPN returned status ' + code + '. Check the League ID and season.' });

  // CacheService caps values at 100KB; big leagues just skip the cache
  if (body.length < 95000) {
    try { cache.put(cacheKey, body, 60); } catch (ignore) {}
  }
  return ContentService.createTextOutput(body).setMimeType(ContentService.MimeType.JSON);
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/** Run this once from the editor to check your setup before deploying. */
function testRelay() {
  const id = PropertiesService.getScriptProperties().getProperty('LEAGUE_ID');
  const out = doGet({ parameter: { leagueId: id, season: String(new Date().getFullYear()) } });
  const data = JSON.parse(out.getContent());
  if (data.error) Logger.log('Problem: ' + data.error);
  else Logger.log('OK — ' + ((data.settings && data.settings.name) || 'league') + ', ' + (data.teams || []).length + ' teams');
}
