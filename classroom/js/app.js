import { createApi } from './api.js';
import { t, getLang, setLang } from './i18n.js';
import { flashcards, letters, pictures, wordBuilder, sentenceBuilder, fillSuffix } from './games.js';
import { TEMPLATE_ROWS } from './roster-core.js';

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

const ICONS = {
  home: '<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  lessons: '<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 21V5"/>',
  homework: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  play: '<rect x="3" y="3" width="18" height="18" rx="4"/><circle cx="8.5" cy="8.5" r="1.2"/><circle cx="15.5" cy="15.5" r="1.2"/><circle cx="12" cy="12" r="1.2"/>',
  badges: '<circle cx="12" cy="9" r="6"/><path d="M8.5 14l-1.5 7 5-3 5 3-1.5-7"/>',
  children: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><circle cx="17.5" cy="9.5" r="2.5"/><path d="M16 14.6A5 5 0 0 1 22 19"/>',
  review: '<path d="M9 11l3 3 8-8"/><path d="M20 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>',
  manage: '<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M12 7v6M9 10h6"/>',
  groups: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6 6 0 0 1 3.5 6"/>',
  users: '<path d="M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6z"/>',
  video: '<rect x="2" y="6" width="14" height="12" rx="2"/><path d="M16 10l6-3v10l-6-3z"/>',
  mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>',
  clip: '<path d="M21 11l-8.5 8.5a5 5 0 0 1-7-7L14 4a3.5 3.5 0 0 1 5 5l-8.5 8.5a2 2 0 0 1-3-3L15 7"/>',
  sheet: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18"/>',
  upload: '<path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3"/>',
  download: '<path d="M12 4v12M7 11l5 5 5-5"/><path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3"/>',
  logout: '<path d="M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4M10 17l5-5-5-5M15 12H3"/>',
  image: '<rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-9 9"/>',
};
const icon = (k, size = 20) => `<svg class="ico" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[k] || ''}</svg>`;
const initials = (n) => esc(([...(String(n || '?').trim())][0] || '?').toUpperCase());
const avatar = (p, cls = '') => `<span class="avatar ${cls}">${initials(p?.full_name)}</span>`;
const isAudio = (p) => /\.(webm|ogg|oga|mp3|m4a|wav|aac)$/i.test(p) || /audio/i.test(p);
const isImage = (p) => /\.(png|jpe?g|gif|webp|heic|heif)$/i.test(p);
const filesOf = (s) => (s?.files?.length ? s.files : s?.file_path ? [s.file_path] : []);

const FAMILY_IDEAS = [
  ['Эмээ, өвөөгөөсөө ярилцлага ав', 'Эцэг эхийнхээ тусламжтайгаар эмээ эсвэл өвөөдөө залгаж 3 асуулт асуу: Хаана төрсөн бэ? Бага насандаа юугаар тоглодог байсан бэ? Хамгийн дуртай хоол нь юу вэ? Хариултыг монголоор бичих эсвэл бичлэг хийж илгээ.'],
  ['Монгол хоол хамт хийх', 'Ээж аавтайгаа хамт монгол хоол (бууз, цуйван, хуушуур…) хий. Орц найрлагын 5 нэрийг монголоор бичээд зураг хавсарга.'],
  ['Гэр бүлийн мод', 'Эцэг эхтэйгээ хамт гурван үеийн гэр бүлийн модоо зур. Хүн бүрийн нэр, хамаатан садны нэршлийг (эмээ, авга ах, нагац эгч…) монголоор бич.'],
  ['Үлгэр хамт унших', 'Эцэг эх чинь монгол үлгэр уншиж өгнө. Дараа нь чи үлгэрийг 3–5 өгүүлбэрээр өөрийнхөөрөө ярьж бичлэг хий.'],
  ['Зүйр цэцэн үг', 'Эцэг эхээсээ нэг зүйр цэцэн үг асууж, утгыг нь тайлбарлуул. Зүйр үгийг бичээд утгыг нь өөрийн үгээр 2 өгүүлбэрээр бич.'],
  ['Гэрийн эд зүйлсийн шошго', 'Гэрийнхээ 10 эд зүйлд монгол нэрийг нь цаасан дээр бичиж наа (хаалга, цонх, ширээ…). Эцэг эхтэйгээ шалгаад зураг авч илгээ.'],
  ['Монгол дуу хамт дуулах', 'Эцэг эхийнхээ бага насны дуртай монгол дууг сурч, хамт дуулаад бичлэг хий.'],
  ['Зөвхөн монголоор ярих оройн хоол', 'Нэг оройн хоолны үеэр гэр бүлээрээ зөвхөн монголоор ярь. Ярилцсан 5 сэдвээ бич.'],
  ['Дэлгүүрийн жагсаалт', 'Эцэг эхтэйгээ хамт долоо хоногийн дэлгүүрийн жагсаалтыг монголоор бич (10 зүйл). Дэлгүүрт очихдоо ашигла!'],
  ['Баяр ёслолын уламжлал', 'Эцэг эхээсээ Цагаан сар эсвэл Наадмын нэг уламжлалыг асууж, 3–5 өгүүлбэрээр бич.'],
];
const isFamily = (a) => a?.kind === 'family';
const familyTag = () => `<span class="chip chip-family">${icon('children', 13)} ${t('family')}</span>`;

const app = $('#app');
let api, me, groupsCache = [], currentChecks = [];

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
function badgeList(st, lettersPerfect, familyDone = 0) {
  return [
    { icon: '📝', name: t('bFirst'), desc: t('bFirstD'), on: st.subs >= 1 },
    { icon: '🔥', name: t('bS3'), desc: t('bS3D'), on: st.streak >= 3 },
    { icon: '🌟', name: t('bS7'), desc: t('bS7D'), on: st.streak >= 7 },
    { icon: '💯', name: t('b100'), desc: t('b100D'), on: st.totalXp >= 100 },
    { icon: '🎒', name: t('b5hw'), desc: t('b5hwD'), on: st.subs >= 5 },
    { icon: '🔤', name: t('bLetters'), desc: t('bLettersD'), on: !!lettersPerfect },
    { icon: '🏠', name: t('bFamily'), desc: t('bFamilyD'), on: familyDone >= 3 },
  ];
}
const groupName = (id) => groupsCache.find((g) => g.id === id)?.name || t('none');
const statusChip = (s) => (!s ? `<span class="chip chip-open">${t('openHw')}</span>`
  : s.status === 'reviewed' ? `<span class="chip chip-done">✓ ${t('reviewed')}${s.score != null ? ` · ${s.score}` : ''}</span>`
    : `<span class="chip chip-sent">${t('submitted')}</span>`);

// ------------------------------------------------------------ shell
function shell(tabs, body, opts = {}) {
  const current = currentTab(tabs);
  const demo = api?.mode === 'demo' ? `<div class="demo-banner">${t('demoBanner')} <button class="link" id="resetDemo">↺ reset</button></div>` : '';
  const foot = `<footer class="foot"><a href="../impressum.html">Impressum</a> · <a href="../datenschutz.html">Datenschutz</a></footer>`;
  const langBtn = `<button class="lang" id="langBtn" aria-label="Language">${getLang() === 'mn' ? 'DE' : 'MN'}</button>`;
  if (!me) {
    app.innerHTML = `${demo}<div class="solo"><header class="solo-top">
      <a class="brand" href="../index.html" title="${t('backHome')}"><img src="../images/logo.jpg" alt="" width="38" height="38"><span><strong>${t('brand')}</strong><small>${t('brandSub')}</small></span></a>
      ${langBtn}</header><main class="wrap">${body}</main>${foot}</div>`;
  } else {
    const g = opts.live;
    app.innerHTML = `
    <div class="layout">
      <aside class="side">
        <div class="side-top">
          <a class="brand" href="../index.html" title="${t('backHome')}"><img src="../images/logo.jpg" alt="" width="38" height="38"><span><strong>${t('brand')}</strong><small>${t('brandSub')}</small></span></a>
          <div class="side-mobile-actions">${langBtn.replace('id="langBtn"', 'id="langBtnM"')}<button class="icon-btn" id="logoutM" aria-label="${t('logout')}">${icon('logout')}</button></div>
        </div>
        ${tabs.length ? `<nav class="side-nav" aria-label="${t('menu')}">${tabs.map((x) => `<a href="#${x.id}" class="${x.id === current ? 'active' : ''}" ${x.id === current ? 'aria-current="page"' : ''}>${icon(x.icon)}<span>${x.label}</span>${x.count ? `<b class="nav-count">${x.count}</b>` : ''}</a>`).join('')}</nav>` : ''}
        ${g ? `<div class="side-live">
          <span class="side-live-label">${t('nextLesson')}</span>
          <strong>${esc(g.schedule || t('none'))}</strong>
          ${safeUrl(g.live_url) ? `<a class="btn btn-live btn-block btn-sm" href="${safeUrl(g.live_url)}" target="_blank" rel="noopener">${icon('video', 18)} ${t('joinLive')}</a>` : `<small>${t('noLive')}</small>`}
        </div>` : ''}
        <div class="side-user">
          ${avatar(me)}
          <span class="side-user-text"><strong>${esc(me.full_name)}</strong><small>${t('r' + me.role)}</small></span>
          ${langBtn}
          <button class="icon-btn" id="logout" aria-label="${t('logout')}" title="${t('logout')}">${icon('logout')}</button>
        </div>
      </aside>
      <div class="content">${demo}<main class="wrap" id="main">${body}</main>${foot}</div>
    </div>`;
  }
  const flip = () => { setLang(getLang() === 'mn' ? 'de' : 'mn'); route(); };
  const out = async () => { await api.signOut(); me = null; location.hash = ''; route(); };
  $$('#langBtn, #langBtnM').forEach((b) => (b.onclick = flip));
  $$('#logout, #logoutM').forEach((b) => (b.onclick = out));
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
      <h1>${t('loginTitle')}</h1>
      <p>${t('loginLead')}</p>
    </div>
    ${demo ? `
    <div class="card login-card">
      <h2>${t('demoTitle')}</h2>
      <p class="muted">${t('demoLead')}</p>
      <div class="demo-roles">
        <button class="role-btn" data-u="s1">${t('asStudent')}</button>
        <button class="role-btn" data-u="p1">${t('asParent')}</button>
        <button class="role-btn" data-u="t1">${t('asTeacher')}</button>
        <button class="role-btn" data-u="a1">${t('asAdmin')}</button>
      </div>
    </div>` : `
    <form class="card login-card" id="loginForm">
      <h2>${mode === 'up' ? t('signUp') : t('signIn')}</h2>
      ${mode === 'up' ? `<label>${t('fullName')}<input name="name" required autocomplete="name"></label>` : ''}
      <label>${mode === 'up' ? t('email') : t('loginOrEmail')}<input name="email" type="${mode === 'up' ? 'email' : 'text'}" required autocomplete="${mode === 'up' ? 'email' : 'username'}" autocapitalize="none" spellcheck="false"></label>
      <label>${t('password')}<input name="pw" type="password" minlength="8" ${mode === 'up' ? 'required' : ''} autocomplete="${mode === 'up' ? 'new-password' : 'current-password'}"></label>
      <button class="btn btn-gold btn-block">${mode === 'up' ? t('signUp') : t('signIn')}</button>
      ${mode === 'in' ? `<button type="button" class="btn btn-ghost btn-block" id="magic">${t('magicLink')}</button>` : ''}
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
  const [lessons, assignments, subs, activity, lettersPerfect, checks] = await Promise.all([
    api.lessons(me.group_id), api.assignments(me.group_id), api.submissions(me.id), api.activity(me.id), api.getMeta('lettersPerfect'),
    api.familyChecks(me.id),
  ]);
  currentChecks = checks || [];
  const group = groupsCache.find((g) => g.id === me.group_id);
  const st = stats(activity, subs);
  const subFor = (aid) => subs.find((s) => s.assignment_id === aid);
  const openHw = assignments.filter((a) => !subFor(a.id));
  const lateHw = openHw.filter((a) => a.due_date && a.due_date < todayIso());
  const badges = badgeList(st, lettersPerfect, currentChecks.length);
  const badgesOn = badges.filter((b) => b.on).length;
  const nextBadge = badges.find((b) => !b.on);
  const level = Math.floor(st.totalXp / 100) + 1, toNext = 100 - (st.totalXp % 100);
  const playedToday = (activity.find((a) => a.day === todayIso())?.xp || 0) > 0;

  const tabs = [
    { id: 'home', icon: 'home', label: t('tabHome') },
    { id: 'lessons', icon: 'lessons', label: t('tabLessons') },
    { id: 'homework', icon: 'homework', label: t('tabHomework'), count: openHw.length },
    { id: 'play', icon: 'play', label: t('tabPlay') },
    { id: 'badges', icon: 'badges', label: t('tabBadges') },
  ];
  const tab = currentTab(tabs);

  const goals = [
    { done: playedToday, title: t('goalPlay'), meta: playedToday ? t('goalsDone') : '+10–20', href: '#play', late: false },
    ...openHw.slice(0, 4).map((a) => ({ done: false, title: a.title, meta: `${a.due_date && a.due_date < todayIso() ? t('late') + ' · ' : t('due') + ': '}${fmtDate(a.due_date) || t('none')}`, href: '#homework', late: a.due_date && a.due_date < todayIso() })),
  ];
  const games = [
    { g: 'word', glyph: 'р·о·ь', name: t('gWord'), d: t('gWordD'), tone: 'indigo' },
    { g: 'letters', glyph: 'Өө', name: t('gLetters'), d: t('gLettersD'), tone: 'gold' },
    { g: 'sent', glyph: 'Би…', name: t('gSent'), d: t('gSentD'), tone: 'green' },
    { g: 'fill', glyph: '-т', name: t('gFill'), d: t('gFillD'), tone: 'rose' },
    { g: 'flash', glyph: 'Аа', name: t('gFlash'), d: t('gFlashD'), tone: 'indigo' },
    { g: 'pics', glyph: icon('image', 26), name: t('gPics'), d: t('gPicsD'), tone: 'green' },
  ];
  const gameTile = (x) => `<button class="game-tile tone-${x.tone}" data-g="${x.g}"><span class="game-glyph">${x.glyph}</span><span class="game-text"><b>${x.name}</b><small>${x.d}</small></span></button>`;

  const views = {
    home: () => `
      <div class="page-head">
        <div><p class="eyebrow">${esc(fmtDate(todayIso()))}${group ? ' · ' + esc(group.name) : ''}</p>
        <h1 class="page-title">${t('hello')}, ${esc(me.full_name)}</h1></div>
      </div>
      ${group ? `<div class="mobile-only">${liveCard(group)}</div>` : ''}
      <div class="kpi-grid">
        <div class="kpi-card"><span class="kpi-label">${t('streakLabel')}</span><span class="kpi-value">${st.streak} 🔥</span><span class="kpi-note">${t('streak')}</span></div>
        <div class="kpi-card"><span class="kpi-label">${t('totalXp')}</span><span class="kpi-value">${st.totalXp}</span><span class="kpi-note accent">${t('level')} ${level} · ${toNext} ${t('toNext')}</span>
          <span class="meter"><span style="width:${100 - toNext}%"></span></span></div>
        <div class="kpi-card"><span class="kpi-label">${t('homework')}</span><span class="kpi-value">${assignments.length - openHw.length}<small> / ${assignments.length}</small></span><span class="kpi-note ${lateHw.length ? 'bad' : ''}">${lateHw.length ? `${lateHw.length} · ${t('late')}` : openHw.length ? `${openHw.length} · ${t('openHw')}` : '✓'}</span></div>
        <div class="kpi-card"><span class="kpi-label">${t('badgesShort')}</span><span class="kpi-value">${badgesOn}<small> / ${badges.length}</small></span><span class="kpi-note">${nextBadge ? `${t('nextBadge')}: ${nextBadge.name}` : '🏆'}</span></div>
      </div>
      <div class="split">
        <section class="card">
          <div class="card-head"><h2>${t('goals')}</h2><span class="muted small">${goals.filter((g) => g.done).length} / ${goals.length} ${t('goalsDone')}</span></div>
          <div class="goal-list">${goals.map((g) => `<a class="goal ${g.done ? 'done' : ''}" href="${g.href}">
            <span class="check" aria-hidden="true">${g.done ? '✓' : ''}</span>
            <span class="goal-text"><b>${esc(g.title)}</b><small class="${g.late ? 'late' : ''}">${esc(g.meta)}</small></span>
            <span class="goal-go" aria-hidden="true">→</span></a>`).join('')}</div>
        </section>
        <section class="card"><h2>${t('week')}</h2>${weekChart(st.week)}</section>
      </div>
      <section>
        <div class="card-head"><h2>${t('play')}</h2><a href="#play" class="link">→</a></div>
        <div class="game-row">${games.slice(0, 3).map((x) => `<a class="game-tile tone-${x.tone}" href="#play" data-start="${x.g}"><span class="game-glyph">${x.glyph}</span><span class="game-text"><b>${x.name}</b><small>${x.d}</small></span></a>`).join('')}</div>
      </section>
      ${lessons[0] ? `<section class="card"><div class="card-head"><h2>${t('lessons')}</h2><a href="#lessons" class="link">→</a></div>${lessonCard(lessons[0])}</section>` : ''}`,
    lessons: () => `<h1 class="page-title">${t('lessons')}</h1>
      ${lessons.length ? `<div class="stack">${lessons.map(lessonCard).join('')}</div>` : `<p class="card muted">${t('noLessons')}</p>`}`,
    homework: () => `<h1 class="page-title">${t('homework')}</h1>
      <div class="stack">${assignments.length ? assignments.map((a) => hwRow(a, subFor(a.id), true)).join('') : `<p class="card muted">${t('noHomework')}</p>`}</div>`,
    play: () => `<h1 class="page-title">${t('play')}</h1><p class="muted">${t('playLead')}</p>
      <div id="gameArea"><div class="game-grid">${games.map(gameTile).join('')}</div></div>`,
    badges: () => `<h1 class="page-title">${t('badges')}</h1>
      <div class="badge-grid">${badges.map((b) => `
        <div class="badge ${b.on ? 'on' : ''}"><span class="badge-icon">${b.on ? b.icon : '🔒'}</span><strong>${b.name}</strong><small>${b.on ? b.desc : t('locked') + ' · ' + b.desc}</small></div>`).join('')}
      </div>`,
  };
  shell(tabs, views[tab](), { live: group });

  if (tab === 'homework') bindHomework(assignments, subFor);
  if (tab === 'home') $$('[data-start]').forEach((a) => (a.onclick = () => { try { sessionStorage.setItem('erdemStartGame', a.dataset.start); } catch {} }));
  if (tab === 'play') {
    bindGames();
    let start; try { start = sessionStorage.getItem('erdemStartGame'); sessionStorage.removeItem('erdemStartGame'); } catch {}
    if (start) $(`.game-tile[data-g="${start}"]`)?.click();
  }
}

function liveCard(group) {
  return `<section class="card live-card">
    <p class="eyebrow">${t('nextLesson')}</p>
    <h2>${esc(group?.schedule || t('none'))}</h2>
    <p class="muted">${esc(group?.name || '')}</p>
    ${safeUrl(group?.live_url) ? `<a class="btn btn-live btn-block" href="${safeUrl(group.live_url)}" target="_blank" rel="noopener">${icon('video', 18)} ${t('joinLive')}</a>`
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
        ${safeUrl(l.video_url) ? `<a class="btn btn-sm btn-navy" href="${safeUrl(l.video_url)}" target="_blank" rel="noopener">${icon('video', 16)} ${t('watch')}</a>` : ''}
        ${safeUrl(l.material_url) ? `<a class="btn btn-sm btn-ghost" href="${safeUrl(l.material_url)}" target="_blank" rel="noopener">${icon('clip', 16)} ${t('material')}</a>` : ''}
      </div>
    </div>
  </article>`;
}
function hwRow(a, sub, full = false) {
  const late = !sub && a.due_date && a.due_date < todayIso();
  return `<article class="hw ${sub ? 'is-' + sub.status : ''}" data-id="${esc(a.id)}">
    <div class="hw-main">
      <h3>${esc(a.title)}</h3>
      ${isFamily(a) ? `<p class="tag-row">${familyTag()} ${currentChecks.some((c) => c.assignment_id === a.id) ? `<span class="chip chip-done">✓ ${t('familyConfirmed')}</span>` : `<span class="muted small">${t('familyWaiting')}</span>`}</p>` : ''}
      ${full && a.instructions ? `<p>${esc(a.instructions)}</p>` : ''}
      <p class="small ${late ? 'late' : 'muted'}">${t('due')}: ${esc(fmtDate(a.due_date)) || t('none')} · ${a.points ?? 10} ${t('xp')}</p>
      ${filesOf(sub).length ? `<p class="small muted">${icon('clip', 14)} ${filesOf(sub).length} ${t('attached')}</p>` : ''}
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
    const canRec = !!(navigator.mediaDevices?.getUserMedia && window.MediaRecorder);
    row.insertAdjacentHTML('beforeend', `
      <form class="hw-form">
        <textarea name="body" rows="4" placeholder="${t('yourAnswer')}">${esc(sub?.body || '')}</textarea>
        <ul class="file-list" aria-live="polite"></ul>
        <div class="row-gap">
          ${canRec ? `<button type="button" class="btn btn-ghost btn-sm" data-rec>${icon('mic', 18)} <span>${t('record')}</span></button>` : ''}
          <label class="btn btn-ghost btn-sm file-btn">${icon('image', 18)} ${t('addFiles')}
            <input type="file" multiple accept="image/*,audio/*,application/pdf,.doc,.docx"></label>
          <span class="muted small">${t('maxFiles')} · 10 MB</span>
        </div>
        <div class="row-gap"><button class="btn btn-gold" data-send>${t('send')}</button><button type="button" class="btn btn-ghost" data-cancel>${t('cancel')}</button></div>
      </form>`);
    const f = $('.hw-form', row), list = $('.file-list', f);
    const files = [];
    let rec = null, chunks = [], stream = null, timer = null;
    const draw = () => {
      list.innerHTML = files.map((x, i) => `<li class="file-item">
        ${isAudioFile(x) ? `<audio controls src="${x._url}"></audio>` : x.type.startsWith('image/') ? `<img src="${x._url}" alt="">` : `<span class="file-chip">${icon('clip', 14)}</span>`}
        <span class="file-name">${esc(x.name)}</span>
        <button type="button" class="btn-x" data-rm="${i}" aria-label="${t('del')}">✕</button></li>`).join('');
      $$('[data-rm]', list).forEach((btn) => (btn.onclick = () => { files.splice(+btn.dataset.rm, 1); draw(); }));
    };
    const add = (fl) => {
      for (const x of fl) {
        if (files.length >= 5) { toast(t('maxFiles'), 'bad'); break; }
        if (x.size > 10 * 1024 * 1024) { toast(`${x.name}: max 10 MB`, 'bad'); continue; }
        x._url = URL.createObjectURL(x); files.push(x);
      }
      draw();
    };
    $('input[type=file]', f).onchange = (e) => { add(e.target.files); e.target.value = ''; };
    const recBtn = $('[data-rec]', f);
    const stopRec = () => { if (rec && rec.state !== 'inactive') rec.stop(); };
    if (recBtn) recBtn.onclick = async () => {
      if (rec && rec.state === 'recording') return stopRec();
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch { return toast(t('noMic'), 'bad'); }
      chunks = [];
      rec = new MediaRecorder(stream);
      rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      rec.onstop = () => {
        stream.getTracks().forEach((tr) => tr.stop());
        clearInterval(timer);
        recBtn.classList.remove('recording');
        $('span', recBtn).textContent = t('record');
        const type = rec.mimeType || 'audio/webm';
        const ext = type.includes('mp4') ? 'm4a' : type.includes('ogg') ? 'ogg' : 'webm';
        add([new File(chunks, `bichleg-${new Date().toTimeString().slice(0, 8).replace(/:/g, '')}.${ext}`, { type })]);
      };
      rec.start();
      const t0 = Date.now();
      recBtn.classList.add('recording');
      const tick = () => {
        const sec = Math.floor((Date.now() - t0) / 1000);
        $('span', recBtn).textContent = `${t('stop')} · ${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
        if (sec >= 180) stopRec();
      };
      tick(); timer = setInterval(tick, 500);
    };
    $('[data-cancel]', f).onclick = () => { stopRec(); f.remove(); };
    f.onsubmit = (e) => {
      e.preventDefault();
      stopRec();
      const body = f.body.value.trim();
      if (!body && !files.length) return f.body.focus();
      const send = $('[data-send]', f);
      send.disabled = true; send.textContent = t('loading');
      guard(async () => {
        await api.submit(a.id, body, files);
        if (!sub) await api.addXp(20);
        toast(t('sentOk'));
        route();
      }).finally(() => { if (send.isConnected) { send.disabled = false; send.textContent = t('send'); } });
    };
  }));
}
const isAudioFile = (x) => (x.type || '').startsWith('audio/');

function bindGames() {
  const area = $('#gameArea');
  const onDone = async (res) => {
    if (!res) return route();
    if (res.xp > 0) await guard(() => api.addXp(res.xp));
    if (res.total === 10 && res.score === 10 && area.dataset.g === 'letters') await api.setMeta('lettersPerfect', true);
  };
  $$('.game-tile', area).forEach((b) => (b.onclick = async () => {
    const g = b.dataset.g;
    area.dataset.g = g;
    const box = document.createElement('div');
    box.className = 'card game-box';
    area.replaceChildren(box);
    if (g === 'letters') return letters(box, onDone);
    if (g === 'sent') return sentenceBuilder(box, onDone);
    if (g === 'fill') return fillSuffix(box, onDone);
    const vocab = await guard(() => api.vocab()) || [];
    if (g === 'flash') flashcards(box, vocab, getLang(), onDone);
    else if (g === 'word') wordBuilder(box, vocab, onDone);
    else pictures(box, vocab, onDone);
  }));
}

// ------------------------------------------------------------ PARENT
async function renderParent() {
  const kids = await api.children();
  const ptabs = [{ id: 'children', icon: 'children', label: t('tabChildren') }];
  if (!kids.length) return shell(ptabs, `<h1 class="page-title">${t('myChildren')}</h1><p class="card muted">${t('noChildren')}</p>`);
  const data = await Promise.all(kids.map(async (k) => {
    const [subs, act, asg, checks] = await Promise.all([api.submissions(k.id), api.activity(k.id), api.assignments(k.group_id), api.familyChecks(k.id)]);
    return { k, subs, asg, checks: checks || [], st: stats(act, subs) };
  }));
  shell(ptabs, `<h1 class="page-title">${t('myChildren')}</h1>
    <div class="stack">${data.map(({ k, subs, asg, checks, st }) => {
      const fam = asg.filter(isFamily);
      const group = groupsCache.find((g) => g.id === k.group_id);
      const open = asg.filter((a) => !subs.some((s) => s.assignment_id === a.id));
      return `<section class="card child">
        <div class="child-head">
          ${avatar(k, 'xl')}
          <div><h2>${esc(k.full_name)}</h2><p class="muted">${esc(group?.name || t('none'))}${group?.schedule ? ' · ' + esc(group.schedule) : ''}</p></div>
          ${safeUrl(group?.live_url) ? `<a class="btn btn-live btn-sm push" href="${safeUrl(group.live_url)}" target="_blank" rel="noopener">${icon('video', 16)} ${t('joinLive')}</a>` : ''}
        </div>
        <div class="kpis">
          <div class="kpi"><small>${t('streakLabel')}</small><span>${st.streak} 🔥</span></div>
          <div class="kpi"><small>${t('totalXp')}</small><span>${st.totalXp}</span></div>
          <div class="kpi"><small>${t('doneHw')}</small><span>${subs.length} / ${asg.length}</span></div>
          <div class="kpi ${open.length ? 'warn' : ''}"><small>${t('openHw')}</small><span>${open.length}</span></div>
        </div>
        <div class="family-box">
          <div class="family-head">${icon('children', 20)}<div><h3>${t('familyTogether')}</h3><p class="muted small">${t('familyLead')}</p></div></div>
          ${fam.length ? fam.map((a) => {
            const c = checks.find((x) => x.assignment_id === a.id);
            const s = subs.find((x) => x.assignment_id === a.id);
            return `<div class="family-task" data-aid="${esc(a.id)}" data-child="${esc(k.id)}">
              <div class="family-task-main"><b>${esc(a.title)}</b>
                <p class="small muted">${esc(a.instructions || '')}</p>
                <p class="small muted">${t('due')}: ${esc(fmtDate(a.due_date)) || t('none')} · ${t('child')}: ${s ? t('submitted') : t('openHw')}</p>
                ${c?.note ? `<div class="feedback small">${esc(c.note)}</div>` : ''}</div>
              <div class="family-task-side">${c ? `<span class="chip chip-done">✓ ${t('familyConfirmed')}</span>` : `<button class="btn btn-sm btn-gold" data-confirm>${t('familyConfirm')}</button>`}</div>
            </div>`;
          }).join('') : `<p class="muted small">${t('familyNone')}</p>`}
        </div>
        <h3 class="sub">${t('week')}</h3>${weekChart(st.week)}
        <h3 class="sub">${t('recent')}</h3>
        <div class="stack-sm">${asg.slice(0, 5).map((a) => {
          const s = subs.find((x) => x.assignment_id === a.id);
          return `<div class="mini-row"><span>${esc(a.title)} ${isFamily(a) ? familyTag() : ''}</span>${statusChip(s)}</div>
            ${s?.feedback ? `<div class="feedback small">${esc(s.feedback)}</div>` : ''}`;
        }).join('') || `<p class="muted">${t('noHomework')}</p>`}</div>
      </section>`;
    }).join('')}</div>`);
  $$('[data-confirm]').forEach((b) => (b.onclick = () => {
    const box = b.closest('.family-task');
    if ($('.family-form', box)) return;
    box.insertAdjacentHTML('beforeend', `<form class="family-form">
      <label>${t('familyNote')}<textarea name="note" rows="2" maxlength="500" placeholder="Хамт хийхэд их хөгжилтэй байлаа…"></textarea></label>
      <div class="row-gap"><button class="btn btn-gold btn-sm">${t('familyConfirm')}</button><button type="button" class="btn btn-ghost btn-sm" data-cancel>${t('cancel')}</button></div></form>`);
    const f = $('.family-form', box);
    $('[data-cancel]', f).onclick = () => f.remove();
    f.onsubmit = (e) => {
      e.preventDefault();
      guard(async () => { await api.confirmFamily(box.dataset.aid, box.dataset.child, f.note.value.trim()); toast(t('familySaved')); route(); });
    };
  }));
}

// ------------------------------------------------------------ TEACHER / ADMIN
async function renderStaff() {
  const isAdmin = me.role === 'admin';
  const tabs = [
    { id: 'review', icon: 'review', label: t('tabReview') },
    { id: 'manage', icon: 'manage', label: t('tabManage') },
    { id: 'groups', icon: 'groups', label: t('tabGroups') },
    ...(isAdmin ? [{ id: 'users', icon: 'users', label: t('tabUsers') }, { id: 'roster', icon: 'sheet', label: t('tabRoster') }] : []),
  ];
  const tab = currentTab(tabs);
  if (tab === 'review') return staffReview(tabs);
  if (tab === 'manage') return staffManage(tabs);
  if (tab === 'groups') return staffGroups(tabs, isAdmin);
  if (tab === 'users') return adminUsers(tabs);
  if (tab === 'roster') return adminRoster(tabs);
}

async function staffReview(tabs) {
  const [subs, asg, checks] = await Promise.all([api.submissions(), api.assignments(), api.familyChecks()]);
  const title = (id) => asg.find((a) => a.id === id)?.title || '';
  const famInfo = (s) => {
    const a = asg.find((x) => x.id === s.assignment_id);
    if (!isFamily(a)) return '';
    const c = (checks || []).find((x) => x.assignment_id === s.assignment_id && x.student_id === s.student_id);
    return `<p class="tag-row">${familyTag()} ${c ? `<span class="chip chip-done">✓ ${t('familyConfirmed')}</span>${c.note ? ` <span class="muted small">“${esc(c.note)}”</span>` : ''}` : `<span class="muted small">${t('familyWaiting')}</span>`}</p>`;
  };
  const pending = subs.filter((s) => s.status === 'submitted');
  const done = subs.filter((s) => s.status === 'reviewed').slice(0, 10);
  const card = (s) => `<article class="card review" data-id="${esc(s.id)}">
      <div class="review-head">
        ${avatar(s.student)}
        <div><strong>${esc(s.student?.full_name || '')}</strong><p class="muted small">${esc(title(s.assignment_id))} · ${esc(groupName(s.student?.group_id))} · ${esc(fmtDate(s.submitted_at))}</p></div>
      </div>
      ${famInfo(s)}
      ${s.body ? `<blockquote class="mn">${esc(s.body)}</blockquote>` : ''}
      ${filesOf(s).length ? `<div class="media-row">${filesOf(s).map((p) => `<div class="media" data-file="${esc(p)}"><span class="file-chip">${icon(isAudio(p) ? 'mic' : isImage(p) ? 'image' : 'clip', 14)} ${esc(p.split('/').pop().replace(/^(?:.*?-)?\d{12,}-(?:\d{1,2}-)?/, ''))}</span></div>`).join('')}</div>` : ''}
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
  $$('.media[data-file]').forEach(async (box) => {
    const p = box.dataset.file;
    const url = await api.fileUrl(p).catch(() => null);
    if (!url || !box.isConnected) return;
    if (isAudio(p)) box.innerHTML = `<audio controls preload="none" src="${esc(url)}"></audio>`;
    else if (isImage(p)) box.innerHTML = `<a href="${esc(url)}" target="_blank" rel="noopener"><img src="${esc(url)}" alt="" loading="lazy"></a>`;
    else box.innerHTML = `<a class="file-chip" href="${esc(url)}" target="_blank" rel="noopener">${icon('clip', 14)} ${esc(p.split('/').pop())}</a>`;
  });
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
        <h2>${t('newLesson')}</h2>
        <label>${t('title')}<input name="title" required></label>
        <label>${t('desc')}<textarea name="description" rows="2"></textarea></label>
        <label>${t('videoUrl')}<input name="video_url" type="url" placeholder="https://"></label>
        <label>${t('materialUrl')}<input name="material_url" type="url" placeholder="https://"></label>
        <label>${t('date')}<input name="lesson_date" type="date" value="${todayIso()}"></label>
        <button class="btn btn-gold">${t('save')}</button>
      </form>
      <form class="card form" id="hwForm">
        <h2>${t('newHw')}</h2>
        <label class="check-line"><input type="checkbox" name="kind" value="family" id="hwFamily"> ${t('familyTask')}</label>
        <label id="ideaWrap" hidden>${t('familyIdeas')}<select id="ideaSel"><option value="">—</option>${FAMILY_IDEAS.map(([ti], i) => `<option value="${i}">${esc(ti)}</option>`).join('')}</select></label>
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
      ${asg.map((a) => `<div class="mini-row"><span><b>${esc(fmtDate(a.due_date)) || '—'}</b> · ${esc(a.title)} ${isFamily(a) ? familyTag() : ''}</span><button class="btn-x" data-da="${esc(a.id)}" aria-label="${t('del')}">✕</button></div>`).join('') || `<p class="muted">${t('noHomework')}</p>`}
    </section>`);
  $('#groupSel').onchange = (e) => { try { sessionStorage.setItem('erdemGroup', e.target.value); } catch {} route(); };
  const clean = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, v === '' ? null : v]));
  $('#lessonForm').onsubmit = (e) => { e.preventDefault(); const d = clean(Object.fromEntries(new FormData(e.target))); guard(async () => { await api.saveLesson({ ...d, group_id: gid }); toast(t('saved')); route(); }); };
  $('#hwFamily').onchange = (e) => { $('#ideaWrap').hidden = !e.target.checked; const p = $('#hwForm').points; if (e.target.checked && p.value === '10') p.value = '20'; };
  $('#ideaSel').onchange = (e) => { const x = FAMILY_IDEAS[e.target.value]; if (!x) return; const f = $('#hwForm'); f.title.value = x[0]; f.instructions.value = x[1]; };
  $('#hwForm').onsubmit = (e) => { e.preventDefault(); const d = clean(Object.fromEntries(new FormData(e.target))); d.points = +(d.points || 10); if (!d.kind) delete d.kind; guard(async () => { await api.saveAssignment({ ...d, group_id: gid }); toast(t('saved')); route(); }); };
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
        <table class="table"><thead><tr><th>${t('student')}</th><th>${t('streak')}</th><th>${t('totalXp')}</th><th>${t('doneHw')}</th></tr></thead>
        <tbody>${mine.map(({ s, st }) => `<tr><td>${avatar(s)} ${esc(s.full_name)}</td><td>${st.streak}</td><td>${st.totalXp}</td><td>${st.subs}/${total}</td></tr>`).join('') || `<tr><td colspan="4" class="muted">${t('none')}</td></tr>`}</tbody></table>
      </section>`;
    }).join('')}
    ${isAdmin ? `<form class="card group-form" data-g="">
        <h2 class="full">${t('newGroup')}</h2>
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
        <td class="user-cell">${avatar(p)} <span>${esc(p.full_name)}${p.family ? ` <small class="muted">· ${esc(p.family)}</small>` : ''}</span></td>
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

// ------------------------------------------------------------ ADMIN: Excel roster
let XLSX = null;
async function loadXlsx() {
  if (!XLSX) XLSX = await import('https://cdn.sheetjs.com/xlsx-0.20.3/package/xlsx.mjs');
  return XLSX;
}
async function downloadXlsx(rows, filename, sheet = 'Жагсаалт') {
  const X = await loadXlsx();
  const ws = X.utils.json_to_sheet(rows);
  const keys = Object.keys(rows[0] || {});
  ws['!cols'] = keys.map((k) => ({ wch: Math.max(k.length, ...rows.map((r) => String(r[k] ?? '').length)) + 2 }));
  const wb = X.utils.book_new();
  X.utils.book_append_sheet(wb, ws, sheet);
  X.writeFile(wb, filename);
}
let rosterRows = null;

async function adminRoster(tabs) {
  shell(tabs, `
    <div><h1 class="page-title">${t('tabRoster')}</h1><p class="muted lead">${t('rosterLead')}</p></div>
    <div class="steps">
      <section class="card step">
        <span class="step-no">1</span>
        <div class="step-body"><h2>${t('rosterStep1')}</h2><p class="muted small">${t('rosterStep1D')}</p>
          <div class="row-gap">
            <button class="btn btn-ghost btn-sm" id="rExport">${icon('download', 18)} ${t('rosterExport')}</button>
            <button class="btn btn-ghost btn-sm" id="rTemplate">${icon('sheet', 18)} ${t('rosterTemplate')}</button>
          </div>
          <details class="rules"><summary>${t('rosterRules')}</summary><p class="small">${t('rosterRulesD')}</p><p class="small muted">${t('rosterRulesD2')}</p></details>
        </div>
      </section>
      <section class="card step">
        <span class="step-no">2</span>
        <div class="step-body"><h2>${t('rosterStep2')}</h2><p class="muted small">${t('rosterStep2D')}</p>
          <div class="row-gap">
            <label class="btn btn-gold btn-sm file-btn">${icon('upload', 18)} ${t('rosterUpload')}<input type="file" id="rFile" accept=".xlsx,.xls,.csv,.ods"></label>
            <label class="check-line small"><input type="checkbox" id="rDeact" checked> ${t('rosterDeactivate')}</label>
          </div>
        </div>
      </section>
    </div>
    <div id="rosterOut" aria-live="polite"></div>`);
  const out = $('#rosterOut');
  $('#rExport').onclick = () => guard(async () => {
    const { rows } = await api.roster('export');
    await downloadXlsx(rows.length ? rows : TEMPLATE_HEAD(), `erdem-jagsaalt-${todayIso()}.xlsx`);
  });
  $('#rTemplate').onclick = () => guard(() => downloadXlsx(TEMPLATE_HEAD(true), 'erdem-jagsaalt-zagvar.xlsx'));
  const runPlan = async () => {
    if (!rosterRows) return;
    out.innerHTML = `<p class="card muted">${t('loading')}</p>`;
    const res = await guard(() => api.roster('plan', rosterRows, $('#rDeact').checked));
    if (res?.plan) renderPlan(res.plan);
    else out.innerHTML = '';
  };
  $('#rDeact').onchange = runPlan;
  $('#rFile').onchange = async (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    out.innerHTML = `<p class="card muted">${t('rosterLoading')}</p>`;
    await guard(async () => {
      const X = await loadXlsx();
      const wb = X.read(await file.arrayBuffer());
      const ws = wb.Sheets[wb.SheetNames[0]];
      rosterRows = X.utils.sheet_to_json(ws, { defval: '', raw: false });
      await runPlan();
    });
  };

  function renderPlan(plan) {
    const actChip = { create: `<span class="chip chip-new">${t('rosterNew')}</span>`, update: `<span class="chip chip-sent">${t('rosterChanged')}</span>`, same: `<span class="chip chip-muted">${t('rosterSame')}</span>` };
    const rows = [...plan.items.filter((x) => x.action !== 'same'), ...plan.items.filter((x) => x.action === 'same')];
    out.innerHTML = `
      <div class="kpi-grid">
        <div class="kpi-card"><span class="kpi-label">${t('rosterNew')}</span><span class="kpi-value">${plan.counts.create}</span></div>
        <div class="kpi-card"><span class="kpi-label">${t('rosterChanged')}</span><span class="kpi-value">${plan.counts.update}</span></div>
        <div class="kpi-card"><span class="kpi-label">${t('rosterOff')}</span><span class="kpi-value">${plan.counts.deactivate}</span></div>
        <div class="kpi-card"><span class="kpi-label">${t('rosterSame')}</span><span class="kpi-value">${plan.counts.same}</span></div>
      </div>
      <div class="apply-bar">${plan.pending
        ? `<button class="btn btn-gold" id="rApply" ${plan.errors.length ? 'disabled' : ''}>${plan.pending} ${t('rosterApply')}</button>`
        : `<p class="muted">${t('rosterNothing')}</p>`}</div>
      ${plan.errors.length ? `<section class="card alert-bad"><h2>${t('rosterErrors')}</h2><p class="small muted">${t('rosterErrorsD')}</p>
        <ul class="err-list">${plan.errors.map((e) => `<li><b>${t('rosterRow')} ${e.row}:</b> ${esc(e.msg)}</li>`).join('')}</ul></section>` : ''}
      ${plan.groupsToCreate.length || plan.linksAdd.length || plan.linksRemove.length ? `<section class="card">
        ${plan.groupsToCreate.length ? `<h3>${t('rosterGroupsNew')}</h3><p>${plan.groupsToCreate.map((g) => `<span class="chip chip-new">${esc(g)}</span>`).join(' ')}</p>` : ''}
        ${plan.linksAdd.length || plan.linksRemove.length ? `<h3>${t('rosterLinks')}</h3><div class="stack-sm">
          ${plan.linksAdd.map((l) => `<div class="mini-row"><span>${esc(l.parentName)} → ${esc(l.childName)}</span><span class="chip chip-new">${t('rosterLinkAdd')}</span></div>`).join('')}
          ${plan.linksRemove.map((l) => `<div class="mini-row"><span>${esc(l.parentName)} → ${esc(l.childName)}</span><span class="chip chip-open">${t('rosterLinkRemove')}</span></div>`).join('')}</div>` : ''}
      </section>` : ''}
      <section class="card table-wrap">
        <table class="table"><thead><tr><th>${t('fullName')}</th><th>${t('loginOrEmail')}</th><th>${t('role')}</th><th>${t('group')}</th><th>${t('familyCol')}</th><th>${t('rosterAction')}</th></tr></thead><tbody>
        ${rows.map((x) => `<tr class="${x.action === 'same' ? 'row-dim' : ''}"><td>${esc(x.name)}</td><td class="mono">${esc(x.login)}</td><td>${t('r' + x.role)}</td><td>${esc(x.group || '—')}</td><td>${esc(x.family || '—')}</td>
          <td>${actChip[x.action]}${x.changes.length ? `<div class="small muted">${x.changes.map(esc).join('<br>')}</div>` : ''}</td></tr>`).join('')}
        ${plan.deactivate.map((d) => `<tr><td>${esc(d.name)}</td><td class="mono">${esc(d.login)}</td><td>${t('r' + d.role)}</td><td>—</td><td>—</td><td><span class="chip chip-open">${t('rosterOff')}</span></td></tr>`).join('')}
        </tbody></table>
      </section>`;
    const ap = $('#rApply');
    if (ap) ap.onclick = () => {
      ap.disabled = true; ap.textContent = t('loading');
      guard(async () => {
        const res = await api.roster('apply', rosterRows, $('#rDeact').checked);
        if (res?.failed) { renderPlan(res.plan); return; }
        renderResult(res);
      }).finally(() => { if (ap.isConnected) ap.disabled = false; });
    };
  }

  function renderResult(res) {
    rosterRows = null;
    const bad = res.log.filter((l) => !l.ok);
    out.innerHTML = `
      <section class="card ${bad.length ? 'alert-bad' : 'alert-ok'}"><h2>${bad.length ? t('error') : '✓ ' + t('rosterDone')}</h2>
        <ul class="err-list">${res.log.map((l) => `<li class="${l.ok ? '' : 'late'}">${l.ok ? '✓' : '✕'} ${esc(l.msg)}</li>`).join('')}</ul></section>
      ${res.credentials?.length ? `<section class="card">
        <h2>${t('rosterCreds')}</h2><p class="small muted">${t('rosterCredsLead')}</p>
        <div class="table-wrap"><table class="table"><thead><tr><th>${t('fullName')}</th><th>${t('loginOrEmail')}</th><th>${t('password')}</th><th>${t('role')}</th></tr></thead><tbody>
        ${res.credentials.map((c) => `<tr><td>${esc(c.name)}</td><td class="mono">${esc(c.login)}</td><td class="mono">${esc(c.password)}</td><td>${esc(c.role)}</td></tr>`).join('')}
        </tbody></table></div>
        <button class="btn btn-gold mt" id="rCreds">${icon('download', 18)} ${t('rosterCredsDl')}</button>
      </section>` : ''}`;
    const c = $('#rCreds');
    if (c) c.onclick = () => guard(() => downloadXlsx(res.credentials.map((x) => ({
      'Овог нэр': x.name, 'Нэвтрэх нэр': x.login, 'Нууц үг': x.password, 'Эрх': x.role, 'Анги': x.group || '', 'Гэр бүл': x.family || '',
      'Хаяг': 'https://erdem-schule.de/classroom/',
    })), `erdem-nevtreh-${todayIso()}.xlsx`, 'Нэвтрэх'));
  }
}
const TEMPLATE_HEAD = (examples = false) => (examples ? TEMPLATE_ROWS : [{ 'Овог нэр': '', 'Имэйл / нэвтрэх нэр': '', 'Эрх': '', 'Анги': '', 'Гэр бүл': '', 'Нууц үг': '', 'Шинэ нууц үг': '' }]);

// ------------------------------------------------------------ router
async function route() {
  document.documentElement.lang = getLang() === 'de' ? 'de' : 'mn';
  if (!me) return renderLogin();
  if (me.role === 'pending') return shell([], `<section class="card pending center"><h1>${t('pendingTitle')}</h1><p class="muted">${t('pendingLead')}</p></section>`);
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
