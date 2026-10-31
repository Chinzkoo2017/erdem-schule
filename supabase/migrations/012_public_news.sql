-- 012: Нүүр хуудасны мэдээ — "Нийтэд" гэсэн мэдэгдлийг нэвтрээгүй хүн ч уншина
alter table public.announcements drop constraint if exists announcements_audience_check;
alter table public.announcements add constraint announcements_audience_check
  check (audience in ('parents','students','families','teachers','all','public'));
drop policy if exists ann_public on public.announcements;
create policy ann_public on public.announcements for select to anon, authenticated using (audience = 'public');
grant select on public.announcements to anon;

-- Нэвтрээгүй хүн зөвхөн "Нийтэд" мэдэгдлийг харна (бусад нь заавал нэвтэрсэн байх)
drop policy if exists ann_read on public.announcements;
create policy ann_read on public.announcements for select to authenticated using (
  public.is_staff() or (
    (audience = 'all'
      or (audience in ('parents','families') and public.my_role() = 'parent')
      or (audience in ('students','families') and public.my_role() = 'student'))
    and (group_id is null or group_id in (select public.my_groups()) or group_id in (select public.my_children_groups()))
  ));
