-- =====================================================================
-- 004 · Багийн зураг оруулах (003-ыг агуулсан тул 003-ыг ажиллуулаагүй бол энэ хангалттай)
-- Supabase → SQL Editor дээр нэг удаа ажиллуулна. Дахин ажиллуулахад аюулгүй.
-- =====================================================================

alter table public.profiles add column if not exists must_change_password boolean not null default false;
alter table public.profiles add column if not exists team_name text;

create or replace function public.password_changed() returns void
language sql security definer set search_path = public as $$
  update profiles set must_change_password = false where id = auth.uid();
$$;

-- Багийн нэр + тэмдэг (emoji эсвэл 'img:<сурагчийн id>/<файл>')
create or replace function public.set_team(target uuid, name text, icon text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not (target = auth.uid() or is_my_child(target) or my_role() = 'admin') then
    raise exception 'Зөвхөн өөрийн эсвэл хүүхдийнхээ багийг өөрчилнө';
  end if;
  if coalesce(trim(name), '') = '' then raise exception 'Багийн нэр хоосон байна'; end if;
  if icon like 'img:%' then
    if icon not like 'img:' || target::text || '/%' or length(icon) > 200 then raise exception 'Зургийн зам буруу'; end if;
  elsif length(coalesce(icon, '')) > 8 then
    raise exception 'Тэмдэг буруу';
  end if;
  update profiles set team_name = left(trim(name), 40), avatar = icon where id = target;
end $$;

revoke execute on function public.password_changed() from anon;
revoke execute on function public.set_team(uuid, text, text) from anon;

-- Хаалттай bucket: зургийг зөвхөн хүүхэд өөрөө, эцэг эх нь, багш/админ харна
insert into storage.buckets (id, name, public) values ('avatars', 'avatars', false)
on conflict (id) do nothing;

drop policy if exists av_insert on storage.objects;
create policy av_insert on storage.objects for insert to authenticated with check (
  bucket_id = 'avatars' and (
    (storage.foldername(name))[1] = auth.uid()::text
    or public.is_my_child(((storage.foldername(name))[1])::uuid)
    or public.my_role() = 'admin')
);
drop policy if exists av_update on storage.objects;
create policy av_update on storage.objects for update to authenticated using (
  bucket_id = 'avatars' and (
    (storage.foldername(name))[1] = auth.uid()::text
    or public.is_my_child(((storage.foldername(name))[1])::uuid)
    or public.my_role() = 'admin')
);
drop policy if exists av_read on storage.objects;
create policy av_read on storage.objects for select to authenticated using (
  bucket_id = 'avatars' and (
    (storage.foldername(name))[1] = auth.uid()::text
    or public.is_my_child(((storage.foldername(name))[1])::uuid)
    or public.is_staff())
);
