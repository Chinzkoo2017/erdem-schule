// Нэг интерфейс, хоёр хэрэгжилт: Supabase (жинхэнэ) ба Demo (localStorage).
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';
import { planRoster, applyPlan, exportRows, toEmail } from './roster-core.js';
import { buildParentReport } from './report-core.js';

const iso = (d) => d.toISOString().slice(0, 10);
const daysAgo = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return iso(d); };
/** Сурагчийн бүх анги (үндсэн + нэмэлт) */
export const groupsOf = (p) => [...new Set([p?.group_id, ...(p?.extra_groups || [])].filter(Boolean))];
const inG = (gid, x) => !gid || (Array.isArray(gid) ? gid.includes(x) : x === gid);
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()));

// ===================================================================
//  DEMO
// ===================================================================
function seed() {
  return {
    groups: [
      { id: 'g1', name: 'Монгол хэл · 1-р бүлэг', level: 'A1', schedule: 'Бямба 10:40', live_url: 'https://meet.google.com/' },
      { id: 'g2', name: 'Монгол хэл · 2-р бүлэг', level: 'A2', schedule: 'Бямба 12:00', live_url: '' },
      { id: 'g3', name: 'Үндэсний бүжиг', subject: 'dance', schedule: 'Бямба 13:30', live_url: '' },
    ],
    profiles: [
      { id: 's1', full_name: 'Тэмүүлэн', role: 'student', group_id: 'g1', extra_groups: ['g3'], family: 'BAT', email: 'temuulen@student.erdem-schule.de' },
      { id: 's2', full_name: 'Номин', role: 'student', group_id: 'g1', family: 'DORJ', email: 'nomin@student.erdem-schule.de' },
      { id: 's3', full_name: 'Анужин', role: 'student', group_id: 'g2', extra_groups: ['g3'], family: 'BAT', email: 'anujin@student.erdem-schule.de' },
      { id: 'p1', full_name: 'Сарнай (ээж)', role: 'parent', group_id: null, family: 'BAT', email: 'sarnai@example.com', contact_email: 'sarnai@example.com', phone: '+4917612345678' },
      { id: 'p2', full_name: 'Дорж (аав)', role: 'parent', group_id: null, family: 'DORJ', email: 'dorj@student.erdem-schule.de', phone: '+4915198765432' },
      { id: 't1', full_name: 'Мөнх-Эрдэнэ багш', role: 'teacher', group_id: null, email: 'monkherdene@example.com' },
      { id: 'a1', full_name: 'Админ', role: 'admin', group_id: null, email: 'admin@example.com' },
      { id: 'n1', full_name: 'Шинэ хэрэглэгч', role: 'pending', group_id: null, email: 'new@example.com' },
    ],
    parent_children: [{ parent_id: 'p1', child_id: 's1' }, { parent_id: 'p1', child_id: 's3' }, { parent_id: 'p2', child_id: 's2' }],
    lessons: [
      { id: 'l1', group_id: 'g1', title: 'Мал аж ахуй: таван хошуу мал', description: 'Морь, үхэр, тэмээ, хонь, ямааны нэрийг сурна.', video_url: 'https://www.youtube.com/', material_url: '', lesson_date: daysAgo(14) },
      { id: 'l2', group_id: 'g1', title: 'Миний гэр бүл', description: 'Ээж, аав, ах, эгч — гэр бүлийн гишүүдийн нэр.', video_url: '', material_url: '', lesson_date: daysAgo(7) },
      { id: 'l3', group_id: 'g1', title: 'Кирилл үсэг: Ө ба Ү', description: 'Монгол хэлний онцгой хоёр үсэг.', video_url: 'https://www.youtube.com/', material_url: '', lesson_date: daysAgo(0) },
      { id: 'l5', group_id: 'g3', title: 'Бүжиг: «Сэлэнгэ» — эхний 16 тоолуур', description: 'Гарын хөдөлгөөн, мөрний чичиргээ. Видеог давтаж үзээрэй.', video_url: 'https://www.youtube.com/', material_url: '', lesson_date: daysAgo(2) },
      { id: 'l4', group_id: 'g2', title: 'Өдөр тутмын яриа', description: 'Мэндлэх, танилцах.', video_url: '', material_url: '', lesson_date: daysAgo(3) },
    ],
    assignments: [
      { id: 'h1', group_id: 'g1', lesson_id: 'l1', title: 'Таван хошуу мал зурах', instructions: 'Таван малыг зураад нэрийг нь кириллээр бич.', due_date: daysAgo(8), points: 10 },
      { id: 'h2', group_id: 'g1', lesson_id: 'l2', title: 'Гэр бүлээ танилцуул', instructions: 'Гэр бүлийн гишүүдээ 3–5 өгүүлбэрээр танилцуул.', due_date: daysAgo(1), points: 10 },
      { id: 'h3', group_id: 'g1', lesson_id: 'l3', title: 'Ө, Ү үсэгтэй 5 үг', instructions: 'Ө эсвэл Ү үсэг орсон 5 үг бичээрэй.', due_date: daysAgo(-6), points: 10 },
      { id: 'h4', group_id: 'g2', lesson_id: 'l4', title: 'Өөрийгөө танилцуул', instructions: 'Аудио бичлэг хавсаргана уу.', due_date: daysAgo(-4), points: 10 },
      { id: 'h7', group_id: 'g3', lesson_id: 'l5', title: 'Бүжгийн хөдөлгөөнөө бичлэг хий', instructions: 'Эхний 16 тоолуурыг гэртээ бүжиглээд утсаараа бичлэг хий. Видеог YouTube (Жагсаалтад үл харагдах / Unlisted) эсвэл Google Drive-д тавиад линкийг нь илгээ.', due_date: daysAgo(-5), points: 10 },
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
    announcements: [
      { id: 'an1', kind: 'meeting', audience: 'parents', group_id: null, title: 'Эцэг эхийн хурал: онлайн ангийн танилцуулга', starts_at: (() => { const d = new Date(); d.setDate(d.getDate() + ((13 - d.getDay()) % 7 || 7)); d.setHours(14, 0, 0, 0); return d.toISOString(); })(), place: 'Нюрнберг, сургуулийн танхим', link: 'https://meet.google.com/', body: 'Онлайн анги, хичээлийн хуваарь, 15 жилийн ойн арга хэмжээний талаар ярилцана.', created_at: new Date().toISOString() },
      { id: 'an2', kind: 'event', audience: 'families', group_id: 'g1', title: 'Монгол хоолны өдөр', starts_at: (() => { const d = new Date(); d.setDate(d.getDate() + 16); d.setHours(12, 0, 0, 0); return d.toISOString(); })(), place: 'Сургуулийн заал', link: '', body: 'Гэр бүл бүр нэг монгол хоол авчирна.', created_at: new Date().toISOString() },
    ],
    ...demoLearning(),
    meta: {},
  };
}

// Демо: сурагч бүрийн үг/үсгийн явц (тогтмол, санамсаргүй биш)
function demoLearning() {
  const words = ['морь','тэмээ','хонь','ямаа','үхэр','нохой','муур','гэр','ээж','аав','нар','сар','ус','уул','ном','алим','сүү','талх'];
  const letters = ['А','Б','В','Г','Д','Е','Ё','Ж','З','И','Й','К','Л','М','Н','О','Ө','П','Р','С','Т','У','Ү','Ф','Х','Ц','Ч','Ш','Ы','Э','Ю','Я'];
  const prof = { s1: [13, 22, 0.82], s2: [7, 15, 0.68], s3: [4, 9, 0.6] };
  const word_stats = [], game_sessions = [];
  const now = Date.now();
  for (const [sid, [nw, nl, acc]] of Object.entries(prof)) {
    words.slice(0, nw).forEach((w, i) => {
      const hard = i % 5 === 3;
      word_stats.push({ student_id: sid, kind: 'vocab', item: w, correct: hard ? 2 : 3 + (i % 3), wrong: hard ? 3 : i % 2, streak: hard ? 0 : (i < nw - 3 ? 3 + (i % 2) : 1), last_at: new Date(now - i * 864e5).toISOString() });
    });
    letters.slice(0, nl).forEach((l, i) => {
      const hard = ['Ө', 'Ү', 'Ы', 'Ц', 'Х'].includes(l);
      word_stats.push({ student_id: sid, kind: 'letter', item: l, correct: hard ? 1 : 3, wrong: hard ? 2 : 0, streak: hard ? 0 : 3, last_at: new Date(now - i * 36e5).toISOString() });
    });
    for (let k = 0; k < 14; k++) {
      if ((k + sid.length) % (sid === 's1' ? 2 : 3)) continue;
      const games = ['letters', 'word', 'flash', 'sent', 'fill', 'pics'];
      const total = 10, score = Math.round(total * Math.min(1, acc - 0.15 + (k / 14) * 0.2));
      game_sessions.push({ student_id: sid, game: games[k % 6], score, total, played_at: new Date(now - (41 - k * 3) * 864e5).toISOString() });
    }
  }
  return { word_stats, game_sessions };
}

function demoApi() {
  const KEY = 'erdemDemo_v6';
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
    async lessons(gid) { return db.lessons.filter((l) => inG(gid, l.group_id)).sort((a, b) => b.lesson_date.localeCompare(a.lesson_date)); },
    async assignments(gid) { return db.assignments.filter((a) => inG(gid, a.group_id)).sort((a, b) => (b.due_date || '').localeCompare(a.due_date || '')); },
    async submissions(studentId) {
      return db.submissions.filter((s) => !studentId || s.student_id === studentId)
        .map((s) => ({ ...s, student: db.profiles.find((p) => p.id === s.student_id) }));
    },
    async submit(assignmentId, body, files = [], link = '') {
      const ex = db.submissions.find((s) => s.assignment_id === assignmentId && s.student_id === meId);
      const paths = files.map((f) => { const p = `${meId}/${Date.now()}-${f.name}`; demoFiles.set(p, URL.createObjectURL(f)); return p; });
      const keep = paths.length ? paths : (ex?.files || []);
      const row = { body, link: link || null, files: keep, file_path: keep[0] || null, status: 'submitted', submitted_at: iso(new Date()) };
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
    async setExtraGroups(id, groups) { db.profiles.find((p) => p.id === id).extra_groups = groups; persist(); },
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
    async announcements() {
      const p = me(); if (!p) return [];
      const staff = ['teacher', 'admin'].includes(p.role);
      const myGroups = p.role !== 'student' ? db.parent_children.filter((l) => l.parent_id === meId).flatMap((l) => groupsOf(db.profiles.find((k) => k.id === l.child_id))) : groupsOf(p);
      return (db.announcements || []).filter((a) => staff || ((a.audience === 'all' || (['parents', 'families'].includes(a.audience) && p.role === 'parent') || (['students', 'families'].includes(a.audience) && p.role === 'student'))
        && (!a.group_id || myGroups.includes(a.group_id)))).sort((a, b) => (a.starts_at || '9').localeCompare(b.starts_at || '9'));
    },
    async saveAnnouncement(a) { const row = { id: uid(), created_at: new Date().toISOString(), ...a }; db.announcements.push(row); persist(); return row; },
    async deleteAnnouncement(id) { db.announcements = db.announcements.filter((a) => a.id !== id); persist(); },
    async recordAnswers(game, score, total, items) {
      {
        db.game_sessions.push({ student_id: meId, game, score, total, played_at: new Date().toISOString() });
        for (const it of items) {
          let w = db.word_stats.find((x) => x.student_id === meId && x.kind === it.kind && x.item === it.item);
          if (!w) { w = { student_id: meId, kind: it.kind, item: it.item, correct: 0, wrong: 0, streak: 0 }; db.word_stats.push(w); }
          if (it.ok) { w.correct++; w.streak++; } else { w.wrong++; w.streak = 0; }
          w.last_at = new Date().toISOString();
        }
      }
      persist();
    },
    async learning(ids) {
      return { stats: db.word_stats.filter((w) => ids.includes(w.student_id)), sessions: db.game_sessions.filter((g) => ids.includes(g.student_id)) };
    },
    async setContact(email, phone, reports) { Object.assign(me(), { contact_email: email || null, phone: phone || null, email_reports: reports }); persist(); },
    async report(action, parentId) {
      const parents = db.profiles.filter((p) => !['pending', 'student'].includes(p.role) && db.parent_children.some((l) => l.parent_id === p.id));
      const emailOf = (p) => p.contact_email || (p.email && !p.email.endsWith('@student.erdem-schule.de') ? p.email : '');
      const build = (p) => {
        const kids = db.parent_children.filter((l) => l.parent_id === p.id).map((l) => db.profiles.find((k) => k.id === l.child_id)).filter(Boolean).map((k) => {
          const gids = groupsOf(k), gs = gids.map((id) => db.groups.find((x) => x.id === id)).filter(Boolean);
          return { name: k.full_name, groupName: gs.map((x) => x.name).join(', '), schedule: gs.map((x) => x.schedule).filter(Boolean).join(', '), assignments: db.assignments.filter((a) => gids.includes(a.group_id)),
            submissions: db.submissions.filter((s) => s.student_id === k.id), activity: db.activity.filter((a) => a.student_id === k.id),
            checks: db.family_checks.filter((c) => c.student_id === k.id) };
        });
        return kids.length ? buildParentReport({ parentName: p.full_name, kids, siteUrl: location.origin + location.pathname }) : null;
      };
      if (action === 'status') return { configured: false, demo: true, parents: parents.map((p) => ({ id: p.id, name: p.full_name, email: emailOf(p), optOut: p.email_reports === false, kids: db.parent_children.filter((l) => l.parent_id === p.id).length })) };
      if (action === 'preview') { const p = parents.find((x) => x.id === parentId) || parents[0]; return { parentId: p.id, ...build(p) }; }
      return { sent: 0, skipped: ['Демо горимд имэйл илгээгдэхгүй'], failed: [] };
    },
    async changePassword() { const p = me(); if (p) p.must_change_password = false; persist(); },
    async setTeam(id, team_name, avatar) { Object.assign(db.profiles.find((p) => p.id === id), { team_name, avatar }); persist(); },
    async uploadTeamImage(id, blob) {
      // Демо: зургийг localStorage-д data URL болгон хадгална
      const data = await new Promise((r) => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(blob); });
      const path = `${id}/team-${Date.now()}.jpg`;
      db.meta['img:' + path] = data; persist();
      return path;
    },
    async avatarUrls(paths) { return Object.fromEntries(paths.map((p) => [p, db.meta['img:' + p] || ''])); },
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
        createGroup: async (name, subject) => { const id = uid(); db.groups.push({ id, name, subject, schedule: '', live_url: '' }); return id; },
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
      if (Array.isArray(gid)) q = q.in('group_id', gid.length ? gid : ['00000000-0000-0000-0000-000000000000']); else if (gid) q = q.eq('group_id', gid);
      return ok(await q);
    },
    async assignments(gid) {
      let q = sb.from('assignments').select('*').order('due_date', { ascending: false });
      if (Array.isArray(gid)) q = q.in('group_id', gid.length ? gid : ['00000000-0000-0000-0000-000000000000']); else if (gid) q = q.eq('group_id', gid);
      return ok(await q);
    },
    async submissions(studentId) {
      let q = sb.from('submissions').select('*, student:profiles(id, full_name, avatar, group_id)').order('submitted_at', { ascending: false });
      if (studentId) q = q.eq('student_id', studentId);
      return ok(await q);
    },
    async submit(assignmentId, body, files = [], link = '') {
      const paths = [];
      for (const f of files) {
        const safe = f.name.replace(/[^\w.\-]+/g, '_');
        const path = `${profile.id}/${assignmentId}-${Date.now()}-${paths.length}-${safe}`;
        ok(await sb.storage.from('homework').upload(path, f, { upsert: true, contentType: f.type || undefined }));
        paths.push(path);
      }
      const row = { assignment_id: assignmentId, student_id: profile.id, body, status: 'submitted', submitted_at: new Date().toISOString() };
      if (paths.length) { row.file_path = paths[0]; row.files = paths; }
      if (link) row.link = link;
      let res = await sb.from('submissions').upsert(row, { onConflict: 'assignment_id,student_id' });
      if (res.error && link && /link/.test(res.error.message || '')) { delete row.link; row.body = [body, link].filter(Boolean).join('\n'); res = await sb.from('submissions').upsert(row, { onConflict: 'assignment_id,student_id' }); }
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
    async setExtraGroups(id, groups) { ok(await sb.rpc('admin_set_extra_groups', { uid: id, groups })); },
    async links() { return ok(await sb.from('parent_children').select('*')); },
    async linkParent(parent_id, child_id) { ok(await sb.from('parent_children').upsert({ parent_id, child_id })); },
    async unlinkParent(parent_id, child_id) { ok(await sb.from('parent_children').delete().match({ parent_id, child_id })); },
    async saveLesson(l) { ok(await sb.from('lessons').insert({ ...l, created_by: profile.id })); },
    async deleteLesson(id) { ok(await sb.from('lessons').delete().eq('id', id)); },
    async saveAssignment(a) { ok(await sb.from('assignments').insert(a)); },
    async deleteAssignment(id) { ok(await sb.from('assignments').delete().eq('id', id)); },
    async saveGroup(g) {
      const run = (x) => { if (x.id) { const { id, ...rest } = x; return sb.from('groups').update(rest).eq('id', id); } return sb.from('groups').insert(x); };
      let r = await run(g);
      if (r.error && 'subject' in g && /subject/.test(r.error.message || '')) { const { subject, ...rest } = g; r = await run(rest); }
      ok(r);
    },
    async familyChecks(studentId) {
      let q = sb.from('family_checks').select('*');
      if (studentId) q = q.eq('student_id', studentId);
      const { data, error } = await q;
      if (error) { console.warn('family_checks', error.message); return []; }
      return data;
    },
    async confirmFamily(aid, child, note) { ok(await sb.rpc('confirm_family', { aid, child, note: note || '' })); },
    async announcements() {
      const { data, error } = await sb.from('announcements').select('*').order('starts_at', { ascending: true, nullsFirst: false }).limit(100);
      if (error) { console.warn('announcements', error.message); return []; }
      return data;
    },
    async saveAnnouncement(a) { return ok(await sb.from('announcements').insert({ ...a, created_by: profile.id }).select().single()); },
    async deleteAnnouncement(id) { ok(await sb.from('announcements').delete().eq('id', id)); },
    async recordAnswers(game, score, total, items) {
      const r = await sb.rpc('record_answers', { game, score, total, items });
      if (r.error) console.warn('record_answers', r.error.message);
    },
    async learning(ids) {
      if (!ids.length) return { stats: [], sessions: [] };
      const since = new Date(Date.now() - 120 * 864e5).toISOString();
      const [a, b] = await Promise.all([
        sb.from('word_stats').select('*').in('student_id', ids),
        sb.from('game_sessions').select('*').in('student_id', ids).gte('played_at', since),
      ]);
      if (a.error) console.warn('word_stats', a.error.message);
      return { stats: a.data || [], sessions: b.data || [] };
    },
    async setContact(email, phone, reports) {
      ok(await sb.rpc('set_contact', { email: email || '', phone: phone || '', reports }));
      Object.assign(profile, { contact_email: email || null, phone: phone || null, email_reports: reports });
    },
    async report(action, parentId) {
      const { data, error } = await sb.functions.invoke('weekly-report', { body: { action, parentId } });
      if (error) {
        let msg = error.message;
        try { const b = await error.context?.json?.(); if (b?.error) msg = b.error; } catch {}
        if (/not found|404|Failed to send/i.test(msg)) msg = 'weekly-report функц суугаагүй байна (README → "Имэйл тайлан")';
        throw new Error(msg);
      }
      return data;
    },
    async changePassword(password) {
      ok(await sb.auth.updateUser({ password }));
      const r = await sb.rpc('password_changed');
      if (r.error) console.warn(r.error.message);
      if (profile) profile.must_change_password = false;
    },
    async uploadTeamImage(target, blob) {
      const path = `${target}/team-${Date.now()}.jpg`;
      ok(await sb.storage.from('avatars').upload(path, blob, { contentType: 'image/jpeg', upsert: true }));
      return path;
    },
    async avatarUrls(paths) {
      const { data, error } = await sb.storage.from('avatars').createSignedUrls(paths, 3600);
      if (error) return {};
      return Object.fromEntries((data || []).map((d) => [d.path, d.signedUrl]));
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
