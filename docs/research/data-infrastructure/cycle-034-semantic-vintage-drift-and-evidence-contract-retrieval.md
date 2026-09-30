# Cycle 034 — Semantic Vintage Drift and Evidence-Contract Retrieval

Date: 2026-09-30
Status: RESEARCH COMPLETE / TEST PROPOSED
Production impact: NONE

## Scope

Cross-domain scan across Design/UX, Quantitative Finance, AI/ML, Market & Data Infrastructure, Product/Competitor, and Evidence & Validation. This cycle deliberately avoids adding a new canonical research ID where existing IDs already cover the discovered gaps.

## 1. Market & Data Infrastructure — semantic vintage drift

### Research

Primary-source review of the Federal Reserve Financial Accounts (Z.1) and St. Louis Fed real-time/vintage APIs shows that point-in-time correctness is not only about observation values. Official datasets can revise values, rename/recode series, renumber tables, add/delete codes, and retroactively change sector/instrument coverage.

The September 11, 2026 Z.1 release incorporated revisions and structural changes including private-credit vehicles, private-credit loans and hedge funds. The June 2026 release renumbered all Z.1 tables. The Financial Accounts code-change registry exposes thousands of historical mnemonic changes. FRED/ALFRED explicitly separates observation date from the real-time period in which information was known and supports historical vintage retrieval.

### Evidence quality

A — primary Federal Reserve / Federal Reserve Bank of St. Louis documentation.

### BO comparison and gap

DI-003 already defines point-in-time feature availability; DI-002 covers lineage. Current canonical rules, however, do not explicitly require semantic/schema identity to be frozen alongside values. A replay can therefore use a historically valid value under a later taxonomy, mnemonic mapping, table definition, or sector composition and still appear PIT-correct.

### Hypothesis — H-DI003-SEMANTIC

For mutable official datasets, freezing value vintage without freezing semantic/schema vintage can change feature meaning or universe membership while passing value-level PIT checks. Recording and validating semantic-vintage provenance will detect these false replays.

### Experiment — EXP-DI003-SEMANTIC

Extend the existing EXP-DI001 + EXP-DI003 fixture; do not create a new harness.

Seed:
- historical value revised after decision time;
- series mnemonic renamed or deleted;
- table renumbered with stale parser mapping;
- sector/instrument definition expanded retroactively;
- data-dictionary/unit/seasonal-adjustment metadata changed;
- current taxonomy applied to an old value snapshot;
- legitimate crosswalk supplied with effective/knowledge time.

Compare:
1. value-only PIT manifest;
2. value + schema/version hash;
3. value + schema/version hash + effective/knowledge-time crosswalk.

Metrics:
- seeded semantic-leak detection recall;
- valid-replay false rejection;
- feature/universe reconstruction accuracy;
- replay equality;
- stale-parser detection;
- source -> vintage -> schema -> transform -> feature reconstruction success;
- downstream decision/risk-metric divergence caused by semantic drift.

Success threshold: preregister after baseline distribution; no invented threshold in this cycle.

### Classification

TEST — DI-003
REFERENCE — DI-002, DI-004, DI-005

### Implementation candidate

Add optional fields to the existing PIT/lineage manifest rather than a new subsystem:
- source_release_id
- source_vintage_at
- schema_hash
- dictionary_hash
- semantic_version
- crosswalk_ref
- crosswalk_effective_from/to
- crosswalk_known_at

Risk: over-versioning can create unnecessary operational burden. Require these fields only for mutable/versioned sources where semantics can change; immutable raw snapshots remain the anchor.

## 2. AI/ML + Evidence — retrieval quality must be separated from reasoning quality

### Research

FinRCA-Bench (2026) constructs 2,250 deterministic financial reconciliation cases with hidden record-level evidence contracts. Holding the reasoning model and prompt fixed while changing retrieval architecture materially changes required-record recall and exact diagnosis accuracy; the paper also shows that correct final labels can occur despite incomplete evidence.

FinSkillBench and FrontierFinance remain supporting references: curated procedures and tool harnesses materially affect observed agent performance.

### Evidence quality

B+ — recent preprints with deterministic/synthetic ground truth, released evaluation structure, and controlled ablations; not yet peer-reviewed.

### BO comparison and gap

AIML-005 already evaluates BO finance agents and EV-009 protects evaluator integrity. The remaining gap is to score evidence retrieval independently from final-answer correctness so a lucky correct answer cannot be treated as an auditable diagnosis.

### Hypothesis — H-AIML005-EVIDENCE

On BO hidden tasks, final-answer accuracy overstates reliability when required evidence coverage is incomplete. A claim/evidence contract scored before reasoning will expose retrieval failures that answer-level scoring misses.

### Experiment — EXP-AIML005-EVIDENCE

Reuse AIML-005 hidden tasks. For a subset with deterministic evidence requirements, annotate minimum required evidence records/claims and admissible alternatives. Compare current retrieval against structured/relational retrieval where available while holding model, prompt, PIT snapshot and budget fixed.

Metrics:
- required-evidence recall/precision;
- evidence-contract exact match;
- final-answer accuracy conditional on complete vs incomplete evidence;
- correct-answer/incomplete-evidence rate;
- unsupported material-claim rate;
- retrieval-vs-reasoning failure attribution;
- latency, calls and cost per verified success.

Classification: TEST — AIML-005; REFERENCE — EV-007, EV-009, AIML-006.

No production behavior change.

## 3. Design/UX

A 2026 IEEE TVCG paper presents a general image-space method for uncertainty visualization, while a 46-study IEEE review finds uncertainty-aware decision support is strongest when uncertainty is integrated into decision logic and human oversight.

BO implication: retain D-005 progressive disclosure. Do not add a new visualization subsystem. Candidate UI test: surface semantic-vintage/retrieval warnings in the Why/Audit layers rather than cluttering the primary decision view.

Classification: REFERENCE — D-005.

## 4. Quantitative Finance

No new independent Quant ID is justified this cycle. The semantic-vintage finding is nevertheless relevant to Q-001/Q-002/EV-003/EV-005 because revised macro/reference inputs can alter calibration, execution assumptions and backtest statistics. Treat this as a data-validity prerequisite, not a new alpha method.

Classification: REVIEWED / REFERENCE ONLY.

## 5. Product / Competitor

CFA Institute's 2026 AI structural-change research emphasizes cognitive convergence, governance, judgment and accountability as AI becomes embedded in investment workflows. This supports AIML-007's common-mode dependency concern but is institutional risk framing, not performance evidence.

Classification: REFERENCE — AIML-007.

## 6. Evidence & Validation

The cycle strengthens the rule that a correct output is insufficient evidence. A valid BO result should preserve both:
1. semantic PIT integrity of the inputs; and
2. evidence sufficiency of the reasoning path.

No ADOPT/REJECT decision is made before experiments produce results.

## Traceability

Federal Reserve / FRED-ALFRED research
-> H-DI003-SEMANTIC
-> EXP-DI003-SEMANTIC
-> PENDING RESULT
-> future ADOPT / REJECT / REVISIT

FinRCA-Bench + supporting finance-agent benchmarks
-> H-AIML005-EVIDENCE
-> EXP-AIML005-EVIDENCE
-> PENDING RESULT
-> future ADOPT / REJECT / REVISIT

## Cycle decision

- New canonical IDs: 0
- New hypotheses: 2
- Experiments proposed: 2 amendments/extensions to existing harnesses
- ADOPT: 0
- REJECT: 0
- Production trading changes: 0

## Highest-priority next action

Keep EXP-DI001 + EXP-DI003 first. Add one semantic-vintage fault (stale schema/crosswalk applied to a frozen value snapshot) to the seeded KRX/PIT replay before expanding the agent evaluation lane. This converts the new research into executable evidence without creating another subsystem.
