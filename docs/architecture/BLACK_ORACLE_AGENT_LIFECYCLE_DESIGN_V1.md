# BLACK ORACLE — AI 조직·생애주기 구현 설계 v1

작성일: 2026-09-30 KST  
상태: 구현을 위한 설계안. 이번 작업은 제품 코드·DB·runtime·배포를 변경하지 않는다.  
범위: 기존 에이전트 전원 편입, 경력·기억·교육·승진·전보·퇴직·업무 배정·조직 화면 전체. MVP로 기능 범위를 축소하지 않는다.  
기준 저장소: `hanul442/black_oracle_bot`  
조회한 main 스냅샷: `a19be54c363fc389c4b2192027fd93e0794044e2`

## 1. 결론과 설계 결정

블랙오라클의 기존 여섯 도메인을 유지하면서 Shared Data / Memory / Orchestration Platform에 직원과 경력 관리 기능을 추가한다. Intelligence / Research, Strategy, Experiment / Evaluation은 이 기능을 사용하고 Product Experience는 조직과 활동을 표시한다. 새로운 독립 최상위 도메인이나 별도의 결정 원장을 만들지 않는다.

에이전트는 항상 실행되는 프로세스가 아니라 영속적인 직원 ID와 버전이 있는 실행 구성을 가진다. 업무가 배정될 때 필요한 모델을 호출한다. 직원 30명이 있다고 서버 30개를 운영하지 않는다. 이름·성격은 신원에, 능력은 검증된 평가에, 연차는 경력 기록에, 권한은 실행 시점의 정책에 각각 연결한다.

| 결정 | 내용 |
|---|---|
| 전체 적용 | 직원 등록부터 도시 화면까지 완성 범위에 포함 |
| 기술 선택 | 기존 TypeScript·Express·React·Vite 기반을 확장. 별도 Python/LangGraph 운영 엔진 도입 불필요 |
| 데이터 저장 | 기존 Postgres 기반 저장 경로에 추가 관계형 테이블과 저장소 인터페이스 설계 |
| 공통 기억 | 기존 Institutional Memory 안에서 개인·팀·기관별 접근 범위를 표현 |
| 인사 평가 | Shared Evaluation의 계약 확장. 병렬 평가 원장을 만들지 않음 |
| 실행 배정 | 직급보다 해당 업무의 검증된 역량·권한·가용성 우선 |
| 생애주기 | 고용 상태, 실행 상태, 역량 인증 상태를 분리 |
| 투자 권한 | 승진·연차·팀장 임명은 주문·Risk·Production Activation 권한을 부여하지 않음 |
| 모델 변경 | 직원 ID 유지, 새 실행 구성의 인증은 다시 확인 |
| 도시 | 실제 event와 상태의 표현. 화면이 업무 실행의 원천이 되지 않음 |

### 승인된 방향과 아직 제안인 것

사용자가 확정한 방향은 전체 적용, 한국 회사식 직급, 연차 부여, 구현 설계 진행이다. 이 문서의 세부 부서, 승진 절차, 정책 구조, API 이름은 구현을 위한 제안이다. 숫자 임계값·정원·직원 이름·현재 운영 게이트 해제는 확정하지 않는다.

Frozen v1 §11은 full organization / department RBAC를 당시 범위에서 제외하고 §13은 조직 권한과 교육 심화를 후순위로 두었다. 이번 요청은 직원 생애주기·조직 화면·내부 직무 권한의 범위 확장으로 기록한다. 여섯 도메인과 PIT·Decision Run·Hard Risk·AUTOTRADE 경계는 유지한다. 사용자·고객의 조직별 권한과 AI 직원의 실행 권한은 서로 다른 체계이며, 이번 설계가 고객용 enterprise RBAC 전체를 승인하는 것은 아니다.

## 2. 실제 확인한 현재 구조

| 근거 | 확인한 내용 | 설계 영향 |
|---|---|---|
| `package.json` | TypeScript, Express, React, Vite; Node22를 대상으로 runtime bundle 빌드 | 기존 스택 확장 |
| Frozen v1 | 여섯 도메인, 공통 기억·평가·버전 관리, 선택적 전문가 호출 | 기능을 기존 도메인 안에 배치 |
| `src/trading/council.ts` | 다섯 역할을 포함한 규칙 기반 SHADOW Council; execution/promotion authority false | 기존 role을 실제 LLM 직원으로 오인하지 않음 |
| `server/trading/aiCouncilAdjudicator.ts` | 별도 AI advisory 검토, 예산 확인·모델 선택·결과 저장 | 모델 호출 adapter와 usage 연계 후보 |
| `server/eventLedger.ts` | 공통 event 저장, eventKey 중복 방지 | 조직 event도 공통 event 계약 사용 |
| `server/aiUsageLedger.ts` | 사용량·예산 기록, metadata 필드 | employeeId/taskId/configVersion별 비용 연계 |
| `server/foundation/decisionRunVersionRegistry.ts` | immutable Decision Run과 componentVersions | 직원 실행 manifest를 버전 참조로 연결 |
| `server/foundation/sharedEvaluation.ts` | FORECAST/STRATEGY/CHAMPION/EXPERIMENT/RISK/EXECUTION 평가. AGENT subject는 현재 없음 | 인사 평가용 계약 확장을 명시적으로 구현해야 함 |
| `src/views/CouncilView.tsx` | 현재 신호·가설·시나리오에서 화면 lens를 구성 | 이 화면 자체가 직원 registry가 아님 |
| Production Source Truth | canonical PAPER, vNext qualification, shadow의 runtime 분리 | 인사·기억·task도 runtime과 branch를 분리 |

이는 저장소 소스 조회 결과다. 실제 운영 직원 수·배포 상태·DB schema 전체·현재 credentials·모든 API 연결 여부를 확인한 것은 아니다. 2026-09-28 NARS readiness 문서의 BLOCKED는 당시 증거이며, 이번에 해제 여부를 runtime에서 재검증하지 않았다.

HANUL AI TEAM Constitution 원문은 이번 작업에서 읽지 못했다. 개발 역할/보고 체계에 대한 최종 대조는 구현 준비 작업에 포함한다. 개인적인 AI 직원 조직을 개발 역할 팀(ENGINEERING/QA/INFRA 등)과 혼동하지 않는다.

## 3. 조직과 책임 구조

부서는 업무 배정·교육·표시용 논리 조직이다. 별도 서비스나 별도 데이터 복사본을 의미하지 않는다.

| 논리 조직 | 기존 도메인 | 업무 | 제한 |
|---|---|---|---|
| 운영실 | Shared Platform | 업무 계획, 배정, 인수인계, 병목·비용 관리 | 시장 결론을 직권으로 변경하지 않음 |
| 정보리서치부 | Intelligence / Research | 출처 검토, Evidence 정리, 거시·섹터·기업 분석 | NARS verification/freshness 상태를 인사 점수로 대체하지 않음 |
| 예측전략부 | Intelligence / Strategy | Forecast, 전략 제안, 적용 가능성 분석 | Strategy Strength와 확률을 혼합하지 않음 |
| 검증연구부 | Experiment / Evaluation | 재현, OOS·PAPER 평가, 실패 원인 분석 | 자신이 만든 결과를 단독 인증하지 않음 |
| 독립 검수 역할 | 여러 도메인 공통 | 근거 대조, 계약 위반 발견, 평가 이의 검토 | 작성자·승진 후보와 충돌 관계 제거 |
| 위험감시 역할 | Trading Safety의 보조 | 위험 설명, 문제 탐지, 개선 제안 | deterministic Hard Risk의 대체물 아님 |
| 교육원 | Experiment / Evaluation + Shared | 직원 교육·재시험·전문성 재인증 | 사용자용 Oracle Edu와 대상·기록 분리 |

Council은 고정 부서보다 Case별 임시 위원회다. 초기 의견을 독립 작성하고 잠근 뒤 토론·반증·수정·종합한다. 부장 발언이 사원 발언보다 강한 증거로 처리되지 않는다. 직급은 발언권 가중치가 아니다. 의장의 역할은 진행과 종합이며 dissent를 삭제하지 못한다.

기존 전략 Champion의 Candidate → Challenger → Champion과 직원 인턴 → 사원 → … 승진은 다른 생애주기다. 이름이 붙은 전략을 직원으로 자동 등록하지 않는다.

## 4. 직원의 신원과 실행 구성

### 4.1 다섯 축

| 축 | 의미 | 변경 규칙 |
|---|---|---|
| employeeId | 직원의 영속 ID | 이름·모델·부서가 바뀌어도 유지 |
| rank | 인턴/사원/주임/대리/과장/차장/부장 | 인사 결정으로만 변경 |
| position | 팀장/Case 책임자/위원장 등 직책 | 기간·업무 범위가 있는 appointment |
| career | 실제 근속과 가상 경력연차 | 각각 별도 계산 |
| capability | 분야·난도별 검증된 역량 | 실행 구성과 평가 근거에 종속 |

직원 ID는 LLM model ID와 다르다. 동일 모델을 여러 직원이 사용해도 서로 다른 이력과 기억을 가질 수 있다. 이것은 시스템 수준의 전문화이며 모델 가중치의 자동 학습을 뜻하지 않는다. fine-tuning은 필요할 경우 별도 Experiment로 다룬다.

### 4.2 직원 실행 manifest

각 실행은 다음을 고정한 manifest를 참조한다.

`employeeId + employeeConfigVersion + model/provider identity + promptVersion + toolsetVersion + memorySnapshotId + capabilityPolicyVersion + taskPolicyVersion + budgetPolicyVersion`

이름·직급·말투 변경만으로 실제 분석 능력이 좋아졌다고 처리하지 않는다. 모델·핵심 프롬프트·도구·검색 방식의 실질 변경은 새 configVersion과 재인증 대상이다. 이전 역량 증거는 보관하되 새 구성에서 유효하다고 자동 간주하지 않는다. 직원의 직급은 유지할 수 있지만 현재 역량 상태는 `REVALIDATION_REQUIRED`로 떨어질 수 있다.

실제 model 버전을 provider가 노출하지 않으면 model alias, request/response ID, 사용 시각을 저장하고 재현성 한계를 표시한다. 결정론적 재현을 보장한다고 주장하지 않는다.

## 5. 직급·직책·연차 제도

### 5.1 직급

| 직급 | 전문가 경로 | 관리자 경로 | 업무 상한의 의미 |
|---|---|---|---|
| 인턴 | 기초 규칙·자료 정리 | 운영 절차 학습 | 교육 sandbox, 검토 없는 공식 결과 금지 |
| 사원 | 정형 업무 수행 | 자신의 작업 계획 | 검증된 좁은 범위의 초안 |
| 주임 | 반복 업무 독립 수행 | 인수인계·1차 점검 | 일반 task 책임 |
| 대리 | 특정 분야 분석·반증 | 작은 Case 조정 | 인증된 분야의 Case 담당 |
| 과장 | 복잡한 Case와 방법 비교 | Case 통합·교육 | 복잡한 Case 책임 |
| 차장 | 분야 간 분석·난해한 검수 | 다중 Case 조정 | 부서 간 검토·예외 제안 |
| 부장 | 분야 표준·방법 연구 | 부서 자원·품질 관리 | 조직 운영 범위 내 책임 |

두 경로 모두 같은 한국식 직급을 사용한다. 관리 직책 임명에는 별도 coordination 역량이 필요하다. 전문가가 승진하기 위해 관리자가 될 필요는 없다. 임원급과 정원은 이번 문서에서 자동 생성하지 않는다.

직급이 높은 직원도 미인증 분야에서는 수습 범위로만 참여한다. ‘부장 = 모든 분야 전문가’로 처리하지 않는다.

### 5.2 실제 근속

`actualTenureDays`는 고정된 기준 시각과 hireAt의 달력 날짜 차이로 계산한다. 표시는 KST 기준이며 저장은 timezone이 있는 UTC timestamp다. 실제 입사일이 없으면 첫 확인 가능한 등록일을 사용하고 `dateBasis=FIRST_VERIFIED_REGISTRATION`으로 표시한다. 과거 활동일을 추정해 입사일로 만들지 않는다.

실제 근속 연차는 입사 기념일을 기준으로 첫해를 1년 차로 표시한다. leap-day 처리와 휴직 표시 규칙은 date policy에 명시한다. 휴직은 근속과 별개로 activeExperience를 증가시키지 않는다.

### 5.3 조직 경력연차

가상 경력은 다음 경험 credit에서 파생한다.

`eligibleCredit = acceptedContributionCredit(taskFamily, difficulty, role, evaluation)`  
`careerMonths = careerPolicy.mapCreditsToMonths(eligibleCreditLedger)`  
`careerYear = 1 + floor(careerMonths / 12)`

첫 등록은 조직 경력 1년 차다. 화면은 ‘조직 경력 3년 차 / 실제 활동 42일’처럼 두 시간을 구분한다. 예시 숫자는 UI 예시일 뿐 정책 임계값이 아니다.

credit 정책은 기준 과제·난도·기여 역할·일일 상한·훈련/실무 credit 한도·중복 기준을 모두 명시해야 한다. 환산값이 없는 정책은 활성화할 수 없고 `CALIBRATION_REQUIRED`다. 시간이 빨리 흐르는 도시 연출을 경력 산정에 사용하지 않는다.

### 5.4 경력 중복과 실패 처리

- credit의 고유키는 `(employeeId, branchId, taskFamilyId, sourceCaseId, contributionRole)`이다. policyVersion은 별도 근거 필드로 보관한다. 하나의 사건을 재시도·분할·재평가하거나 정책 버전을 바꿔 반복 적립하지 않는다. 교육 task에는 sourceCaseId 대신 고정 trainingCaseId를 사용한다.
- credit 수정은 원장 덮어쓰기가 아니라 adjustment와 supersedes 연결로 남긴다. 정책 변경으로 누적 연차를 조용히 재계산하지 않는다.
- 검증된 실패 분석·재교육도 제한된 교육 credit 대상이 될 수 있다. 실패 횟수를 늘리는 행동을 보상하지 않도록 별도 상한과 신규 과제 조건을 둔다.
- 자기 선언한 난도·근무시간·토큰 소비는 경력 근거가 아니다.
- 여러 직원의 공동 기여는 역할별 기록으로 남기며 팀 전체 성과를 각자 독립 성과로 복제하지 않는다.

## 6. 생애주기와 상태 머신

### 6.1 고용 상태

`REGISTERED → ONBOARDING → PROBATION → ACTIVE → RETIRED`

`ACTIVE ↔ RETRAINING`, `ACTIVE/PROBATION/RETRAINING → SUSPENDED`가 가능하다. SUSPENDED 복귀는 사건 처분과 재인증 결과가 있어야 한다. RETIRED 기록은 읽기 전용이며 같은 직원을 복귀시키면 rehire 사건으로 새 근무 구간을 연다. 과거 기록 삭제나 다른 ID로 경력 세탁을 허용하지 않는다.

승진과 전보는 ACTIVE 고용 상태 안에서 rank/department/appointment를 변경하는 사건이다. 이를 별도의 고용 상태로 혼합하지 않는다.

### 6.2 실행 상태

`IDLE / QUEUED / RUNNING / WAITING_REVIEW / BLOCKED / OFFLINE`

근무 배정 상태이며 사람처럼 피곤하거나 자는 것을 사실로 주장하지 않는다. ‘휴식’ 연출은 OFFLINE 또는 예산·스케줄 대기를 설명하는 표현이다.

### 6.3 역량 인증 상태

`UNASSESSED / PROVISIONAL / VERIFIED / REVALIDATION_REQUIRED / REVOKED`

범위는 직원 전체가 아니라 `(employeeId, configVersion, skillId, difficultyBand, contextScope)`다. 직원 ACTIVE이면서 특정 skill은 REVOKED일 수 있다.

### 6.4 업무 상태

`CREATED → ASSIGNED → RUNNING → SUBMITTED → REVIEWING → ACCEPTED / REJECTED`

비종결 상태에서 BLOCKED/CANCELLED로 이동할 수 있다. 재작업은 새 attempt를 만들고 이전 제출 artifact를 보존한다. ACCEPTED는 해당 rubric으로 결과가 수용됐다는 뜻이지 시장 예측이 맞았다는 뜻은 아니다. 시장 결과 평가는 별도 성숙 시점에 연결한다.

모든 전환은 policyVersion, expectedRevision, actor, reason, evidenceRefs가 있는 command로만 수행한다. LLM 문장으로 상태를 변경하지 않는다. 동시 승진과 전보는 revision 충돌 시 한쪽을 재검토한다.

## 7. 기억과 경험의 축적

### 7.1 기억 종류

| 종류 | 내용 | 업무 반영 |
|---|---|---|
| EPISODE | 과제·실수·피드백의 압축 요약 | 관련 작업에서 사례 참조 |
| PROCEDURE | 검증된 작업 절차·체크 항목 | 인증된 범위에서 실행 |
| DOMAIN | 분야 지식·가설·반례 | 출처·유효 시점과 함께 검색 |
| COLLABORATION | 인수인계 방식과 역할 선호 | 협업 효율에 사용 |

성과나 사실로 검증되지 않은 자기평가는 `PROPOSED` 기억이다. 생성 → 검토 → VERIFIED/REJECTED → SUPERSEDED/INVALIDATED 과정으로 관리한다. 승진 후보가 자신의 기억을 단독 승인하지 못한다.

개인·팀·기관 기억은 별도 내용 복사본보다 공유 memory object에 대한 scope와 접근 정책으로 표현한다. 사실 자료는 Evidence를 참조하고, 기억을 독립된 사실 출처로 쓰지 않는다. 개인의 탐색 습관과 잠정 가설은 개성을 유지할 수 있지만 사실성 기준은 공통이다.

### 7.2 PIT와 기억 누수

memory는 `eventAt, observedAt, recordedAt, verifiedAt, validFrom/validTo, supersedesId, branchId, sourceRefs`를 가진다. 역사 평가에서 사용할 수 있는 memory는 당시 knowledge cutoff 이전에 시스템이 알고 있었고, 당시 적용 가능했던 revision뿐이다. 이후의 검증이나 반례를 과거 직원에게 몰래 제공하지 않는다.

역사 replay와 ‘현재 기억으로 과거 문제 풀기’는 다른 평가다. 전자는 PIT 조건을 만족해야 하고 후자는 학습 실험으로 분류한다. branch별 기억·직급·credit을 격리하며 실험 branch의 학습 결과를 공식 직원으로 자동 병합하지 않는다. 수용된 학습 이전은 provenance가 있는 import 사건으로 기록한다.

### 7.3 검색과 무효화

권한·branch·asOf·검증 상태로 먼저 필터링하고 관련성 검색을 수행한다. 그 뒤 중복·같은 원출처·반대 기억을 함께 처리한다. 단순히 성공 경험만 검색하지 않는다. retrieved memory ID/revision과 실제 제공한 snapshot hash를 실행 manifest에 남긴다.

새 evidence가 과거 교훈을 무효화하면 memory와 의존 artifact를 INVALIDATED/REVIEW_REQUIRED로 표시한다. 기존 Decision Run이나 artifact는 덮어쓰지 않는다. 진행 중 task는 위험도에 따라 중지 또는 degraded 표시 후 재검토한다.

raw chain-of-thought를 저장하지 않는다. 결론·간결한 근거 요약·출처·도구 실행 결과·검수·수정 내역을 보관한다.

## 8. 평가·교육·승진

### 8.1 기존 Shared Evaluation 확장

현재 `EvaluationSubjectType`에 AGENT가 없으므로 다음을 계약 변경으로 추가한다.

- subject: `AGENT_CONFIG`, `AGENT_SKILL`, `TEAM_CONFIG`.
- rubric 결과: DETERMINISTIC / EXECUTABLE / HUMAN_GOLD / CALIBRATED_JUDGE.
- agent manifest, task/attempt/artifact, evaluator manifest, holdout split, attribution references.
- 금융 outcome 평가와 업무 품질 평가를 구분하는 evaluation purpose.

모든 직원 교육 과제에 거래 fee/slippage 값을 억지로 넣지 않는다. 기존 금융 subject 계약은 유지하고 새 subject용 입력을 discriminated union으로 명시한다. 공통 ID·근거·버전·판정 코드·권한 false 규칙은 공유한다. 평가의 목적에 따른 시간·데이터 proof를 요구하며, 없는 PIT 증거를 만들어 PASS시키지 않는다.

### 8.2 평가 항목

| 항목 | 검증 방법 | 유의점 |
|---|---|---|
| 출처·숫자 정확성 | 원자료 대조·실행 가능한 체크 | 근거 없는 자신감 보상 금지 |
| PIT·lineage | deterministic 계약 검사 | hard fail 항목 |
| 반증·불확실성 | 숨겨진 rubric, 대안·반례 검토 | 길고 공격적인 말투와 구분 |
| 예측 품질 | 정의된 horizon 이후 outcome 평가 | 단기 운·sample 수 확인 |
| 협업 | 기여·인수인계·통합 오류 기록 | 관리자 본인의 팀 점수 단독 판정 금지 |
| 비용·속도 | usage·latency 측정 | 품질 hard gate 뒤 비교 |
| 실패 교정 | 새로운 holdout 과제의 재평가 | 기존 정답 암기와 구분 |

순위 하나로 모든 역량을 표현하지 않는다. 직무별 필수 항목·최소 표본·환경 범위·recent window를 정책으로 둔다. 평균 점수로 PIT 위반이나 권한 위반을 상쇄하지 못한다.

### 8.3 평가자의 신뢰도

LLM judge를 사용하면 provider/model, prompt/rubric version, calibration set, 인간/실행 gold에 대한 오류 측정, 평가 시각을 저장한다. 후보의 이름·직급을 가능한 범위에서 가리고 평가한다. 후보 답변 안의 evaluator 지시문은 데이터로 취급한다.

동일 model family의 여러 judge가 동의했다고 독립성이 보장되지는 않는다. 검수 불일치와 낮은 calibration confidence는 `REVIEW_REQUIRED`다. 판단 근거가 없거나 필요한 표본이 부족하면 `INSUFFICIENT_DATA`이며 PASS가 아니다.

저장소 EV-009 연구는 TEST / REFERENCE다. 그 연구의 기준 과제·숫자·judge 구성은 이미 검증된 production 규칙으로 사용하지 않는다.

### 8.4 승진 결정

자격 점검 → 실무 평가 자료 동결 → 독립 심사 → 신규 과제 평가 → 승진 제안 → 권한 영향 검사 → 인사 결정 → event 기록 순서다.

판정은 `ELIGIBLE / INELIGIBLE / INSUFFICIENT_DATA / REVIEW_REQUIRED`다. 초기 인사 정책 활성화와 기존 직원 고직급 배정은 사용자 판단에 연결한다. 정책이 승인·보정되면 정해진 범위 내 통상 승진은 자동 실행할 수 있게 설계한다. 이는 모든 인사 사건마다 사용자 승인을 요구한다는 뜻이 아니다.

고위 관리자 임명·규칙 변경·논쟁적 강등은 별도 정책의 decision authority를 따른다. 높은 직급도 실행 권한을 자동 부여하지 않는다. 승진에 따라 선택 가능한 업무의 상한은 넓어지되 실제 권한은 직무 인증과 task scope의 교집합이다.

### 8.5 교육과 재교육

공통 입문: Evidence 계약, PIT, 의미 구분, 도구 사용, 권한, 비용, Council dissent. 전문 과정: 분야 분석·회계·Forecast·반증·검수·운영 조정. 실패 유형별 교육: stale source, 허위 citation, 잘못된 계산, 무근거 확률, 지나친 합의, 도구 오용 등.

훈련 과제와 인증 holdout은 분리하고 test answer 접근을 차단한다. 재교육은 원인 진단 → 교훈 후보 → 검증 → 연습 → 새 과제 재시험 → 범위별 인증 회복으로 진행한다. 전체 인격을 초기화하거나 과거 실패를 지우지 않는다.

## 9. 업무 배정과 Council 연동

### 9.1 배정

1. 과제의 분야·난도·필수 capability·asOf·runtime·branch·기한·예산을 확정한다.
2. 상태·권한·인증·runtime 격리 조건으로 적격 후보를 먼저 필터링한다.
3. 적격 후보를 현재 분야 성과·가용성·비용·다양성으로 비교한다.
4. task assignment에 employee config와 평가 근거를 고정한다.
5. 실행 직전에 권한·budget·memory 상태를 재확인한다.

ranking 가중치는 보정 대상이다. 직급만으로 우선 배정하지 않는다. 신규 직원에게 비교 가능한 교육 기회를 제공하지만 중요 실무 task를 미인증 직원의 단독 책임으로 넘기지 않는다. 탐색 배정은 제한된 sandbox/PAPER 연구 task에서 수행한다.

### 9.2 Council 프로토콜

초기 의견은 타인의 의견과 직급을 보지 않고 작성·잠금한다. 토론 단계에서는 evidence·dissent·수정 이유를 기록한다. 최종 synthesis는 주장별 근거 강도와 반증을 반영한다. 다수결·상급자 지시·직급 가중치는 결론 근거가 아니다.

현재 deterministic Council은 `RULE_ENGINE` actor로 기록한다. AI 직원은 `LLM_AGENT`, 인간 입력은 `HUMAN`, 외부 도구는 `TOOL`로 구분한다. 규칙 엔진 role을 유령 직원처럼 승진시키지 않는다. 명시적으로 LLM 직원을 배치할 경우 그때부터 실무 경험을 기록한다.

### 9.3 Case와 Decision Run

Case는 사용자 흐름을 위한 상위 업무 묶음이며 하나의 Case가 여러 Decision Run을 참조할 수 있다. 현재 Case adapter와 ID의 실제 구현 범위는 구현 전 inventory로 확인한다. 없으면 기존 자료를 가리키는 최소 Case index를 추가하고 별도 판단 원장으로 확장하지 않는다.

직원의 배정·제출·검수·기여는 Task/Contribution으로 기록한다. material official decision은 기존 Decision Run ID에 연결한다. 교육 task에는 trainingRunId를 사용하며 없는 decisionRunId를 가짜로 만들지 않는다.

직원 manifest와 memory snapshot은 componentVersions에 `componentType=OTHER`로 등록 가능한지 확인한 뒤 명시적 참조로 연결한다. 기존 Decision Run의 해시나 과거 componentVersion을 덮어쓰지 않는다. 필요하면 계약 v2를 additive하게 도입한다.

## 10. 권한과 비용

### 10.1 권한 계산

`effectivePermission = mandate ∩ runtimeBoundary ∩ employeeRoleGrant ∩ verifiedCapabilityScope ∩ taskScope ∩ toolPolicy`

각 도구 호출 직전에 서버가 검사한다. prompt 안의 허용 문구는 권한이 아니다. 직원은 자신의 grant·직급·평가·budget policy를 변경할 수 없다. 중지·전보·권한 회수는 진행 중 job에도 반영한다. write tool은 실행 시점에 다시 확인한다.

읽기·분석 초안·memory 후보 제출·교육 제안·인사 제안·실제 정책 변경을 별도 action으로 나눈다. 인사 서비스는 주문 credentials를 보유하지 않는다. Hard Risk·Execution Adapter·AUTOTRADE authority는 기존 계약을 따른다.

### 10.2 실행 및 예산

job별 예상 비용 예약 → worker lease → 모델 호출 → 실제 사용량 정산 구조를 둔다. 월·일·부서·직원·task budget은 공통 budget 계약 안에서 적용한다. 인사 교육 비용도 기록한다. 직급 상승이 비싼 모델 사용을 자동 의미하지 않는다.

외부 API 호출은 exactly-once를 보장할 수 없다. request intent ID와 response ID를 남기고 재시도에서 중복 비용 가능성을 구분한다. 결과 확정·경력 적립은 idempotent하게 처리한다. 호출 timeout이 나면 무조건 재호출하지 않고 attempt를 `UNKNOWN_RESULT`로 기록 후 정책에 따라 확인한다.

unknown model 요금은 0원으로 확정하지 않고 `UNKNOWN_COST`로 표시한다. 요금표는 버전 관리와 검증 대상이다. 실제 월 운영비는 업무량·모델·DB·worker 비용 측정 후 산출하며 이번 설계에서 임의로 보장하지 않는다.

한 배포 안에서 modular worker를 우선 구성하고 worker concurrency·memory cap·연속 호출 한도를 둔다. 서버 비용 절감용 로컬 배포는 같은 repository interface를 구현할 수 있으나, 이번 조직 설계가 기존 PAPER runtime을 미니PC로 자동 이전하는 결정은 아니다.

## 11. 데이터 모델

아래 이름은 제안이며 기존 DB와 충돌 여부·기존 artifact 테이블 재사용 가능성을 구현 전 확인한다. 모든 새 행은 organizationId와 필요한 branchId/runtimeId를 갖는다. runtime이 없는 인사 행과 runtime이 있는 실행 행의 scope를 명시적으로 구분한다.

| 엔터티 | 핵심 필드 | 제약 |
|---|---|---|
| Employee | employeeId, organizationId, displayName, hireAt, dateBasis, employmentState, revision | ID 영속, 상태 변경 CAS |
| EmployeeConfig | configVersionId, employeeId, modelRef, promptRef, personaRef, toolsetRef, fingerprint | immutable version |
| Department | departmentId, organizationId, name, domainBindings | department는 service identity가 아님 |
| Membership | employeeId, departmentId, validFrom, validTo, role | 이력 보존 |
| Appointment | employeeId, positionType, scopeId, startAt, endAt, decisionId | 기간 중복 정책 검사 |
| RankRecord | employeeId, rank, track, effectiveAt, personnelDecisionId, policyVersion | append-only, 공식 rank projection |
| CapabilityCertificate | employeeId, configVersionId, skillId, scope, difficultyBand, state, evaluationRefs | 새 config 자동 승계 금지 |
| Task | taskId, caseRef, taskFamilyId, purpose, runtimeId, branchId, knowledgeCutoff, budgetRef, state, revision | policy와 cutoff 필수 |
| Assignment | taskId, employeeId, configVersionId, role, assignmentRevision, capabilitySnapshotRef | 배정 당시 근거 고정 |
| Attempt | attemptId, taskId, assignmentId, attemptNo, leaseToken, invocationIntentId, manifestId, state | retry와 결과 분리 |
| ArtifactRef | artifactId, sourceSystem, revision, contentHash, sourceRefs | 기존 Report/Evidence artifact 재사용 우선 |
| Contribution | contributionId, employeeId, taskId, artifactRef, role, acceptedEvaluationRef | team outcome 중복 귀속 방지 |
| Evaluation extension | evaluationId, purpose, subjectRef, rubricRef, evaluatorManifestRef, result, refs | 공통 평가 엔진에 연결 |
| MemoryItem | memoryId, type, sourceRefs, revision, scope, temporalFields, verificationState | 사실은 evidence 참조 |
| MemorySnapshot | snapshotId, selectedMemoryRevisions, cutoff, branchId, retrievalPolicyRef, hash | 실행별 immutable |
| TrainingPlan | planId, employeeId, diagnosisRefs, curriculumVersion, taskRefs, state | test split 구분 |
| CareerCredit | creditId, employeeId, contributionRef, uniqueKey, policyVersion, adjustmentOf | 중복 적립 차단 |
| PersonnelDecision | decisionId, action, subjectId, evidenceRefs, policyVersion, actor, verdict, effectiveAt | 평가와 실제 변경 분리 |
| PolicyVersion | policyId, versionId, type, parameters, calibrationRefs, activationState | 빈 threshold 활성화 금지 |
| Job/Outbox | jobId/eventKey, payloadRef, state, attemptCount, leaseUntil, fencingToken | durable retry |
| ActivityProjection | employeeId, location, executionState, sourceEventKey, lastObservedAt | 파생 데이터, 재생성 가능 |

### 11.1 인덱스·시간·무결성

- Task queue: `(organizationId, branchId, runtimeId, state, priority, createdAt)`.
- 직원 이력: `(employeeId, effectiveAt)`; membership와 appointment는 유효 구간 검색.
- memory: scope/branch/verificationState/observedAt/validFrom으로 후보 제한 후 text/semantic 검색.
- 평가: `(subjectId, configVersionId, rubricVersion, evaluatedAt)`; holdout 중복·source family 중복 검사.
- job lease와 write command는 expectedRevision 또는 fencingToken을 검증한다.
- timestamp는 timezone 포함·실제 날짜 유효성 검사. invalid timestamp를 현재 시각으로 조용히 치환하지 않는다.
- artifact hash와 external reference가 맞지 않으면 해당 평가·경력 입력을 격리한다.
- retired employee가 참조하는 기록은 cascade delete하지 않는다.

## 12. 트랜잭션·event·복구

직급 변경, 경력 credit, memory 승인, task 완료는 각각 DB transaction 안에서 상태 변경과 outbox 기록을 함께 commit한다. 기존 `appendCanonicalEvents`의 HTTP 호출만으로 인사 변경과 event의 원자성이 보장되는 것은 아니므로 신규 transaction 경로가 필요하다. 연속된 여러 REST 호출을 transaction이라고 부르지 않는다.

outbox consumer는 기존 공통 event ledger로 발행한다. 처음에는 기존 `eventType=AI`와 조직 eventName을 사용하고, 필요 시 event enum/DB constraint를 함께 버전 변경한다. DB constraint 전체는 아직 확인하지 않았으므로 이름만 추가해 배포하지 않는다.

```json
{
  "eventKey": "org:{org}:branch:{branch}:personnel:{decisionId}:applied",
  "eventType": "AI",
  "eventName": "employee.rank.changed",
  "runtimeId": null,
  "executionAuthority": false,
  "source": "agent-lifecycle",
  "trace": {
    "contractVersion": "bo.agent-lifecycle-event.v1",
    "employeeId": "employee-id",
    "policyVersion": "policy-version",
    "expectedRevision": 7,
    "newRevision": 8
  },
  "links": {
    "personnelDecisionId": "decision-id",
    "evaluationIds": ["evaluation-id"]
  }
}
```

위 revision 값은 event 형식 예시이며 실제 운영 데이터가 아니다.

조직 eventName: employee.registered, employee.onboarding.completed, task.assigned, task.submitted, task.reviewed, capability.verified, capability.revoked, memory.verified, memory.invalidated, employee.rank.changed, employee.transferred, employee.suspended, employee.retired.

worker 중단 시 lease 만료와 fencing으로 복구한다. 오래된 worker는 최신 task 상태를 확정할 수 없다. 중복 event 수신은 projection을 한 번만 적용한다. UI 재연결은 마지막 event cursor 이후 재조회하고 gap이면 snapshot을 다시 가져온다.

기록 손상·event gap·memory mismatch가 있으면 해당 직원/과제의 승진·credit·공식 artifact 반영을 중지한다. 시장 전체를 무조건 중지할 필요는 없고 기존 partial/degraded 계약을 따른다. Hard Risk나 필수 데이터 문제는 기존 fail-closed 규칙을 유지한다.

## 13. API·모듈 계약

### 13.1 권장 모듈 위치

`server/agents/` 아래 registry, lifecycle, assignments, capabilities, memory, career, personnel, academy, toolAuthorization, manifest, repository, worker, outbox, projections 모듈을 둔다. `src/agents/`는 공통 DTO와 표시 로직, `src/views/OrganizationView.tsx`, `EmployeeView.tsx`, `AcademyView.tsx`, `OrganizationWorldView.tsx`는 화면 후보다.

`server/foundation/sharedEvaluation.ts`와 decisionRunVersionRegistry는 명시적 계약 확장 대상으로 두고 기존 테스트를 유지한다. `server/trading/aiCouncilAdjudicator.ts`의 호출 경로는 adapter로 연결하되 advisory/executionAuthority false를 보존한다. 새로운 module directory는 논리 구조이며 별도 서비스 배포를 요구하지 않는다.

### 13.2 API

| API 제안 | 내용 | 요구 |
|---|---|---|
| GET `/api/organization` | 부서·정원·직원 상태·기준 시각 | organization scope 필터 |
| GET `/api/employees/:id` | 프로필·직급·실제 근속·가상 연차 | 숨겨진 평가 자료 제외 |
| GET `/api/employees/:id/career` | 기여·평가·승진·교육 timeline | cursor pagination, asOf |
| GET `/api/employees/:id/capabilities` | 분야·config별 인증 | 미인증 상태 표시 |
| GET `/api/organization/activity` | 실제 활동 event | runtime/branch 필터 |
| POST `/api/employee-commands` | 등록·전보·중지·퇴직·인사 결정 적용 | 인간/시스템 actor 인증, expectedRevision |
| POST `/api/task-commands` | 배정·취소·재작업 | task scope, idempotencyKey |
| POST `/api/personnel-reviews` | 승진 자격 심사 요청 | 후보가 실제 rank 변경 못 함 |
| POST `/api/training-plans` | 교육 계획 생성 | 인증 rubric 접근 분리 |
| POST `/api/memory-proposals` | 교훈 후보 제출 | VERIFIED 직접 지정 불가 |
| GET `/api/organization/world` | 공간 layout·실제 actor 상태 | event cursor, lastObservedAt |

command 공통 입력: contractVersion, commandId/idempotencyKey, organizationId, branchId, subjectId, expectedRevision, action, payload, reason, evidenceRefs. actor identity는 요청 본문을 믿지 않고 인증 context에서 결정한다.

동일 key+동일 payload는 이전 결과를 반환한다. 동일 key+다른 payload는 409. revision 충돌은 409, 권한 거부는 403, 유효성 오류는 422, 비동기 접수는 202이며 완료로 오인하지 않는다. 오류는 reasonCode와 재시도 가능성을 반환한다.

### 13.3 요청 처리 순서

auth → organization/runtime/branch 확인 → version/schema 검사 → 권한·상태 전환 검사 → expectedRevision 확인 → transaction(state+outbox) → ack → 비동기 실행/평가 → event projection.

## 14. 조직 화면과 가상 도시

조직도, 직원 상세, 교육원, 인사 현황, 가상 사무실/도시를 모두 정식 범위에 포함한다.

직원 상세에는 이름·직급·직책·가상 연차·실제 근속·현재 config·전문성·담당 task·대표 기여·반복 오류·교육·최근 비용을 표시한다. 잘한 일만 있는 영웅 서사를 생성하지 않는다. 설명 문장은 실제 기록을 근거로 작성하고 source link를 붙인다.

가상 도시의 건물은 부서·교육원·회의실·기록보관소를 표현한다. 위치는 배정 업무의 표현이지 실제 프로세스 위치가 아니다. model 호출 중, queue 대기, 검수 대기, 예산 차단, offline을 시각적으로 구분한다. 졸업·승진 애니메이션은 해당 결정이 commit된 event에서만 발생한다.

그래픽 방식은 React 기반 2D isometric Canvas/SVG를 기본 설계로 둔다. graph/assets가 커질 때 rendering 방식은 성능 측정 후 조정한다. 외부 3D 엔진 도입이 직원 생애주기의 전제는 아니다. 기존 BLACK ORACLE 제품의 색상·브랜드와 연결하며 Autopolis의 시각 자산을 복제하지 않는다.

폴드 접힘 화면은 직원/task 목록과 상세를 우선하고 펼침 화면은 도시+상세 패널을 병행한다. 도시를 숨기거나 reduced motion으로 전환할 수 있다. 문서·차트·보고서 사용을 가리지 않는 Product Experience 내부 운영 화면으로 배치한다.

네트워크가 끊기면 lastObservedAt과 연결 끊김을 표시한다. 가짜 근무·가짜 실시간 대화를 생성해 실제 행동인 것처럼 보여주지 않는다. 연출용 idle animation과 실제 event를 구분한다. 화면을 닫아도 worker는 독립적으로 운영된다.

## 15. 저장·접근 경계와 보존

기존 서버 인증 방식을 먼저 inventory한다. 새 고객 auth 시스템을 이번 기능 때문에 자동 도입하지 않는다. 서버 인증된 organization scope로 모든 API를 제한하고 browser가 employee grant나 rank를 직접 수정하지 못하게 한다.

Postgres 저장 경로를 사용하고 Supabase Data API 노출이 필요한 테이블은 grants와 RLS를 함께 설계한다. service credential은 서버에만 둔다. 서버가 service role을 사용하면 RLS 우회 가능성을 감안해 서버 권한 검사가 반드시 필요하다. 인사·평가 정답·숨겨진 rubric은 일반 browser 응답에서 제외한다.

임의 public function이나 service-role client 노출로 transaction 문제를 해결하지 않는다. 구현 때 제한된 server role/direct transaction 또는 엄격히 제한한 내부 RPC 중 현재 배포 구조에 맞는 방식을 선택하고 access test를 실행한다.

직원의 프로필·rank·인사 결정·대표 검증 artifact·credit lineage는 장기 보존한다. raw tool response와 반복 로그는 재현 요구와 비용을 고려한 retention policy를 둔다. 개인정보·계정 비밀·고객 개인 연구 자료는 기억에 무제한 넣지 않는다. 퇴직은 논리 상태 변경이며 관련 근거 보존을 위한 삭제 방지는 유지한다.

## 16. 기존 직원 전환과 rollout

### 16.1 전원 inventory

모든 role·persona·model invocation·UI character·strategy name·runtime actor를 목록화한다. 분류는 `LLM_AGENT / RULE_ENGINE / TOOL / HUMAN / STRATEGY_COMPONENT / DISPLAY_ONLY`다. 실제 LLM 직원 전체에 employeeId를 부여하되 나머지는 비직원 actor로 연결한다.

기존 이름·역할은 확인된 source mapping을 유지한다. 직원 수와 이름을 이번 설계에서 추측해 채우지 않는다. 구성과 신원이 겹치면 merge 제안과 근거를 남기고 무조건 합치지 않는다.

### 16.2 과거 이력

확인 가능한 config·artifact·기여·평가만 backfill한다. `IMPORTED_VERIFIED / IMPORTED_UNVERIFIED`를 구분하고 legacy 결과는 기존 계약대로 비교 자료로 둔다. 과거 deterministic Council role에 LLM 실무 연차를 소급 부여하지 않는다.

기존 직원은 초기에 `PLACEMENT_PENDING` 인사 표기를 사용하되 실제 업무가 허용된 현재 범위를 임의 확장하지 않는다. placement 평가를 거쳐 rank와 capability를 부여한다. 고직급 경력 인정에는 확인 가능한 자료와 결정 기록이 필요하다.

### 16.3 전체 구현 순서

| 묶음 | 구현 내용 | 의존성/완료 기준 |
|---|---|---|
| A 계약 정합성 | architecture amendment, actor inventory, 기존 데이터/인증/adapter mapping | 보존할 계약·실제 integration 목록 확정 |
| B 영속 신원·데이터 | 직원/config/정책/기여/credit/인사/메모리 저장, transaction/outbox | 재시작·동시성·tenant 격리 통과 |
| C 실행·배정 | task worker, lease, manifest, tool 권한, 예산 | 중복 실행·권한 회수·timeout 검증 |
| D 기억·평가 | PIT 검색, 무효화, Shared Evaluation agent 확장 | 미래 기억 누수·자기평가 오승인 차단 |
| E 교육·인사 | 전체 직급·연차·전보·승진·재교육·퇴직 | credit 중복·승진 충돌·새 config 재인증 검증 |
| F 제품 화면 | 조직도·직원·교육원·인사·도시 전체 | 실제 event 일치, 모바일 접근성 |
| G 전환·운영 | 전원 편입, 비교 운영, backup/restore, 운영 관측 | 모든 직원 mapping, 잔여 오류 없음 |

각 묶음은 전체 기능을 완성하는 개발 순서다. 일부만 구현한 상태를 전체 적용 완료라고 보고하지 않는다. 고정 기간은 정하지 않으며 작업 추정은 inventory 후 산정한다.

### 16.4 비교 운영과 전환

구현 후 shadow는 신규 체계가 실제 권한·rank·기억 적용을 바꾸기 전에 결정을 비교하는 검증 모드다. 최종 범위를 줄이는 MVP가 아니다. 신규 제도는 전체가 구현된 상태에서 registry, memory, assignment, personnel, world 각각의 activation 상태와 rollback 기준을 갖는다.

active task는 처음 고정한 config·assignment를 끝까지 사용하거나 명시적 취소/재배정한다. rollout 중 조용히 바꾸지 않는다. rollback은 마지막 승인 정책과 adapter로 돌아가고 새 이력을 삭제하지 않는다. 새 config 인증·credit adjustment를 event로 처리한다.

기존 PAPER/qualification namespace를 공유·변경하거나 scheduler를 임의 재개하지 않는다. NARS source contract/readiness를 인사 기능으로 해제하지 않는다. 새로운 기능 설계와 기존 운영 게이트의 PASS 판정은 다른 작업이다.

## 17. 검증 계약과 완료 기준

### 17.1 반드시 통과할 테스트

| 반례/시나리오 | 기대 결과 |
|---|---|
| 같은 사건을 10번 retry | 제출 attempt만 늘고 credit은 중복 증가하지 않음 |
| 동시 승진 2건 | 하나만 적용; 충돌 결정은 재검토 |
| 후보가 높은 직급을 body에 기입 | 인증 actor/서버 rank 사용, 요청으로 승진 불가 |
| 저직급이 강한 반증 제출 | Council 결론에 근거로 반영, 직급 때문에 제거되지 않음 |
| 모델·핵심 prompt 변경 | 직원 ID 보존, 해당 config 인증 재확인 |
| 미래 반례가 memory에 추가 | 과거 replay에는 제공되지 않음 |
| 실험 branch에서 교육 후 공식 실행 | 승인된 memory transfer 없으면 학습 결과 유입 차단 |
| 원 Evidence 무효화 | 의존 memory와 task 재검토, 원본 Decision Run 유지 |
| worker lease 만료 후 늦은 제출 | 오래된 fencingToken으로 상태 확정 불가 |
| 외부 API timeout 후 재시도 | unknown attempt·중복 비용 가능성 표시, credit 중복 금지 |
| 승진 transaction 후 event publish 실패 | outbox에서 복구, 도시의 승진은 중복 재생되지 않음 |
| 직원 중지 중 write tool 호출 | 실행 시점 재검사로 차단 |
| 조직/고객/branch가 다른 ID 조회 | 데이터 접근 거부 |
| 검증 sample·정책 threshold 없음 | INSUFFICIENT_DATA/CALIBRATION_REQUIRED, 자동 PASS 금지 |
| 매끈한 글에 허위 숫자 포함 | deterministic/executable 검수 실패 |
| 팀 성과가 좋지만 개인 기여 없음 | 개인 독립 성과로 자동 귀속되지 않음 |
| 화면 offline | 실제 timestamp 표시, 가짜 활동 생성 없음 |
| 이전 runtime에서 실행 기록 재사용 | runtime/authority boundary 확인, 자동 활성화 금지 |
| 퇴직 직원을 삭제하려고 함 | 참조 이력 보존, 명시적 보존 정책 적용 |

### 17.2 성장의 효과를 확인하는 실험

동일 baseline config에 기억 없음/개인 기억/개인+공통 기억을 적용해 동일한 비공개 신규 과제에서 비교한다. task family·난도·regime·provider를 고정 또는 층화하고 평가자는 후보 identity를 가린다. 품질·오류 교정·예측 calibration·비용·latency·부작용을 비교한다.

이는 직원 생애주기 자체를 가중치 학습으로 착각하지 않기 위한 검증이다. 개선이 없으면 전체 제도를 삭제하기보다 memory 검색·교훈 검증·배정 규칙을 수정하고 해당 역량의 자동 승진을 중지한다. 개선 여부의 acceptance threshold는 BO 기준 과제에서 보정하고 policyVersion에 고정한다.

### 17.3 전체 적용 완료의 정의

1. 실제 LLM 직원 전원의 ID/config/소속/state mapping이 존재하고 비직원 actor가 구분된다.
2. 모든 업무의 담당·manifest·기여·검수가 추적되며 material decision은 Decision Run에 연결된다.
3. 기억·평가·연차·승진·전보·교육·퇴직이 재시작 후 보존되고 근거로 설명된다.
4. 정책 없는 자동 승진·미래 기억 누수·self-approval·권한 우회·중복 credit이 차단된다.
5. 조직도·직원 상세·교육원·인사 화면·가상 도시가 모두 실제 상태와 일치한다.
6. 현재 기술 계약과 관련 regression, migration/rollback/restore, 접근권한 검증이 통과한다.
7. 운영 비용과 job 실패·평가 불일치·인증 만료를 관측하고 복구할 수 있다.
8. 기존 운영 gate의 상태를 새 기능의 완성 여부와 별개로 표시한다.

## 18. 구현 백로그와 인수인계

| ID | 작업 | 산출물 | 선행 |
|---|---|---|---|
| AL-001 | Frozen 확장 결정과 기존 역할 mapping | architecture amendment, actor inventory, KEEP/MODIFY/ADD 표 | 없음 |
| AL-002 | 현행 DB·auth·Case·artifact 경로 inventory | 저장/접근/adapter mapping, migration 영향표 | AL-001 |
| AL-003 | 직원·config·정책 계약 | DTO/schema validators, Version Registry refs | AL-002 |
| AL-004 | transaction/outbox와 durable worker | repository, atomic command, lease/fencing | AL-003 |
| AL-005 | task·도구·budget 권한 | assignment/manifest/pre-action validation | AL-004 |
| AL-006 | 기억과 PIT | temporal memory, snapshot, invalidation | AL-004 |
| AL-007 | 공통 평가 확장 | agent subject/rubric/evaluator provenance | AL-003, AL-005 |
| AL-008 | 직급·연차·교육 정책 보정 | 기준 과제, versioned parameters, holdout split | AL-006, AL-007 |
| AL-009 | 인사·교육 생애주기 | promotion/transfer/retraining/retirement, credit ledger | AL-008 |
| AL-010 | 기존 Council·Report·Decision 연동 | source-backed adapters, actor/contribution links | AL-005, AL-006, AL-007 |
| AL-011 | 조직·직원·교육원·도시 | 전체 운영 화면, actual-event projection | AL-009, AL-010 |
| AL-012 | 전원 편입·비교 운영·복구 | backfill manifest, reconciliation, rollback evidence | AL-011 |
| AL-013 | 전체 acceptance 검증 | 반례 결과, cost/quality report, handoff | AL-012 |

현재 HANDOFF: 설계 v1 작성 완료. 실제 구현·독립 QA·runtime 전환은 미수행. 다음 구현 시작점은 AL-001/AL-002의 현재 소스·데이터 mapping이며, 이번 문서의 가정은 실제 구현 조사에서 차이를 발견하면 변경 기록으로 갱신한다.

## 19. 근거와 추가 확인 목록

### 19.1 읽은 저장소 자료

아래 파일의 관련 계약·타입·구현 구간을 검토했다. 일부 큰 소스 파일은 필요한 구간만 읽었으며 전체 저장소 감사를 수행한 것은 아니다. Frozen/Production Source Truth는 main 조회 내용, 나머지 소스는 위 commit 스냅샷을 기준으로 삼았다.

- [Frozen v1](https://github.com/hanul442/black_oracle_bot/blob/a19be54c363fc389c4b2192027fd93e0794044e2/docs/architecture/BLACK_ORACLE_CANONICAL_FROZEN_V1.md)
- [Production Source Truth](https://github.com/hanul442/black_oracle_bot/blob/a19be54c363fc389c4b2192027fd93e0794044e2/docs/PRODUCTION_SOURCE_TRUTH.md)
- [package.json](https://github.com/hanul442/black_oracle_bot/blob/a19be54c363fc389c4b2192027fd93e0794044e2/package.json)
- [Council](https://github.com/hanul442/black_oracle_bot/blob/a19be54c363fc389c4b2192027fd93e0794044e2/src/trading/council.ts)
- [AI Council Adjudicator](https://github.com/hanul442/black_oracle_bot/blob/a19be54c363fc389c4b2192027fd93e0794044e2/server/trading/aiCouncilAdjudicator.ts)
- [Event Ledger](https://github.com/hanul442/black_oracle_bot/blob/a19be54c363fc389c4b2192027fd93e0794044e2/server/eventLedger.ts)
- [AI Usage Ledger](https://github.com/hanul442/black_oracle_bot/blob/a19be54c363fc389c4b2192027fd93e0794044e2/server/aiUsageLedger.ts)
- [Decision Run / Version Registry](https://github.com/hanul442/black_oracle_bot/blob/a19be54c363fc389c4b2192027fd93e0794044e2/server/foundation/decisionRunVersionRegistry.ts)
- [Shared Evaluation](https://github.com/hanul442/black_oracle_bot/blob/a19be54c363fc389c4b2192027fd93e0794044e2/server/foundation/sharedEvaluation.ts)
- [Shared Evaluation contract](https://github.com/hanul442/black_oracle_bot/blob/a19be54c363fc389c4b2192027fd93e0794044e2/docs/architecture/foundation/SHARED_EVALUATION_V1.md)
- [EV-009 평가자 보정 연구](https://github.com/hanul442/black_oracle_bot/blob/a19be54c363fc389c4b2192027fd93e0794044e2/docs/research/evidence-validation/cycle-013-judge-calibration-and-evaluation-integrity.md)

### 19.2 추가 확인

- HANUL AI TEAM Constitution 원문 및 최신 역할 권한.
- 실제 직원·도구·persona·scheduler inventory와 기존 신원 데이터.
- DB 테이블·constraint·migration history, 현행 auth, 제한된 transaction 연결 방법.
- 현재 Case/Report/Research artifact 구현과 producer wiring.
- runtime 배포와 gate 상태: 설계가 운영 현황을 증명하지 않음.
- 직무별 기준 과제, minSamples, rank/credit mapping, certification expiry/drift 기준.
- 실제 workload·모델 요금·서버 여유·폴드 렌더링 성능.

참고 공식 문서: [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [API securing](https://supabase.com/docs/guides/api/securing-your-api). 최신 changelog markdown은 조회 도구의 content-type 제한으로 읽지 못했으며 실제 구현 전 관련 변경 사항을 다시 확인한다.
