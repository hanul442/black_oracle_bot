# BLACK ORACLE R&D Cycle 038 — Discovery-Process Evaluation

Date: 2026-10-02
Status: research only; no production/paper-trading behavior changed.

## Decision summary

This cycle creates no new canonical ID. The strongest new evidence is assigned to existing AIML-001, AIML-005, EV-003, EV-005, DI-003, D-005, Q-002, and EV-001.

The key change is methodological: BLACK ORACLE must evaluate the *research/discovery process* under rolling historical re-execution, not only the final factor/strategy that happened to survive one research run.

## 1. Quant + AI/ML — agentic discovery must itself be OOS

### Source
Pan, Ding & Giesecke (2026), "Agentic Empirical Asset Pricing: Methodological Foundations" (arXiv:2609.00731).

### New material
The paper separates autonomous factor discovery into hypothesis generation, formalization, execution/estimation, evaluation gate, and memory/iteration. It argues that evaluating only discovered factors is insufficient and proposes point-in-time data, point-in-time process, OOS-only claimed results, and rolling re-execution of the discovery system. It compares SEADS with five reimplemented baselines on two US equity panels and reports that no single metric consistently ranks systems.

### Evidence quality
B+ — directly relevant, explicit methodology and comparative experiments, but currently a preprint and not BO/KRX-specific.

### BO comparison / gap
BO already owns factor lineage/redundancy (AIML-001), agent evaluation (AIML-005), PIT inputs (DI-003), and multiple-testing/research-budget accounting (EV-003/EV-005). The missing link is an explicit test of whether the *same discovery engine*, rerun at successive historical cutoffs with only then-available state, repeatedly produces useful/non-redundant candidates. A one-time winning factor is not evidence that Strategy Factory/Genome is a reliable discovery process.

### Classification
TEST / REFERENCE → AIML-001 + AIML-005 + EV-003 + EV-005 + DI-003.

### Hypothesis
H-AIML001-ROLLING: A candidate-generation process that looks strong under one static discovery run will show materially different yield, novelty, trial burden, and OOS performance when the entire discovery loop is re-executed at successive PIT cutoffs.

### Experiment
EXP-AIML001-ROLLING:
1. Freeze a simple non-agentic candidate generator and the current BO discovery candidate generator.
2. Choose successive historical cutoffs on the existing replayable dataset.
3. At each cutoff, expose only PIT-valid data, prior accepted/rejected candidate memory that would have existed then, and a fixed compute/trial budget.
4. Generate candidates, run the same structural/statistical/redundancy gates, then lock outputs.
5. Evaluate only on the next untouched OOS window.
6. Preserve every generated/rejected candidate in the trial family; do not reset failed attempts between metrics.

Metrics: OOS Sharpe/IC distribution, accepted-candidate yield per 100 trials, novelty/redundancy rate, false-discovery/multiple-testing diagnostics, turnover/cost sensitivity, cross-window survival, candidate churn, run-to-run/seed variance, cost per OOS-surviving candidate, and ranking reversal versus static evaluation.

Success rule: no arbitrary threshold yet. A more complex agentic discovery loop is promotable only if it adds repeatable OOS value and/or novelty over the simple generator after trial accounting, costs, and instability are included.

Risks: modern-LLM parametric knowledge can still contaminate historical discovery; rolling re-execution is compute-heavy; adaptive memory can silently expand the effective trial count. Those risks must remain explicit evidence fields.

## 2. AI/ML — longitudinal and cross-entity finance tasks need their own stratum

### Source
Fin-RATE (2026), arXiv:2602.07294.

### New material
Fin-RATE evaluates SEC-filing analysis across single-disclosure, cross-entity, and longitudinal workflows. Reported accuracy drops by 18.60% and 14.35% when moving from single-document tasks to longitudinal and cross-entity analysis, with more time/entity mismatches and comparison hallucinations.

### Evidence quality
B — directly relevant benchmark with 17 models, but preprint and US-SEC-specific.

### BO comparison / gap
AIML-005/FinFIRST-style atomic checks cover source, period, entity and evidence quality, but a task mix dominated by single-period questions can hide failure on the exact workflows BO needs for company trajectories, peer comparisons and revision-aware analysis.

### Classification
TEST / REFERENCE → AIML-005 + DI-003 + DI-005.

### Hypothesis
H-AIML005-LONG: Model/agent rankings and error composition will change when BO tasks require multi-period and multi-entity synthesis rather than isolated retrieval/reasoning.

### Experiment
Amend EXP-AIML005: preregister three strata — single-period, longitudinal, cross-entity. Hold tool entitlement and evaluator constant. Measure strict pass, entity mismatch, time/period mismatch, comparison hallucination, evidence completeness, retrieval-vs-reasoning attribution, cost/latency, and architecture ranking reversal.

## 3. Quant / execution — market-impact realism remains a challenger, not an adoption

### Source
Abbade & Costa (2026), "Realistic Market Impact Modeling for Reinforcement Learning Trading Environments" (arXiv:2603.29086).

### New material
Gymnasium-compatible environments combine nonlinear Almgren–Chriss-style impact and square-root impact, and report that cost model choice materially changes both trading behavior and relative algorithm ranking.

### Evidence quality
B — open/reproducible research direction and directly relevant to execution realism, but preprint and RL/NASDAQ-100 transfer to BO is unproven.

### BO comparison / gap
Q-002 already owns execution-cost model risk and EV-001 owns cross-engine implementation risk. No new ID is justified. BO should test nonlinear impact only after the simple fee/spread/slippage baseline is reproducible.

### Classification
REFERENCE / REVISIT → Q-002 + EV-001.

### Experiment amendment
When EXP-Q002 runs, compare fee-only → spread/slippage → simple square-root impact challenger on identical archived/paper intents. Metrics: net OOS return, turnover, realized/modelled cost, strategy/model ranking reversal, cost misspecification sensitivity, capacity sensitivity, latency/complexity overhead. Reject the nonlinear model if it does not change decisions materially or improve held-out cost realism.

## 4. Design/UX — bind uncertainty to oversight action

### Source
Anyabolu, Dubey & Hattab (IEEE VIS 2026 UncertaintyVis), "Visualizing Uncertainty-to-Action Composition for Human Oversight."

### New material
The work distinguishes output uncertainty from uncertainty in the decision process and proposes an inspectable mapping from uncertainty conditions to an oversight response.

### Evidence quality
B — strong design relevance and IEEE VIS workshop provenance, but worked-case evidence rather than BO user evidence.

### BO comparison / gap
D-005 already specifies progressive disclosure. The missing UX test is whether users can infer the correct *oversight action* from uncertainty/conflict states, rather than merely notice a confidence value.

### Classification
TEST / REFERENCE → D-005.

### Experiment amendment
Compare confidence-only vs uncertainty detail vs uncertainty→action binding. Metrics: correct proceed/escalate/hold choice, unsafe proceed rate, unnecessary escalation, decision time, comprehension, and performance after brief practice. Do not allow UI text to override EV-006 deterministic authority.

## 5. Market & Data Infrastructure

Recent vendor implementations continue to expose known-at/revision/provenance semantics and point-in-time financial snapshots. These are useful implementation references but do not independently prove correctness. DI-003/DI-004 remain the owner; no new ID.

Classification: REFERENCE only. Vendor PIT claims never replace BO seeded leakage/revision tests.

## 6. Product / Competitor

Current financial-AI products continue converging on premium/structured data integration, citations, permissions and auditability. This supports BO's evidence-first product direction but is product evidence, not model/trading-performance evidence.

Classification: REVIEWED / REFERENCE; no architecture change.

## Traceability

AEAP research → H-AIML001-ROLLING → EXP-AIML001-ROLLING → PENDING → ADOPT / REJECT / REVISIT

Fin-RATE → H-AIML005-LONG → EXP-AIML005 longitudinal/cross-entity amendment → PENDING → ADOPT / REJECT / REVISIT

Market-impact research → EXP-Q002 challenger amendment → PENDING → ADOPT / REJECT / REVISIT

Uncertainty-to-action research → EXP-D005 amendment → PENDING → ADOPT / REJECT / REVISIT

## Implementation path

Do not build a new Strategy Factory subsystem yet. After EXP-DI001+DI003 is replayable:
- add historical cutoff/run-family fields to bo.experiment.v1;
- preserve generator/model/prompt/tool/data/memory versions and complete candidate trial history;
- add discovery_run_id, cutoff_at, trial_family_id, parent_candidate_id, generator_version, memory_snapshot_ref, compute_budget, accepted/rejected reason, and next-OOS-window ref;
- run a deliberately small rolling discovery comparison before scaling.

## Risks / non-actions

No production or paper trading behavior changed. No strategy promotion, model-router change, Council topology change, live credential change, sizing change, or execution-gate change is authorized by this research.

Primary unresolved risk: modern LLM knowledge can violate historical discovery even when data/tool inputs are PIT. Treat model-knowledge-time as a confound until separately controlled.

## Cycle report

Sources reviewed: agentic empirical asset pricing, Fin-RATE, realistic market-impact modeling, uncertainty-to-action visualization, current PIT/provenance vendor patterns, and current institutional financial-AI product patterns.

Documents changed: this Cycle 038 research note; central research ledger updated separately on the same branch.

Experiments proposed/amended: EXP-AIML001-ROLLING (new extension), EXP-AIML005-LONG amendment, EXP-Q002 challenger amendment, EXP-D005 amendment.

Decisions: no new canonical ID; TEST/REFERENCE for rolling discovery-process evaluation; no ADOPT/REJECT; no production impact.

Unresolved bottleneck: EXP-DI001 + EXP-DI003 still must produce a replayable RESULT before rolling autonomous discovery can be trusted.

Highest-priority next research action: stop expanding discovery architecture and execute the seeded PIT replay fixture; once replayability is proven, run a small two-generator rolling discovery pilot with complete trial accounting.
