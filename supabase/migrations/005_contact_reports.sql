-- =====================================================================
-- 005 · Эцэг эхийн утас, холбоо барих имэйл, долоо хоногийн тайлан
-- Supabase → SQL Editor дээр нэг удаа ажиллуулна. Дахин ажиллуулахад аюулгүй.
-- =====================================================================

alter table public.profiles add column if not exists phone text;
alter table public.profiles add column if not exists contact_email text;
alter table public.profiles add column if not exists email_reports boolean not null default true;

-- Хэрэглэгч өөрийн холбоо барих мэдээлэл, тайлангийн тохиргоог солино
create or replace function public.set_contact(email text, phone text, reports boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if coalesce(set_contact.email, '') <> '' and set_contact.email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'Имэйл буруу байна'; end if;
  update profiles set
    contact_email = nullif(lower(trim(set_contact.email)), ''),
    phone = nullif(left(regexp_replace(coalesce(set_contact.phone, ''), '[^0-9+]', '', 'g'), 20), ''),
    email_reports = coalesce(set_contact.reports, true)
  where id = auth.uid();
end $$;
revoke execute on function public.set_contact(text, text, boolean) from anon;
