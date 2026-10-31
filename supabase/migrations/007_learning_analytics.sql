-- =====================================================================
-- 007 · Сурах явцын анализ (үг, үсэг, өгүүлбэр, нөхцөл)
-- Зөвхөн багш/админ ба тухайн хүүхдийн эцэг эх харна. Сурагч өөрөө харахгүй.
-- Supabase → SQL Editor дээр нэг удаа ажиллуулна. Дахин ажиллуулахад аюулгүй.
-- =====================================================================

-- Нэг сурагч × нэг зүйл (үг/үсэг/өгүүлбэр/нөхцөл) бүрийн хуримтлал
create table if not exists public.word_stats (
  student_id uuid not null references public.profiles on delete cascade,
  kind       text not null check (kind in ('vocab','letter','sentence','suffix')),
  item       text not null,
  correct    int  not null default 0,
  wrong      int  not null default 0,
  streak     int  not null default 0,          -- дараалсан зөв хариулт (3+ = цээжилсэн)
  last_at    timestamptz not null default now(),
  primary key (student_id, kind, item)
);

-- Тоглоом бүрийн үр дүн (цаг хугацааны явц)
create table if not exists public.game_sessions (
  id         bigint generated always as identity primary key,
  student_id uuid not null references public.profiles on delete cascade,
  game       text not null,
  score      int  not null,
  total      int  not null,
  played_at  timestamptz not null default now()
);
create index if not exists game_sessions_student on public.game_sessions (student_id, played_at);

alter table public.word_stats    enable row level security;
alter table public.game_sessions enable row level security;

drop policy if exists ws_read on public.word_stats;
create policy ws_read on public.word_stats for select using (public.is_my_child(student_id) or public.is_staff());
drop policy if exists gs_read on public.game_sessions;
create policy gs_read on public.game_sessions for select using (public.is_my_child(student_id) or public.is_staff());

-- Сурагч тоглоом дуусгахад дуудна. items: [{"kind":"vocab","item":"морь","ok":true}, …]
create or replace function public.record_answers(game text, score int, total int, items jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare r jsonb;
begin
  if my_role() <> 'student' then return; end if;
  if jsonb_array_length(coalesce(items, '[]')) > 60 then raise exception 'too many items'; end if;
  insert into game_sessions (student_id, game, score, total)
  values (auth.uid(), left(record_answers.game, 20), greatest(0, least(record_answers.score, 100)), greatest(0, least(record_answers.total, 100)));
  for r in select * from jsonb_array_elements(coalesce(items, '[]')) loop
    continue when (r->>'kind') not in ('vocab','letter','sentence','suffix') or coalesce(r->>'item', '') = '';
    insert into word_stats as w (student_id, kind, item, correct, wrong, streak)
    values (auth.uid(), r->>'kind', left(r->>'item', 120),
            case when (r->>'ok')::boolean then 1 else 0 end,
            case when (r->>'ok')::boolean then 0 else 1 end,
            case when (r->>'ok')::boolean then 1 else 0 end)
    on conflict (student_id, kind, item) do update set
      correct = w.correct + excluded.correct,
      wrong   = w.wrong + excluded.wrong,
      streak  = case when excluded.correct = 1 then w.streak + 1 else 0 end,
      last_at = now();
  end loop;
end $$;
revoke execute on function public.record_answers(text, int, int, jsonb) from anon;
