-- =====================================================================
-- 009 · Мэдэгдэл: эцэг эхийн хурал, арга хэмжээ, мэдээлэл
-- Supabase → SQL Editor дээр нэг удаа ажиллуулна. Дахин ажиллуулахад аюулгүй.
-- =====================================================================
create table if not exists public.announcements (
  id         uuid primary key default gen_random_uuid(),
  kind       text not null default 'info' check (kind in ('meeting','event','info')),
  audience   text not null default 'parents' check (audience in ('parents','students','families','teachers','all')),
  group_id   uuid references public.groups on delete cascade,   -- null = бүх анги
  title      text not null,
  starts_at  timestamptz,
  place      text,
  link       text,
  body       text,
  created_by uuid references public.profiles on delete set null,
  created_at timestamptz default now()
);
alter table public.announcements enable row level security;

-- Хэн харах вэ: staff бүгд; бусад нь өөрийн эрх + өөрийн/хүүхдийн анги таарвал
drop policy if exists ann_read on public.announcements;
create policy ann_read on public.announcements for select using (
  public.is_staff()
  or (
    (audience = 'all'
      or (audience in ('parents','families') and public.my_role() = 'parent')
      or (audience in ('students','families') and public.my_role() = 'student'))
    and (group_id is null or group_id = public.my_group() or group_id in (select public.my_children_groups()))
  )
);
drop policy if exists ann_staff on public.announcements;
create policy ann_staff on public.announcements for all using (public.is_staff()) with check (public.is_staff());
