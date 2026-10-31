-- 010: Нэг сурагч олон ангид (монгол хэл + бүжиг, гитар ...), ангийн төрөл, даалгаврын видео линк
-- SQL Editor дээр нэг удаа ажиллуулна. Дахин ажиллуулахад аюулгүй.

alter table public.groups add column if not exists subject text not null default 'mongolian';
alter table public.groups drop constraint if exists groups_subject_check;
alter table public.groups add constraint groups_subject_check check (subject in ('mongolian','dance','music','sport','other'));

alter table public.profiles add column if not exists extra_groups uuid[] not null default '{}';
alter table public.submissions add column if not exists link text;

-- Сурагчийн бүх анги: үндсэн + нэмэлт
create or replace function public.student_groups(sid uuid) returns setof uuid
language sql stable security definer set search_path = public as $$
  select group_id from profiles where id = sid and group_id is not null
  union
  select unnest(extra_groups) from profiles where id = sid
$$;

create or replace function public.my_groups() returns setof uuid
language sql stable security definer set search_path = public as $$
  select public.student_groups(auth.uid())
$$;

create or replace function public.my_children_groups() returns setof uuid
language sql stable security definer set search_path = public as $$
  select public.student_groups(pc.child_id) from parent_children pc where pc.parent_id = auth.uid()
$$;

drop policy if exists groups_read on public.groups;
create policy groups_read on public.groups for select using (
  is_staff() or id in (select my_groups()) or id in (select my_children_groups())
);
drop policy if exists lessons_read on public.lessons;
create policy lessons_read on public.lessons for select using (
  is_staff() or group_id in (select my_groups()) or group_id in (select my_children_groups())
);
drop policy if exists assign_read on public.assignments;
create policy assign_read on public.assignments for select using (
  is_staff() or group_id in (select my_groups()) or group_id in (select my_children_groups())
);
do $$ begin
  if to_regclass('public.announcements') is not null then
    execute 'drop policy if exists ann_read on public.announcements';
    execute $p$create policy ann_read on public.announcements for select using (
      public.is_staff() or (
        (audience = 'all'
          or (audience in ('parents','families') and public.my_role() = 'parent')
          or (audience in ('students','families') and public.my_role() = 'student'))
        and (group_id is null or group_id in (select public.my_groups()) or group_id in (select public.my_children_groups()))
      ))$p$;
  end if;
end $$;

-- Гэр бүлийн даалгавар: хүүхдийн аль ч ангийнх байж болно
create or replace function public.confirm_family(aid uuid, child uuid, note text default '')
returns void language plpgsql security definer set search_path = public as $$
declare inserted boolean;
begin
  if my_role() <> 'parent' or not is_my_child(child) then
    raise exception 'Зөвхөн өөрийн хүүхдийн даалгаврыг баталгаажуулна';
  end if;
  if not exists (
    select 1 from assignments a
    where a.id = aid and a.kind = 'family' and a.group_id in (select student_groups(child))
  ) then
    raise exception 'Энэ бол гэр бүлийн даалгавар биш';
  end if;
  insert into family_checks (assignment_id, student_id, parent_id, note)
  values (aid, child, auth.uid(), left(coalesce(note, ''), 500))
  on conflict (assignment_id, student_id) do update set note = excluded.note, parent_id = excluded.parent_id
  returning (xmax = 0) into inserted;
  if inserted then
    insert into activity (student_id, day, xp) values (child, current_date, 10)
    on conflict (student_id, day) do update set xp = activity.xp + 10;
  end if;
end $$;

-- Админ нэмэлт анги оноох
create or replace function public.admin_set_extra_groups(uid uuid, groups uuid[])
returns void language plpgsql security definer set search_path = public as $$
begin
  if my_role() <> 'admin' then raise exception 'admin only'; end if;
  update profiles set extra_groups = coalesce(groups, '{}') where id = uid;
end $$;
