// Leonida Platinum Tracker: checklist, roadmap, missable watch and platinum
// path optimizer for the 55 official GTA 6 trophies. Offline; ticks live in
// localStorage, nothing is fetched over the network after the first load.
const KEY = 'leonida-platinum-tracker-v2';
const $ = (id) => document.getElementById(id);
const doc = await (await fetch('data/trophies.json')).json();
const trophies = doc.trophies.slice().sort((a, b) => a.order - b.order);
const byId = new Map(trophies.map((t) => [t.id, t]));
let earned = new Set(JSON.parse(localStorage.getItem(KEY) ?? '[]'));
let view = 'checklist';

const TIER_NAMES = {
  1: 'Tier 1 — Story Path',
  2: 'Tier 2 — Open World & Side',
  3: 'Tier 3 — Grind & Collectibles',
  4: 'Tier 4 — Platinum',
};
const TIER_BLURBS = {
  1: 'Play in story order. The missable watch lives here — clear these on your first pass.',
  2: 'Sweep as you explore Leonida: activities, side strands, places and moments.',
  3: 'The long counters. Leave these for after the story, then grind them down one by one.',
  4: 'The platinum itself: it lands when the other 54 are earned.',
};

function save() {
  localStorage.setItem(KEY, JSON.stringify([...earned]));
}

function gradeBadge(t) {
  return `<span class="badge ${t.grade}">${t.grade}</span>`;
}
function metaBadges(t) {
  const stars = '★'.repeat(t.difficulty) + '☆'.repeat(5 - t.difficulty);
  return `${gradeBadge(t)}<span class="badge">${t.kind}</span>`
    + (t.missable ? `<span class="badge miss">Missable</span>` : '')
    + `<span class="badge diff">${stars}</span><span class="badge">${t.time}</span>`;
}

function rowEl(t, opts = {}) {
  const li = document.createElement('li');
  li.className = 'trow' + (earned.has(t.id) ? ' earned' : '');
  const spoiled = $('spoiler').checked && t.kind === 'story' && !earned.has(t.id);
  if (spoiled) li.classList.add('spoiled');
  const box = document.createElement('input');
  box.type = 'checkbox';
  box.checked = earned.has(t.id);
  box.setAttribute('aria-label', `Earned: ${t.name}`);
  box.addEventListener('change', () => {
    if (box.checked) earned.add(t.id);
    else earned.delete(t.id);
    save();
    renderAll();
  });
  const body = document.createElement('div');
  body.className = 'body';
  body.innerHTML = `<div class="name">${t.name}</div><div class="desc">${t.description}</div>`
    + `<div class="guide-line">${t.guide}</div><div class="meta">${metaBadges(t)}</div>`;
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'guide-btn';
  btn.textContent = 'Guide';
  btn.addEventListener('click', () => openDetail(t.id));
  li.append(box, body, btn);
  if (opts.reason) {
    const r = document.createElement('div');
    r.className = 'desc';
    r.textContent = opts.reason;
    body.append(r);
  }
  return li;
}

function filtered() {
  const q = $('search').value.trim().toLowerCase();
  const g = $('grade').value;
  const k = $('kind').value;
  const s = $('status').value;
  const m = $('missOnly').checked;
  return trophies.filter((t) => {
    if (q && !(t.name + ' ' + t.description + ' ' + t.guide).toLowerCase().includes(q)) return false;
    if (g !== 'all' && t.grade !== g) return false;
    if (k !== 'all' && t.kind !== k) return false;
    if (s === 'earned' && !earned.has(t.id)) return false;
    if (s === 'remaining' && earned.has(t.id)) return false;
    if (m && !t.missable) return false;
    return true;
  });
}

function renderChecklist() {
  const list = filtered();
  const rows = $('rows');
  rows.replaceChildren();
  for (const t of list) rows.append(rowEl(t));
  const rem = trophies.length - earned.size;
  $('listHint').textContent = list.length === trophies.length
    ? `${earned.size} of 55 earned — ${rem} to go. Tick a trophy when you earn it; the tracker remembers.`
    : `Showing ${list.length} of 55 trophies — ${earned.size} earned, ${rem} remaining.`;
}

function renderRoadmap() {
  const wrap = $('tiers');
  wrap.replaceChildren();
  for (const tier of [1, 2, 3, 4]) {
    const ts = trophies.filter((t) => t.tier === tier);
    const done = ts.filter((t) => earned.has(t.id)).length;
    const div = document.createElement('div');
    div.className = 'tier';
    div.innerHTML = `<h2>${TIER_NAMES[tier]} — ${done}/${ts.length}</h2>`
      + `<p class="hint">${TIER_BLURBS[tier]}</p>`
      + `<div class="bar"><i style="width:${ts.length ? (done / ts.length) * 100 : 0}%"></i></div>`
      + `<div class="names">${ts.map((t) => (earned.has(t.id) ? '✓ ' : '○ ') + t.name).join(' · ')}</div>`;
    wrap.append(div);
  }
}

function missReason(t) {
  if (t.kind === 'mission') return `Only inside the story mission named in its description — clear it when the story hands you the mission.`;
  if (t.kind === 'side') return `Only inside its character's final mission — close the strand while it is open.`;
  if (t.id === 33 || t.id === 34) return `Needs your partner beside you — only during story stretches when you are paired.`;
  if (t.id === 37) return `Needs VCIA access, which the story gates — do it while the story still takes you through the airport.`;
  return 'Only inside one story moment.';
}

function renderMissables() {
  const rows = $('missRows');
  rows.replaceChildren();
  const ms = trophies.filter((t) => t.missable).sort((a, b) => a.order - b.order);
  $('missPill').textContent = String(ms.filter((t) => !earned.has(t.id)).length);
  for (const t of ms) rows.append(rowEl(t, { reason: missReason(t) }));
}

function optimizerOrder() {
  const rem = trophies.filter((t) => !earned.has(t.id) && t.id !== 1);
  rem.sort((a, b) => {
    if (a.missable !== b.missable) return a.missable ? -1 : 1;
    if (a.tier !== b.tier) return a.tier - b.tier;
    return a.order - b.order;
  });
  return rem;
}

function renderPlanner() {
  const next = optimizerOrder();
  const up = $('nextUp');
  up.replaceChildren();
  if (next.length === 0) {
    up.innerHTML = `<p><strong>Nothing left.</strong> The platinum is yours — or one trophy away from it.</p>`;
  } else {
    const t = next[0];
    up.innerHTML = `<p><strong>${t.name}</strong> — ${t.description}</p><p>${t.guide}</p>`
      + `<p><span class="badge ${t.grade}">${t.grade}</span> `
      + (t.missable ? `<span class="badge miss">Missable — do it first</span>` : '')
      + ` <span class="badge">${TIER_NAMES[t.tier]}</span></p>`;
  }
  const list = $('nextList');
  list.replaceChildren();
  for (const t of next.slice(1, 6)) {
    const li = document.createElement('li');
    li.innerHTML = `<span class="nm">${t.name}</span> <span class="why">— ${t.missable ? 'missable, ' : ''}${TIER_NAMES[t.tier]}, ${t.time}</span>`;
    list.append(li);
  }
  const bg = $('byGrade');
  bg.replaceChildren();
  for (const g of ['platinum', 'gold', 'silver', 'bronze']) {
    const ts = trophies.filter((t) => t.grade === g);
    const done = ts.filter((t) => earned.has(t.id)).length;
    const row = document.createElement('div');
    row.className = 'stat-row';
    row.innerHTML = `<span>${g}</span><span>${done} / ${ts.length}</span>`;
    bg.append(row);
  }
  const bt = $('byTier');
  bt.replaceChildren();
  for (const tier of [1, 2, 3, 4]) {
    const ts = trophies.filter((t) => t.tier === tier);
    const done = ts.filter((t) => earned.has(t.id)).length;
    const row = document.createElement('div');
    row.className = 'stat-row';
    row.innerHTML = `<span>${TIER_NAMES[tier]}</span><span>${done} / ${ts.length}</span>`;
    bt.append(row);
  }
}

function renderProgress() {
  const pct = Math.round((earned.size / trophies.length) * 100);
  $('pct').textContent = `${pct}%`;
  $('count').textContent = `${earned.size} / 55`;
  $('ringFg').style.strokeDashoffset = String(326.7 * (1 - earned.size / trophies.length));
}

function renderAll() {
  renderProgress();
  renderChecklist();
  renderRoadmap();
  renderMissables();
  renderPlanner();
}

function openDetail(id) {
  const t = byId.get(id);
  if (!t) return;
  $('detailBody').innerHTML = `${gradeBadge(t)}
    <h2>${t.name}</h2>
    <p class="desc">${t.description}</p>
    <h3>Guide</h3><p>${t.guide}</p>
    <h3>Why it matters</h3><p>${t.missable ? missReason(t) : 'Earnable any time — no story window to miss.'}</p>
    <h3>Facts</h3><p>Grade: ${t.grade} · Kind: ${t.kind} · Tier: ${TIER_NAMES[t.tier]} · Difficulty: ${'★'.repeat(t.difficulty)}${'☆'.repeat(5 - t.difficulty)} · Effort: ${t.time}</p>
    <h3>Source</h3><p class="src">${t.source}</p>`;
  $('detail').classList.remove('hidden');
  location.hash = `#trophy=${id}`;
}

function setView(v) {
  view = v;
  for (const b of document.querySelectorAll('.tabs button')) {
    b.classList.toggle('active', b.dataset.view === v);
  }
  for (const s of document.querySelectorAll('.view')) s.classList.add('hidden');
  $(`view-${v}`).classList.remove('hidden');
  $('controls').style.display = v === 'checklist' ? '' : 'none';
  if (v !== 'checklist') $('detail').classList.add('hidden');
  location.hash = `#view=${v}`;
}

for (const b of document.querySelectorAll('.tabs button')) {
  b.addEventListener('click', () => setView(b.dataset.view));
}
for (const id of ['search', 'grade', 'kind', 'status', 'missOnly', 'spoiler']) {
  $(id).addEventListener('input', renderChecklist);
  $(id).addEventListener('change', renderChecklist);
}
$('detailClose').addEventListener('click', () => {
  $('detail').classList.add('hidden');
  location.hash = `#view=${view}`;
});
$('export').addEventListener('click', () => {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify([...earned])], { type: 'application/json' }));
  a.download = 'leonida-platinum-progress.json';
  a.click();
});
$('import').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const ids = JSON.parse(await file.text());
    earned = new Set(ids.filter((n) => byId.has(n)));
    save();
    renderAll();
  } catch {
    // A bad import file changes nothing.
  }
});

function fromHash() {
  const h = new URLSearchParams(location.hash.slice(1));
  const v = h.get('view');
  if (v && ['checklist', 'roadmap', 'missables', 'planner'].includes(v)) setView(v);
  if (h.get('spoiler') === 'on') $('spoiler').checked = true;
  const tid = Number(h.get('trophy'));
  if (tid) openDetail(tid);
}
window.addEventListener('hashchange', fromHash);
renderAll();
fromHash();
