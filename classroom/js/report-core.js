// Эцэг эхэд очих долоо хоногийн тайлан. Хөтөч (урьдчилан харах) болон Edge Function хоёулаа ашиглана.

const pad = (n) => String(n).padStart(2, '0');
const isoDay = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const mnD = (s) => { if (!s) return ''; const x = new Date(String(s).length === 10 ? s + 'T12:00' : s); return `${x.getMonth() + 1}-р сарын ${x.getDate()}`; };
const h = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/**
 * kid: { name, groupName, schedule, liveUrl, assignments[], submissions[], activity[], checks[] }
 * Буцаах: тоон үзүүлэлтүүд + жагсаалтууд
 */
export function kidSummary(kid, now = new Date()) {
  const today = isoDay(now), weekAgo = isoDay(addDays(now, -7)), weekAhead = isoDay(addDays(now, 7));
  const subOf = (aid) => kid.submissions.find((s) => s.assignment_id === aid);
  const xpWeek = kid.activity.filter((a) => a.day > weekAgo && a.day <= today).reduce((t, a) => t + a.xp, 0);
  const activeDays = new Set(kid.activity.filter((a) => a.xp > 0 && a.day > weekAgo && a.day <= today).map((a) => a.day)).size;
  const days = new Set(kid.activity.filter((a) => a.xp > 0).map((a) => a.day));
  let streak = 0; let d = new Date(now);
  if (!days.has(isoDay(d))) d = addDays(d, -1);
  while (days.has(isoDay(d))) { streak++; d = addDays(d, -1); }
  const totalXp = kid.activity.reduce((t, a) => t + a.xp, 0);
  const sentWeek = kid.submissions.filter((s) => String(s.submitted_at || '').slice(0, 10) > weekAgo);
  const overdue = kid.assignments.filter((a) => a.due_date && a.due_date < today && !subOf(a.id));
  const upcoming = kid.assignments.filter((a) => (!a.due_date || (a.due_date >= today && a.due_date <= weekAhead)) && !subOf(a.id))
    .sort((a, b) => (a.due_date || '9').localeCompare(b.due_date || '9'));
  const feedback = kid.submissions.filter((s) => s.status === 'reviewed' && s.feedback && String(s.submitted_at || '').slice(0, 10) > isoDay(addDays(now, -14)))
    .map((s) => ({ title: kid.assignments.find((a) => a.id === s.assignment_id)?.title || '', feedback: s.feedback, score: s.score }));
  const familyOpen = kid.assignments.filter((a) => a.kind === 'family' && !kid.checks.some((c) => c.assignment_id === a.id) && (!a.due_date || a.due_date >= weekAgo));
  return { xpWeek, activeDays, streak, totalXp, sentWeek: sentWeek.length, overdue, upcoming, feedback, familyOpen };
}

export function buildParentReport({ parentName, kids, siteUrl, now = new Date() }) {
  const sums = kids.map((k) => ({ k, s: kidSummary(k, now) }));
  const names = kids.map((k) => k.name).join(', ');
  const subject = `${names} · 7 хоногийн тайлан (${mnD(isoDay(now))})`;

  // ---------- text
  const tLines = [`Сайн байна уу${parentName ? ', ' + parentName : ''}!`, '', 'Эрдэм сургуулийн онлайн ангийн долоо хоногийн тайлан:', ''];
  for (const { k, s } of sums) {
    tLines.push(`== ${k.name} (${k.groupName || ''}) ==`);
    tLines.push(`Илгээсэн даалгавар: ${s.sentWeek} · Хийгээгүй (хоцорсон): ${s.overdue.length}`);
    tLines.push(`Идэвхтэй өдөр: ${s.activeDays}/7 · Цуврал: ${s.streak} · Энэ 7 хоногт ${s.xpWeek} оноо (нийт ${s.totalXp})`);
    if (s.overdue.length) tLines.push('Хоцорсон:', ...s.overdue.map((a) => ` - ${a.title} (${mnD(a.due_date)})`));
    if (s.upcoming.length) tLines.push('Ирэх 7 хоногт:', ...s.upcoming.map((a) => ` - ${a.title}${a.due_date ? ` (${mnD(a.due_date)})` : ''}${a.kind === 'family' ? ' [гэр бүлээрээ]' : ''}`));
    if (s.feedback.length) tLines.push('Багшийн сэтгэгдэл:', ...s.feedback.map((f) => ` - ${f.title}: "${f.feedback}"`));
    tLines.push('');
  }
  tLines.push(`Онлайн анги: ${siteUrl}`, '', 'Эрдэм сургууль', '(Энэ имэйлийг авахгүй байхыг хүсвэл онлайн ангийн "Миний бүртгэл" хэсгээс унтраана уу.)');

  // ---------- html (имэйл клиентэд найдвартай: хүснэгт + inline style)
  const navy = '#0B1F3A', gold = '#C8A13A', mute = '#5F6982', line = '#E2E7F1', red = '#B3261E', green = '#1F8A5B';
  const stat = (v, l, color = navy) => `<td style="padding:10px 12px;background:#F4F6FB;border-radius:10px;text-align:left;width:25%">
      <div style="font:800 22px Arial,sans-serif;color:${color}">${v}</div><div style="font:600 12px Arial,sans-serif;color:${mute}">${l}</div></td>`;
  const list = (title, items, color = navy) => (items.length ? `
      <p style="margin:16px 0 6px;font:800 12px Arial,sans-serif;letter-spacing:.06em;text-transform:uppercase;color:${color}">${title}</p>
      <ul style="margin:0;padding-left:18px;font:14px/1.5 Arial,sans-serif;color:#121A2E">${items.join('')}</ul>` : '');
  const kidHtml = ({ k, s }) => `
    <tr><td style="padding:22px 24px;border-bottom:1px solid ${line}">
      <p style="margin:0;font:800 19px Georgia,serif;color:${navy}">${h(k.name)}</p>
      <p style="margin:2px 0 14px;font:13px Arial,sans-serif;color:${mute}">${h(k.groupName || '')}${k.schedule ? ' · ' + h(k.schedule) : ''}</p>
      <table role="presentation" width="100%" cellspacing="6" cellpadding="0" style="border-collapse:separate"><tr>
        ${stat(s.sentWeek, 'илгээсэн даалгавар', green)}
        ${stat(s.overdue.length, 'хоцорсон', s.overdue.length ? red : navy)}
        ${stat(`${s.activeDays}/7`, 'идэвхтэй өдөр')}
        ${stat(s.xpWeek, `оноо (нийт ${s.totalXp})`, gold)}
      </tr></table>
      ${list('⏳ Хоцорсон даалгавар', s.overdue.map((a) => `<li><b>${h(a.title)}</b> <span style="color:${red}">· ${mnD(a.due_date)}</span></li>`), red)}
      ${list('📅 Ирэх 7 хоногт', s.upcoming.map((a) => `<li>${h(a.title)}${a.due_date ? ` <span style="color:${mute}">· ${mnD(a.due_date)}</span>` : ''}${a.kind === 'family' ? ' <span style="color:#A8325A">· 👨‍👩‍👧 гэр бүлээрээ</span>' : ''}</li>`))}
      ${list('👨‍👩‍👧 Хамтдаа хийх (таны баталгаажуулалт хүлээж байна)', s.familyOpen.map((a) => `<li>${h(a.title)}</li>`), '#A8325A')}
      ${list('💬 Багшийн сэтгэгдэл', s.feedback.map((f) => `<li><b>${h(f.title)}</b>${f.score != null ? ` · ${f.score} оноо` : ''}<br><i style="color:#2b3550">“${h(f.feedback)}”</i></li>`), green)}
      ${!s.overdue.length && !s.upcoming.length ? `<p style="margin:14px 0 0;font:14px Arial,sans-serif;color:${green}">✓ Хийх даалгавар алга. Сайн байна!</p>` : ''}
    </td></tr>`;
  const html = `<!doctype html><html lang="mn"><body style="margin:0;background:#F4F6FB">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#F4F6FB"><tr><td align="center" style="padding:24px 12px">
    <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px;width:100%;background:#fff;border-radius:14px;overflow:hidden;border:1px solid ${line}">
      <tr><td style="background:${navy};padding:20px 24px">
        <p style="margin:0;font:800 18px Georgia,serif;color:#fff">Эрдэм сургууль</p>
        <p style="margin:2px 0 0;font:600 12px Arial,sans-serif;color:${gold};letter-spacing:.12em;text-transform:uppercase">Долоо хоногийн тайлан · ${mnD(isoDay(now))}</p>
      </td></tr>
      <tr><td style="padding:20px 24px 4px;font:15px/1.5 Arial,sans-serif;color:#121A2E">Сайн байна уу${parentName ? ', ' + h(parentName) : ''}! Хүүхдийн тань энэ долоо хоногийн явц:</td></tr>
      ${sums.map(kidHtml).join('')}
      <tr><td style="padding:22px 24px" align="left">
        <a href="${h(siteUrl)}" style="display:inline-block;background:#3B4BC8;color:#fff;text-decoration:none;font:700 15px Arial,sans-serif;padding:12px 20px;border-radius:10px">Онлайн анги руу орох</a>
        <p style="margin:16px 0 0;font:12px/1.5 Arial,sans-serif;color:${mute}">Энэ имэйлийг долоо хоног бүр автоматаар илгээдэг. Авахгүй байхыг хүсвэл онлайн ангийн «Миний бүртгэл» хэсгээс унтраана уу. Асуулт байвал энэ имэйлд хариу бичээрэй.</p>
      </td></tr>
    </table>
  </td></tr></table></body></html>`;
  return { subject, html, text: tLines.join('\n') };
}
