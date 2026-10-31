-- 011: Багш эсвэл админ өөрөө эцэг эх байж болно (гэр бүлийн даалгавар баталгаажуулах)
create or replace function public.confirm_family(aid uuid, child uuid, note text default '')
returns void language plpgsql security definer set search_path = public as $$
declare inserted boolean;
begin
  if not is_my_child(child) then
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
