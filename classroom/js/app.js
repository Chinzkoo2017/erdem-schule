import { createApi } from './api.js';
import { t, getLang, setLang } from './i18n.js';
import { flashcards, letters, pictures } from './games.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const safeUrl = (u) => (/^https?:\/\//i.test(u || '') ? esc(u) : '');
const iso = (d) => { const x = new Date(d); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`; };
const todayIso = () => iso(new Date());
const fmtDate = (d) => {
  if (!d) return '';
  const x = new Date(d.length === 10 ? d + 'T12:00' : d);
  if (getLang() === 'de') return x.toLocaleDateString('de-DE', { day: 'numeric', month: 'short' });
  return `${x.getMonth() + 1}-р сарын ${x.getDate()}`;
};

const app = $('#app');
let api, me, groupsCache = [];

// ------------------------------------------------------------ helpers
function toast(msg, kind = 'ok') {
  const el = document.createElement('div');
  el.className = `toast toast-${kind}`;
  el.textContent = msg;
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 300); }, 2800);
}
async function guard(fn) {
  try { return await fn(); } catch (e) { console.error(e); toast(`${t('error')}: ${e.message || e}`, 'bad'); }
}
function stats(activity, subs) {
  const days = new Set(activity.filter((a) => a.xp > 0).map((a) => a.day));
  let streak = 0;
  const d = new Date();
  if (!days.has(iso(d))) d.setDate(d.getDate() - 1);
  while (days.has(iso(d))) { streak++; d.setDate(d.getDate() - 1); }
  const totalXp = activity.reduce((s, a) => s + a.xp, 0);
  const week = [...Array(7)].map((_, k) => {
    const x = new Date(); x.setDate(x.getDate() - (6 - k));
    const day = iso(x);
    return { day, label: t('days')[x.getDay()], xp: activity.find((a) => a.day === day)?.xp || 0 };
  });
  return { streak, totalXp, week, subs: subs.length };
}
function weekChart(week) {
  const max = Math.max(20, ...week.map((w) => w.xp));
  return `<div class="week" role="img" aria-label="${t('week')}">
    ${week.map((w) => `<div class="week-col${w.day === todayIso() ? ' is-today' : ''}">
      <div class="week-bar"><span style="height:${(w.xp / max) * 100}%"></span></div>
      <small>${esc(w.label)}</small></div>`).join('')}
  </div>`;
}
function badgeList(st, lettersPerfect) {
  return [
    { icon: '📝', name: t('bFirst'), desc: t('bFirstD'), on: st.subs >= 1 },
    { icon: '🔥', name: t('bS3'), desc: t('bS3D'), on: st.streak >= 3 },
    { icon: '🌟', name: t('bS7'), desc: t('bS7D'), on: st.streak >= 7 },
    { icon: '💯', name: t('b100'), desc: t('b100D'), on: st.totalXp >= 100 },
    { icon: '🎒', name: t('b5hw'), desc: t('b5hwD'), on: st.subs >= 5 },
    { icon: '🔤', name: t('bLetters'), desc: t('bLettersD'), on: !!lettersPerfect },
  ];
}
const groupName = (id) => groupsCache.find((g) => g.id === id)?.name || t('none');
const statusChip = (s) => (!s ? `<span class="chip chip-open">${t('openHw')}</span>`
  : s.status === 'reviewed' ? `<span class="chip chip-done">✓ ${t('reviewed')}${s.score != null ? ` · ${s.score}` : ''}</span>`
    : `<span class="chip chip-sent">${t('submitted')}</span>`);

// ------------------------------------------------------------ shell
function shell(tabs, body) {
  const current = currentTab(tabs);
  app.innerHTML = `
    ${api?.mode === 'demo' ? `<div class="demo-banner">🧪 ${t('demoBanner')} <button class="link" id="resetDemo">↺ reset</button></div>` : ''}
    <header class="topbar">
      <a class="brand" href="../index.html" title="${t('backHome')}">
        <img src="../images/logo.jpg" alt="" width="40" height="40">
        <span><strong>${t('brand')}</strong><small>${t('brandSub')}</small></span>
      </a>
      <div class="topbar-right">
        <button class="lang" id="langBtn">${getLang() === 'mn' ? 'DE' : 'MN'}</button>
        ${me ? `<span class="who"><span class="avatar">${esc(me.avatar || '🙂')}</span><span class="who-text"><span class="who-name">${esc(me.full_name)}</span><small class="who-role">${t('r' + me.role)}</small></span></span>
        <button class="btn btn-ghost btn-sm" id="logout">${t('logout')}</button>` : ''}
      </div>
    </header>
    ${tabs.length ? `<nav class="tabs" aria-label="menu">${tabs.map((x) => `<a href="#${x.id}" class="${x.id === current ? 'active' : ''}"><span>${x.icon}</span>${x.label}</a>`).join('')}</nav>` : ''}
    <main class="wrap" id="main">${body}</main>
    <footer class="foot"><span class="meander"></span><a href="../impressum.html">Impressum</a> · <a href="../datenschutz.html">Datenschutz</a></footer>`;
  $('#langBtn').onclick = () => { setLang(getLang() === 'mn' ? 'de' : 'mn'); route(); };
  $('#logout') && ($('#logout').onclick = async () => { await api.signOut(); me = null; location.hash = ''; route(); });
  $('#resetDemo') && ($('#resetDemo').onclick = async () => { await api.resetDemo(); route(); });
}
function currentTab(tabs) {
  const h = location.hash.slice(1);
  return tabs.find((x) => x.id === h)?.id || tabs[0]?.id;
}
const loading = () => shell([], `<p class="muted center pad">${t('loading')}</p>`);

// ------------------------------------------------------------ login
function renderLogin(mode = 'in') {
  const demo = api.mode === 'demo';
  shell([], `
  <section class="login">
    <div class="login-hero">
      <div class="sun" aria-hidden="true"></div>
      <h1>${t('loginTitle')}</h1>
      <p>${t('loginLead')}</p>
    </div>
    ${demo ? `
    <div class="card login-card">
      <h2>${t('demoTitle')}</h2>
      <p class="muted">${t('demoLead')}</p>
      <div class="demo-roles">
        <button class="role-btn" data-u="s1"><span>🐎</span>${t('asStudent')}</button>
        <button class="role-btn" data-u="p1"><span>🌸</span>${t('asParent')}</button>
        <button class="role-btn" data-u="t1"><span>📚</span>${t('asTeacher')}</button>
        <button class="role-btn" data-u="a1"><span>🛡️</span>${t('asAdmin')}</button>
      </div>
    </div>` : `
    <form class="card login-card" id="loginForm">
      <h2>${mode === 'up' ? t('signUp') : t('signIn')}</h2>
      ${mode === 'up' ? `<label>${t('fullName')}<input name="name" required autocomplete="name"></label>` : ''}
      <label>${t('email')}<input name="email" type="email" required autocomplete="email"></label>
      <label>${t('password')}<input name="pw" type="password" minlength="8" ${mode === 'up' ? 'required' : ''} autocomplete="${mode === 'up' ? 'new-password' : 'current-password'}"></label>
      <button class="btn btn-gold btn-block">${mode === 'up' ? t('signUp') : t('signIn')}</button>
      ${mode === 'in' ? `<button type="button" class="btn btn-ghost btn-block" id="magic">✉️ ${t('magicLink')}</button>` : ''}
      <p class="muted center">${mode === 'up' ? t('haveAccount') : t('noAccount')} <a href="#" id="swap">${mode === 'up' ? t('signIn') : t('signUp')}</a></p>
      <p class="form-msg" aria-live="polite"></p>
    </form>`}
  </section>`);

  if (demo) {
    $$('.role-btn').forEach((b) => (b.onclick = async () => { me = await api.demoLogin(b.dataset.u); location.hash = ''; route(); }));
    return;
  }
  const f = $('#loginForm'), msg = $('.form-msg', f);
  $('#swap').onclick = (e) => { e.preventDefault(); renderLogin(mode === 'up' ? 'in' : 'up'); };
  f.onsubmit = async (e) => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(f));
    try {
      if (mode === 'up') { await api.signUp(d.email, d.pw, d.name); msg.textContent = t('signUpDone'); }
      else { me = await api.signIn(d.email, d.pw); route(); }
    } catch (err) { msg.textContent = err.message; msg.classList.add('bad'); }
  };
  $('#magic') && ($('#magic').onclick = async () => {
    const email = f.email.value;
    if (!email) return f.email.reportValidity();
    try { await api.magicLink(email); msg.textContent = t('magicSent'); } catch (err) { msg.textContent = err.message; }
  });
}

// ------------------------------------------------------------ STUDENT
async function renderStudent() {
  const tabs = [
    { id: 'home', icon: '🏠', label: t('tabHome') },
    { id: 'lessons', icon: '📖', label: t('tabLessons') },
    { id: 'homework', icon: '✏️', label: t('tabHomework') },
    { id: 'play', icon: '🎲', label: t('tabPlay') },
    { id: 'badges', icon: '🏅', label: t('tabBadges') },
  ];
  const tab = currentTab(tabs);
  const [lessons, assignments, subs, activity, lettersPerfect] = await Promise.all([
    api.lessons(me.group_id), api.assignments(me.group_id), api.submissions(me.id), api.activity(me.id), api.getMeta('lettersPerfect'),
  ]);
  const group = groupsCache.find((g) => g.id === me.group_id);
  const st = stats(activity, subs);
  const subFor = (aid) => subs.find((s) => s.assignment_id === aid);
  const openHw = assignments.filter((a) => !subFor(a.id));

  const views = {
    home: () => `
      <section class="hero-card">
        <div class="hero-left">
          <span class="avatar xl">${esc(me.avatar || '🐎')}</span>
          <div><p class="eyebrow">${esc(group?.name || '')}</p><h1>${t('hello')}, ${esc(me.full_name)}!</h1></div>
        </div>
        <div class="hero-stats">
          <div class="stat"><span class="stat-n">🔥 ${st.streak}</span><span>${t('streak')}</span></div>
          <div class="stat"><span class="stat-n">⭐ ${st.totalXp}</span><span>${t('xp')}</span></div>
        </div>
      </section>
      <div class="grid-2">
        ${liveCard(group)}
        <section class="card">
          <h2>${t('week')}</h2>${weekChart(st.week)}
          <a class="btn btn-gold btn-block mt" href="#play">🎲 ${t('play')}</a>
        </section>
      </div>
      <section class="card">
        <div class="card-head"><h2>${t('homework')}</h2><a href="#homework" class="link">→</a></div>
        ${openHw.length ? openHw.slice(0, 3).map((a) => hwRow(a, null)).join('') : `<p class="muted">${t('noHomework')}</p>`}
      </section>
      ${lessons[0] ? `<section class="card"><div class="card-head"><h2>${t('lessons')}</h2><a href="#lessons" class="link">→</a></div>${lessonCard(lessons[0])}</section>` : ''}`,
    lessons: () => `<h1 class="page-title">${t('lessons')}</h1>
      ${lessons.length ? `<div class="stack">${lessons.map(lessonCard).join('')}</div>` : `<p class="muted">${t('noLessons')}</p>`}`,
    homework: () => `<h1 class="page-title">${t('homework')}</h1>
      <div class="stack">${assignments.length ? assignments.map((a) => hwRow(a, subFor(a.id), true)).join('') : `<p class="muted">${t('noHomework')}</p>`}</div>`,
    play: () => `<h1 class="page-title">${t('play')}</h1><p class="muted">${t('playLead')}</p>
      <div id="gameArea">
        <div class="game-grid">
          <button class="game-card" data-g="flash"><span>🃏</span><strong>${t('gFlash')}</strong><small>${t('gFlashD')}</small></button>
          <button class="game-card" data-g="letters"><span class="letter-icon">Өө</span><strong>${t('gLetters')}</strong><small>${t('gLettersD')}</small></button>
          <button class="game-card" data-g="pics"><span>🐫</span><strong>${t('gPics')}</strong><small>${t('gPicsD')}</small></button>
        </div>
      </div>`,
    badges: () => `<h1 class="page-title">${t('badges')}</h1>
      <div class="badge-grid">${badgeList(st, lettersPerfect).map((b) => `
        <div class="badge ${b.on ? 'on' : ''}"><span class="badge-icon">${b.on ? b.icon : '🔒'}</span><strong>${b.name}</strong><small>${b.on ? b.desc : t('locked') + ' · ' + b.desc}</small></div>`).join('')}
      </div>`,
  };
  shell(tabs, views[tab]());

  if (tab === 'homework' || tab === 'home') bindHomework(assignments, subFor);
  if (tab === 'play') bindGames();
}

function liveCard(group) {
  return `<section class="card live-card">
    <p class="eyebrow">${t('nextLesson')}</p>
    <h2>${esc(group?.schedule || t('none'))}</h2>
    <p class="muted">${esc(group?.name || '')}</p>
    ${safeUrl(group?.live_url) ? `<a class="btn btn-live btn-block" href="${safeUrl(group.live_url)}" target="_blank" rel="noopener">🎥 ${t('joinLive')}</a>`
      : `<p class="muted small">${t('noLive')}</p>`}
  </section>`;
}
function lessonCard(l) {
  return `<article class="lesson">
    <div class="lesson-date"><span>${esc(fmtDate(l.lesson_date))}</span></div>
    <div class="lesson-body">
      <h3>${esc(l.title)}</h3>
      ${l.description ? `<p>${esc(l.description)}</p>` : ''}
      <div class="row-gap">
        ${safeUrl(l.video_url) ? `<a class="btn btn-sm btn-navy" href="${safeUrl(l.video_url)}" target="_blank" rel="noopener">▶ ${t('watch')}</a>` : ''}
        ${safeUrl(l.material_url) ? `<a class="btn btn-sm btn-ghost" href="${safeUrl(l.material_url)}" target="_blank" rel="noopener">📎 ${t('material')}</a>` : ''}
      </div>
    </div>
  </article>`;
}
function hwRow(a, sub, full = false) {
  const late = !sub && a.due_date && a.due_date < todayIso();
  return `<article class="hw ${sub ? 'is-' + sub.status : ''}" data-id="${esc(a.id)}">
    <div class="hw-main">
      <h3>${esc(a.title)}</h3>
      ${full && a.instructions ? `<p>${esc(a.instructions)}</p>` : ''}
      <p class="small ${late ? 'late' : 'muted'}">${t('due')}: ${esc(fmtDate(a.due_date)) || t('none')} · ${a.points ?? 10} ${t('xp')}</p>
      ${sub?.status === 'reviewed' && sub.feedback ? `<div class="feedback"><strong>${t('feedback')}:</strong> ${esc(sub.feedback)}</div>` : ''}
    </div>
    <div class="hw-side">${statusChip(sub)}
      ${(!sub || sub.status === 'submitted') ? `<button class="btn btn-sm btn-gold" data-open="${esc(a.id)}">${sub ? '✎ ' + t('send') : t('open')}</button>` : ''}
    </div>
  </article>`;
}
function bindHomework(assignments, subFor) {
  $$('[data-open]').forEach((b) => (b.onclick = () => {
    const a = assignments.find((x) => x.id === b.dataset.open);
    const sub = subFor(a.id);
    const row = b.closest('.hw');
    if ($('.hw-form', row)) return;
    row.insertAdjacentHTML('beforeend', `
      <form class="hw-form">
        <textarea name="body" rows="4" placeholder="${t('yourAnswer')}">${esc(sub?.body || '')}</textarea>
        <label class="file-drop">📎 ${t('attach')}<input type="file" name="file" accept="image/*,audio/*,application/pdf,.doc,.docx"><span class="file-name"></span></label>
        <div class="row-gap"><button class="btn btn-gold">${t('send')}</button><button type="button" class="btn btn-ghost" data-cancel>${t('cancel')}</button></div>
      </form>`);
    const f = $('.hw-form', row);
    f.file.onchange = () => { $('.file-name', f).textContent = f.file.files[0]?.name || ''; };
    $('[data-cancel]', f).onclick = () => f.remove();
    f.onsubmit = (e) => {
      e.preventDefault();
      const body = f.body.value.trim(), file = f.file.files[0];
      if (!body && !file) return f.body.focus();
      if (file && file.size > 10 * 1024 * 1024) return toast('Max 10 MB', 'bad');
      $('button', f).disabled = true;
      guard(async () => {
        await api.submit(a.id, body, file);
        if (!sub) await api.addXp(20);
        toast(t('sentOk'));
        route();
      }).finally(() => { const btn = $('button', f); if (btn) btn.disabled = false; });
    };
  }));
}
function bindGames() {
  const area = $('#gameArea');
  const onDone = async (res) => {
    if (!res) return route();
    if (res.xp > 0) await guard(() => api.addXp(res.xp));
    if (res.total === 10 && res.score === 10 && area.dataset.g === 'letters') await api.setMeta('lettersPerfect', true);
  };
  $$('.game-card', area).forEach((b) => (b.onclick = async () => {
    area.dataset.g = b.dataset.g;
    const box = document.createElement('div');
    box.className = 'card game-box';
    area.replaceChildren(box);
    if (b.dataset.g === 'letters') return letters(box, onDone);
    const vocab = await guard(() => api.vocab()) || [];
    if (b.dataset.g === 'flash') flashcards(box, vocab, getLang(), onDone);
    else pictures(box, vocab, onDone);
  }));
}

// ------------------------------------------------------------ PARENT
async function renderParent() {
  const kids = await api.children();
  if (!kids.length) return shell([], `<h1 class="page-title">${t('myChildren')}</h1><p class="card muted">${t('noChildren')}</p>`);
  const data = await Promise.all(kids.map(async (k) => {
    const [subs, act, asg] = await Promise.all([api.submissions(k.id), api.activity(k.id), api.assignments(k.group_id)]);
    return { k, subs, asg, st: stats(act, subs) };
  }));
  shell([], `<h1 class="page-title">${t('myChildren')}</h1>
    <div class="stack">${data.map(({ k, subs, asg, st }) => {
      const group = groupsCache.find((g) => g.id === k.group_id);
      const open = asg.filter((a) => !subs.some((s) => s.assignment_id === a.id));
      return `<section class="card child">
        <div class="child-head">
          <span class="avatar xl">${esc(k.avatar || '🙂')}</span>
          <div><h2>${esc(k.full_name)}</h2><p class="muted">${esc(group?.name || t('none'))}${group?.schedule ? ' · ' + esc(group.schedule) : ''}</p></div>
          ${safeUrl(group?.live_url) ? `<a class="btn btn-live btn-sm push" href="${safeUrl(group.live_url)}" target="_blank" rel="noopener">🎥 ${t('joinLive')}</a>` : ''}
        </div>
        <div class="kpis">
          <div class="kpi"><span>🔥 ${st.streak}</span><small>${t('streak')}</small></div>
          <div class="kpi"><span>⭐ ${st.totalXp}</span><small>${t('totalXp')}</small></div>
          <div class="kpi"><span>✅ ${subs.length}/${asg.length}</span><small>${t('doneHw')}</small></div>
          <div class="kpi ${open.length ? 'warn' : ''}"><span>📌 ${open.length}</span><small>${t('openHw')}</small></div>
        </div>
        <h3 class="sub">${t('week')}</h3>${weekChart(st.week)}
        <h3 class="sub">${t('recent')}</h3>
        <div class="stack-sm">${asg.slice(0, 5).map((a) => {
          const s = subs.find((x) => x.assignment_id === a.id);
          return `<div class="mini-row"><span>${esc(a.title)}</span>${statusChip(s)}</div>
            ${s?.feedback ? `<div class="feedback small">💬 ${esc(s.feedback)}</div>` : ''}`;
        }).join('') || `<p class="muted">${t('noHomework')}</p>`}</div>
      </section>`;
    }).join('')}</div>`);
}

// ------------------------------------------------------------ TEACHER / ADMIN
async function renderStaff() {
  const isAdmin = me.role === 'admin';
  const tabs = [
    { id: 'review', icon: '✅', label: t('tabReview') },
    { id: 'manage', icon: '📚', label: t('tabManage') },
    { id: 'groups', icon: '👥', label: t('tabGroups') },
    ...(isAdmin ? [{ id: 'users', icon: '🛡️', label: t('tabUsers') }] : []),
  ];
  const tab = currentTab(tabs);
  if (tab === 'review') return staffReview(tabs);
  if (tab === 'manage') return staffManage(tabs);
  if (tab === 'groups') return staffGroups(tabs, isAdmin);
  if (tab === 'users') return adminUsers(tabs);
}

async function staffReview(tabs) {
  const [subs, asg] = await Promise.all([api.submissions(), api.assignments()]);
  const title = (id) => asg.find((a) => a.id === id)?.title || '';
  const pending = subs.filter((s) => s.status === 'submitted');
  const done = subs.filter((s) => s.status === 'reviewed').slice(0, 10);
  const card = (s) => `<article class="card review" data-id="${esc(s.id)}">
      <div class="review-head">
        <span class="avatar">${esc(s.student?.avatar || '🙂')}</span>
        <div><strong>${esc(s.student?.full_name || '')}</strong><p class="muted small">${esc(title(s.assignment_id))} · ${esc(groupName(s.student?.group_id))} · ${esc(fmtDate(s.submitted_at))}</p></div>
      </div>
      ${s.body ? `<blockquote class="mn">${esc(s.body)}</blockquote>` : ''}
      ${s.file_path ? `<button class="btn btn-sm btn-ghost" data-file="${esc(s.file_path)}">📎 ${esc(s.file_path.split('/').pop())}</button>` : ''}
      <form class="review-form">
        <label>${t('score')}<input name="score" type="number" min="0" max="100" value="${s.score ?? 10}"></label>
        <label class="grow">${t('feedback')}<input name="feedback" value="${esc(s.feedback || '')}" placeholder="Маш сайн! / Sehr gut!"></label>
        <button class="btn btn-gold">${t('give')}</button>
      </form>
    </article>`;
  shell(tabs, `<h1 class="page-title">${t('toReview')} <span class="count">${pending.length}</span></h1>
    <div class="stack">${pending.length ? pending.map(card).join('') : `<p class="card muted">${t('nothingToReview')}</p>`}</div>
    ${done.length ? `<details class="mt"><summary>${t('reviewed')} (${done.length})</summary><div class="stack mt">${done.map(card).join('')}</div></details>` : ''}`);
  $$('.review-form').forEach((f) => (f.onsubmit = (e) => {
    e.preventDefault();
    const id = f.closest('.review').dataset.id;
    guard(async () => { await api.review(id, +f.score.value, f.feedback.value.trim()); toast(t('saved')); route(); });
  }));
  $$('[data-file]').forEach((b) => (b.onclick = async () => {
    const url = await api.fileUrl(b.dataset.file);
    if (url) window.open(url, '_blank', 'noopener'); else toast(api.mode === 'demo' ? 'Demo' : t('error'), 'bad');
  }));
}

async function staffManage(tabs) {
  let gid; try { gid = sessionStorage.getItem('erdemGroup'); } catch {}
  gid = gid || groupsCache[0]?.id;
  if (!groupsCache.some((g) => g.id === gid)) gid = groupsCache[0]?.id;
  const [lessons, asg] = gid ? await Promise.all([api.lessons(gid), api.assignments(gid)]) : [[], []];
  shell(tabs, `
    <div class="page-head">
      <h1 class="page-title">${t('tabManage')}</h1>
      <label class="inline">${t('group')}
        <select id="groupSel">${groupsCache.map((g) => `<option value="${esc(g.id)}" ${g.id === gid ? 'selected' : ''}>${esc(g.name)}</option>`).join('')}</select>
      </label>
    </div>
    <div class="grid-2">
      <form class="card form" id="lessonForm">
        <h2>➕ ${t('newLesson')}</h2>
        <label>${t('title')}<input name="title" required></label>
        <label>${t('desc')}<textarea name="description" rows="2"></textarea></label>
        <label>${t('videoUrl')}<input name="video_url" type="url" placeholder="https://"></label>
        <label>${t('materialUrl')}<input name="material_url" type="url" placeholder="https://"></label>
        <label>${t('date')}<input name="lesson_date" type="date" value="${todayIso()}"></label>
        <button class="btn btn-gold">${t('save')}</button>
      </form>
      <form class="card form" id="hwForm">
        <h2>➕ ${t('newHw')}</h2>
        <label>${t('title')}<input name="title" required></label>
        <label>${t('instructions')}<textarea name="instructions" rows="3"></textarea></label>
        <label>${t('tabLessons')}<select name="lesson_id"><option value="">${t('none')}</option>${lessons.map((l) => `<option value="${esc(l.id)}">${esc(l.title)}</option>`).join('')}</select></label>
        <div class="row-gap"><label class="grow">${t('due')}<input name="due_date" type="date"></label><label>${t('points')}<input name="points" type="number" value="10" min="0" max="100"></label></div>
        <button class="btn btn-gold">${t('save')}</button>
      </form>
    </div>
    <section class="card"><h2>${t('lessons')}</h2>
      ${lessons.map((l) => `<div class="mini-row"><span><b>${esc(fmtDate(l.lesson_date))}</b> · ${esc(l.title)}</span><button class="btn-x" data-dl="${esc(l.id)}" aria-label="${t('del')}">✕</button></div>`).join('') || `<p class="muted">${t('noLessons')}</p>`}
    </section>
    <section class="card"><h2>${t('homework')}</h2>
      ${asg.map((a) => `<div class="mini-row"><span><b>${esc(fmtDate(a.due_date)) || '—'}</b> · ${esc(a.title)}</span><button class="btn-x" data-da="${esc(a.id)}" aria-label="${t('del')}">✕</button></div>`).join('') || `<p class="muted">${t('noHomework')}</p>`}
    </section>`);
  $('#groupSel').onchange = (e) => { try { sessionStorage.setItem('erdemGroup', e.target.value); } catch {} route(); };
  const clean = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, v === '' ? null : v]));
  $('#lessonForm').onsubmit = (e) => { e.preventDefault(); const d = clean(Object.fromEntries(new FormData(e.target))); guard(async () => { await api.saveLesson({ ...d, group_id: gid }); toast(t('saved')); route(); }); };
  $('#hwForm').onsubmit = (e) => { e.preventDefault(); const d = clean(Object.fromEntries(new FormData(e.target))); d.points = +(d.points || 10); guard(async () => { await api.saveAssignment({ ...d, group_id: gid }); toast(t('saved')); route(); }); };
  $$('[data-dl]').forEach((b) => (b.onclick = () => confirm(t('confirmDel')) && guard(async () => { await api.deleteLesson(b.dataset.dl); route(); })));
  $$('[data-da]').forEach((b) => (b.onclick = () => confirm(t('confirmDel')) && guard(async () => { await api.deleteAssignment(b.dataset.da); route(); })));
}

async function staffGroups(tabs, isAdmin) {
  const [profiles, subs, asg] = await Promise.all([api.profiles(), api.submissions(), api.assignments()]);
  const students = profiles.filter((p) => p.role === 'student');
  const rows = await Promise.all(students.map(async (s) => ({ s, st: stats(await api.activity(s.id), subs.filter((x) => x.student_id === s.id)) })));
  shell(tabs, `<h1 class="page-title">${t('tabGroups')}</h1>
    <div class="stack">${groupsCache.map((g) => {
      const mine = rows.filter((r) => r.s.group_id === g.id);
      const total = asg.filter((a) => a.group_id === g.id).length;
      return `<section class="card">
        <form class="group-form" data-g="${esc(g.id)}">
          <label class="grow">${t('groupName')}<input name="name" value="${esc(g.name)}" ${isAdmin ? '' : 'readonly'}></label>
          <label>${t('schedule')}<input name="schedule" value="${esc(g.schedule || '')}"></label>
          <label class="grow">${t('liveUrl')}<input name="live_url" type="url" value="${esc(g.live_url || '')}" placeholder="https://meet.google.com/…"></label>
          <button class="btn btn-gold btn-sm">${t('save')}</button>
        </form>
        <table class="table"><thead><tr><th>${t('student')}</th><th>🔥</th><th>⭐</th><th>${t('doneHw')}</th></tr></thead>
        <tbody>${mine.map(({ s, st }) => `<tr><td>${esc(s.avatar)} ${esc(s.full_name)}</td><td>${st.streak}</td><td>${st.totalXp}</td><td>${st.subs}/${total}</td></tr>`).join('') || `<tr><td colspan="4" class="muted">${t('none')}</td></tr>`}</tbody></table>
      </section>`;
    }).join('')}
    ${isAdmin ? `<form class="card group-form" data-g="">
        <h2 class="full">➕ ${t('newGroup')}</h2>
        <label class="grow">${t('groupName')}<input name="name" required></label>
        <label>${t('schedule')}<input name="schedule" placeholder="Бямба 10:40"></label>
        <label class="grow">${t('liveUrl')}<input name="live_url" type="url" placeholder="https://"></label>
        <button class="btn btn-gold btn-sm">${t('save')}</button>
      </form>` : ''}
    </div>`);
  $$('.group-form').forEach((f) => (f.onsubmit = (e) => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(f));
    if (f.dataset.g) d.id = f.dataset.g;
    guard(async () => { await api.saveGroup(d); groupsCache = await api.groups(); toast(t('saved')); route(); });
  }));
}

async function adminUsers(tabs) {
  const [profiles, links] = await Promise.all([api.profiles(), api.links()]);
  const roles = ['pending', 'student', 'parent', 'teacher', 'admin'];
  const name = (id) => esc(profiles.find((p) => p.id === id)?.full_name || id);
  const parents = profiles.filter((p) => p.role === 'parent'), kids = profiles.filter((p) => p.role === 'student');
  const sorted = [...profiles].sort((a, b) => (a.role === 'pending' ? -1 : 0) - (b.role === 'pending' ? -1 : 0));
  shell(tabs, `<h1 class="page-title">${t('tabUsers')}</h1>
    <section class="card table-wrap">
      <table class="table"><thead><tr><th>${t('fullName')}</th><th>${t('role')}</th><th>${t('group')}</th></tr></thead><tbody>
      ${sorted.map((p) => `<tr data-u="${esc(p.id)}" class="${p.role === 'pending' ? 'row-pending' : ''}">
        <td>${esc(p.avatar)} ${esc(p.full_name)}</td>
        <td><select class="u-role" ${p.id === me.id ? 'disabled' : ''}>${roles.map((r) => `<option value="${r}" ${r === p.role ? 'selected' : ''}>${t('r' + r)}</option>`).join('')}</select></td>
        <td><select class="u-group"><option value="">${t('none')}</option>${groupsCache.map((g) => `<option value="${esc(g.id)}" ${g.id === p.group_id ? 'selected' : ''}>${esc(g.name)}</option>`).join('')}</select></td>
      </tr>`).join('')}
      </tbody></table>
    </section>
    <section class="card">
      <h2>${t('linkParent')}</h2>
      <form class="row-gap" id="linkForm">
        <label class="grow">${t('parent')}<select name="p">${parents.map((p) => `<option value="${esc(p.id)}">${esc(p.full_name)}</option>`).join('')}</select></label>
        <label class="grow">${t('child')}<select name="c">${kids.map((p) => `<option value="${esc(p.id)}">${esc(p.full_name)}</option>`).join('')}</select></label>
        <button class="btn btn-gold btn-sm align-end">${t('link')}</button>
      </form>
      <div class="stack-sm mt">${links.map((l) => `<div class="mini-row"><span>${name(l.parent_id)} → ${name(l.child_id)}</span><button class="btn-x" data-unlink="${esc(l.parent_id)}|${esc(l.child_id)}" aria-label="${t('del')}">✕</button></div>`).join('')}</div>
    </section>`);
  $$('tr[data-u]').forEach((tr) => {
    const save = () => guard(async () => { await api.setProfile(tr.dataset.u, $('.u-role', tr).value, $('.u-group', tr).value); toast(t('saved')); });
    $('.u-role', tr).onchange = save; $('.u-group', tr).onchange = save;
  });
  $('#linkForm').onsubmit = (e) => { e.preventDefault(); const f = e.target; if (!f.p.value || !f.c.value) return; guard(async () => { await api.linkParent(f.p.value, f.c.value); toast(t('linked')); route(); }); };
  $$('[data-unlink]').forEach((b) => (b.onclick = () => { const [p, c] = b.dataset.unlink.split('|'); guard(async () => { await api.unlinkParent(p, c); route(); }); }));
}

// ------------------------------------------------------------ router
async function route() {
  document.documentElement.lang = getLang() === 'de' ? 'de' : 'mn';
  if (!me) return renderLogin();
  if (me.role === 'pending') return shell([], `<section class="card pending center"><div class="big-emoji">⏳</div><h1>${t('pendingTitle')}</h1><p class="muted">${t('pendingLead')}</p></section>`);
  await guard(async () => {
    groupsCache = await api.groups();
    if (me.role === 'student') await renderStudent();
    else if (me.role === 'parent') await renderParent();
    else await renderStaff();
    window.scrollTo(0, 0);
  });
}
window.addEventListener('hashchange', () => route());

(async () => {
  loading();
  try {
    api = await createApi();
    me = await api.init();
  } catch (e) {
    console.error(e);
    app.innerHTML = `<p class="pad center">${t('error')}: ${esc(e.message)}</p>`;
    return;
  }
  route();
})();
