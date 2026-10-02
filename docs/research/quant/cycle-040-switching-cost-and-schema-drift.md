# BLACK ORACLE R&D — Cycle 040
Date: 2026-10-02
Status: research only; no production/paper-trading behavior changed.

## Decision summary
No new canonical research ID. This cycle strengthens Q-002, DI-003, AIML-005, EV-008/009, and D-005 without duplicating existing ownership.

## 1. Quantitative Finance — implicit switching-cost regularization
Source: Witkowski (2026), "Implicit Switching-Cost Regularization in Supervised Trading Signal Classification", Computational Economics, published 2026-09-22.
Evidence: A- (peer-reviewed, controlled ablation, four FX pairs, 50 independent runs/configuration; transfer to BO/KRX unverified).
Classification: TEST / REFERENCE -> Q-002.

New material: conditioning the current supervised prediction on the model's previous output creates decision-path dependence. The controlled ablation reports 10–16 fewer position changes per 1,000 test timesteps while directional accuracy remains comparable; cost advantage widens under higher imposed spreads.

BO comparison/gap: Q-002 already owns execution-cost model risk, but BO does not yet test whether signal-generation architecture itself can suppress economically useless switching before post-hoc execution filters.

Hypothesis H-Q002-PATH:
For otherwise matched supervised signal models, previous-output conditioning reduces OOS turnover and realized execution-cost sensitivity without materially degrading predictive quality or increasing drawdown/path-lock-in risk.

Experiment EXP-Q002-PATH:
On the same frozen PIT dataset and identical base model/features/hyperparameters, compare:
A) independent prediction baseline;
B) post-hoc hysteresis/no-trade filter;
C) previous-output-conditioned challenger.
Use walk-forward/OOS evaluation and the existing Q-002 cost family. Stress regime breaks and deliberately wrong early predictions.

Success metrics:
switches/1k observations; turnover; net OOS return/Sharpe; directional/calibration metrics; drawdown; recovery after regime flip; cost-sensitivity curve; seed variance; latency/compute; ranking reversal across cost assumptions.
Decision rule: ADOPT only if the challenger adds net value over the simpler post-hoc baseline under held-out cost/regime conditions. Otherwise REJECT/REFERENCE.

Risks: path dependence can propagate early errors, create excessive inertia after regime change, and overfit one cost assumption.

## 2. Market & Data Infrastructure — taxonomy-version drift is a live PIT failure mode
Source: SEC EDGAR 26.3 XBRL Taxonomies Update, 2026-09-15.
Evidence: A (primary regulator documentation).
Classification: TEST / REFERENCE -> DI-003 (and DI-002 lineage).

New material: EDGAR 26.3 added the 2026q3 FND taxonomy and stopped accepting 2024 versions of many taxonomies including US-GAAP, SRT, CURRENCY, EXCH, SIC and others.

BO comparison/gap: DI-003 already requires point-in-time availability, but a replay can still be semantically wrong if a current taxonomy/parser/crosswalk is silently applied to an old filing.

Hypothesis H-DI003-TAXONOMY:
Pinning taxonomy/parser/crosswalk versions to the filing/replay knowledge state detects semantic leakage that value-level PIT checks miss.

Experiment EXP-DI003-TAXONOMY:
Seed the KRX/filing replay harness with taxonomy element addition/removal, renamed/deprecated tags, stale parser behavior, and current-taxonomy-on-historical-filing faults.

Success metrics:
seeded semantic-leak recall; valid-replay false rejection; extracted-feature equality; stale-parser detection; source->taxonomy->parser->transform reconstruction completeness; downstream decision divergence.

Implementation candidate:
Extend the existing lineage/PIT manifest only where applicable with taxonomy_id/version, parser_version/hash, mapping/crosswalk version and known_at/effective interval. Do not create a second data ledger.

## 3. AI/ML + Evidence — hard-negative evidence discrimination
Source: FinRank (2026), evidence-grounded SEC-filing QA benchmark.
Evidence: B+ (manually authored benchmark; 1,185 QA records, 22 companies; preprint).
Classification: TEST / REFERENCE -> AIML-005 + EV-009.

New material: retrieval quality degrades sharply when easy/random negatives are replaced by confusable passages from other periods/entities/disclosure contexts; reported pairwise accuracy drops 13.0–20.5 percentage points. A numerically plausible answer can therefore be grounded in the wrong filing evidence.

Hypothesis H-AIML005-HARDNEG:
BO agent/evaluator rankings change when retrieval tests use entity/period/context-matched hard negatives rather than random distractors.

Experiment amendment:
Add matched hard negatives to the hidden AIML-005 calibration subset: same metric/wrong period, same period/wrong entity, same entity/wrong disclosure context, amended-vs-original filing. Keep answer and evidence scoring separate.

Metrics:
hard-negative discrimination; Recall@k/MRR; entity-period-context mismatch rate; correct-answer/wrong-evidence rate; strict evidence-contract pass; evaluator disagreement; ranking reversal.

## 4. Evidence & Validation / Agent Security — identity/authorization implementation maturity
Source: NIST NCCoE, "Comments on Software and Agentic AI Identity Concept Paper", 2026-09-29.
Evidence: A- (primary institutional project update; implementation work is forthcoming, not completed validation).
Classification: REFERENCE / REVISIT -> EV-008.

New material: NIST says its first implementation use case will demonstrate identification, authentication and authorization of AI agents in a DevSecOps lifecycle. This reinforces BO's existing rule that prompt text is not authority.

BO action: no new subsystem. Keep EV-008 runtime policy tests and revisit when NIST publishes the concrete implementation artifacts. Do not treat the announcement as effectiveness evidence.

## 5. Design/UX
No new independent design gap justified a canonical ID. Existing D-005 should consume the evidence-state distinctions produced by AIML-005/EV-009: correct answer with wrong/insufficient evidence must be visibly distinguishable in Why/Audit views from fully verified evidence. Classification: REVIEWED / existing D-005.

## 6. Product / Competitor
Institutional finance products continue converging on infrastructure-level RBAC, source citations, audit logs, model routing and governed execution. This validates BO's product direction but is not performance evidence. Classification: REFERENCE only. No architecture change.

## Traceability
- Peer-reviewed switching-cost research -> H-Q002-PATH -> EXP-Q002-PATH -> PENDING -> ADOPT / REJECT / REVISIT
- SEC EDGAR 26.3 taxonomy change -> H-DI003-TAXONOMY -> EXP-DI003-TAXONOMY -> PENDING -> ADOPT / REJECT / REVISIT
- FinRank -> H-AIML005-HARDNEG -> EXP-AIML005 amendment -> PENDING -> ADOPT / REJECT / REVISIT
- NIST 2026-09-29 agent identity update -> EV-008 REFERENCE / REVISIT

## Priority
Do not displace the current queue leader. EXP-DI001 + EXP-DI003 seeded PIT replay remains first. Add one taxonomy-version fault to that fixture. Q-002-PATH should run only after the replay/cost harness is trustworthy.

## Production impact
None. No strategy ranking, router, Council, position sizing, order gate, credentials, paper trading or live trading behavior changed.
