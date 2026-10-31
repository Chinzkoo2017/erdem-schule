
// ===================================================================
//  Supabase Edge Function: weekly-report
//  • Cron (x-cron-secret) → бүх эцэг эхэд тайлан илгээнэ
//  • Админ: action "status" | "preview" | "test" | "send"
//  Secrets: BREVO_API_KEY, SENDER_EMAIL, (SENDER_NAME), (REPLY_TO), CRON_SECRET, (SITE_URL)
// ===================================================================
import { createClient } from 'npm:@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const reply = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
const env = (k: string, d = '') => Deno.env.get(k) || d;
const STUDENT_DOMAIN = 'student.erdem-schule.de';

function secretKey(): string {
  try {
    const keys = JSON.parse(env('SUPABASE_SECRET_KEYS', '{}'));
    const first = keys.default || Object.values(keys)[0];
    if (first) return String(first);
  } catch (_) { /* ignore */ }
  return env('SUPABASE_SERVICE_ROLE_KEY');
}

async function sendMail(to: string, toName: string, subject: string, html: string, text: string) {
  const key = env('BREVO_API_KEY'), from = env('SENDER_EMAIL');
  if (!key || !from) throw new Error('BREVO_API_KEY эсвэл SENDER_EMAIL тохируулаагүй байна');
  const body: any = { sender: { name: env('SENDER_NAME', 'Эрдэм сургууль'), email: from }, to: [{ email: to, name: toName || to }], subject, htmlContent: html, textContent: text };
  if (env('REPLY_TO')) body.replyTo = { email: env('REPLY_TO') };
  const r = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST', headers: { 'api-key': key, 'Content-Type': 'application/json', accept: 'application/json' }, body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`Brevo ${r.status}: ${(await r.text()).slice(0, 200)}`);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  try {
    const db = createClient(env('SUPABASE_URL'), secretKey(), { auth: { persistSession: false, autoRefreshToken: false } });
    const body = await req.json().catch(() => ({}));
    let action = body.action || 'status';
    let caller: any = null;

    const cron = req.headers.get('x-cron-secret');
    if (cron) {
      if (!env('CRON_SECRET') || cron !== env('CRON_SECRET')) return reply({ error: 'bad cron secret' }, 401);
      action = 'send';
    } else {
      const token = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
      const { data: auth } = await db.auth.getUser(token);
      caller = auth?.user;
      if (!caller) return reply({ error: 'Нэвтрээгүй байна' }, 401);
      const { data: me } = await db.from('profiles').select('role').eq('id', caller.id).single();
      if (me?.role !== 'admin') return reply({ error: 'Зөвхөн админ' }, 403);
    }

    // ---------- өгөгдөл
    const users: any[] = [];
    for (let page = 1; page < 50; page++) {
      const { data, error } = await db.auth.admin.listUsers({ page, perPage: 1000 });
      if (error) throw error;
      users.push(...data.users);
      if (data.users.length < 1000) break;
    }
    const loginEmail = new Map(users.map((u) => [u.id, (u.email || '').toLowerCase()]));
    const since = new Date(Date.now() - 120 * 864e5).toISOString().slice(0, 10);
    const q = async (p: any) => { const { data, error } = await p; if (error) throw error; return data || []; };
    const [profiles, groups, links, assignments, submissions, activity] = await Promise.all([
      q(db.from('profiles').select('*')), q(db.from('groups').select('*')), q(db.from('parent_children').select('*')),
      q(db.from('assignments').select('id,group_id,title,due_date,kind')), q(db.from('submissions').select('assignment_id,student_id,status,score,feedback,submitted_at')),
      q(db.from('activity').select('*').gte('day', since)),
    ]);
    const checks = await q(db.from('family_checks').select('assignment_id,student_id')).catch(() => []);

    const emailOf = (p: any) => {
      if (p.contact_email) return p.contact_email;
      const e = loginEmail.get(p.id) || '';
      return e && !e.endsWith('@' + STUDENT_DOMAIN) ? e : '';
    };
    const parents = profiles.filter((p: any) => p.role !== 'pending' && p.role !== 'student' && links.some((l: any) => l.parent_id === p.id));
    const reportFor = (p: any) => {
      const kidIds = links.filter((l: any) => l.parent_id === p.id).map((l: any) => l.child_id);
      const kids = profiles.filter((k: any) => kidIds.includes(k.id) && k.role === 'student').map((k: any) => {
        const gids = [k.group_id, ...(k.extra_groups || [])].filter(Boolean);
        const gs = gids.map((id: string) => groups.find((x: any) => x.id === id)).filter(Boolean);
        const g = gs[0] || {};
        return {
          name: k.full_name, groupName: gs.map((x: any) => x.name).join(', '), schedule: gs.map((x: any) => x.schedule).filter(Boolean).join(', '), liveUrl: g.live_url,
          assignments: assignments.filter((a: any) => gids.includes(a.group_id)),
          submissions: submissions.filter((s: any) => s.student_id === k.id),
          activity: activity.filter((a: any) => a.student_id === k.id),
          checks: checks.filter((c: any) => c.student_id === k.id),
        };
      });
      if (!kids.length) return null;
      return buildParentReport({ parentName: p.full_name, kids, siteUrl: env('SITE_URL', 'https://erdem-schule.de/classroom/') });
    };

    const rows = parents.map((p: any) => ({
      id: p.id, name: p.full_name, email: emailOf(p), optOut: p.email_reports === false,
      kids: links.filter((l: any) => l.parent_id === p.id).length,
    }));

    if (action === 'status') {
      return reply({ parents: rows, configured: !!(env('BREVO_API_KEY') && env('SENDER_EMAIL')), sender: env('SENDER_EMAIL'), cron: !!env('CRON_SECRET') });
    }
    if (action === 'preview') {
      const p = parents.find((x: any) => x.id === body.parentId) || parents.find((x: any) => reportFor(x));
      const r = p ? reportFor(p) : null;
      if (!r) return reply({ error: 'Хүүхэдтэй холбогдсон эцэг эх алга' }, 400);
      return reply({ parentId: p.id, ...r });
    }

    // ---------- илгээх
    const out = { sent: 0, skipped: [] as string[], failed: [] as string[] };
    const targets = action === 'test'
      ? parents.filter((p: any) => !body.parentId || p.id === body.parentId).slice(0, body.parentId ? 1 : 3)
      : parents;
    for (const p of targets) {
      const row = rows.find((r: any) => r.id === p.id)!;
      const to = action === 'test' ? (caller?.email || '') : row.email;
      if (action !== 'test' && row.optOut) { out.skipped.push(`${p.full_name} (татгалзсан)`); continue; }
      if (!to) { out.skipped.push(`${p.full_name} (имэйлгүй)`); continue; }
      const r = reportFor(p);
      if (!r) { out.skipped.push(`${p.full_name} (хүүхэд холбогдоогүй)`); continue; }
      try {
        await sendMail(to, p.full_name, (action === 'test' ? '[ТУРШИЛТ] ' : '') + r.subject, r.html, r.text);
        out.sent++;
        await new Promise((res) => setTimeout(res, 150));
      } catch (e) { out.failed.push(`${p.full_name}: ${(e as Error).message}`); }
    }
    return reply(out);
  } catch (e) {
    return reply({ error: (e as Error).message || String(e) }, 500);
  }
});
