-- =====================================================================
-- 008 · Сурагч өөрийн сурах явцаа (алдсан үг, цээжилсэн үг) харах
-- Supabase → SQL Editor дээр нэг удаа ажиллуулна. Дахин ажиллуулахад аюулгүй.
-- =====================================================================
drop policy if exists ws_read on public.word_stats;
create policy ws_read on public.word_stats for select using (
  student_id = auth.uid() or public.is_my_child(student_id) or public.is_staff()
);
drop policy if exists gs_read on public.game_sessions;
create policy gs_read on public.game_sessions for select using (
  student_id = auth.uid() or public.is_my_child(student_id) or public.is_staff()
);
