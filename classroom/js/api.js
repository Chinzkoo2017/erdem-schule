// Нэг интерфейс, хоёр хэрэгжилт: Supabase (жинхэнэ) ба Demo (localStorage).
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';
import { planRoster, applyPlan, exportRows, toEmail } from './roster-core.js';

const iso = (d) => d.toISOString().slice(0, 10);
const daysAgo = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return iso(d); };
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()));

// ===================================================================
//  DEMO
// ===================================================================
function seed() {
  return {
    groups: [
      { id: 'g1', name: 'Монгол хэл · 1-р бүлэг', level: 'A1', schedule: 'Бямба 10:40', live_url: 'https://meet.google.com/' },
      { id: 'g2', name: 'Монгол хэл · 2-р бүлэг', level: 'A2', schedule: 'Бямба 12:00', live_url: '' },
    ],
    profiles: [
      { id: 's1', full_name: 'Тэмүүлэн', role: 'student', group_id: 'g1', family: 'BAT', email: 'temuulen@student.erdem-schule.de' },
      { id: 's2', full_name: 'Номин', role: 'student', group_id: 'g1', family: 'DORJ', email: 'nomin@student.erdem-schule.de' },
      { id: 's3', full_name: 'Анужин', role: 'student', group_id: 'g2', family: 'BAT', email: 'anujin@student.erdem-schule.de' },
      { id: 'p1', full_name: 'Сарнай (ээж)', role: 'parent', group_id: null, family: 'BAT', email: 'sarnai@example.com' },
      { id: 't1', full_name: 'Мөнх-Эрдэнэ багш', role: 'teacher', group_id: null, email: 'monkherdene@example.com' },
      { id: 'a1', full_name: 'Админ', role: 'admin', group_id: null, email: 'admin@example.com' },
      { id: 'n1', full_name: 'Шинэ хэрэглэгч', role: 'pending', group_id: null, email: 'new@example.com' },
    ],
    parent_children: [{ parent_id: 'p1', child_id: 's1' }, { parent_id: 'p1', child_id: 's3' }],
    lessons: [
      { id: 'l1', group_id: 'g1', title: 'Мал аж ахуй: таван хошуу мал', description: 'Морь, үхэр, тэмээ, хонь, ямааны нэрийг сурна.', video_url: 'https://www.youtube.com/', material_url: '', lesson_date: daysAgo(14) },
      { id: 'l2', group_id: 'g1', title: 'Миний гэр бүл', description: 'Ээж, аав, ах, эгч — гэр бүлийн гишүүдийн нэр.', video_url: '', material_url: '', lesson_date: daysAgo(7) },
      { id: 'l3', group_id: 'g1', title: 'Кирилл үсэг: Ө ба Ү', description: 'Монгол хэлний онцгой хоёр үсэг.', video_url: 'https://www.youtube.com/', material_url: '', lesson_date: daysAgo(0) },
      { id: 'l4', group_id: 'g2', title: 'Өдөр тутмын яриа', description: 'Мэндлэх, танилцах.', video_url: '', material_url: '', lesson_date: daysAgo(3) },
    ],
    assignments: [
      { id: 'h1', group_id: 'g1', lesson_id: 'l1', title: 'Таван хошуу мал зурах', instructions: 'Таван малыг зураад нэрийг нь кириллээр бич.', due_date: daysAgo(8), points: 10 },
      { id: 'h2', group_id: 'g1', lesson_id: 'l2', title: 'Гэр бүлээ танилцуул', instructions: 'Гэр бүлийн гишүүдээ 3–5 өгүүлбэрээр танилцуул.', due_date: daysAgo(1), points: 10 },
      { id: 'h3', group_id: 'g1', lesson_id: 'l3', title: 'Ө, Ү үсэгтэй 5 үг', instructions: 'Ө эсвэл Ү үсэг орсон 5 үг бичээрэй.', due_date: daysAgo(-6), points: 10 },
      { id: 'h4', group_id: 'g2', lesson_id: 'l4', title: 'Өөрийгөө танилцуул', instructions: 'Аудио бичлэг хавсаргана уу.', due_date: daysAgo(-4), points: 10 },
      { id: 'h5', group_id: 'g1', lesson_id: 'l2', kind: 'family', title: 'Эмээ, өвөөгөөсөө ярилцлага ав', instructions: 'Эцэг эхийнхээ тусламжтайгаар эмээ эсвэл өвөөдөө утсаар залгаж 3 асуулт асуу: Хаана төрсөн бэ? Бага насандаа юугаар тоглодог байсан бэ? Хамгийн дуртай хоол? Хариултыг монголоор бичээд эсвэл бичлэг хийгээд илгээ.', due_date: daysAgo(-5), points: 20 },
      { id: 'h6', group_id: 'g2', lesson_id: 'l4', kind: 'family', title: 'Монгол хоол хамт хийх', instructions: 'Ээж аавтайгаа хамт монгол хоол (бууз, цуйван…) хийж, орц найрлагын 5 нэрийг монголоор бич. Зураг хавсаргаарай.', due_date: daysAgo(-3), points: 20 },
    ],
    submissions: [
      { id: 'x1', assignment_id: 'h1', student_id: 's1', body: 'морь, үхэр, тэмээ, хонь, ямаа', file_path: 'mal.jpg', status: 'reviewed', score: 10, feedback: 'Маш сайн! Зураг чинь гоё байна 🌟', submitted_at: daysAgo(9) },
      { id: 'x2', assignment_id: 'h1', student_id: 's2', body: 'морь, үхэр, тэмээ, хонь', file_path: null, status: 'submitted', score: null, feedback: null, submitted_at: daysAgo(8) },
      { id: 'x3', assignment_id: 'h2', student_id: 's2', body: 'Миний ээж Туяа. Аав маань Бат.', file_path: null, status: 'submitted', score: null, feedback: null, submitted_at: daysAgo(1) },
    ],
    vocab: [
      ['морь','Pferd','🐎'],['тэмээ','Kamel','🐫'],['хонь','Schaf','🐑'],['ямаа','Ziege','🐐'],['үхэр','Rind','🐄'],
      ['нохой','Hund','🐕'],['муур','Katze','🐈'],['гэр','Jurte','🛖'],['ээж','Mama','👩'],['аав','Papa','👨'],
      ['нар','Sonne','☀️'],['сар','Mond','🌙'],['ус','Wasser','💧'],['уул','Berg','⛰️'],['ном','Buch','📖'],
      ['алим','Apfel','🍎'],['сүү','Milch','🥛'],['талх','Brot','🍞'],
    ].map(([mn, de, emoji], i) => ({ id: 'v' + i, group_id: null, mn, de, emoji })),
    activity: [
      { student_id: 's1', day: daysAgo(3), xp: 25 }, { student_id: 's1', day: daysAgo(2), xp: 15 },
      { student_id: 's1', day: daysAgo(1), xp: 30 }, { student_id: 's2', day: daysAgo(1), xp: 10 },
      { student_id: 's3', day: daysAgo(5), xp: 20 }, { student_id: 's3', day: daysAgo(2), xp: 10 },
    ],
    family_checks: [],
    meta: {},
  };
}

function demoApi() {
  const KEY = 'erdemDemo_v2';
  let db;
  try { db = JSON.parse(localStorage.getItem(KEY)) || seed(); } catch { db = seed(); }
  db.family_checks ||= [];
  const persist = () => { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch {} };
  let meId = null;
  const demoFiles = new Map();
  try { meId = sessionStorage.getItem('erdemDemoUser'); } catch {}
  const me = () => db.profiles.find((p) => p.id === meId) || null;
  const childIds = () => db.parent_children.filter((l) => l.parent_id === meId).map((l) => l.child_id);

  return {
    mode: 'demo',
    async init() { return me(); },
    async demoLogin(id) { meId = id; try { sessionStorage.setItem('erdemDemoUser', id); } catch {} return me(); },
    async signOut() { meId = null; try { sessionStorage.removeItem('erdemDemoUser'); } catch {} },
    async resetDemo() { db = seed(); persist(); },
    async me() { return me(); },
    async groups() { return db.groups; },
    async lessons(gid) { return db.lessons.filter((l) => !gid || l.group_id === gid).sort((a, b) => b.lesson_date.localeCompare(a.lesson_date)); },
    async assignments(gid) { return db.assignments.filter((a) => !gid || a.group_id === gid).sort((a, b) => (b.due_date || '').localeCompare(a.due_date || '')); },
    async submissions(studentId) {
      return db.submissions.filter((s) => !studentId || s.student_id === studentId)
        .map((s) => ({ ...s, student: db.profiles.find((p) => p.id === s.student_id) }));
    },
    async submit(assignmentId, body, files = []) {
      const ex = db.submissions.find((s) => s.assignment_id === assignmentId && s.student_id === meId);
      const paths = files.map((f) => { const p = `${meId}/${Date.now()}-${f.name}`; demoFiles.set(p, URL.createObjectURL(f)); return p; });
      const keep = paths.length ? paths : (ex?.files || []);
      const row = { body, files: keep, file_path: keep[0] || null, status: 'submitted', submitted_at: iso(new Date()) };
      if (ex) Object.assign(ex, row); else db.submissions.push({ id: uid(), assignment_id: assignmentId, student_id: meId, score: null, feedback: null, ...row });
      persist();
    },
    async review(id, score, feedback) { Object.assign(db.submissions.find((s) => s.id === id), { score, feedback, status: 'reviewed' }); persist(); },
    async fileUrl(p) { return demoFiles.get(p) || null; },
    async vocab() { return db.vocab; },
    async activity(sid) { return db.activity.filter((a) => a.student_id === sid); },
    async addXp(n) {
      const d = iso(new Date());
      const r = db.activity.find((a) => a.student_id === meId && a.day === d);
      if (r) r.xp += n; else db.activity.push({ student_id: meId, day: d, xp: n });
      persist();
    },
    async getMeta(k) { return db.meta[meId + ':' + k]; },
    async setMeta(k, v) { db.meta[meId + ':' + k] = v; persist(); },
    async children() { const ids = childIds(); return db.profiles.filter((p) => ids.includes(p.id)); },
    async profiles() { return db.profiles; },
    async setProfile(id, role, group_id) { Object.assign(db.profiles.find((p) => p.id === id), { role, group_id: group_id || null }); persist(); },
    async links() { return db.parent_children; },
    async linkParent(parent_id, child_id) {
      if (!db.parent_children.some((l) => l.parent_id === parent_id && l.child_id === child_id)) db.parent_children.push({ parent_id, child_id });
      persist();
    },
    async unlinkParent(parent_id, child_id) { db.parent_children = db.parent_children.filter((l) => !(l.parent_id === parent_id && l.child_id === child_id)); persist(); },
    async saveLesson(l) { db.lessons.push({ id: uid(), ...l }); persist(); },
    async deleteLesson(id) { db.lessons = db.lessons.filter((l) => l.id !== id); persist(); },
    async saveAssignment(a) { db.assignments.push({ id: uid(), ...a }); persist(); },
    async deleteAssignment(id) { db.assignments = db.assignments.filter((a) => a.id !== id); persist(); },
    async saveGroup(g) {
      if (g.id) Object.assign(db.groups.find((x) => x.id === g.id), g); else db.groups.push({ ...g, id: uid() });
      persist();
    },
    async changePassword() { const p = me(); if (p) p.must_change_password = false; persist(); },
    async setTeam(id, team_name, avatar) { Object.assign(db.profiles.find((p) => p.id === id), { team_name, avatar }); persist(); },
    async familyChecks(studentId) { return db.family_checks.filter((c) => !studentId || c.student_id === studentId); },
    async confirmFamily(aid, child, note) {
      const ex = db.family_checks.find((c) => c.assignment_id === aid && c.student_id === child);
      if (ex) Object.assign(ex, { note, parent_id: meId });
      else {
        db.family_checks.push({ assignment_id: aid, student_id: child, parent_id: meId, note, created_at: iso(new Date()) });
        const d = iso(new Date()), r = db.activity.find((a) => a.student_id === child && a.day === d);
        if (r) r.xp += 10; else db.activity.push({ student_id: child, day: d, xp: 10 });
      }
      persist();
    },
    async roster(action, rows = [], deactivateMissing = true) {
      const state = { users: db.profiles, groups: db.groups, links: db.parent_children };
      if (action === 'export') return { rows: exportRows(state) };
      const plan = planRoster(rows, state, { callerId: meId, deactivateMissing });
      if (action !== 'apply') return { plan };
      const res = await applyPlan(plan, state, {
        createGroup: async (name) => { const id = uid(); db.groups.push({ id, name, schedule: '', live_url: '' }); return id; },
        createUser: async ({ email, name }) => { const id = uid(); db.profiles.push({ id, email, full_name: name, role: 'pending', group_id: null }); return id; },
        updateProfile: async (id, f) => { Object.assign(db.profiles.find((p) => p.id === id), f); },
        setPassword: async () => {},
        addLink: async (parent_id, child_id) => { db.parent_children.push({ parent_id, child_id }); },
        removeLink: async (pid, cid) => { db.parent_children = db.parent_children.filter((l) => !(l.parent_id === pid && l.child_id === cid)); },
      });
      persist();
      return { plan, ...res };
    },
  };
}

// ===================================================================
//  SUPABASE
// ===================================================================
async function liveApi() {
  const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
  const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  let profile = null;
  const ok = ({ data, error }) => { if (error) throw error; return data; };

  async function loadMe() {
    const { data: { session } } = await sb.auth.getSession();
    if (!session) return (profile = null);
    profile = ok(await sb.from('profiles').select('*').eq('id', session.user.id).single());
    return profile;
  }

  return {
    mode: 'live',
    async init() { return loadMe(); },
    async signIn(login, password) { ok(await sb.auth.signInWithPassword({ email: toEmail(login), password })); return loadMe(); },
    async magicLink(email) { ok(await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: location.href.split('#')[0], shouldCreateUser: false } })); },
    async signUp(email, password, full_name) { ok(await sb.auth.signUp({ email, password, options: { data: { full_name }, emailRedirectTo: location.href.split('#')[0] } })); },
    async signOut() { await sb.auth.signOut(); profile = null; },
    async me() { return profile; },
    async groups() { return ok(await sb.from('groups').select('*').order('name')); },
    async lessons(gid) {
      let q = sb.from('lessons').select('*').order('lesson_date', { ascending: false });
      if (gid) q = q.eq('group_id', gid);
      return ok(await q);
    },
    async assignments(gid) {
      let q = sb.from('assignments').select('*').order('due_date', { ascending: false });
      if (gid) q = q.eq('group_id', gid);
      return ok(await q);
    },
    async submissions(studentId) {
      let q = sb.from('submissions').select('*, student:profiles(id, full_name, avatar, group_id)').order('submitted_at', { ascending: false });
      if (studentId) q = q.eq('student_id', studentId);
      return ok(await q);
    },
    async submit(assignmentId, body, files = []) {
      const paths = [];
      for (const f of files) {
        const safe = f.name.replace(/[^\w.\-]+/g, '_');
        const path = `${profile.id}/${assignmentId}-${Date.now()}-${paths.length}-${safe}`;
        ok(await sb.storage.from('homework').upload(path, f, { upsert: true, contentType: f.type || undefined }));
        paths.push(path);
      }
      const row = { assignment_id: assignmentId, student_id: profile.id, body, status: 'submitted', submitted_at: new Date().toISOString() };
      if (paths.length) { row.file_path = paths[0]; row.files = paths; }
      let res = await sb.from('submissions').upsert(row, { onConflict: 'assignment_id,student_id' });
      if (res.error && paths.length && /files/.test(res.error.message || '')) {
        delete row.files; // хуучин schema: files багана байхгүй
        res = await sb.from('submissions').upsert(row, { onConflict: 'assignment_id,student_id' });
      }
      ok(res);
    },
    async review(id, score, feedback) { ok(await sb.from('submissions').update({ score, feedback, status: 'reviewed' }).eq('id', id)); },
    async fileUrl(path) {
      if (!path) return null;
      const { data } = await sb.storage.from('homework').createSignedUrl(path, 3600);
      return data?.signedUrl || null;
    },
    async vocab() { return ok(await sb.from('vocab').select('*')); },
    async activity(sid) { return ok(await sb.from('activity').select('*').eq('student_id', sid)); },
    async addXp(n) { ok(await sb.rpc('add_xp', { amount: n })); },
    async getMeta(k) { try { return JSON.parse(localStorage.getItem(`erdem:${profile.id}:${k}`)); } catch { return null; } },
    async setMeta(k, v) { try { localStorage.setItem(`erdem:${profile.id}:${k}`, JSON.stringify(v)); } catch {} },
    async children() {
      const links = ok(await sb.from('parent_children').select('child_id').eq('parent_id', profile.id));
      if (!links.length) return [];
      return ok(await sb.from('profiles').select('*').in('id', links.map((l) => l.child_id)));
    },
    async profiles() { return ok(await sb.from('profiles').select('*').order('full_name')); },
    async setProfile(id, role, group_id) { ok(await sb.rpc('admin_set_profile', { uid: id, new_role: role, new_group: group_id || null })); },
    async links() { return ok(await sb.from('parent_children').select('*')); },
    async linkParent(parent_id, child_id) { ok(await sb.from('parent_children').upsert({ parent_id, child_id })); },
    async unlinkParent(parent_id, child_id) { ok(await sb.from('parent_children').delete().match({ parent_id, child_id })); },
    async saveLesson(l) { ok(await sb.from('lessons').insert({ ...l, created_by: profile.id })); },
    async deleteLesson(id) { ok(await sb.from('lessons').delete().eq('id', id)); },
    async saveAssignment(a) { ok(await sb.from('assignments').insert(a)); },
    async deleteAssignment(id) { ok(await sb.from('assignments').delete().eq('id', id)); },
    async saveGroup(g) {
      if (g.id) { const { id, ...rest } = g; ok(await sb.from('groups').update(rest).eq('id', id)); }
      else ok(await sb.from('groups').insert(g));
    },
    async familyChecks(studentId) {
      let q = sb.from('family_checks').select('*');
      if (studentId) q = q.eq('student_id', studentId);
      const { data, error } = await q;
      if (error) { console.warn('family_checks', error.message); return []; }
      return data;
    },
    async confirmFamily(aid, child, note) { ok(await sb.rpc('confirm_family', { aid, child, note: note || '' })); },
    async changePassword(password) {
      ok(await sb.auth.updateUser({ password }));
      const r = await sb.rpc('password_changed');
      if (r.error) console.warn(r.error.message);
      if (profile) profile.must_change_password = false;
    },
    async setTeam(target, name, icon) {
      ok(await sb.rpc('set_team', { target, name, icon }));
      if (profile && profile.id === target) Object.assign(profile, { team_name: name, avatar: icon });
    },
    async roster(action, rows = [], deactivateMissing = true) {
      const { data, error } = await sb.functions.invoke('roster-sync', { body: { action, rows, deactivateMissing } });
      if (error) {
        let msg = error.message;
        try { const b = await error.context?.json?.(); if (b?.error) msg = b.error; if (b?.plan) return { ...b, failed: true }; } catch {}
        if (/not found|404|Failed to send/i.test(msg)) msg = 'roster-sync функц суугаагүй байна (README → "Excel жагсаалт")';
        throw new Error(msg);
      }
      return data;
    },
  };
}

export async function createApi() {
  const forceDemo = new URLSearchParams(location.search).has('demo');
  if (SUPABASE_URL && SUPABASE_ANON_KEY && !forceDemo) return liveApi();
  return demoApi();
}
