
// ===================================================================
//  Supabase Edge Function: roster-sync
//  Зөвхөн админ дуудна. action: "export" | "plan" | "apply"
// ===================================================================
import { createClient } from 'npm:@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const reply = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

function secretKey(): string {
  try {
    const keys = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') || '{}');
    const first = keys.default || Object.values(keys)[0];
    if (first) return String(first);
  } catch (_) { /* ignore */ }
  return Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  try {
    const db = createClient(Deno.env.get('SUPABASE_URL')!, secretKey(), { auth: { persistSession: false, autoRefreshToken: false } });

    // 1. Дуудаж буй хүн админ мөн эсэх
    const token = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
    const { data: auth } = await db.auth.getUser(token);
    const caller = auth?.user;
    if (!caller) return reply({ error: 'Нэвтрээгүй байна' }, 401);
    const { data: me } = await db.from('profiles').select('role').eq('id', caller.id).single();
    if (me?.role !== 'admin') return reply({ error: 'Зөвхөн админ' }, 403);

    // 2. Одоогийн төлөв
    const users: any[] = [];
    for (let page = 1; page < 50; page++) {
      const { data, error } = await db.auth.admin.listUsers({ page, perPage: 1000 });
      if (error) throw error;
      users.push(...data.users);
      if (data.users.length < 1000) break;
    }
    const [{ data: profiles, error: e1 }, { data: groups, error: e2 }, { data: links, error: e3 }] = await Promise.all([
      db.from('profiles').select('*'), db.from('groups').select('id,name'), db.from('parent_children').select('*'),
    ]);
    if (e1 || e2 || e3) throw e1 || e2 || e3;
    const emailOf = new Map(users.map((u) => [u.id, (u.email || '').toLowerCase()]));
    const state = {
      users: (profiles || []).map((p: any) => ({ ...p, email: emailOf.get(p.id) || '' })),
      groups: groups || [],
      links: links || [],
    };

    const body = await req.json().catch(() => ({}));
    if (body.action === 'export') return reply({ rows: exportRows(state) });

    const plan = planRoster(Array.isArray(body.rows) ? body.rows : [], state, {
      callerId: caller.id, deactivateMissing: body.deactivateMissing !== false,
    });
    if (body.action !== 'apply') return reply({ plan });
    if (plan.errors.length) return reply({ error: 'Excel-д алдаа байна. Эхлээд засна уу.', plan }, 400);

    const ok = (r: any) => { if (r.error) throw r.error; return r.data; };
    const result = await applyPlan(plan, state, {
      createGroup: async (name: string) => ok(await db.from('groups').insert({ name }).select('id').single()).id,
      createUser: async ({ email, password, name }: any) =>
        ok(await db.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: name } })).user.id,
      updateProfile: async (id: string, fields: any) => {
        let f = { ...fields };
        let r = await db.from('profiles').upsert({ id, ...f });
        // Шинэ багана (migration ажиллаагүй) байхгүй бол түүнийг хасаад дахин оролдоно
        for (let i = 0; i < 4 && r.error; i++) {
          const col = ['must_change_password', 'phone', 'contact_email'].find((c) => c in f && r.error.message.includes(c));
          if (!col) break;
          delete (f as any)[col];
          r = await db.from('profiles').upsert({ id, ...f });
        }
        ok(r);
      },
      setPassword: async (id: string, password: string) => { ok(await db.auth.admin.updateUserById(id, { password })); },
      addLink: async (parent_id: string, child_id: string) => { ok(await db.from('parent_children').upsert({ parent_id, child_id })); },
      removeLink: async (parent_id: string, child_id: string) => { ok(await db.from('parent_children').delete().match({ parent_id, child_id })); },
    });
    return reply({ plan, ...result });
  } catch (e) {
    return reply({ error: (e as Error).message || String(e) }, 500);
  }
});
