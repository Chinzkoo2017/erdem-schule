// Excel жагсаалтыг баазтай харьцуулах цэвэр логик.
// Энэ файлыг хөтөч (демо + урьдчилж харах) болон Supabase Edge Function хоёулаа ашиглана.

export const STUDENT_DOMAIN = 'student.erdem-schule.de';

const TRANSLIT = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'ye', ё: 'yo', ж: 'j', з: 'z', и: 'i', й: 'i', к: 'k', л: 'l', м: 'm',
  н: 'n', о: 'o', ө: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ү: 'u', ф: 'f', х: 'kh', ц: 'ts', ч: 'ch', ш: 'sh',
  щ: 'sh', ъ: '', ы: 'i', ь: 'i', э: 'e', ю: 'yu', я: 'ya', ä: 'ae', ö: 'oe', ü: 'ue', ß: 'ss',
};

/** "Тэмүүлэн" → "temuulen" */
export function slug(s) {
  return [...String(s || '').trim().toLowerCase()].map((c) => TRANSLIT[c] ?? c).join('')
    .replace(/\s+/g, '.').replace(/[^a-z0-9._-]/g, '').replace(/\.{2,}/g, '.').replace(/^\.|\.$/g, '');
}

/** Нэвтрэх нэр эсвэл имэйлийг имэйл болгоно. "temuulen" → "temuulen@student.erdem-schule.de" */
export function toEmail(login) {
  const v = String(login || '').trim().toLowerCase();
  if (!v) return '';
  return v.includes('@') ? v : `${slug(v)}@${STUDENT_DOMAIN}`;
}
export const loginOf = (email) => (String(email || '').endsWith('@' + STUDENT_DOMAIN) ? email.split('@')[0] : email);

const ROLES = {
  admin: 'admin', админ: 'admin', administrator: 'admin',
  teacher: 'teacher', багш: 'teacher', lehrer: 'teacher', lehrerin: 'teacher', lehrkraft: 'teacher',
  student: 'student', сурагч: 'student', schüler: 'student', schülerin: 'student', kind: 'student', хүүхэд: 'student',
  parent: 'parent', 'эцэг эх': 'parent', 'эцэг/эх': 'parent', эцэг: 'parent', эх: 'parent', ээж: 'parent', аав: 'parent',
  eltern: 'parent', elternteil: 'parent', mutter: 'parent', vater: 'parent',
};
export const ROLE_LABEL = { admin: 'Админ', teacher: 'Багш', student: 'Сурагч', parent: 'Эцэг эх', pending: 'Идэвхгүй' };

const HEADERS = {
  name: ['овог нэр', 'нэр', 'бүтэн нэр', 'name', 'full name', 'vor- und nachname', 'vorname nachname'],
  login: ['имэйл / нэвтрэх нэр', 'нэвтрэх нэр', 'имэйл', 'и-мэйл', 'email', 'e-mail', 'login', 'benutzername', 'username'],
  role: ['эрх', 'role', 'rolle'],
  group: ['анги', 'бүлэг', 'group', 'klasse', 'gruppe'],
  family: ['гэр бүл', 'гэр бүлийн код', 'family', 'familie'],
  password: ['нууц үг', 'password', 'passwort'],
  newPassword: ['шинэ нууц үг', 'new password', 'neues passwort'],
};
const norm = (s) => String(s ?? '').trim().replace(/\s+/g, ' ').toLowerCase();

function canonicalKey(header) {
  const h = norm(header);
  for (const [k, list] of Object.entries(HEADERS)) if (list.includes(h)) return k;
  for (const [k, list] of Object.entries(HEADERS)) if (list.some((x) => h.startsWith(x))) return k;
  return null;
}

/** Excel-ийн мөрийг (толгойн нэр → утга) стандарт хэлбэрт оруулна */
export function normalizeRow(raw) {
  const r = {};
  for (const [h, v] of Object.entries(raw || {})) {
    const k = canonicalKey(h);
    if (k && r[k] == null) r[k] = String(v ?? '').trim();
  }
  const roleRaw = norm(r.role);
  return {
    name: r.name || '',
    login: r.login || '',
    email: toEmail(r.login),
    roleRaw: r.role || '',
    role: ROLES[roleRaw] || null,
    group: (r.group || '').trim(),
    family: (r.family || '').trim(),
    password: r.password || '',
    newPassword: r.newPassword || '',
  };
}

const WORDS = ['Mori', 'Temee', 'Khoni', 'Yamaa', 'Nar', 'Sar', 'Uul', 'Gol', 'Tal', 'Ger', 'Od', 'Mod', 'Shuvuu', 'Tsetseg'];
export function makePassword() {
  const rnd = (n) => {
    try { const a = new Uint32Array(1); crypto.getRandomValues(a); return a[0] % n; } catch { return Math.floor(Math.random() * n); }
  };
  return `${WORDS[rnd(WORDS.length)]}-${1000 + rnd(9000)}`;
}

/**
 * rows: Excel-ийн түүхий мөрүүд
 * state: { users: [{id,email,full_name,role,group_id,family}], groups: [{id,name}], links: [{parent_id,child_id}] }
 * opts: { callerId, deactivateMissing }
 */
export function planRoster(rows, state, opts = {}) {
  const errors = [], items = [];
  const byEmail = new Map(state.users.filter((u) => u.email).map((u) => [u.email.toLowerCase(), u]));
  const groupByName = new Map(state.groups.map((g) => [norm(g.name), g]));
  const groupName = (id) => state.groups.find((g) => g.id === id)?.name || '';
  const seen = new Set();
  const groupsToCreate = [];

  rows.forEach((raw, i) => {
    const n = normalizeRow(raw);
    const rowNo = i + 2; // Excel: 1-р мөр толгой
    if (!n.name && !n.login && !n.roleRaw) return; // хоосон мөр
    if (!n.email) return errors.push({ row: rowNo, msg: `"${n.name}": имэйл / нэвтрэх нэр алга` });
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(n.email)) return errors.push({ row: rowNo, msg: `"${n.login}": имэйл буруу байна` });
    if (!n.role) return errors.push({ row: rowNo, msg: `"${n.name || n.login}": эрх "${n.roleRaw}" танигдсангүй (Админ / Багш / Сурагч / Эцэг эх)` });
    if (seen.has(n.email)) return errors.push({ row: rowNo, msg: `"${n.login}" давхардсан байна` });
    for (const pw of [n.password, n.newPassword]) if (pw && pw.length < 8) return errors.push({ row: rowNo, msg: `"${n.login}": нууц үг 8-аас дээш тэмдэгт байх ёстой` });
    seen.add(n.email);
    const name = n.name || n.login;
    if (n.group && !groupByName.has(norm(n.group)) && !groupsToCreate.some((g) => norm(g) === norm(n.group))) groupsToCreate.push(n.group);

    const ex = byEmail.get(n.email);
    if (ex && ex.id === opts.callerId && n.role !== 'admin') {
      return errors.push({ row: rowNo, msg: `"${n.login}": өөрийн админ эрхийг Excel-ээр хасах боломжгүй` });
    }
    const item = { row: rowNo, name, email: n.email, login: loginOf(n.email), role: n.role, group: n.group, family: n.family, password: n.password, newPassword: n.newPassword };
    if (!ex) {
      item.action = 'create';
      item.changes = [];
    } else {
      item.id = ex.id;
      const ch = [];
      if ((ex.full_name || '') !== name) ch.push(`нэр: ${ex.full_name || '—'} → ${name}`);
      if (ex.role !== n.role) ch.push(`эрх: ${ROLE_LABEL[ex.role] || ex.role} → ${ROLE_LABEL[n.role]}`);
      if (norm(groupName(ex.group_id)) !== norm(n.group)) ch.push(`анги: ${groupName(ex.group_id) || '—'} → ${n.group || '—'}`);
      if (norm(ex.family) !== norm(n.family)) ch.push(`гэр бүл: ${ex.family || '—'} → ${n.family || '—'}`);
      if (n.newPassword) ch.push('нууц үг шинэчлэх');
      item.changes = ch;
      item.action = ch.length ? 'update' : 'same';
    }
    items.push(item);
  });

  // Жагсаалтад байхгүй идэвхтэй хэрэглэгчид
  const deactivate = opts.deactivateMissing === false ? [] : state.users
    .filter((u) => u.role !== 'pending' && u.id !== opts.callerId && !seen.has((u.email || '').toLowerCase()))
    .map((u) => ({ id: u.id, name: u.full_name, email: u.email, login: loginOf(u.email), role: u.role }));

  // Гэр бүлийн код → эцэг эх × хүүхэд холбоос
  const fam = new Map();
  for (const it of items) {
    if (!it.family) continue;
    const k = norm(it.family);
    if (!fam.has(k)) fam.set(k, { parents: [], kids: [] });
    if (it.role === 'parent') fam.get(k).parents.push(it);
    if (it.role === 'student') fam.get(k).kids.push(it);
  }
  const desired = [];
  for (const { parents, kids } of fam.values()) for (const p of parents) for (const c of kids) desired.push({ p, c });
  const hasLink = (pid, cid) => state.links.some((l) => l.parent_id === pid && l.child_id === cid);
  const linksAdd = desired.filter(({ p, c }) => !(p.id && c.id && hasLink(p.id, c.id)))
    .map(({ p, c }) => ({ parentEmail: p.email, childEmail: c.email, parentName: p.name, childName: c.name }));
  const rosterIds = new Set(items.filter((x) => x.id).map((x) => x.id));
  const linksRemove = state.links
    .filter((l) => rosterIds.has(l.parent_id) && rosterIds.has(l.child_id))
    .filter((l) => !desired.some(({ p, c }) => p.id === l.parent_id && c.id === l.child_id))
    .map((l) => ({ ...l, parentName: state.users.find((u) => u.id === l.parent_id)?.full_name, childName: state.users.find((u) => u.id === l.child_id)?.full_name }));

  const counts = {
    create: items.filter((x) => x.action === 'create').length,
    update: items.filter((x) => x.action === 'update').length,
    same: items.filter((x) => x.action === 'same').length,
    deactivate: deactivate.length,
  };
  const pending = counts.create + counts.update + counts.deactivate + groupsToCreate.length + linksAdd.length + linksRemove.length;
  return { errors, items, deactivate, groupsToCreate, linksAdd, linksRemove, counts, pending };
}

/**
 * Төлөвлөгөөг хэрэгжүүлэх. io нь орчноос хамаарах үйлдлүүд:
 * { createGroup(name)→id, createUser({email,password,name})→id, updateProfile(id,{full_name,role,group_id,family}),
 *   setPassword(id,pw), addLink(pid,cid), removeLink(pid,cid) }
 */
export async function applyPlan(plan, state, io) {
  const log = [], credentials = [];
  const groupId = new Map(state.groups.map((g) => [norm(g.name), g.id]));
  for (const name of plan.groupsToCreate) {
    try { groupId.set(norm(name), await io.createGroup(name)); log.push({ ok: true, msg: `Анги үүслээ: ${name}` }); }
    catch (e) { log.push({ ok: false, msg: `Анги "${name}": ${e.message}` }); }
  }
  const idByEmail = new Map(state.users.filter((u) => u.email).map((u) => [u.email.toLowerCase(), u.id]));
  for (const it of plan.items) {
    if (it.action === 'same') continue;
    const fields = { full_name: it.name, role: it.role, group_id: it.group ? groupId.get(norm(it.group)) || null : null, family: it.family || null };
    try {
      if (it.action === 'create') {
        const password = it.password || makePassword();
        const id = await io.createUser({ email: it.email, password, name: it.name });
        idByEmail.set(it.email, id);
        await io.updateProfile(id, fields);
        credentials.push({ name: it.name, login: it.login, password, role: ROLE_LABEL[it.role], group: it.group, family: it.family });
        log.push({ ok: true, msg: `Нэмэгдлээ: ${it.name}` });
      } else {
        await io.updateProfile(it.id, fields);
        if (it.newPassword) {
          await io.setPassword(it.id, it.newPassword);
          credentials.push({ name: it.name, login: it.login, password: it.newPassword, role: ROLE_LABEL[it.role], group: it.group, family: it.family });
        }
        log.push({ ok: true, msg: `Шинэчлэгдлээ: ${it.name}` });
      }
    } catch (e) { log.push({ ok: false, msg: `${it.name} (${it.login}): ${e.message}` }); }
  }
  for (const d of plan.deactivate) {
    try { await io.updateProfile(d.id, { role: 'pending' }); log.push({ ok: true, msg: `Идэвхгүй болгосон: ${d.name}` }); }
    catch (e) { log.push({ ok: false, msg: `${d.name}: ${e.message}` }); }
  }
  for (const l of plan.linksRemove) {
    try { await io.removeLink(l.parent_id, l.child_id); log.push({ ok: true, msg: `Холбоос хасав: ${l.parentName} → ${l.childName}` }); }
    catch (e) { log.push({ ok: false, msg: e.message }); }
  }
  for (const l of plan.linksAdd) {
    const pid = idByEmail.get(l.parentEmail), cid = idByEmail.get(l.childEmail);
    if (!pid || !cid) { log.push({ ok: false, msg: `Холбоос: ${l.parentName} → ${l.childName} (хэрэглэгч олдсонгүй)` }); continue; }
    try { await io.addLink(pid, cid); log.push({ ok: true, msg: `Холбов: ${l.parentName} → ${l.childName}` }); }
    catch (e) { log.push({ ok: false, msg: e.message }); }
  }
  return { log, credentials };
}

/** Одоогийн хэрэглэгчдийг Excel-ийн мөр болгох */
export function exportRows(state) {
  const gname = (id) => state.groups.find((g) => g.id === id)?.name || '';
  const order = { admin: 0, teacher: 1, parent: 3, student: 2, pending: 4 };
  return [...state.users]
    .filter((u) => u.role !== 'pending')
    .sort((a, b) => (order[a.role] - order[b.role]) || String(a.family || '').localeCompare(String(b.family || '')) || String(a.full_name).localeCompare(String(b.full_name)))
    .map((u) => ({
      'Овог нэр': u.full_name || '',
      'Имэйл / нэвтрэх нэр': loginOf(u.email),
      'Эрх': ROLE_LABEL[u.role] || u.role,
      'Анги': gname(u.group_id),
      'Гэр бүл': u.family || '',
      'Нууц үг': '',
      'Шинэ нууц үг': '',
    }));
}
export const TEMPLATE_ROWS = [
  { 'Овог нэр': 'Б. Тэмүүлэн', 'Имэйл / нэвтрэх нэр': 'temuulen', 'Эрх': 'Сурагч', 'Анги': 'Монгол хэл · 1-р бүлэг', 'Гэр бүл': 'BAT', 'Нууц үг': '', 'Шинэ нууц үг': '' },
  { 'Овог нэр': 'Б. Сарнай', 'Имэйл / нэвтрэх нэр': 'sarnai@example.com', 'Эрх': 'Эцэг эх', 'Анги': '', 'Гэр бүл': 'BAT', 'Нууц үг': '', 'Шинэ нууц үг': '' },
  { 'Овог нэр': 'Мөнх-Эрдэнэ', 'Имэйл / нэвтрэх нэр': 'monkherdene@example.com', 'Эрх': 'Багш', 'Анги': '', 'Гэр бүл': '', 'Нууц үг': '', 'Шинэ нууц үг': '' },
];
