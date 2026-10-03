-- Run nars-calibrate-hourly at minute 13 instead of minute 7.
--
-- At minute 7 it started together with nars-primary-evidence-match-10m
-- (7-59/10), and the two competed for the same small instance: the 00:07
-- and 01:07 UTC calibration runs still hit the 2-minute statement timeout
-- even though its candidate-pair search alone takes ~20s. Minute 13 does not
-- coincide with any other NARS job (cluster */5, score 2-59/5,
-- evidence-acquire 4-59/10, primary-match 7-59/10, shadow-poll */10).
--
-- Applied to production on 2026-10-03.
-- Rollback: select cron.alter_job(job_id := (select jobid from cron.job where jobname='nars-calibrate-hourly'), schedule := '7 * * * *');

select cron.alter_job(
  job_id := (select jobid from cron.job where jobname = 'nars-calibrate-hourly'),
  schedule := '13 * * * *'
);
