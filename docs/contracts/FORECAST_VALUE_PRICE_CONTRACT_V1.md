# Forecast Fair Value vs Future Price Contract v1

**Task:** BO-S1-011  
**Status:** REVIEW / READY FOR INDEPENDENT QA  
**Authority:** BLACK_ORACLE_CANONICAL_FROZEN_V1 §2B Forecast, §4 Core Semantic Contract  
**Scope:** Alpha S1 contract only. No runtime, schema, calibration, Strategy, Risk, or LIVE authority change.

## 1. Purpose

Prevent Fair Value and Future Price Forecast from collapsing into one field, score, label, or user-facing claim.

## 2. Canonical semantics

### Fair Value
An estimated intrinsic / justified value **range** derived from a valuation method and its assumptions.

Required identity:
- `forecastArtifactId`
- `kind = FAIR_VALUE`
- `methodId` and `methodVersion`
- `asOf`
- `assetId`
- `valueRange`
- `currency`
- `inputEvidenceIds`
- `reasonSummary`
- `availabilityState`

Fair Value must not imply that the market will realize the range by a particular future date unless a separate Future Price Forecast exists.

### Future Price Forecast
An estimated realized market-price **range/path over a defined horizon**.

Required identity:
- `forecastArtifactId`
- `kind = FUTURE_PRICE`
- `methodId` and `methodVersion`
- `asOf`
- `assetId`
- `horizonRef`
- `priceRange`
- `currency`
- `inputEvidenceIds`
- `reasonSummary`
- `availabilityState`

A Future Price Forecast must not be labeled or stored as intrinsic/fair value.

## 3. Non-collapse invariants

1. `FAIR_VALUE` and `FUTURE_PRICE` are distinct discriminated artifact kinds.
2. A single numeric field cannot serve as both kinds.
3. Converting Fair Value into a Future Price Forecast requires an explicit forecast method/artifact with its own identity, version, as-of, evidence lineage, reason summary, and horizon.
4. UI simplification may place both near each other but must preserve distinct labels and drill-down semantics.
5. Historical review preserves the original kind, method/version, as-of and Evidence lineage.
6. Missing one kind does not authorize fabrication from the other; unavailable/degraded state is explicit.

## 4. Relationship to other S1 semantics

Neither artifact is:
- Directional Probability,
- Strategy Strength,
- Forecast Reliability,
- Evidence/Data Quality.

Those remain separate under Frozen v1. Forecast synthesis may consume these artifacts and their underlying reasons/evidence but must not blindly average or semantically merge them.

## 5. Calibration boundary

Exact standard horizons, weights, thresholds, valuation formula selection, and reliability visualization remain deferred calibration work. This contract introduces none of them.

## 6. QA acceptance cases

Independent QA should verify at minimum:
- a Fair Value-only artifact cannot be represented as a dated Future Price forecast;
- a Future Price-only artifact cannot be represented as intrinsic value;
- both can coexist for the same asset/as-of without identity collision;
- missing/degraded one-side state remains explicit;
- historical retrieval preserves kind + method/version + as-of + Evidence lineage;
- no Strategy/Risk/LIVE authority is introduced.

