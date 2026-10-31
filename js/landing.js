import { loadPublic, sessionUser, CLASSROOM } from './public.js';
import { $, $$, esc, nl2br, videoHtml, reduceMotion } from './util.js';
import { SCHOOL } from './config.js';
import { extend, t, pick, onLang, apply, fmtDateL } from './i18n.js';

extend({
  mn: {
    'brand.name': 'Эрдэм сургууль',
    'nav.about': 'Бидний тухай', 'nav.program': 'Хөтөлбөр', 'nav.history': '15 жил', 'nav.news': 'Мэдээ', 'nav.events': 'Хуваарь',
    'nav.contact': 'Холбоо барих', 'nav.login': 'Нэвтрэх', 'nav.mypage': 'Миний хуудас',
    'skip': 'Агуулга руу шилжих', 'hero.badge': 'Ойн хичээлийн жил 2026/2027', 'hero.years': 'жилийн ой', 'hero.title': 'Эх хэл. Соёл. Эрдэм.',
    'hero.desc': 'Герман улсад амьдарч буй монгол хүүхдүүдэд эх хэл, өв соёлоо өвлүүлэн үлдээж яваа сургууль маань 15 жилийн ойгоо тэмдэглэж байна.',
    'hero.cta1': 'Хүүхдээ бүртгүүлэх', 'hero.cta2': 'Сургалтын веб',
    'count.chip': 'Шинэ хичээлийн жил', 'count.title': '2026 / 2027 оны хичээл 10-р сарын 4-нд эхэлнэ',
    'count.d': 'өдөр', 'count.h': 'цаг', 'count.m': 'минут', 'count.s': 'секунд',
    'count.done': '<b>Хичээл явагдаж байна.</b> Бямба гарагт онлайн, ням гарагт Эрланген хотноо танхимаар.', 'count.started': '2026 / 2027 оны хичээлийн жил', 'count.link': 'Хуваарь харах',
    'about.h': 'Монгол хэл, монгол сэтгэл, монгол боловсрол',
    'about.text': '«Эрдэм» сургууль нь Нюрнберг, Эрланген орчмын монгол гэр бүлийн 6-аас дээш насны хүүхдүүдэд монгол хэл, соёл, уламжлалт урлагийг заадаг. Хүүхдүүдийг бага, дунд, ахлах гэсэн гурван бүлэгт хуваан, түвшинд нь тохирсон сургалтыг явуулдаг.',
    'about.f1': 'жилийн түүх', 'about.f2': 'насны бүлэг', 'about.f3': 'сургалтын чиглэл',
    'about.how': 'Хичээл хэрхэн явагддаг вэ?',
    'about.sat': '<b>Бямба — онлайн.</b> Дунд, ахлах ангийн монгол хэл.',
    'about.sun': '<b>Ням — танхим.</b> Эрланген хотноо монгол хэл, бүжиг, гитар.',
    'prog.h': 'Сургалтын чиглэл',
    'prog.sub': '2026/2027 оны хичээлийн жилд дөрвөн чиглэлээр хичээллэнэ.',
    'prog.1t': 'Монгол хэл', 'prog.1d': 'Кирилл үсэг, зөв бичгээс эхлээд уншлага, яриа хүртэл. Бага, дунд, ахлах гурван түвшинд, онлайн тоглоомоор давтана.',
    'prog.2t': 'Үндэсний бүжиг', 'prog.2d': 'Монгол ардын бүжгийн хөдөлгөөн, хэмнэлийг сурч, баяр ёслол, тоглолтод оролцоно.',
    'prog.3t': 'Гитар', 'prog.3d': 'Хөгжмийн анхан шатнаас эхэлж, монгол дуунуудыг гитартай хамт тоглож сурна.',
    'prog.4t': 'Сагсан бөмбөг, волейбол', 'prog.4d': 'Спорт заалд залуучууд болон насанд хүрэгчдэд зориулсан бэлтгэл.',
    'hist.eyebrow': '15 жилийн аян замнал', 'hist.2t': 'Жил бүр',
    'hist.1': 'Эрдэм сургууль үүдээ нээж, анхны сурагчдаа угтлаа.',
    'hist.2': 'Цагаан сар, урлагийн тоглолт, эцэг эхийн өдөр уламжлал болон тогтлоо.',
    'hist.3': 'Шинэ хичээлийн жил 10-р сарын 4-нд эхэлж, сургалтын шинэ вэб нээгдэв.',
    'hist.4': 'Эрдэм сургуулийн 15 жилийн ой — хамтдаа тэмдэглэе!',
    'news.eyebrow': 'Шинэ мэдээ', 'news.h': 'Мэдээ, мэдээлэл', 'news.add': 'Мэдээ нэмэх', 'news.none': 'Шинэ мэдээ нийтлэгдэхэд энд гарна.',
    'news.pinned': '📌 Чухал', 'news.video': '▶ Видео', 'news.join': 'Онлайнаар орох',
    'nav.online': 'Онлайн анги', 'on.eyebrow': 'Шинэ', 'on.h': 'Онлайн анги', 'on.p': 'Хичээл, гэрийн даалгавар, монгол хэлний тоглоом, эцэг эхийн самбар — бүгд нэг дор. Компьютер, утсан дээр ажиллана, үнэгүй.',
    'on.1t': 'Хичээл, шууд хичээл', 'on.1d': 'Хичээлийн видео, материал, Google Meet-д нэг товчоор', 'on.2t': 'Гэрийн даалгавар', 'on.2d': 'Бичих, дуу бичих, зураг; бүжиг, дууны бичлэг линкээр', 'on.3t': 'Тоглож сурах', 'on.3d': 'Үг, үсэг, өгүүлбэрийн 6 тоглоом, оноо, шагнал', 'on.4t': 'Эцэг эхэд', 'on.4d': 'Хүүхдийн явц, цээжилсэн үгс, долоо хоногийн тайлан', 'on.go': 'Онлайн ангид нэвтрэх', 'on.note': 'Нэвтрэх нэр, нууц үгээ сургуулиас авна.',
    'ev.h': 'Ойрын арга хэмжээ', 'ev.all': 'Бүх хуваарь', 'ev.none': 'Одоогоор товлосон арга хэмжээ алга. Хичээлийн тогтмол цагийг «Бүх хуваарь» хэсгээс харна уу.',
    'ct.h': 'Хүүхдээ бүртгүүлэх үү?', 'ct.p': 'Шинэ сурагч элсүүлж байна. Хүүхдийнхээ нэр, насыг бичээд имэйл илгээгээрэй, бид эргэн холбогдоно.', 'ct.reg': 'Бүртгүүлэх имэйл бичих',
    'ct.card.h': 'Сурагч, багш нар аа', 'ct.card.p': 'Өөрийн эрхээр нэвтэрч сургалтын веб рүү орно уу.',
    'foot.rights': 'Бүх эрх хуулиар хамгаалагдсан.',
    'music.title': 'Хөгжим асаах / унтраах', 'music.vol': 'Дууны хэмжээ',
  },
  de: {
    'brand.name': 'Erdem Schule',
    'nav.about': 'Über uns', 'nav.program': 'Programm', 'nav.history': '15 Jahre', 'nav.news': 'Neuigkeiten', 'nav.events': 'Termine',
    'nav.contact': 'Kontakt', 'nav.login': 'Anmelden', 'nav.mypage': 'Mein Bereich',
    'skip': 'Zum Inhalt springen', 'hero.badge': 'Jubiläumsschuljahr 2026/2027', 'hero.years': 'Jahre', 'hero.title': 'Muttersprache. Kultur. Wissen.',
    'hero.desc': 'Wir vermitteln mongolischen Kindern in Deutschland ihre Muttersprache und ihr kulturelles Erbe — und feiern unser 15-jähriges Jubiläum.',
    'hero.cta1': 'Kind anmelden', 'hero.cta2': 'Lernportal',
    'count.chip': 'Neues Schuljahr', 'count.title': 'Das Schuljahr 2026 / 2027 beginnt am 4. Oktober',
    'count.d': 'Tage', 'count.h': 'Std.', 'count.m': 'Min.', 'count.s': 'Sek.',
    'count.done': '<b>Der Unterricht läuft.</b> Samstags online, sonntags vor Ort in Erlangen.', 'count.started': 'Schuljahr 2026 / 2027', 'count.link': 'Zum Stundenplan',
    'about.h': 'Mongolische Sprache, mongolische Seele, mongolische Bildung',
    'about.text': 'Die „Erdem“-Schule vermittelt Kindern mongolischer Familien ab 6 Jahren in Nürnberg, Erlangen und Umgebung die mongolische Sprache, Kultur und traditionelle Kunst. Die Kinder lernen in drei Gruppen — Unter-, Mittel- und Oberstufe — passend zu ihrem Niveau.',
    'about.f1': 'Jahre Geschichte', 'about.f2': 'Altersgruppen', 'about.f3': 'Kursangebote',
    'about.how': 'Wie läuft der Unterricht ab?',
    'about.sat': '<b>Samstag — online.</b> Mongolisch für Mittel- und Oberstufe.',
    'about.sun': '<b>Sonntag — Präsenz.</b> Mongolisch, Tanz und Gitarre in Erlangen.',
    'prog.h': 'Unsere Fächer',
    'prog.sub': 'Im Schuljahr 2026/2027 bieten wir vier Kurse an.',
    'prog.1t': 'Mongolische Sprache', 'prog.1d': 'Von der kyrillischen Schrift und Rechtschreibung bis zum Lesen und Sprechen — in Unter-, Mittel- und Oberstufe, mit Online-Lernspielen zum Üben.',
    'prog.2t': 'Mongolischer Tanz', 'prog.2d': 'Bewegungen und Rhythmen des mongolischen Volkstanzes — mit Auftritten bei Festen und Feiern.',
    'prog.3t': 'Gitarre', 'prog.3d': 'Von den ersten Griffen bis zum gemeinsamen Spielen mongolischer Lieder.',
    'prog.4t': 'Basketball & Volleyball', 'prog.4d': 'Training in der Sporthalle für Jugendliche und Erwachsene.',
    'hist.eyebrow': '15 Jahre unterwegs', 'hist.2t': 'Jedes Jahr',
    'hist.1': 'Die Erdem Schule öffnet ihre Türen und begrüßt die ersten Schülerinnen und Schüler.',
    'hist.2': 'Tsagaan Sar, Kulturprogramme und der Elterntag werden zur festen Tradition.',
    'hist.3': 'Das neue Schuljahr beginnt am 4. Oktober — und unser neues Lernportal geht online.',
    'hist.4': '15 Jahre Erdem Schule — feiern wir gemeinsam!',
    'news.eyebrow': 'Aktuelles', 'news.h': 'Neuigkeiten & Informationen', 'news.add': 'Beitrag hinzufügen', 'news.none': 'Neue Beiträge erscheinen hier.',
    'news.pinned': '📌 Wichtig', 'news.video': '▶ Video', 'news.join': 'Online teilnehmen',
    'nav.online': 'Online-Klasse', 'on.eyebrow': 'Neu', 'on.h': 'Online-Klasse', 'on.p': 'Unterricht, Hausaufgaben, Mongolisch-Lernspiele und ein Elternbereich — alles an einem Ort. Läuft auf Computer und Handy, kostenlos.',
    'on.1t': 'Unterricht & Live-Stunde', 'on.1d': 'Videos, Material, mit einem Klick zu Google Meet', 'on.2t': 'Hausaufgaben', 'on.2d': 'Schreiben, Sprachaufnahme, Fotos; Tanz- und Musikvideos per Link', 'on.3t': 'Spielend lernen', 'on.3d': '6 Spiele zu Wörtern, Buchstaben, Sätzen — mit Punkten und Abzeichen', 'on.4t': 'Für Eltern', 'on.4d': 'Lernfortschritt, gelernte Wörter, Wochenbericht', 'on.go': 'Zur Online-Klasse', 'on.note': 'Zugangsdaten erhalten Sie von der Schule.',
    'ev.h': 'Kommende Termine', 'ev.all': 'Alle Termine', 'ev.none': 'Zurzeit sind keine Veranstaltungen geplant. Die regulären Unterrichtszeiten finden Sie unter „Alle Termine“.',
    'ct.h': 'Ihr Kind anmelden?', 'ct.p': 'Wir nehmen neue Schülerinnen und Schüler auf. Schreiben Sie uns Name und Alter Ihres Kindes — wir melden uns bei Ihnen.', 'ct.reg': 'Anmeldung per E-Mail',
    'ct.card.h': 'Schüler und Lehrer', 'ct.card.p': 'Melden Sie sich mit Ihrem Zugang im Lernportal an.',
    'foot.rights': 'Alle Rechte vorbehalten.',
    'music.title': 'Musik an / aus', 'music.vol': 'Lautstärke',
  },
});

window.__erdemReady = true; // index.html-ийн нөөц таймер агуулгыг ил гаргахгүй
apply(); // толь бүрэн бүртгэгдсэний дараа статик текстүүдийг орчуулна

let user = null, newsItems = [], events = [], site = {};
// Мэдээг онлайн ангийн "Мэдэгдэл" цэснээс ("Нийтэд" гэж сонгоод) нэмнэ
const isStaff = () => false;

// ---------- nav ----------
const nav = $('#nav');
const onScroll = () => nav.classList.toggle('solid', scrollY > 40);
addEventListener('scroll', onScroll, { passive: true }); onScroll();
const burger = $('#burger');
const setMenu = (open) => { $('#links').classList.toggle('open', open); burger.setAttribute('aria-expanded', String(open)); };
burger.onclick = () => setMenu(!$('#links').classList.contains('open'));
$$('#links a').forEach((a) => a.addEventListener('click', () => setMenu(false)));
addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });
$('#yr').textContent = new Date().getFullYear();

function renderLogin() {
  const b = $('#loginBtn');
  if (user) {
    b.href = CLASSROOM;
    b.innerHTML = `<i class="fa-solid fa-user"></i> ${user.name ? esc(user.name.split(' ')[0]) + ' · ' : ''}${t('nav.mypage')}`;
  } else { b.href = CLASSROOM; b.innerHTML = `<i class="fa-solid fa-right-to-bracket"></i> ${t('nav.login')}`; }
}
user = sessionUser();
$('#addNews').classList.add('hidden');

// ---------- site settings (админ засдаг) ----------
function applySite() {
  const set = (sel, key) => { const v = pick(site, key); if (v) $(sel).textContent = v; };
  set('#heroTitle', 'heroTitle'); set('#heroDesc', 'heroDesc'); set('#aboutText', 'aboutText');
  set('#cAddr', 'address');
  if (site.email) { $('#cMail').textContent = site.email; $('#cMail').href = 'mailto:' + site.email; }
  const msg = pick(site, 'announcement');
  $('#ticker').classList.toggle('hidden', !msg);
  $('#tickerText').textContent = msg;
}
applySite();

// ---------- news ----------
loadPublic().then(({ news, events: ev }) => { newsItems = news; events = ev; renderNews(); renderEvents(); });
function renderNews() {
  const box = $('#newsGrid');
  if (!newsItems.length) { box.innerHTML = `<div class="empty">${t('news.none')}</div>`; return; }
  const sorted = [...newsItems].sort((a, b) => (b.pinned === true) - (a.pinned === true) || b.createdAt - a.createdAt);
  box.innerHTML = sorted.map((n) => `
    <article class="news ${n.pinned ? 'pin' : ''}" data-id="${esc(n.id)}" tabindex="0">
      <div class="pic ${n.image ? '' : 'none'}">${n.image ? `<img src="${esc(n.image)}" alt="" loading="lazy">` : ''}</div>
      <div class="body">
        <div>${n.pinned ? `<span class="chip red">${t('news.pinned')}</span> ` : ''}${n.video ? `<span class="chip blue">${t('news.video')}</span>` : ''}</div>
        <h3>${esc(pick(n, 'title'))}</h3>
        <p>${esc(pick(n, 'body'))}</p>
        <div class="meta"><span>${fmtDateL(n.createdAt)} · ${esc(n.author || '')}</span>
          ${isStaff() ? `<button class="btn ghost sm" data-edit="${esc(n.id)}" title="${t('common.edit')}"><i class="fa-solid fa-pen"></i></button>` : ''}
        </div>
      </div>
    </article>`).join('');
}
$('#newsGrid').addEventListener('click', (e) => {
  const ed = e.target.closest('[data-edit]');
  const card = e.target.closest('.news');
  if (card) openNews(newsItems.find((n) => n.id === card.dataset.id));
});
$('#newsGrid').addEventListener('keydown', (e) => {
  if (e.key !== 'Enter' || !e.target.classList?.contains('news')) return;
  openNews(newsItems.find((n) => n.id === e.target.dataset.id));
});
function openNews(n) {
  if (!n) return;
  const bg = document.createElement('div');
  bg.className = 'modal-bg';
  bg.innerHTML = `<div class="modal news-full"><h3>${esc(pick(n, 'title'))}</h3>
    <p class="muted" style="margin-top:-.6rem;font-size:.8rem">${fmtDateL(n.createdAt)} · ${esc(n.author || '')}</p>
    ${n.image ? `<img class="full" src="${esc(n.image)}" alt="">` : ''}
    ${n.video && videoHtml(n.video) ? `<div class="media">${videoHtml(n.video)}</div>` : ''}
    <p>${nl2br(pick(n, 'body'))}</p>
    ${n.link && !n.video && /^https?:/i.test(n.link) ? `<p><a class="btn gold sm" href="${esc(n.link)}" target="_blank" rel="noopener"><i class="fa-solid fa-video"></i> ${t('news.join')}</a></p>` : ''}<div class="actions"><button class="btn ghost" data-x>${t('common.close')}</button></div></div>`;
  document.body.append(bg);
  bg.onmousedown = (e) => { if (e.target === bg || e.target.dataset.x !== undefined) bg.remove(); };
}

// ---------- events ----------
function renderEvents() {
  const today = new Date().toISOString().slice(0, 10);
  const up = events.filter((e) => e.date >= today).sort((a, b) => (a.date + (a.time || '')).localeCompare(b.date + (b.time || ''))).slice(0, 5);
  $('#eventList').innerHTML = up.length ? up.map((e) => {
    const d = new Date(e.date + 'T00:00:00');
    const online = e.type === 'Онлайн';
    return `<div class="ev reveal in"><div class="d"><b>${d.getDate()}</b><small>${t('month.' + (d.getMonth() + 1))}</small></div>
      <div><h3>${esc(pick(e, 'title'))}</h3><p>${esc(e.time || '')} · ${esc(e.place || '')}</p></div>
      <span class="chip ${online ? 'blue' : 'green'}">${online ? t('common.online') : t('common.onsite')}</span></div>`;
  }).join('') : `<div class="empty">${t('ev.none')}</div>`;
}

// ---------- countdown ----------
const target = new Date(SCHOOL.newYearStart).getTime();
function tick() {
  const diff = target - Date.now();
  if (diff <= 0) {
    $('#countGrid').classList.add('hidden'); $('#countDone').classList.remove('hidden');
    $('#countTitle').textContent = t('count.started');
    $('#countLink').classList.remove('hidden');
    $('#top .count').classList.add('done');
    return false;
  }
  const s = Math.floor(diff / 1000);
  $('#cd').textContent = Math.floor(s / 86400);
  $('#ch').textContent = String(Math.floor(s % 86400 / 3600)).padStart(2, '0');
  $('#cm').textContent = String(Math.floor(s % 3600 / 60)).padStart(2, '0');
  $('#cs').textContent = String(s % 60).padStart(2, '0');
  return true;
}
let cdTimer;
if (tick()) cdTimer = setInterval(() => { if (!tick()) clearInterval(cdTimer); }, 1000);


// Хэл солигдоход динамик хэсгүүдийг дахин зурна (i18n.apply нь data-i18n текстийг дарж бичдэг)
onLang(() => { applySite(); renderLogin(); renderNews(); renderEvents(); if (target <= Date.now()) $('#countTitle').textContent = t('count.started'); });
renderLogin();

// ---------- арын хөгжим (давтагдана) ----------
const bgm = $('#bgm'), musicBtn = $('#musicBtn');
let musicWanted = true;
try { musicWanted = localStorage.getItem('erdemMusic') !== 'off'; } catch { /* ignore */ }
// ---- дууны хэмжээ: гулсагч 0-100, бодит түвшин нь квадрат муруй (чихэнд жигд сонсогдоно). Хөтөч санана ----
const volEl = $('#vol');
let volPct = 60;
try { const s = localStorage.getItem('erdemVol'); if (s !== null && !isNaN(+s)) volPct = Math.min(100, Math.max(0, +s)); } catch { /* ignore */ }
volEl.value = volPct;
const applyVol = () => { bgm.volume = (volPct / 100) ** 2; };
applyVol();
function paintMusic() {
  const on = !bgm.paused && volPct > 0;
  musicBtn.classList.toggle('on', on);
  musicBtn.setAttribute('aria-pressed', String(!bgm.paused));
  musicBtn.textContent = on ? '🔊' : '🔇';
}
async function startMusic() {
  try { await bgm.play(); } catch { /* автоматаар тоглуулахыг хөтөч хориглосон — эхний товшилтыг хүлээнэ */ }
  paintMusic();
}
const unlockEvents = ['pointerdown', 'keydown', 'touchend'];
function unlock(e) {
  if (e.target.closest?.('#musicBtn')) return; // товчийг өөрийг нь дарахад давхар асаахгүй
  if (musicWanted && bgm.paused) startMusic();
  if (!bgm.paused) unlockEvents.forEach((ev) => removeEventListener(ev, unlock));
}
if (musicWanted) { startMusic(); unlockEvents.forEach((ev) => addEventListener(ev, unlock)); }
musicBtn.onclick = () => {
  musicWanted = bgm.paused;
  try { localStorage.setItem('erdemMusic', musicWanted ? 'on' : 'off'); } catch { /* ignore */ }
  if (musicWanted) startMusic(); else { bgm.pause(); paintMusic(); }
};
volEl.addEventListener('input', () => {
  volPct = +volEl.value; applyVol();
  try { localStorage.setItem('erdemVol', String(volPct)); } catch { /* ignore */ }
  // Гулсагчийг татах нь хэрэглэгчийн үйлдэл тул хөгжим унтарсан/хориглогдсон байсан ч асаана
  if (volPct > 0 && bgm.paused) { musicWanted = true; try { localStorage.setItem('erdemMusic', 'on'); } catch { /* ignore */ } startMusic(); }
  else paintMusic();
});

// ---------- амны хөдөлгөөн: дууны хоолойтой синхрон ----------
// audio/eh-hel.mouth.json = дууны хоолойн давтамжийн (300–3400 Hz) энергийн дугтуй, 20 мс тутамд 0..99.
// Дууны одоогийн хугацаагаар (currentTime) уншиж амны sprite-ийг ангайлгана. Дууны хэмжээнээс үл хамаарна.
// Хязгаарлалт: энэ нь үгийн дагуу (a/o/u хэлбэр) биш, дуулсан үеийн хэмнэл, чанга сулын дагуу нээгдэнэ.
let mouthEnv = null;
fetch('audio/eh-hel.mouth.json').then((r) => r.json()).then((j) => { mouthEnv = j; }).catch(() => { /* дугтуйгүй бол өмнөх энгийн хөдөлгөөн үргэлжилнэ */ });
const stageEl = $('#stage');
const envAt = (t) => {
  const f = Math.max(0, t) / mouthEnv.hop, i = Math.floor(f), fr = f - i;
  const a = mouthEnv.v[i] ?? 0, b = mouthEnv.v[i + 1] ?? a;
  return (a + (b - a) * fr) / 99;
};
let mGirl = 0, mBoy = 0;
function lipSync() {
  if (mouthEnv && !bgm.paused && volPct > 0) {
    const t = bgm.currentTime - 0.04; // дууны гаралтын саатлыг нөхнө
    const tg = envAt(t), tb = envAt(t - 0.05) * 0.92; // хүү бага зэрэг хоцорч, жижгээр нээгдэнэ — хоёр хүүхэд адилхан робот шиг харагдахгүй
    mGirl += (tg - mGirl) * (tg > mGirl ? 0.65 : 0.28); // хурдан нээгдэж, удаан хаагдана
    mBoy += (tb - mBoy) * (tb > mBoy ? 0.65 : 0.28);
    stageEl.style.setProperty('--m', mGirl.toFixed(3));
    stageEl.style.setProperty('--m2', mBoy.toFixed(3));
    stageEl.classList.add('sync');
  } else stageEl.classList.remove('sync');
  requestAnimationFrame(lipSync);
}
if (!reduceMotion()) requestAnimationFrame(lipSync);

// Цонх нуугдахад түр зогсоож, буцаж ирэхэд үргэлжлүүлнэ
document.addEventListener('visibilitychange', () => {
  if (document.hidden) bgm.pause(); else if (musicWanted) startMusic();
});
bgm.addEventListener('play', paintMusic); bgm.addEventListener('pause', paintMusic);

// ---------- reveal / counters / tilt ----------
const io = new IntersectionObserver((es) => es.forEach((e) => {
  if (!e.isIntersecting) return;
  e.target.classList.add('in'); io.unobserve(e.target);
  if (e.target.classList.contains('fact')) countUp(e.target.querySelector('.num'));
}), { threshold: .15 });
$$('.reveal, .fact').forEach((el) => io.observe(el));
function countUp(el) {
  const to = +el.dataset.to; if (reduceMotion()) { el.textContent = to; return; }
  const t0 = performance.now();
  (function f(now) { const k = Math.min(1, (now - t0) / 1400); el.textContent = Math.round(to * (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(f); })(t0);
}
function bindTilt(root = document) {
  if (reduceMotion() || matchMedia('(hover: none)').matches) return;
  $$('.tilt', root).forEach((el) => {
    if (el._t) return; el._t = 1;
    el.addEventListener('mousemove', (e) => {
      const r = el.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
      el.style.transform = `perspective(700px) rotateY(${x * 8}deg) rotateX(${-y * 8}deg) translateY(-4px)`;
    });
    el.addEventListener('mouseleave', () => { el.style.transform = ''; });
  });
}
bindTilt();

// ---------- canvas: оч, confetti, курсорын мөр ----------
const cv = $('#fx'), ctx = cv.getContext('2d');
let W, H, parts = [];
const DPR = devicePixelRatio || 1;
const resize = () => { W = cv.width = innerWidth * DPR; H = cv.height = innerHeight * DPR; };
resize(); addEventListener('resize', resize);
const COLORS = ['#f0c879', '#c59d5f', '#fff2c4', '#d4343b', '#3b82f6', '#ffffff'];
function confetti(x, y, n = 90) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, v = 4 + Math.random() * 9;
    kick(); parts.push({ x: x * DPR, y: y * DPR, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 5, g: .22, life: 90 + Math.random() * 60, size: (4 + Math.random() * 6) * DPR, c: COLORS[i % COLORS.length], rot: Math.random() * 6, vr: (Math.random() - .5) * .4, shape: Math.random() < .5 ? 'r' : 's' });
  }
}
function frame() {
  ctx.clearRect(0, 0, W, H);
  parts = parts.filter((p) => p.life > 0);
  for (const p of parts) {
    p.x += p.vx; p.y += p.vy; p.vy += p.g; p.vx *= .99; p.life--; p.rot += p.vr;
    ctx.globalAlpha = Math.min(1, p.life / 30); ctx.fillStyle = p.c;
    ctx.shadowColor = '#f0c879'; ctx.shadowBlur = p.glow ? 12 : 0;
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
    if (p.shape === 'r') ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2); else { ctx.beginPath(); ctx.arc(0, 0, p.size / 2, 0, 7); ctx.fill(); }
    ctx.restore();
  }
  ctx.globalAlpha = 1;
  if (parts.length) requestAnimationFrame(frame); else running = false;
}
let running = false;
const kick = () => { if (!running) { running = true; requestAnimationFrame(frame); } };
if (!reduceMotion()) {
  setTimeout(() => confetti(innerWidth / 2, innerHeight * .35, 120), 700);
  $('#big15').addEventListener('click', (e) => confetti(e.clientX, e.clientY, 140));
  // Хүүхдүүд дээр дарвал хурдан, хүчтэй дуулна
  let loudTimer;
  $('#stage').addEventListener('click', (e) => {
    const st = $('#stage'); st.classList.add('loud'); clearTimeout(loudTimer);
    loudTimer = setTimeout(() => st.classList.remove('loud'), 3500);
    confetti(e.clientX, e.clientY, 60);
  });
}
