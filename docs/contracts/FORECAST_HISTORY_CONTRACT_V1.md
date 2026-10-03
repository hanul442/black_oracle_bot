# Forecast History Read/Write Contract v1

> [!IMPORTANT]
> **SUPERSEDED 2026-10-03** by [Forecast History Contract v2](https://github.com/hanul442/black_oracle_report/blob/main/docs/contracts/FORECAST_HISTORY_CONTRACT_V2.md) (black_oracle_report). v2 makes the exact consumed Evidence revision mandatory (CT-01) and keeps records without it out of point-in-time reads.

**Task:** BO-S1-013  
**Status:** REVIEW / READY FOR INDEPENDENT QA  
**Authority:** BLACK_ORACLE_CANONICAL_FROZEN_V1 Forecast + Institutional Memory; BO-S1-010/012 approved S1 contracts  
**Scope:** Alpha S1 persistence/read contract only. No schema migration, runtime authority, calibration, Strategy, Risk, or LIVE change.

## 1. Purpose

Make every historical Forecast reconstructable as it was known at its original point in time. History is append/version oriented: a later forecast, correction, method revision, or realized outcome must not overwrite the identity or evidence lineage of an earlier forecast.

## 2. Write contract

A persisted forecast history record MUST contain:

- `forecastArtifactId` — immutable artifact identity.
- `forecastRevisionId` — immutable revision identity.
- `assetId`.
- `artifactKind` — the canonical forecast kind; FAIR_VALUE and FUTURE_PRICE remain distinct.
- `methodId`, `methodVersion`, `methodFamily`.
- `asOf` — decision/knowledge cutoff used by the forecast.
- `createdAt` / `ingestedAt` where applicable; these must not be used to backdate knowledge before `asOf`.
- `inputEvidenceIds[]` and, when available, exact Evidence revision identities.
- `reasonSummary`.
- `availabilityState` and any explicit degraded/unavailable reason.
- the kind-specific forecast payload. FUTURE_PRICE preserves `horizonRef`; FAIR_VALUE must not acquire one merely for storage convenience.
- `reliabilityRef` or reliability artifact identity when reliability exists. Reliability remains separate from Directional Probability and Strategy Strength.
- component/version references required to reproduce the forecast method state.

A new forecast or correction creates a new artifact/revision. It MUST NOT mutate a prior historical forecast in place.

## 3. Read contract

History reads MUST support:

1. exact lookup by `forecastArtifactId` + revision;
2. asset history ordered by original `asOf`;
3. point-in-time selection using only revisions/evidence known by the requested cutoff;
4. retrieval of the exact method/version and Evidence lineage used at that time;
5. explicit distinction between forecast-time data and later realized outcomes;
6. coexistence of FAIR_VALUE and FUTURE_PRICE without type or identity collapse;
7. explicit unavailable/degraded state rather than fabricated values.

A historical query MUST NOT silently substitute the current method version, current Evidence revision, current reliability result, or later correction for the version originally used.

## 4. Realized outcome boundary

Realized price/outcome is a later observation linked to a forecast; it is not a rewrite of that forecast. Evaluation may compare forecast vs realized outcome only while preserving both timestamps, identities, and lineage.

## 5. PIT / lineage invariants

- `Evidence.knownAt <= forecast.asOf` (using the canonical PIT knowledge boundary already defined by S1-003).
- Later-known Evidence or corrections cannot enter an earlier forecast reconstruction.
- Missing historical lineage fails closed or is marked legacy/incomplete; it is never synthesized.
- History preserves method/version, Evidence identity/revision, artifact kind, and original as-of.
- Application logs alone are not sufficient historical truth.

## 6. Minimal interface semantics

`writeForecastHistory(record)` accepts only a fully identified, PIT-valid record and is append/version oriented.

`getForecastHistory(assetId, from?, to?, kind?)` returns historical artifacts without replacing their original versions.

`getForecastAsOf(assetId, cutoff, kind?)` returns only the latest eligible artifact/revision whose canonical knowledge lineage is valid at the cutoff.

`getForecastById(forecastArtifactId, revisionId?)` returns the requested immutable historical identity.

These names describe contract behavior, not a new architecture or required storage technology.

## 7. QA acceptance cases

Independent QA should verify at minimum:

- two forecasts for the same asset preserve separate identities/versions;
- a later Evidence correction cannot change an earlier as-of reconstruction;
- historical retrieval returns the original method/version and Evidence IDs;
- FAIR_VALUE and FUTURE_PRICE can coexist without collapse;
- later realized outcome remains linked but does not mutate the forecast;
- missing PIT/version lineage fails closed or remains explicitly incomplete;
- no Strategy/Risk/PAPER/LIVE authority is introduced.

