# BLACK ORACLE R&D Cycle 037
Date: 2026-10-01
Production impact: NONE

## Decision
Create one proposed canonical research item: **DI-006 — Outcome maturity / revision-time contract** (TEST). This is distinct from DI-003 input feature availability: a forecast can be PIT-clean at decision time yet be trained/evaluated against a provisional or later-revised outcome without recording which target state was available when learning occurred.

## DI-006 — outcome maturity and revised labels
Primary source: Kim, Byun, Lee & Jang, *Downside-Controlled Online Forecast Combination under Delayed and Revised Outcomes*, arXiv:2609.29096 (2026-09-24).
Evidence: B+ recent preprint; seven benchmarks, four base models including two foundation models, explicit failure analysis. Not finance-specific and not peer reviewed, so no adoption claim.
New: combines a frozen forecaster, static corrector and online corrector using losses only after the forecast horizon matures. Across 28 benchmark/model pairs, reported worst deterioration at the main horizon is 0.15% and gains reach 11.5%. In European day-ahead load, learning from provisional rather than settled outcomes can change results; learning on settled outcomes restored gains across all seven zones in the reported experiment.
BO gap: DI-003 records when inputs were knowable, but the canonical ledger has no symmetric contract for when a target/outcome became observable, whether it was provisional, when it settled, and which revision trained/evaluated a candidate.
H-DI006-MATURITY: recording target maturity and revision state, and forbidding learner updates before the declared maturity boundary, will expose optimistic or unstable online-learning results that input-only PIT checks miss.
EXP-DI006-MATURITY: extend the seeded replay fixture with delayed labels and provisional->settled revisions. Compare (A) illegal immediate/final-label learning, (B) provisional-label learning, (C) settled-label learning, and (D) a frozen/no-correction control under identical forecasts and budgets.
Metrics: premature-label leakage detection recall; valid-update false rejection; provisional-vs-settled score divergence; ranking reversal rate; revision sensitivity; post-drift recovery time; worst-case deterioration vs frozen baseline; replay determinism; target lineage reconstruction.
Status: TEST.
Implementation candidate: extend experiment/target manifests with target_id, horizon_end_at, observed_at, maturity_state, revision_id, revision_known_at, settled_at where available, source_hash, and learner_update_at. Enforce learner_update_at >= allowed maturity boundary in replay validators.
Risks: some market outcomes have no unique settled value; vendor corrections can arrive asynchronously; an overly strict contract can reject legitimate online learning. The contract therefore needs target-specific maturity policy rather than one universal delay.
Trace: revised-outcome research -> DI-006 -> H-DI006-MATURITY -> EXP-DI006-MATURITY -> PENDING -> ADOPT/REJECT/REVISIT.

## Quant / forecast-combination reference
Source: same downside-controlled online forecast-combination paper.
Comparison: BO should not adopt the method from a preprint. It does, however, provide a useful challenger design for EV-002/Q-001 style robustness tests: frozen baseline vs static correction vs adaptive correction vs downside-controlled combination.
Experiment amendment: only after DI-006 is valid, test whether an adaptive correction adds value over a frozen/simple baseline under delayed outcomes.
Success metrics: OOS loss, worst deterioration relative to frozen baseline, regime/drift recovery, revision sensitivity, compute cost.
Classification: REFERENCE / REVISIT. No trading behavior change.

## AI/ML / Agent evaluation
Implication: AIML-005 tasks with outcomes that mature after a horizon must distinguish answer-time evidence from later scoring labels. Agent evaluation should never expose settled outcomes to an agent whose simulated decision precedes them.
Classification: REFERENCE -> AIML-005 and EV-009.
Experiment amendment: add a temporal canary in hidden tasks that fails if a post-cutoff settled outcome appears in retrieval, prompt context, judge context, or learner memory.
Metrics: canary detection recall, post-cutoff evidence rate, judge-context leakage, replay equality.

## Design / UX
Source: IEEE VIS 2026, *Visualizing Uncertainty-to-Action Composition for Human Oversight* (ActionCue).
Evidence: B design/research framework demonstrated across healthcare, credit assessment and disaster forecasting; not yet BO-specific user evidence.
New: separates uncertainty display from the oversight action that uncertainty should trigger, using an explicit precedence policy and contextual safety modifier.
BO comparison: strengthens D-005 rather than creating a new UX ID. BO already uses Decision -> Why -> Audit; the missing test is whether uncertainty states map to inspectable oversight actions rather than decorative confidence.
H-D005-ACTION: explicit uncertainty-to-oversight binding will reduce incorrect proceed/override decisions compared with confidence-only presentation without materially increasing time-to-decision.
Experiment: confidence-only vs uncertainty detail vs uncertainty+action binding, measured both first-use and after short guided practice.
Metrics: correct oversight-action rate, unsafe-proceed rate, unnecessary-escalation rate, decision time, comprehension, post-practice delta.
Classification: TEST / REFERENCE.

## Market & Data Infrastructure
The DI-006 proposal is the main infrastructure result. Recent PIT vendors continue to expose as-of history and provenance, but vendor claims are implementation references only; BO still requires seeded leakage/revision tests.
Classification: REVIEWED / no additional ID.

## Product / Competitor
Recent finance-data products increasingly surface PIT/as-of semantics, provenance and agent-safe schemas. This validates product demand for auditability but is not evidence of correctness. BO differentiation should remain verified replayability and evidence lineage rather than feature-count imitation.
Classification: REFERENCE.

## Evidence & Validation
DI-006 adds a missing symmetry to BO validation:
- DI-003: what information could the decision-maker know?
- DI-006: what outcome could the learner/evaluator know, and when?
A result is not temporally valid unless both sides are controlled.
EV-002 robustness tests should report results by target maturity policy rather than silently mixing provisional and settled labels.

## Cycle report
Sources reviewed: recent forecast-combination/revised-outcome research; IEEE VIS uncertainty-to-action work; recent finance-data/PIT product references; current BO canonical ledger and Cycle 036 PR.
Documents changed: this Cycle 037 research document plus the research ledger on the Cycle 037 branch.
Experiments proposed: EXP-DI006-MATURITY; D-005 action-binding amendment; AIML-005 temporal-canary amendment.
Decisions: proposed DI-006 TEST; no ADOPT; no REJECT; no production/paper-trading behavior changes.
Unresolved bottleneck: EXP-DI001 + EXP-DI003 still lacks a recorded RESULT; Cycle 036/037 research remains unmerged until review.
Highest-priority next action: execute EXP-DI001 + EXP-DI003 on the seeded KRX replay fixture, then add one delayed/revised target fixture so DI-006 can be tested on the same replay substrate.
