// Хоёр хэл: Монгол (mn) / Герман (de)
// HTML: data-i18n="key" (текст), data-i18n-ph="key" (placeholder), data-i18n-html="key" (HTML)
// Хуудас бүр өөрийн толийг extend({mn:{...}, de:{...}})-ээр нэмнэ.
const DICT = { mn: {}, de: {} };
const subs = new Set();
let lang = 'mn';
try { lang = localStorage.getItem('erdemLang') || 'mn'; } catch { /* ignore */ }

export const getLang = () => lang;
export function extend(d) { for (const l of ['mn', 'de']) Object.assign(DICT[l], d[l] || {}); }
export function t(key, vars) {
  let s = DICT[lang][key] ?? DICT.mn[key] ?? key;
  if (vars) for (const k in vars) s = s.replaceAll('{' + k + '}', vars[k]);
  return s;
}
// Динамик контентын хоёр хэлтэй талбар: obj.title / obj.title_de. DE хоосон бол монголыг харуулна.
export function pick(obj, field) {
  if (!obj) return '';
  return (lang === 'de' && obj[field + '_de']) || obj[field] || '';
}
export function onLang(cb) { subs.add(cb); return () => subs.delete(cb); }

export function apply(root = document) {
  document.documentElement.lang = lang;
  root.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
  root.querySelectorAll('[data-i18n-html]').forEach((el) => { el.innerHTML = t(el.dataset.i18nHtml); });
  root.querySelectorAll('[data-i18n-ph]').forEach((el) => { el.placeholder = t(el.dataset.i18nPh); });
  root.querySelectorAll('[data-i18n-title]').forEach((el) => { el.title = t(el.dataset.i18nTitle); });
  root.querySelectorAll('[data-lang-toggle]').forEach((b) => {
    b.innerHTML = `<span class="${lang === 'mn' ? 'on' : ''}">MN</span><span class="${lang === 'de' ? 'on' : ''}">DE</span>`;
  });
}
export function setLang(l) {
  lang = l === 'de' ? 'de' : 'mn';
  try { localStorage.setItem('erdemLang', lang); } catch { /* ignore */ }
  apply();
  subs.forEach((f) => f(lang));
}
document.addEventListener('click', (e) => {
  if (e.target.closest('[data-lang-toggle]')) setLang(lang === 'mn' ? 'de' : 'mn');
});

extend({
  mn: {
    'lang.title': 'Хэл солих',
    'common.cancel': 'Болих', 'common.save': 'Хадгалах', 'common.delete': 'Устгах', 'common.close': 'Хаах',
    'common.edit': 'Засах', 'common.saved': 'Хадгалагдлаа', 'common.deleted': 'Устгагдлаа', 'common.error': 'Алдаа',
    'common.all': 'Бүгд', 'common.confirmDel': 'Устгахдаа итгэлтэй байна уу?', 'common.wait': 'Түр хүлээнэ үү…',
    'common.logout': 'Гарах', 'common.home': 'Нүүр хуудас', 'common.send': 'Илгээх', 'common.online': 'Онлайн', 'common.onsite': 'Танхим',
    'demo.bar': 'DEMO горим — өгөгдөл зөвхөн энэ хөтөчид хадгалагдана. Жинхэнэ ажиллагаанд README.md-г үзнэ үү.',
    'role.admin': 'Админ', 'role.teacher': 'Багш', 'role.student': 'Сурагч',
    'group.бага': 'бага', 'group.дунд': 'дунд', 'group.ахлах': 'ахлах',
    'month.1': '1-р сар', 'month.2': '2-р сар', 'month.3': '3-р сар', 'month.4': '4-р сар', 'month.5': '5-р сар', 'month.6': '6-р сар',
    'month.7': '7-р сар', 'month.8': '8-р сар', 'month.9': '9-р сар', 'month.10': '10-р сар', 'month.11': '11-р сар', 'month.12': '12-р сар',
    'news.edit.new': 'Шинэ мэдээ', 'news.edit.edit': 'Мэдээ засах',
    'news.f.title': 'Гарчиг (монгол)', 'news.f.body': 'Агуулга (монгол)',
    'news.f.titleDe': 'Гарчиг (герман)', 'news.f.bodyDe': 'Агуулга (герман)',
    'news.f.deHint': 'Герман хувилбар хоосон бол монгол хувилбар харагдана.',
    'news.f.image': 'Зураг (заавал биш)', 'news.f.video': 'Видео линк — YouTube / Vimeo (заавал биш)', 'news.f.pinned': 'Дээр нь тогтоох',
    'news.confirmDel': 'Энэ мэдээг устгах уу?',
  },
  de: {
    'lang.title': 'Sprache wechseln',
    'common.cancel': 'Abbrechen', 'common.save': 'Speichern', 'common.delete': 'Löschen', 'common.close': 'Schließen',
    'common.edit': 'Bearbeiten', 'common.saved': 'Gespeichert', 'common.deleted': 'Gelöscht', 'common.error': 'Fehler',
    'common.all': 'Alle', 'common.confirmDel': 'Wirklich löschen?', 'common.wait': 'Einen Moment…',
    'common.logout': 'Abmelden', 'common.home': 'Startseite', 'common.send': 'Senden', 'common.online': 'Online', 'common.onsite': 'Präsenz',
    'demo.bar': 'DEMO-Modus — Daten werden nur in diesem Browser gespeichert. Für den echten Betrieb siehe README.md.',
    'role.admin': 'Admin', 'role.teacher': 'Lehrer/in', 'role.student': 'Schüler/in',
    'group.бага': 'Unterstufe', 'group.дунд': 'Mittelstufe', 'group.ахлах': 'Oberstufe',
    'month.1': 'Januar', 'month.2': 'Februar', 'month.3': 'März', 'month.4': 'April', 'month.5': 'Mai', 'month.6': 'Juni',
    'month.7': 'Juli', 'month.8': 'August', 'month.9': 'September', 'month.10': 'Oktober', 'month.11': 'November', 'month.12': 'Dezember',
    'news.edit.new': 'Neuer Beitrag', 'news.edit.edit': 'Beitrag bearbeiten',
    'news.f.title': 'Titel (mongolisch)', 'news.f.body': 'Text (mongolisch)',
    'news.f.titleDe': 'Titel (deutsch)', 'news.f.bodyDe': 'Text (deutsch)',
    'news.f.deHint': 'Ist die deutsche Version leer, wird die mongolische angezeigt.',
    'news.f.image': 'Bild (optional)', 'news.f.video': 'Video-Link — YouTube / Vimeo (optional)', 'news.f.pinned': 'Oben anheften',
    'news.confirmDel': 'Diesen Beitrag löschen?',
  },
});

// Огноог идэвхтэй хэлээр
export function fmtDateL(v) {
  const d = typeof v === 'string' ? new Date(v + 'T00:00:00') : new Date(v);
  if (isNaN(d)) return '';
  return lang === 'de'
    ? `${d.getDate()}. ${t('month.' + (d.getMonth() + 1))} ${d.getFullYear()}`
    : `${d.getFullYear()} оны ${t('month.' + (d.getMonth() + 1))}ын ${d.getDate()}`;
}

document.addEventListener('DOMContentLoaded', () => apply());
if (document.readyState !== 'loading') apply();
