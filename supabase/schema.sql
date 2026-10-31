-- =====================================================================
-- Erdem Schule – Онлайн анги (LMS)  ·  Supabase schema + RLS
-- Supabase → SQL Editor дээр нэг удаа бүтнээр нь ажиллуулна.
-- Free tier дээр бүрэн ажиллана.
-- =====================================================================

-- ---------- Tables ---------------------------------------------------

create table if not exists public.groups (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  level       text,
  live_url    text,             -- Zoom / Google Meet линк
  schedule    text,             -- "Бямба 10:40"
  created_at  timestamptz default now()
);

create table if not exists public.profiles (
  id          uuid primary key references auth.users on delete cascade,
  full_name   text not null default '',
  role        text not null default 'pending'
              check (role in ('pending','student','parent','teacher','admin')),
  group_id    uuid references public.groups on delete set null,
  avatar      text default '🐎',
  created_at  timestamptz default now()
);

create table if not exists public.parent_children (
  parent_id   uuid references public.profiles on delete cascade,
  child_id    uuid references public.profiles on delete cascade,
  primary key (parent_id, child_id)
);

create table if not exists public.lessons (
  id           uuid primary key default gen_random_uuid(),
  group_id     uuid not null references public.groups on delete cascade,
  title        text not null,
  description  text,
  video_url    text,
  material_url text,
  lesson_date  date default current_date,
  created_by   uuid references public.profiles on delete set null,
  created_at   timestamptz default now()
);

create table if not exists public.assignments (
  id           uuid primary key default gen_random_uuid(),
  group_id     uuid not null references public.groups on delete cascade,
  lesson_id    uuid references public.lessons on delete set null,
  title        text not null,
  instructions text,
  due_date     date,
  points       int default 10,
  created_at   timestamptz default now()
);

create table if not exists public.submissions (
  id            uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments on delete cascade,
  student_id    uuid not null references public.profiles on delete cascade,
  body          text,
  file_path     text,           -- storage: homework/<student_id>/<file> (эхний файл)
  files         text[] default '{}', -- бүх хавсралт (зураг, аудио…)
  status        text not null default 'submitted' check (status in ('submitted','reviewed')),
  score         int,
  feedback      text,
  submitted_at  timestamptz default now(),
  unique (assignment_id, student_id)
);

create table if not exists public.vocab (
  id        uuid primary key default gen_random_uuid(),
  group_id  uuid references public.groups on delete cascade,   -- null = бүх ангид
  mn        text not null,
  de        text not null,
  emoji     text,
  category  text
);

-- Өдөр бүрийн XP → streak, badge тооцоолно
create table if not exists public.activity (
  student_id uuid references public.profiles on delete cascade,
  day        date not null default current_date,
  xp         int  not null default 0,
  primary key (student_id, day)
);

-- Хуучин суулгацад шинэ багана нэмэх (дахин ажиллуулахад аюулгүй)
alter table public.submissions add column if not exists files text[] default '{}';

-- ---------- Helper functions (security definer → RLS recursion-гүй) ---

create or replace function public.my_role() returns text
language sql stable security definer set search_path = public as $$
  select role from profiles where id = auth.uid()
$$;

create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select role in ('teacher','admin') from profiles where id = auth.uid()), false)
$$;

create or replace function public.my_group() returns uuid
language sql stable security definer set search_path = public as $$
  select group_id from profiles where id = auth.uid()
$$;

create or replace function public.is_my_child(child uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from parent_children where parent_id = auth.uid() and child_id = child)
$$;

create or replace function public.my_children_groups() returns setof uuid
language sql stable security definer set search_path = public as $$
  select p.group_id from parent_children pc join profiles p on p.id = pc.child_id
  where pc.parent_id = auth.uid() and p.group_id is not null
$$;

-- Шинэ хэрэглэгч бүртгүүлэхэд profile автоматаар үүснэ (role = pending).
-- Админ дараа нь role, анги оноож өгнө.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)));
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- XP нэмэх (сурагч өөрөө л нэмнэ, нэг удаад max 50)
create or replace function public.add_xp(amount int) returns void
language plpgsql security definer set search_path = public as $$
begin
  if my_role() <> 'student' then return; end if;
  insert into activity (student_id, day, xp)
  values (auth.uid(), current_date, least(greatest(amount,0),50))
  on conflict (student_id, day) do update set xp = activity.xp + excluded.xp;
end $$;

-- ---------- RLS ------------------------------------------------------

alter table public.groups          enable row level security;
alter table public.profiles        enable row level security;
alter table public.parent_children enable row level security;
alter table public.lessons         enable row level security;
alter table public.assignments     enable row level security;
alter table public.submissions     enable row level security;
alter table public.vocab           enable row level security;
alter table public.activity        enable row level security;

-- groups: хэрэглэгч өөрийн/хүүхдийнхээ ангийг харна, staff бүгдийг удирдана
drop policy if exists groups_read on public.groups;
create policy groups_read on public.groups for select using (
  is_staff() or id = my_group() or id in (select my_children_groups())
);
drop policy if exists groups_staff on public.groups;
create policy groups_staff on public.groups for all using (is_staff()) with check (is_staff());

-- profiles: өөрийгөө, хүүхдээ; staff бүгдийг
drop policy if exists profiles_read on public.profiles;
create policy profiles_read on public.profiles for select using (
  id = auth.uid() or is_my_child(id) or is_staff()
);
drop policy if exists profiles_self_update on public.profiles;
create policy profiles_self_update on public.profiles for update
  using (id = auth.uid() or my_role() = 'admin')
  with check (id = auth.uid() or my_role() = 'admin');
-- Хэрэглэгч өөрийн role/анги солих боломжгүй: зөвхөн нэр, avatar
revoke update on public.profiles from authenticated;
grant  update (full_name, avatar) on public.profiles to authenticated;
-- Админ role/анги солихдоо доорх функцийг ашиглана
create or replace function public.admin_set_profile(uid uuid, new_role text, new_group uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if my_role() <> 'admin' then raise exception 'admin only'; end if;
  update profiles set role = new_role, group_id = new_group where id = uid;
end $$;

-- parent_children: эцэг эх өөрийнхөө холбоосыг харна; админ удирдана
drop policy if exists pc_read on public.parent_children;
create policy pc_read on public.parent_children for select using (parent_id = auth.uid() or is_staff());
drop policy if exists pc_admin on public.parent_children;
create policy pc_admin on public.parent_children for all
  using (my_role() = 'admin') with check (my_role() = 'admin');

-- lessons / assignments: ангийнхан + хүүхдийн эцэг эх уншина, staff бичнэ
drop policy if exists lessons_read on public.lessons;
create policy lessons_read on public.lessons for select using (
  is_staff() or group_id = my_group() or group_id in (select my_children_groups())
);
drop policy if exists lessons_staff on public.lessons;
create policy lessons_staff on public.lessons for all using (is_staff()) with check (is_staff());

drop policy if exists assign_read on public.assignments;
create policy assign_read on public.assignments for select using (
  is_staff() or group_id = my_group() or group_id in (select my_children_groups())
);
drop policy if exists assign_staff on public.assignments;
create policy assign_staff on public.assignments for all using (is_staff()) with check (is_staff());

-- submissions: сурагч өөрийнхөө, эцэг эх хүүхдийнхээ, staff бүгдийг
drop policy if exists sub_read on public.submissions;
create policy sub_read on public.submissions for select using (
  student_id = auth.uid() or is_my_child(student_id) or is_staff()
);
drop policy if exists sub_insert on public.submissions;
create policy sub_insert on public.submissions for insert with check (
  student_id = auth.uid() and my_role() = 'student'
);
drop policy if exists sub_student_update on public.submissions;
create policy sub_student_update on public.submissions for update
  using (student_id = auth.uid() and status = 'submitted')
  with check (student_id = auth.uid() and status = 'submitted' and score is null);
drop policy if exists sub_staff on public.submissions;
create policy sub_staff on public.submissions for update using (is_staff()) with check (is_staff());

-- vocab: нэвтэрсэн бүх хүн уншина, staff бичнэ
drop policy if exists vocab_read on public.vocab;
create policy vocab_read on public.vocab for select using (auth.uid() is not null);
drop policy if exists vocab_staff on public.vocab;
create policy vocab_staff on public.vocab for all using (is_staff()) with check (is_staff());

-- activity: зөвхөн add_xp() функцээр бичнэ
drop policy if exists act_read on public.activity;
create policy act_read on public.activity for select using (
  student_id = auth.uid() or is_my_child(student_id) or is_staff()
);

-- ---------- Storage: homework bucket (private) -----------------------

insert into storage.buckets (id, name, public)
values ('homework', 'homework', false)
on conflict (id) do nothing;

drop policy if exists hw_upload on storage.objects;
create policy hw_upload on storage.objects for insert to authenticated with check (
  bucket_id = 'homework' and (storage.foldername(name))[1] = auth.uid()::text
);
drop policy if exists hw_read on storage.objects;
create policy hw_read on storage.objects for select to authenticated using (
  bucket_id = 'homework' and (
    (storage.foldername(name))[1] = auth.uid()::text
    or public.is_my_child(((storage.foldername(name))[1])::uuid)
    or public.is_staff()
  )
);

-- ---------- Анхны үгсийн сан (бүх ангид) ----------------------------

insert into public.vocab (mn, de, emoji, category)
select * from (values
  ('морь','Pferd','🐎','амьтан'), ('тэмээ','Kamel','🐫','амьтан'),
  ('хонь','Schaf','🐑','амьтан'), ('ямаа','Ziege','🐐','амьтан'),
  ('үхэр','Rind','🐄','амьтан'), ('нохой','Hund','🐕','амьтан'),
  ('муур','Katze','🐈','амьтан'), ('гэр','Jurte','🛖','гэр бүл'),
  ('ээж','Mama','👩','гэр бүл'), ('аав','Papa','👨','гэр бүл'),
  ('нар','Sonne','☀️','байгаль'), ('сар','Mond','🌙','байгаль'),
  ('ус','Wasser','💧','байгаль'), ('уул','Berg','⛰️','байгаль'),
  ('ном','Buch','📖','сургууль'), ('алим','Apfel','🍎','хоол'),
  ('сүү','Milch','🥛','хоол'), ('талх','Brot','🍞','хоол')
) v(mn, de, emoji, category)
where not exists (select 1 from public.vocab);

-- Олон хавсралт (зураг, аудио)
alter table public.submissions add column if not exists files text[] default '{}';

-- Гэр бүлийн код (Excel-ийн "Гэр бүл" багана)
alter table public.profiles add column if not exists family text;

-- Даалгаврын төрөл: 'normal' | 'family'
alter table public.assignments add column if not exists kind text not null default 'normal';

-- Эцэг эхийн баталгаажуулалт
create table if not exists public.family_checks (
  assignment_id uuid not null references public.assignments on delete cascade,
  student_id    uuid not null references public.profiles on delete cascade,
  parent_id     uuid references public.profiles on delete set null,
  note          text,
  created_at    timestamptz default now(),
  primary key (assignment_id, student_id)
);
alter table public.family_checks enable row level security;

drop policy if exists fc_read on public.family_checks;
create policy fc_read on public.family_checks for select using (
  student_id = auth.uid() or public.is_my_child(student_id) or public.is_staff()
);
-- Бичих нь зөвхөн confirm_family() функцээр

create or replace function public.confirm_family(aid uuid, child uuid, note text default '')
returns void language plpgsql security definer set search_path = public as $$
declare inserted boolean;
begin
  if my_role() <> 'parent' or not is_my_child(child) then
    raise exception 'Зөвхөн өөрийн хүүхдийн даалгаврыг баталгаажуулна';
  end if;
  if not exists (
    select 1 from assignments a join profiles p on p.id = child
    where a.id = aid and a.kind = 'family' and a.group_id = p.group_id
  ) then
    raise exception 'Энэ бол гэр бүлийн даалгавар биш';
  end if;
  insert into family_checks (assignment_id, student_id, parent_id, note)
  values (aid, child, auth.uid(), left(coalesce(note, ''), 500))
  on conflict (assignment_id, student_id) do update set note = excluded.note, parent_id = excluded.parent_id
  returning (xmax = 0) into inserted;
  if inserted then  -- анх удаа баталгаажуулахад хүүхэд +10 оноо
    insert into activity (student_id, day, xp) values (child, current_date, 10)
    on conflict (student_id, day) do update set xp = activity.xp + 10;
  end if;
end $$;

revoke execute on function public.confirm_family(uuid, uuid, text) from anon;

alter table public.profiles add column if not exists must_change_password boolean not null default false;
alter table public.profiles add column if not exists team_name text;

-- Хэрэглэгч нууц үгээ сольсны дараа тэмдэглэгээг арилгана
create or replace function public.password_changed() returns void
language sql security definer set search_path = public as $$
  update profiles set must_change_password = false where id = auth.uid();
$$;

-- Багийн нэр, тэмдэг: сурагч өөрөө, эцэг эх нь, эсвэл админ
create or replace function public.set_team(target uuid, name text, icon text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not (target = auth.uid() or is_my_child(target) or my_role() = 'admin') then
    raise exception 'Зөвхөн өөрийн эсвэл хүүхдийнхээ багийг өөрчилнө';
  end if;
  if coalesce(trim(name), '') = '' then raise exception 'Багийн нэр хоосон байна'; end if;
  update profiles set team_name = left(trim(name), 40), avatar = left(coalesce(icon, ''), 8) where id = target;
end $$;

revoke execute on function public.password_changed() from anon;
revoke execute on function public.set_team(uuid, text, text) from anon;

-- =====================================================================
-- Дараа нь: өөрийгөө бүртгүүлээд SQL Editor дээр:
--   update profiles set role = 'admin' where id = (select id from auth.users where email = 'TANY@EMAIL');
-- =====================================================================
