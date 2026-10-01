# BLACK ORACLE R&D Cycle 036
Date: 2026-10-01
Production impact: NONE

## Decisions
No new canonical ID. Strengthen EV-007, AIML-005, AIML-007, D-005, DI-003/004 and existing execution-validation work.

## EV-007 — audit artifact integrity
Source: TRACE, IEEE BigDataSecurity 2026.
Evidence: A-/B+ peer-reviewed implementation/security precedent; not finance-specific.
New: provenance graphs, digest commitments and historical reconstruction provide a concrete precedent for detecting later changes to an audit trail.
BO gap: bo.audit_bundle.v1 is content-addressed, but the ledger does not explicitly test whether later artifact changes or omissions are detected.
H-EV007-INTEGRITY: a minimal integrity manifest over canonical artifact digests will detect seeded post-run change/omission without creating a second ledger.
EXP-EV007-INTEGRITY: generate an audit bundle on the existing KRX replay fixture; alter or omit selected evidence, constraint, trace, result and validator-version artifacts; then attempt blind reconstruction.
Metrics: seeded-change detection recall, valid-replay false alarms, omission detection, reconstruction completeness, verification determinism, latency/storage overhead.
Status: TEST / REFERENCE.
Implementation candidate: optional integrity_manifest with artifact type/path, digest algorithm, digest and one bundle-root digest. Keep this local and minimal until threat-model testing proves a need for stronger mechanisms.
Risk: canonicalization mistakes, migration burden, and overstating what digest verification proves.
Trace: TRACE -> H-EV007-INTEGRITY -> EXP-EV007-INTEGRITY -> PENDING -> ADOPT/REJECT/REVISIT.

## AIML-005 — executable quantitative tasks
Source: Quantitative Finance-Bench (QFBench), 2026.
Evidence: B+ open executable benchmark with Docker tasks, programmatic verification, multiple models and repeated runs; BO must reproduce any relevant claims independently.
New: 87 quant-finance coding tasks use executable numerical verification and track a single-shot non-agentic Finance-Zero baseline separately. Reported best pass@1 is about 62%, and repeated attempts can materially change pass@k.
BO gap: AIML-005 does not yet require a hidden executable quant subset or a simple non-agentic control.
H-AIML005-EXEC: executable hidden quant tasks plus a matched single-shot baseline will change some model/agent rankings and expose numerical implementation failures hidden by prose evaluation.
EXP-AIML005-EXEC: freeze 10–15 BO-relevant hidden tasks covering risk, execution cost, corporate actions, factor/backtest and VaR/ES; compare single-shot script, current agent and later Council under fixed model/budget where practical.
Metrics: pass@1; pass@k separately; numerical-tolerance failure; deterministic-test pass; cost/verified success; latency; run variance; incremental gain over simple baseline.
Status: TEST / REFERENCE.
Risk: public benchmark contamination; use QFBench as design precedent, not as BO promotion evidence.

## AIML-007 — common-mode capable-agent risk
Source: Ross et al., Why Better Models Can Create Riskier Systems: Evidence from LLM Agents in Financial Markets, arXiv:2609.04373.
Evidence: B recent preprint with formal framing and agent-based simulation; live-market external validity remains unproven.
New: more capable LLM traders can become more behaviorally correlated; a shared misinformation environment turns that correlation into a system-level liability.
BO comparison: directly strengthens AIML-007; no new ID.
Experiment amendment: add shared-misinformation and shared-retrieval perturbations; measure pairwise error correlation, false-consensus rate and common-mode error severity.
Status: REFERENCE / TEST.

## DI-003/004 + Product
PtData, Arche and Synapse Discovery expose point-in-time/restatement handling, provenance metadata and agent-facing APIs. Evidence: C+/B- product/implementation references, not independent validation.
Decision: REFERENCE only. Vendor PIT labels never replace BO seeded leakage tests.

## D-005 — learning effects in uncertainty UI
Source: IEEE VIS 2026, Practice improves performance with uncertainty visualization tasks.
Evidence: B+ research precedent; finance transfer unproven.
New: practice can improve task performance and can change the ranking of uncertainty visualizations.
H-D005-LEARN: short guided practice changes task accuracy/time enough to alter the preferred uncertainty representation.
Experiment: first-use versus post-practice evaluation on Decision -> Why -> Audit tasks.
Metrics: decision accuracy, calibration-interpretation error, time-to-correct-decision, audit-open rate, learning delta.
Status: REFERENCE / TEST.

## Quant
No new canonical quant ID. QFBench is evaluation-design precedent; existing Q-002/Q-004 already own execution realism questions.

## Priority
1. Keep EXP-DI001 + EXP-DI003 first.
2. Add EXP-EV007-INTEGRITY when EV-007 runs on the same fixture.
3. Add hidden executable quant tasks and a single-shot baseline when AIML-005 is frozen.

No production or paper-trading behavior, strategy ranking, router, sizing, order-gate, credentials or live execution changed.
