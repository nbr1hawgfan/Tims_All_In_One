/* ============================================================
   Family Hub — shared sign-in + server calls for the family features
   (Pick'em, Family List, Birthdays, Daily Trivia). Everyone signs in
   once with the group code, their name and a 4-digit PIN; the same
   sign-in is shared by every family page on this phone.
   Needs: app.js, pickem-config.js (for PICKEM_RELAY_URL).
   ============================================================ */

const FAMILY_SESSION_KEY = 'toolkit-pickem';
const FAMILY_RELAY_KEY = 'toolkit-pickem-relay';

function familyLs(k, v) {
  try {
    if (arguments.length === 1) return localStorage.getItem(k);
    if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v);
  } catch (e) { return null; }
  return null;
}

function familyRelay() {
  return (typeof PICKEM_RELAY_URL !== 'undefined' && PICKEM_RELAY_URL) || familyLs(FAMILY_RELAY_KEY) || '';
}

function familySession() {
  try {
    const s = JSON.parse(familyLs(FAMILY_SESSION_KEY));
    return s && s.code && s.name && s.pin ? s : null;
  } catch (e) { return null; }
}

function familyIsAuthError(msg) { return /Wrong PIN|No player|group code|join first/i.test(String(msg || '')); }

async function familyApi(action, extra, sessionOverride) {
  const relay = familyRelay();
  if (!relay) throw new Error('The Family Hub isn’t set up yet.');
  const body = Object.assign({ action }, sessionOverride || familySession() || {}, extra || {});
  let res;
  try {
    // text/plain body keeps this a "simple" request that Apps Script can answer cross-site
    res = await fetch(relay, { method: 'POST', body: JSON.stringify(body) });
  } catch (e) {
    throw new Error('Can’t reach the family server — check your connection.');
  }
  let json;
  try { json = await res.json(); } catch (e) { throw new Error('The family server sent something unexpected. Is the web app deployed with access “Anyone”?'); }
  if (json.error) {
    if (familyIsAuthError(json.error) && !sessionOverride) familyLs(FAMILY_SESSION_KEY, null);
    throw new Error(json.error);
  }
  return json;
}

/**
 * Shows the sign-in card in `container` if needed, then calls onReady(session).
 * Pages call this once on load; if a later call fails with a sign-in error,
 * call it again and the person is asked to sign back in.
 */
function familyGate(container, onReady, opts = {}) {
  const e = toolkitEscapeHtml;
  if (!familyRelay()) {
    container.innerHTML = `
      <div class="card">
        <h3>Family features aren’t connected yet</h3>
        <p class="helper-text">This runs on the same Google Sheet as Family Pick'em. Set that up first (README → “Family Pick'em”), then come back.</p>
        <a class="btn" href="pickem.html">Go to Pick'em setup</a>
      </div>`;
    return;
  }
  const s = familySession();
  if (s) { onReady(s); return; }
  const prefill = new URLSearchParams(location.search).get('code') || '';
  container.innerHTML = `
    <div class="card fam-join">
      <h3>${e(opts.title || 'Sign in to the family group')}</h3>
      <p class="helper-text">${e(opts.blurb || 'Same group code, name and PIN as Family Pick\'em. New? Pick a name and PIN to join.')}</p>
      <div class="fam-err"></div>
      <label for="fj-code">Group code</label>
      <input type="text" id="fj-code" autocapitalize="characters" autocomplete="off" value="${e(prefill)}">
      <label for="fj-name">Your name</label>
      <input type="text" id="fj-name" maxlength="20" autocomplete="nickname">
      <label for="fj-pin">4-digit PIN</label>
      <input type="password" id="fj-pin" inputmode="numeric" maxlength="4" autocomplete="off" style="letter-spacing:0.4em;font-family:var(--font-mono)">
      <button class="btn block" id="fj-go">Sign in</button>
    </div>`;
  const go = container.querySelector('#fj-go');
  go.addEventListener('click', async () => {
    const code = container.querySelector('#fj-code').value.trim().toUpperCase();
    const name = container.querySelector('#fj-name').value.trim();
    const pin = container.querySelector('#fj-pin').value.trim();
    const err = container.querySelector('.fam-err');
    err.innerHTML = '';
    if (!code || !name) { err.innerHTML = `<p class="chip danger" style="margin-bottom:12px">Enter the group code and your name.</p>`; return; }
    if (!/^\d{4}$/.test(pin)) { err.innerHTML = `<p class="chip danger" style="margin-bottom:12px">PIN must be 4 digits.</p>`; return; }
    go.disabled = true; go.textContent = 'Signing in…';
    try {
      const r = await familyApi('join', {}, { code, name, pin });
      const session = { code, name: r.player, pin };
      familyLs(FAMILY_SESSION_KEY, JSON.stringify(session));
      toolkitToast(r.returning ? `Welcome back, ${r.player}!` : `You’re in, ${r.player}!`);
      onReady(session);
    } catch (ex) {
      err.innerHTML = `<p class="chip danger" style="margin-bottom:12px;white-space:normal">${e(ex.message)}</p>`;
      go.disabled = false; go.textContent = 'Sign in';
    }
  });
}

// ---------- Birthdays & anniversaries helpers (also used by the home screen) ----------
const FAMILY_DATES_CACHE = 'toolkit-family-dates-cache';

function familyCachedDates() {
  try { return JSON.parse(familyLs(FAMILY_DATES_CACHE)) || []; } catch (e) { return []; }
}
function familyCacheDates(list) { familyLs(FAMILY_DATES_CACHE, JSON.stringify(list || [])); }

// Next time this date comes around: { when, days, turning }
function familyNextOccurrence(d, from) {
  const today = from ? new Date(from) : new Date();
  today.setHours(0, 0, 0, 0);
  const build = (y) => {
    let day = d.day;
    // Feb 29 dates are celebrated on Feb 28 in non-leap years
    if (d.month === 2 && day === 29 && !((y % 4 === 0 && y % 100 !== 0) || y % 400 === 0)) day = 28;
    return new Date(y, d.month - 1, day);
  };
  let when = build(today.getFullYear());
  if (when < today) when = build(today.getFullYear() + 1);
  const days = Math.round((when - today) / 86400000);
  const turning = d.year ? when.getFullYear() - d.year : null;
  return { when, days, turning };
}

function familyOrdinal(n) {
  const s = ['th', 'st', 'nd', 'rd'], v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function familyDateBlurb(d, next) {
  const n = next || familyNextOccurrence(d);
  if (d.kind === 'anniversary') return n.turning ? `${familyOrdinal(n.turning)} anniversary` : 'Anniversary';
  if (d.kind === 'birthday') return n.turning != null ? `Turns ${n.turning}` : 'Birthday';
  return n.turning ? `${n.turning} years` : '';
}

function familyDaysLabel(days) {
  if (days === 0) return 'Today!';
  if (days === 1) return 'Tomorrow';
  if (days < 7) return `in ${days} days`;
  if (days < 14) return 'next week';
  return `in ${days} days`;
}
