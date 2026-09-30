# Cycle 035 — Atomic Financial Research Evaluation

Date: 2026-10-01
Status: TEST PROPOSAL
Production impact: NONE

## Primary finding: FinFIRST
Wang et al., *FinFIRST: Benchmarking Search Agents for Financial Information Retrieval, Sourcing and Traceability* (arXiv:2609.25192, 2026-09-21) evaluates 123 expert-authored financial research tasks with atomic criteria covering raw-information acquisition, source verification, and computation/answer formation. It uses an 18-field taxonomy, six-axis coverage design, 138-source registry, more than 50 finance experts, and six-stage QC. Reported best atomic score is 87.59% and best strict pass rate is 71.54%; computation/answer formation lags raw-information acquisition.

Evidence: B+ (recent preprint; strong benchmark construction and unified tool setting, not peer-reviewed).

BO gap: AIML-005 evaluates financial agents, but final-answer scoring can hide failures in source authority, PIT validity, entity/period alignment, unit/definition consistency, evidence sufficiency, and computation.

### H-AIML005-ATOMIC
On frozen BO financial tasks, atomic evidence/process scoring will reveal materially different failure attribution and may reverse candidate rankings relative to final-answer-only scoring.

### EXP-AIML005-ATOMIC
Extend EXP-AIML005 rather than create a new canonical ID. Freeze 30–50 BO tasks and a hidden calibration subset. Define machine-checkable atoms where possible: source authority, PIT cutoff, instrument identity, fiscal/reporting period, unit/definition, minimum evidence contract, required calculation, and final answer. Hold model/checkpoint, tool entitlement, PIT snapshot, budget and task wording fixed. Run deterministic checks first and EV-009-calibrated judging only for non-deterministic criteria.

Metrics: strict pass rate; atomic accuracy; source-authority precision; PIT violation; entity/period/unit errors; required-evidence precision/recall; computation correctness; correct-answer-with-invalid-process rate; ranking reversal; deterministic-vs-judge disagreement; cost/latency/tool calls per strict pass; replay determinism. No arbitrary promotion threshold before baseline distributions exist.

Classification: TEST / REFERENCE → AIML-005, EV-009, DI-003, DI-005.

Implementation candidate: extend the evaluation artifact with task/rubric version, PIT snapshot reference, source-registry version, required-evidence reference, tool-manifest hash, deterministic-verifier reference, judge-manifest reference, trace reference, atomic results and strict-pass result. Risks include rubric leakage, benchmark overfitting, false precision in source-authority labels, correlated criteria and evaluator contamination.

## Evidence & Validation: NIST TEVV-Athlon
NIST AI 200-2 initial public draft structures customized AI assessment around objectives and combinations of Events, Tools, Blocks and measurement concepts, and explicitly covers agentic systems.

Evidence: A- as an authoritative public-draft measurement framework; not empirical architecture-performance evidence.
Classification: REFERENCE → AIML-002, AIML-005, EV-009.
Transfer: ensure each BO evaluation states objective/context, event/task, tool/condition, measurement block and decision rule. Do not create a parallel ledger.

## Market/Data + Design/Product: OpenBB current documentation
OpenBB Workspace documentation updated 2026-09-29 exposes citation paths back to widgets/documents and raw widget data. Its SEC balance-sheet reference documents pit_mode, preserving original filing vintage instead of later restatements/amendments.

Evidence: A for current documented product/API behavior; not performance evidence.
Classification: REFERENCE → D-005, DI-003; PRODUCT/COMPETITOR REFERENCE.
Decision: preserve BO's stricter knowledge-time/source-time contract rather than inheriting provider semantics.

## Quant
Implementation-risk literature remains directly aligned with EV-001. No distinct Quant gap justified a new ID this cycle.
Classification: REFERENCE / no new ID.

## Product/Competitor
Current financial-agent products continue to emphasize connected financial data, citations/auditability, human approval and audit trails. These reinforce EV-006/007/008 but do not constitute performance evidence.
Classification: PRODUCT REFERENCE.

## Traceability
FinFIRST → H-AIML005-ATOMIC → EXP-AIML005-ATOMIC → PENDING → ADOPT / REJECT / REVISIT.
NIST TEVV-Athlon → AIML-002/AIML-005/EV-009 REFERENCE.
OpenBB PIT/citation patterns → DI-003/D-005 REFERENCE.
Backtest implementation-risk review → EV-001 REFERENCE.

## Decision
New canonical IDs: 0. ADOPT: 0. REJECT: 0. Production/paper trading behavior: unchanged.

## Highest-priority next action
Execute EXP-DI001 + EXP-DI003 on the seeded KRX PIT replay fixture. In parallel, freeze AIML-005 task/rubric versions so EXP-AIML005-ATOMIC can run on a stable target after the PIT/evidence verifier exists.
