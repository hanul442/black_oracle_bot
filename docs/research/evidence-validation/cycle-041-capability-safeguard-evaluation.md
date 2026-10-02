# Cycle 041 — Capability and Safeguard Evaluation

Date: 2026-10-03
Status: R&D only. No production or paper-trading behavior changed.

## Decision
No new canonical ID. This cycle strengthens EV-008, EV-009, AIML-005, D-005, and DI-003.

## EV-008 — capability and safeguard performance are separate axes
The UK AI Security Institute Frontier AI Trends Report summarizes testing of more than 30 frontier systems and reports that capability gains did not reliably imply stronger safeguards. This is strong institutional evidence but requires BO-domain transfer testing.

**H-EV008-CAPSAFE:** candidate capability deltas and safeguard deltas can diverge enough that one composite promotion score hides regressions.

**EXP-EV008-CAPSAFE:** evaluate the same frozen candidate set on two independent scorecards: AIML-005 financial-task capability and EV-008 safety/control fixtures. Compare two-axis promotion with a naive weighted composite.

Metrics: safeguard-regression detection recall, false promotion rate, capability/safeguard delta correlation, fail-closed rate, ranking reversal, cost and latency per verified safe success.

Classification: **TEST / REFERENCE**. A hard deterministic safety regression cannot be compensated by a capability gain.

## EV-009 — measurement probes
NIST ITL's 2026 work on measurement probes for agentic AI describes automated judges/verifiers, including adversarial verifiers, as a way to improve traceability and dynamic verification.

**H-EV009-PROBE:** versioned probes on selected high-risk agent steps improve seeded-failure attribution and replayability without unacceptable overhead.

**EXP-EV009-PROBE:** compare no probe, deterministic probe, and calibrated adversarial verifier on a small AIML-005/EV-008 sandbox subset while preserving raw traces for offline re-evaluation.

Metrics: seeded-failure recall, false alarm rate, localization accuracy, replay agreement, verifier disagreement, latency/cost overhead, material-action coverage.

Implementation candidate: add optional probe metadata to the existing trace/audit manifest: probe identifier/version, target step, verifier reference, knowledge-base hash, result reference, and check time. Do not create a second trace system.

Classification: **TEST / REFERENCE**.

## DI-003 — taxonomy lifecycle
The SEC's Sept. 14, 2026 Draft 2027 SEC Taxonomies announcement confirms that EDGAR structured-data taxonomies undergo recurring versioned updates. This reinforces semantic point-in-time reconstruction.

Amend EXP-DI003-TAXONOMY with a draft-to-approved/version-transition fixture. Require historical replay to bind filing data to the taxonomy/parser/crosswalk valid and knowable for that decision context.

Metrics: taxonomy-version reconstruction accuracy, semantic-leak recall, stale-parser detection, feature equality, downstream decision divergence.

Classification: **REFERENCE / TEST amendment**.

## D-005 — two-axis decision UX
Do not collapse answer quality and safety/control status into one confidence badge.

**H-D005-CAPSAFE:** separate capability and safeguard presentation reduces unsafe proceed decisions relative to a single composite confidence score.

Future EXP-D005 condition: composite score versus separate capability + safeguard state. Metrics: unsafe proceed, unnecessary escalation, comprehension, decision time.

Classification: **TEST amendment**.

## Quantitative Finance
No new Q-ID. No evidence reviewed this cycle was both strong and sufficiently distinct from Q-001–004 and EV-001/003/005 to justify ledger inflation.

Classification: **REVIEWED / NO NEW ID**.

## Product / Competitor
Recent institutional finance assistants continue to favor bounded or confirmed state-changing actions. Product announcements are directional references, not performance evidence.

Classification: **REFERENCE only**.

## Traceability
- AISI evidence → H-EV008-CAPSAFE → EXP-EV008-CAPSAFE → PENDING → ADOPT / REJECT / REVISIT
- NIST probes → H-EV009-PROBE → EXP-EV009-PROBE → PENDING → ADOPT / REJECT / REVISIT
- SEC taxonomy lifecycle → EXP-DI003-TAXONOMY amendment → PENDING
- two-axis UX → H-D005-CAPSAFE → EXP-D005 amendment → PENDING

## Priority
Close EXP-DI001 + EXP-DI003 to RESULT on the seeded KRX replay fixture first. Then reuse that fixture for EV-007/008 faults. Run EXP-EV008-CAPSAFE after AIML-005 capability baselines and EV-008 safeguard fixtures are frozen.
