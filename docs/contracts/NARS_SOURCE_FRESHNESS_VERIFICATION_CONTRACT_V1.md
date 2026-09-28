# NARS Source Freshness & Verification Contract v1

Status: IMPLEMENTING — pending independent QA  
Task: BO-S1-002  
Scope: NARS source configuration and provenance metadata only

## Purpose

BO-S1-002 closes the gap where a NARS source could enter collection without an explicit source verification, freshness, and availability assessment.

This contract does not create a new source score, credibility threshold, freshness TTL, migration, or execution authority.

## Contract

Every configured NARS source must declare:

- `verificationState`: `unreviewed | provisional | reviewed | suspended`
- `freshnessState`: `unknown | current | stale`
- `availabilityState`: `primary | fallback | failed`
- `assessedAt`: required timestamp identifying when the assessment was made

Conditional fields:

- `availabilityState=fallback` requires `fallbackSourceKey`
- `availabilityState=failed` requires `failureCode`

No numeric credibility score is introduced by this contract.

## Runtime behavior

The collector validates the contract before collection. Invalid or legacy source configuration that omits the contract fails closed rather than being silently promoted to a valid assessed source.

The validated fields are copied into the existing source `metadata` payload using the same field names so that existing `nars_sources.metadata` storage preserves the assessment without a database migration.

The queue envelope also retains the assessment fields so source state remains attached to the collector-to-ingest handoff.

## Explicit non-goals

This change does not:

- define freshness TTLs or automatic stale transitions
- assign or change source credibility scores
- change evidence scoring calibration
- add database tables or columns
- migrate legacy source records
- change NARS or BLACK ORACLE execution authority
- enable LIVE trading
- auto-promote `unreviewed` or legacy sources

## Deployment note

A deployment must not reuse a legacy `NARS_SOURCE_CONFIG_JSON` that lacks these required fields. Runtime source configuration must be populated with truthful assessment values before enabling the updated collector.

Independent QA must verify:

1. missing assessment fields fail closed;
2. fallback and failed conditional requirements are enforced;
3. assessment metadata survives the collector queue/ingest boundary;
4. no schema, authority, scoring-threshold, or calibration expansion was introduced.
