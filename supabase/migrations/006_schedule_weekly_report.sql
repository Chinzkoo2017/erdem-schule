-- =====================================================================
-- 006 · Долоо хоногийн тайланг Ням гараг бүр автоматаар илгээх (pg_cron, үнэгүй)
-- weekly-report функц болон түүний secrets тохируулсны ДАРАА ажиллуулна.
-- CRON_SECRET-ийг функцийн Secrets-д оруулсан утгатай ижил болгоно.
-- =====================================================================
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.unschedule('erdem-weekly-report')
where exists (select 1 from cron.job where jobname = 'erdem-weekly-report');

-- Ням гараг 17:00 UTC = Германд 18:00 (өвөл) / 19:00 (зун)
select cron.schedule('erdem-weekly-report', '0 17 * * 0', $$
  select net.http_post(
    url := 'https://ksalwzgyfdunoszdghch.supabase.co/functions/v1/weekly-report',
    headers := '{"Content-Type": "application/json", "x-cron-secret": "PASTE_CRON_SECRET"}'::jsonb,
    body := '{}'::jsonb
  );
$$);
