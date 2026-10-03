-- Shed NARS load while the instance is resource-starved.
--
-- From ~02:30 UTC on 2026-10-03 the database became starved: single-row
-- PostgREST reads took 14-23s, pg_database_size() took 11s, cron jobs failed
-- with "job startup timeout" and the MCP/SQL connection timed out for ~1h.
-- Since the 2026-10-03 matching fixes, nars-primary-evidence-match-10m runs to
-- completion (30-90s) instead of being cancelled, and nars-calibrate-hourly
-- kept timing out inside nars_cutover_readiness_v1. Together they are the
-- heaviest recurring NARS work on this small instance.
--
-- * nars-calibrate-hourly: paused until it is optimized (it failed every run
--   on 2026-10-03 anyway, so pausing loses no successful output).
-- * nars-primary-evidence-match: every 30 minutes instead of every 10.
--
-- Applied to production on 2026-10-03 05:3x UTC.
-- Rollback:
--   select cron.alter_job(job_id := (select jobid from cron.job where jobname='nars-calibrate-hourly'), active := true);
--   select cron.alter_job(job_id := (select jobid from cron.job where jobname='nars-primary-evidence-match-10m'), schedule := '7-59/10 * * * *');

select cron.alter_job(
  job_id := (select jobid from cron.job where jobname = 'nars-calibrate-hourly'),
  active := false
);

select cron.alter_job(
  job_id := (select jobid from cron.job where jobname = 'nars-primary-evidence-match-10m'),
  schedule := '7-59/30 * * * *'
);
