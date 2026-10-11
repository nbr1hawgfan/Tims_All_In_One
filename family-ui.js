/* ============================================================
   Family Calendar & Tasks — shared UI pieces (event editor, event
   details, task editor, styles). Used by family.html,
   family-calendar.html and family-tasks.html.
   Needs: app.js, icons.js, family.js
   ============================================================ */

const FAMILY_DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

(function familyUiStyles() {
  const css = `
  .who-chip { display: inline-flex; align-items: center; gap: 5px; font-size: 0.72rem; font-weight: 700; padding: 3px 9px 3px 7px; border-radius: 999px;
    background: color-mix(in srgb, var(--pc) 18%, transparent); color: var(--text); border: 1px solid color-mix(in srgb, var(--pc) 40%, transparent); white-space: nowrap; }
  .who-chip::before { content: ''; width: 7px; height: 7px; border-radius: 50%; background: var(--pc); }
  .who-chip.sm { font-size: 0.66rem; padding: 2px 7px 2px 6px; }
  .ev-row { display: flex; gap: 12px; align-items: stretch; background: var(--surface); border: 1px solid var(--border); border-radius: 14px; padding: 11px 12px; margin-bottom: 8px; cursor: pointer; text-decoration: none; color: var(--text); position: relative; overflow: hidden; }
  .ev-row::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 4px; background: var(--cc); }
  .ev-row .tm { width: 58px; flex-shrink: 0; font-size: 0.74rem; font-weight: 800; color: var(--text); line-height: 1.25; padding-left: 4px; }
  .ev-row .tm small { display: block; font-weight: 500; color: var(--text-muted); font-size: 0.68rem; }
  .ev-row .bd { flex: 1; min-width: 0; }
  .ev-row .tt { font-weight: 700; font-size: 0.93rem; display: flex; align-items: center; gap: 6px; }
  .ev-row .tt .ico { color: var(--cc); }
  .ev-row .mt { font-size: 0.74rem; color: var(--text-muted); margin-top: 3px; display: flex; flex-wrap: wrap; gap: 5px; align-items: center; }
  .ev-row .rp { color: var(--text-muted); display: inline-flex; }
  .day-h { display: flex; align-items: baseline; gap: 8px; margin: 18px 2px 8px; }
  .day-h b { font-family: var(--font-display); font-size: 1rem; font-weight: 800; }
  .day-h span { font-size: 0.74rem; color: var(--text-muted); font-weight: 600; }
  .day-h.today b { color: var(--ink-accent); }
  .tk-row { display: flex; align-items: center; gap: 12px; background: var(--surface); border: 1px solid var(--border); border-radius: 14px; padding: 10px 12px; margin-bottom: 8px; }
  .tk-row .ck { width: 28px; height: 28px; border-radius: 9px; border: 2px solid var(--border); background: none; flex-shrink: 0; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #fff; padding: 0; transition: transform 0.1s ease; }
  .tk-row .ck:active { transform: scale(0.88); }
  .tk-row.done .ck { background: var(--success); border-color: var(--success); }
  .tk-row .bd { flex: 1; min-width: 0; cursor: pointer; }
  .tk-row .tt { font-weight: 600; font-size: 0.94rem; overflow-wrap: anywhere; }
  .tk-row.done .tt { text-decoration: line-through; color: var(--text-muted); }
  .tk-row .mt { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; margin-top: 4px; font-size: 0.72rem; color: var(--text-muted); }
  .tk-row .due.over { color: var(--danger); font-weight: 700; }
  .tk-row .due.today { color: var(--accent); font-weight: 700; }
  .fam-sheet-bd { position: fixed; inset: 0; background: rgba(5, 10, 20, 0.55); z-index: 60; display: flex; align-items: flex-end; justify-content: center; animation: fade-in 0.15s ease; }
  .fam-sheet { background: var(--bg); width: 100%; max-width: var(--max-w); border-radius: 22px 22px 0 0; padding: 10px 16px calc(22px + env(safe-area-inset-bottom)); box-shadow: var(--shadow-lg); max-height: 92vh; overflow-y: auto; animation: sheet-up 0.25s cubic-bezier(.2,.8,.2,1); }
  .fam-sheet .grab { width: 40px; height: 5px; border-radius: 3px; background: var(--border); margin: 0 auto 12px; }
  .fam-sheet h3 { margin-bottom: 14px; }
  @keyframes sheet-up { from { transform: translateY(40px); opacity: 0.4; } to { transform: none; opacity: 1; } }
  @keyframes fade-in { from { opacity: 0; } }
  .cat-pick, .who-pick, .dow-pick { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 14px; }
  .cat-pick button, .who-pick button, .dow-pick button { display: inline-flex; align-items: center; gap: 6px; padding: 8px 12px; border-radius: 999px; border: 1.5px solid var(--border); background: var(--surface); color: var(--text); font-weight: 700; font-size: 0.8rem; cursor: pointer; }
  .cat-pick button.on { border-color: var(--cc); background: color-mix(in srgb, var(--cc) 18%, transparent); }
  .cat-pick button .ico { color: var(--cc); }
  .who-pick button.on { border-color: var(--pc); background: color-mix(in srgb, var(--pc) 20%, transparent); }
  .who-pick button .dot { width: 8px; height: 8px; border-radius: 50%; background: var(--pc); }
  .who-pick .add-who { border-style: dashed; color: var(--text-muted); }
  .dow-pick button { width: 42px; justify-content: center; padding: 8px 0; border-radius: 10px; }
  .dow-pick button.on { background: var(--primary); border-color: transparent; color: #fff; }
  .f-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .toggle-line { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 14px; font-weight: 600; font-size: 0.9rem; }
  .fam-switch { -webkit-appearance: none; appearance: none; width: 48px; height: 28px; border-radius: 999px; background: var(--surface-2); border: 1px solid var(--border); position: relative; cursor: pointer; flex-shrink: 0; transition: background 0.2s ease; margin: 0 !important; padding: 0 !important; }
  .fam-switch::after { content: ''; position: absolute; top: 2px; left: 2px; width: 22px; height: 22px; border-radius: 50%; background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,0.3); transition: transform 0.2s ease; }
  .fam-switch:checked { background: var(--success); border-color: var(--success); }
  .fam-switch:checked::after { transform: translateX(20px); }
  .sheet-actions { display: flex; gap: 8px; margin-top: 6px; }
  .sheet-actions .btn { flex: 1; }
  .detail-hero { border-radius: 18px; padding: 16px; margin-bottom: 14px; color: #fff; background: linear-gradient(140deg, color-mix(in srgb, var(--cc) 85%, #fff), color-mix(in srgb, var(--cc) 70%, #000)); }
  .detail-hero .k { font-size: 0.68rem; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; opacity: 0.9; display: flex; align-items: center; gap: 6px; }
  .detail-hero .t { font-family: var(--font-display); font-size: 1.35rem; font-weight: 800; margin-top: 6px; letter-spacing: -0.01em; }
  .detail-hero .w { margin-top: 6px; font-size: 0.9rem; opacity: 0.95; }
  .detail-hero .who-chip { background: rgba(255,255,255,0.22); border-color: rgba(255,255,255,0.35); color: #fff; }
  .detail-list { margin-bottom: 14px; }
  .detail-list div { display: flex; gap: 10px; align-items: flex-start; padding: 8px 2px; border-bottom: 1px solid var(--border); font-size: 0.9rem; }
  .detail-list div:last-child { border-bottom: 0; }
  .detail-list .ico { color: var(--text-muted); margin-top: 1px; }
  .stack-btns { display: grid; gap: 8px; }
  `;
  const st = document.createElement('style');
  st.textContent = css;
  document.head.appendChild(st);
})();

function familyCat(c) { return FAMILY_CATEGORIES[c] || FAMILY_CATEGORIES.other; }

function familyOpenSheet(html) {
  const bd = document.createElement('div');
  bd.className = 'fam-sheet-bd';
  bd.innerHTML = `<div class="fam-sheet" role="dialog"><div class="grab"></div>${html}</div>`;
  document.body.appendChild(bd);
  document.body.style.overflow = 'hidden';
  const close = () => { bd.remove(); document.body.style.overflow = ''; };
  bd.addEventListener('click', (e) => { if (e.target === bd) close(); });
  bd.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', close));
  return { el: bd, close };
}

// One row in an agenda list
function familyEventRow(occ) {
  const e = occ.ev, cat = familyCat(e.category);
  const time = e.start ? `${familyTimeLabel(e.start)}${e.end ? `<small>${familyTimeLabel(e.end)}</small>` : ''}` : `All day`;
  return `
    <div class="ev-row" style="--cc:${cat.color}" data-id="${toolkitEscapeHtml(e.id)}" data-date="${occ.date}">
      <div class="tm">${time}</div>
      <div class="bd">
        <div class="tt">${toolkitIcon(cat.icon, 15, 2.2)}<span>${toolkitEscapeHtml(e.title)}</span></div>
        <div class="mt">${(e.who || []).map((w) => familyPersonChip(w, true)).join('')}${e.location ? `<span>${toolkitEscapeHtml(e.location)}</span>` : ''}${e.repeat ? `<span class="rp" title="Repeats weekly">${toolkitIcon('repeat', 13)}</span>` : ''}</div>
      </div>
    </div>`;
}

/**
 * Event details sheet (tap on an event). handlers: onEdit(ev), onSkip(ev, date), onDelete(ev)
 */
function familyShowEvent(e, date, handlers) {
  const esc = toolkitEscapeHtml, cat = familyCat(e.category);
  const d = familyParseYmd(date || e.date);
  const when = d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }) + (e.start ? ` · ${familyTimeLabel(e.start)}${e.end ? '–' + familyTimeLabel(e.end) : ''}` : ' · All day');
  const repeatTxt = e.repeat ? `Every ${(e.days || []).map((x) => FAMILY_DOW[x]).join(', ')}${e.until ? ' until ' + familyParseYmd(e.until).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : ''}` : '';
  const s = familyOpenSheet(`
    <div class="detail-hero" style="--cc:${cat.color}">
      <div class="k">${toolkitIcon(cat.icon, 14, 2.4)}${esc(cat.label)}</div>
      <div class="t">${esc(e.title)}</div>
      <div class="w">${esc(when)}</div>
      ${(e.who || []).length ? `<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:10px">${e.who.map((w) => familyPersonChip(w)).join('')}</div>` : ''}
    </div>
    <div class="detail-list">
      ${e.location ? `<div>${toolkitIcon('map-pin', 18)}<span><a href="https://maps.google.com/?q=${encodeURIComponent(e.location)}" target="_blank" rel="noopener">${esc(e.location)}</a></span></div>` : ''}
      ${repeatTxt ? `<div>${toolkitIcon('repeat', 18)}<span>${esc(repeatTxt)}</span></div>` : ''}
      ${e.notes ? `<div>${toolkitIcon('notebook-pen', 18)}<span style="white-space:pre-wrap">${esc(e.notes)}</span></div>` : ''}
      <div>${toolkitIcon('user', 18)}<span style="color:var(--text-muted)">Added by ${esc(e.addedBy || 'family')}</span></div>
    </div>
    <div class="stack-btns">
      <button class="btn" data-a="ics">${toolkitIcon('calendar-plus', 18)}&nbsp;Add to my phone’s calendar</button>
      <div class="sheet-actions" style="margin:0">
        <button class="btn secondary" data-a="edit">${toolkitIcon('pencil', 16)}&nbsp;Edit</button>
        ${e.repeat ? `<button class="btn secondary" data-a="skip">Skip this date</button>` : ''}
        <button class="btn secondary" data-a="del" style="color:var(--danger)">${toolkitIcon('trash-2', 16)}</button>
      </div>
    </div>`);
  s.el.querySelector('[data-a="ics"]').addEventListener('click', () => { familyDownloadIcs(e); toolkitToast('Opening in your calendar…'); });
  s.el.querySelector('[data-a="edit"]').addEventListener('click', () => { s.close(); handlers.onEdit(e); });
  const skip = s.el.querySelector('[data-a="skip"]');
  if (skip) skip.addEventListener('click', () => { s.close(); handlers.onSkip(e, date); });
  s.el.querySelector('[data-a="del"]').addEventListener('click', () => {
    if (!confirm(e.repeat ? `Delete "${e.title}" and all its repeats?` : `Delete "${e.title}"?`)) return;
    s.close(); handlers.onDelete(e);
  });
}

/**
 * Add / edit an event. people = known names. onSave(payload) must return a promise.
 */
function familyEditEvent(e, opts) {
  const esc = toolkitEscapeHtml;
  const isNew = !e;
  const ev = e ? JSON.parse(JSON.stringify(e)) : { title: '', date: opts.date || familyYmd(new Date()), start: '', end: '', who: [], category: 'family', location: '', notes: '', repeat: '', days: [], until: '' };
  let people = [...new Set((opts.people || []).concat(ev.who || []))];
  const s = familyOpenSheet(`
    <h3>${isNew ? 'New event' : 'Edit event'}</h3>
    <label for="ev-title">What</label>
    <input type="text" id="ev-title" maxlength="60" placeholder="e.g. Cheer practice, Dentist, Ballgame" value="${esc(ev.title)}">
    <label>Type</label>
    <div class="cat-pick" id="ev-cat">${Object.entries(FAMILY_CATEGORIES).map(([k, c]) => `<button type="button" data-k="${k}" style="--cc:${c.color}">${toolkitIcon(c.icon, 15, 2.2)}${c.label}</button>`).join('')}</div>
    <label>Who’s it for</label>
    <div class="who-pick" id="ev-who"></div>
    <div class="f-row">
      <div><label for="ev-date">Date</label><input type="date" id="ev-date" value="${esc(ev.date)}"></div>
      <div><label for="ev-loc">Where</label><input type="text" id="ev-loc" maxlength="80" placeholder="Optional" value="${esc(ev.location)}"></div>
    </div>
    <div class="toggle-line"><span>All day</span><input type="checkbox" class="fam-switch" id="ev-allday" ${ev.start ? '' : 'checked'}></div>
    <div class="f-row" id="ev-times">
      <div><label for="ev-start">Starts</label><input type="time" id="ev-start" value="${esc(ev.start)}"></div>
      <div><label for="ev-end">Ends</label><input type="time" id="ev-end" value="${esc(ev.end)}"></div>
    </div>
    <div class="toggle-line"><span>Repeats every week</span><input type="checkbox" class="fam-switch" id="ev-repeat" ${ev.repeat ? 'checked' : ''}></div>
    <div id="ev-rep-box">
      <label>On these days</label>
      <div class="dow-pick" id="ev-days">${FAMILY_DOW.map((d, i) => `<button type="button" data-d="${i}">${d.slice(0, 2)}</button>`).join('')}</div>
      <label for="ev-until">Until (optional)</label>
      <input type="date" id="ev-until" value="${esc(ev.until)}">
    </div>
    <label for="ev-notes">Notes</label>
    <textarea id="ev-notes" rows="2" maxlength="300" placeholder="Bring water bottle, uniform…">${esc(ev.notes)}</textarea>
    <div class="sheet-actions">
      <button class="btn secondary" data-close>Cancel</button>
      <button class="btn" id="ev-save">${isNew ? 'Add event' : 'Save'}</button>
    </div>`);
  const $ = (q) => s.el.querySelector(q);
  let cat = ev.category || 'family';
  let who = [...(ev.who || [])];
  let days = [...(ev.days || [])];
  const drawCat = () => s.el.querySelectorAll('#ev-cat button').forEach((b) => b.classList.toggle('on', b.dataset.k === cat));
  const drawWho = () => {
    $('#ev-who').innerHTML = people.map((p) => `<button type="button" data-p="${esc(p)}" style="--pc:${familyPersonColor(p)}" class="${who.some((w) => w.toLowerCase() === p.toLowerCase()) ? 'on' : ''}"><span class="dot"></span>${esc(p)}</button>`).join('') + `<button type="button" class="add-who">+ Add name</button>`;
    s.el.querySelectorAll('#ev-who [data-p]').forEach((b) => b.addEventListener('click', () => {
      const p = b.dataset.p;
      who = who.some((w) => w.toLowerCase() === p.toLowerCase()) ? who.filter((w) => w.toLowerCase() !== p.toLowerCase()) : who.concat([p]);
      drawWho();
    }));
    $('#ev-who .add-who').addEventListener('click', () => {
      const n = (prompt('Name (for example one of the kids):') || '').trim().slice(0, 24);
      if (!n) return;
      if (!people.some((p) => p.toLowerCase() === n.toLowerCase())) people.push(n);
      if (!who.some((w) => w.toLowerCase() === n.toLowerCase())) who.push(n);
      drawWho();
    });
  };
  const drawDays = () => s.el.querySelectorAll('#ev-days button').forEach((b) => b.classList.toggle('on', days.includes(Number(b.dataset.d))));
  const drawToggles = () => {
    $('#ev-times').style.display = $('#ev-allday').checked ? 'none' : '';
    $('#ev-rep-box').style.display = $('#ev-repeat').checked ? '' : 'none';
  };
  s.el.querySelectorAll('#ev-cat button').forEach((b) => b.addEventListener('click', () => { cat = b.dataset.k; drawCat(); }));
  s.el.querySelectorAll('#ev-days button').forEach((b) => b.addEventListener('click', () => {
    const d = Number(b.dataset.d);
    days = days.includes(d) ? days.filter((x) => x !== d) : days.concat([d]);
    drawDays();
  }));
  $('#ev-allday').addEventListener('change', drawToggles);
  $('#ev-repeat').addEventListener('change', () => {
    if ($('#ev-repeat').checked && !days.length && $('#ev-date').value) days = [familyParseYmd($('#ev-date').value).getDay()];
    drawDays(); drawToggles();
  });
  drawCat(); drawWho(); drawDays(); drawToggles();
  $('#ev-save').addEventListener('click', async () => {
    const btn = $('#ev-save');
    const allDay = $('#ev-allday').checked, rep = $('#ev-repeat').checked;
    const payload = {
      id: ev.id, title: $('#ev-title').value, date: $('#ev-date').value, category: cat, who,
      start: allDay ? '' : $('#ev-start').value, end: allDay ? '' : $('#ev-end').value,
      location: $('#ev-loc').value, notes: $('#ev-notes').value,
      repeat: rep ? 'weekly' : '', days: rep ? days : [], until: rep ? $('#ev-until').value : '',
    };
    if (!payload.title.trim()) { toolkitToast('Give the event a name', { danger: true }); return; }
    if (!allDay && !payload.start) { toolkitToast('Add a start time, or switch on All day', { danger: true }); return; }
    btn.disabled = true; btn.textContent = 'Saving…';
    try { await opts.onSave(payload); s.close(); toolkitToast(isNew ? 'Added to the family calendar' : 'Saved'); }
    catch (err) { toolkitToast(err.message, { danger: true }); btn.disabled = false; btn.textContent = isNew ? 'Add event' : 'Save'; }
  });
  if (isNew) setTimeout(() => $('#ev-title').focus(), 80);
}

// ---------- Tasks ----------
function familyDueInfo(t) {
  if (!t.due) return { label: '', cls: '' };
  const today = familyYmd(new Date());
  if (t.due < today && !t.done) return { label: 'Overdue · ' + familyParseYmd(t.due).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }), cls: 'over' };
  if (t.due === today) return { label: 'Today', cls: 'today' };
  return { label: familyDayLabel(t.due), cls: '' };
}

function familyTaskRow(t) {
  const esc = toolkitEscapeHtml, due = familyDueInfo(t);
  const rep = { daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly' }[t.repeat];
  return `
    <div class="tk-row ${t.done ? 'done' : ''}" data-id="${esc(t.id)}">
      <button class="ck" aria-label="${t.done ? 'Mark not done' : 'Mark done'}">${t.done ? toolkitIcon('check', 16, 3) : ''}</button>
      <div class="bd">
        <div class="tt">${esc(t.title)}</div>
        <div class="mt">${t.who ? familyPersonChip(t.who, true) : ''}${due.label ? `<span class="due ${due.cls}">${esc(due.label)}</span>` : ''}${rep ? `<span style="display:inline-flex;align-items:center;gap:3px">${toolkitIcon('repeat', 12)}${rep}</span>` : ''}${t.done && t.doneBy ? `<span>Done by ${esc(t.doneBy)}</span>` : ''}</div>
      </div>
    </div>`;
}

function familyEditTask(t, opts) {
  const esc = toolkitEscapeHtml;
  const isNew = !t || !t.id;
  const task = Object.assign({ title: '', who: '', due: '', repeat: '' }, t || {});
  let people = [...new Set((opts.people || []).concat(task.who ? [task.who] : []))];
  let who = task.who;
  const s = familyOpenSheet(`
    <h3>${isNew ? 'New task' : 'Edit task'}</h3>
    <label for="tk-title">Task</label>
    <input type="text" id="tk-title" maxlength="80" placeholder="e.g. Take out trash, Sign permission slip" value="${esc(task.title)}">
    <label>Who’s doing it</label>
    <div class="who-pick" id="tk-who"></div>
    <div class="f-row">
      <div><label for="tk-due">Due</label><input type="date" id="tk-due" value="${esc(task.due)}"></div>
      <div><label for="tk-rep">Repeats</label><select id="tk-rep">${[['', 'No'], ['daily', 'Every day'], ['weekly', 'Every week'], ['monthly', 'Every month']].map(([v, l]) => `<option value="${v}" ${task.repeat === v ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
    </div>
    <p class="helper-text">Repeating tasks jump to their next due date when checked off.</p>
    <div class="sheet-actions">
      ${isNew ? '' : `<button class="btn secondary" id="tk-del" style="flex:0 0 auto;color:var(--danger)">${toolkitIcon('trash-2', 18)}</button>`}
      <button class="btn secondary" data-close>Cancel</button>
      <button class="btn" id="tk-save">${isNew ? 'Add task' : 'Save'}</button>
    </div>`);
  const $ = (q) => s.el.querySelector(q);
  const drawWho = () => {
    $('#tk-who').innerHTML = people.map((p) => `<button type="button" data-p="${esc(p)}" style="--pc:${familyPersonColor(p)}" class="${who && who.toLowerCase() === p.toLowerCase() ? 'on' : ''}"><span class="dot"></span>${esc(p)}</button>`).join('') + `<button type="button" class="add-who">+ Add name</button>`;
    s.el.querySelectorAll('#tk-who [data-p]').forEach((b) => b.addEventListener('click', () => { who = who && who.toLowerCase() === b.dataset.p.toLowerCase() ? '' : b.dataset.p; drawWho(); }));
    $('#tk-who .add-who').addEventListener('click', () => {
      const n = (prompt('Name:') || '').trim().slice(0, 24);
      if (!n) return;
      if (!people.some((p) => p.toLowerCase() === n.toLowerCase())) people.push(n);
      who = n; drawWho();
    });
  };
  drawWho();
  $('#tk-save').addEventListener('click', async () => {
    const btn = $('#tk-save');
    const payload = { id: task.id, title: $('#tk-title').value, who, due: $('#tk-due').value, repeat: $('#tk-rep').value };
    if (!payload.title.trim()) { toolkitToast('What needs doing?', { danger: true }); return; }
    if (payload.repeat && !payload.due) { toolkitToast('Pick a due date for a repeating task', { danger: true }); return; }
    btn.disabled = true; btn.textContent = 'Saving…';
    try { await opts.onSave(payload); s.close(); }
    catch (err) { toolkitToast(err.message, { danger: true }); btn.disabled = false; btn.textContent = isNew ? 'Add task' : 'Save'; }
  });
  const del = $('#tk-del');
  if (del) del.addEventListener('click', async () => {
    if (!confirm(`Delete "${task.title}"?`)) return;
    try { await opts.onDelete(task); s.close(); } catch (err) { toolkitToast(err.message, { danger: true }); }
  });
  if (isNew) setTimeout(() => $('#tk-title').focus(), 80);
}
