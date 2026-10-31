-- =====================================================================
-- 002 · Excel жагсаалт + гэр бүлийн даалгавар + олон файл
-- Supabase → SQL Editor дээр нэг удаа ажиллуулна. Дахин ажиллуулахад аюулгүй.
-- =====================================================================

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
