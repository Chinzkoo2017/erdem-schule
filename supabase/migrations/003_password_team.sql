-- =====================================================================
-- 003 · Анхны нэвтрэлтэд нууц үг солих + багийн нэр, тэмдэг
-- Supabase → SQL Editor дээр нэг удаа ажиллуулна. Дахин ажиллуулахад аюулгүй.
-- =====================================================================

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
