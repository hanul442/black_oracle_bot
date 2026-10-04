import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CANONICAL_DATA_CONTRACT_VERSION,
  assessPointInTime,
  projectLegacyCanonicalEventTemporal,
  selectRevisionAsOf,
  selectExactRevisionAsOf,
  type CanonicalDataEnvelope,
} from './canonicalData';

const record = (
  overrides: Partial<CanonicalDataEnvelope<{ value: string }>> = {},
): CanonicalDataEnvelope<{ value: string }> => ({
  contractVersion: CANONICAL_DATA_CONTRACT_VERSION,
  source: 'test-source',
  revision: {
    logicalRecordId: 'macro:cpi:2026-08',
    revisionId: 'rev-1',
  },
  temporal: {
    eventTime: '2026-09-01T00:00:00.000Z',
    observedAt: '2026-09-01T01:00:00.000Z',
    ingestedAt: '2026-09-01T01:00:05.000Z',
  },
  payload: { value: 'initial' },
  ...overrides,
});

test('Point-in-Time accepts a revision only after BLACK ORACLE observed and ingested it', () => {
  const beforeIngest = assessPointInTime(record(), '2026-09-01T01:00:02.000Z');
  assert.equal(beforeIngest.eligible, false);
  assert.equal(beforeIngest.reason, 'INGESTED_AFTER_AS_OF');

  const afterIngest = assessPointInTime(record(), '2026-09-01T01:00:05.000Z');
  assert.equal(afterIngest.eligible, true);
  assert.equal(afterIngest.reason, 'ELIGIBLE');
});

test('Point-in-Time does not reject a scheduled future event that was already known', () => {
  const scheduled = record({
    revision: {
      logicalRecordId: 'calendar:fomc:2026-09-30',
      revisionId: 'rev-1',
    },
    temporal: {
      eventTime: '2026-09-30T18:00:00.000Z',
      sourcePublishedAt: '2026-09-01T00:00:00.000Z',
      observedAt: '2026-09-01T00:01:00.000Z',
      ingestedAt: '2026-09-01T00:01:02.000Z',
    },
  });

  const result = assessPointInTime(scheduled, '2026-09-10T00:00:00.000Z');
  assert.equal(result.eligible, true);
  assert.equal(result.reason, 'ELIGIBLE');
});

test('as-of revision selection excludes corrections learned in the future', () => {
  const initial = record();
  const correction = record({
    revision: {
      logicalRecordId: 'macro:cpi:2026-08',
      revisionId: 'rev-2',
      supersedesRevisionId: 'rev-1',
    },
    temporal: {
      eventTime: '2026-09-01T00:00:00.000Z',
      observedAt: '2026-09-03T02:00:00.000Z',
      ingestedAt: '2026-09-03T02:00:04.000Z',
    },
    payload: { value: 'corrected' },
  });

  assert.equal(
    selectRevisionAsOf([initial, correction], 'macro:cpi:2026-08', '2026-09-02T00:00:00.000Z')?.revision.revisionId,
    'rev-1',
  );
  assert.equal(
    selectRevisionAsOf([initial, correction], 'macro:cpi:2026-08', '2026-09-04T00:00:00.000Z')?.revision.revisionId,
    'rev-2',
  );
});

test('Point-in-Time rejects impossible observation/ingestion ordering', () => {
  const invalid = record({
    temporal: {
      eventTime: '2026-09-01T00:00:00.000Z',
      observedAt: '2026-09-01T01:00:05.000Z',
      ingestedAt: '2026-09-01T01:00:00.000Z',
    },
  });

  const result = assessPointInTime(invalid, '2026-09-02T00:00:00.000Z');
  assert.equal(result.eligible, false);
  assert.equal(result.reason, 'TEMPORAL_ORDER_INVALID');
});

test('legacy Canonical Event projection never invents observedAt or revision identity', () => {
  const projection = projectLegacyCanonicalEventTemporal({
    eventKey: 'paper:btc:decision',
    occurredAt: Date.parse('2026-09-01T00:00:00.000Z'),
    recordedAt: Date.parse('2026-09-01T00:00:10.000Z'),
    trace: { traceId: 'legacy-trace' },
  });

  assert.equal(projection.status, 'LEGACY_INCOMPLETE');
  assert.equal(projection.logicalRecordId, 'paper:btc:decision');
  assert.equal(projection.observedAt, null);
  assert.equal(projection.revisionId, null);
  assert.deepEqual(projection.missing, ['observedAt', 'revisionId']);
});

test('legacy row is PIT-complete only when explicit knowledge and revision metadata already exist', () => {
  const projection = projectLegacyCanonicalEventTemporal({
    eventKey: 'nars:evidence:1',
    occurredAt: '2026-09-01T00:00:00.000Z',
    recordedAt: '2026-09-01T00:01:03.000Z',
    trace: {
      observedAt: '2026-09-01T00:01:00.000Z',
      sourcePublishedAt: '2026-09-01T00:00:30.000Z',
      revisionId: 'source-rev-7',
    },
  });

  assert.equal(projection.status, 'POINT_IN_TIME_COMPLETE');
  assert.equal(projection.observedAt, '2026-09-01T00:01:00.000Z');
  assert.equal(projection.revisionId, 'source-rev-7');
  assert.deepEqual(projection.missing, []);
});


test('Point-in-Time requires a valid eventTime without treating future eventTime as leakage', () => {
  const invalid = record({
    temporal: {
      eventTime: 'not-a-time',
      observedAt: '2026-09-01T00:01:00.000Z',
      ingestedAt: '2026-09-01T00:01:02.000Z',
    },
  });

  const result = assessPointInTime(invalid, '2026-09-10T00:00:00.000Z');
  assert.equal(result.eligible, false);
  assert.equal(result.reason, 'EVENT_TIME_INVALID');
});

const consumedReference = { logicalRecordId: 'macro:cpi:2026-08', revisionId: 'rev-1' };
const historyCutoff = '2026-09-02T00:00:00.000Z';

test('CT-01: reconstruction preserves consumed r1 when r2 was also known before the forecast cutoff', () => {
  const initial = record();
  const correction = record({
    revision: { ...consumedReference, revisionId: 'rev-2', supersedesRevisionId: 'rev-1' },
    temporal: {
      eventTime: initial.temporal.eventTime,
      observedAt: '2026-09-01T02:00:00.000Z',
      ingestedAt: '2026-09-01T02:00:05.000Z',
    },
    payload: { value: 'corrected' },
  });
  const records = [initial, correction];
  assert.equal(selectRevisionAsOf(records, consumedReference.logicalRecordId, historyCutoff)?.revision.revisionId, 'rev-2');
  assert.deepEqual(selectExactRevisionAsOf(records, consumedReference, historyCutoff), initial);
  assert.deepEqual(selectExactRevisionAsOf([correction, initial], consumedReference, historyCutoff), initial);
});

test('exact reconstruction never fills missing lineage with the current eligible revision', () => {
  const records = [record()];
  for (const reference of [
    { ...consumedReference, revisionId: '' },
    { ...consumedReference, revisionId: 'missing' },
    { ...consumedReference, logicalRecordId: '' },
    { ...consumedReference, logicalRecordId: 'another-evidence' },
  ]) assert.equal(selectExactRevisionAsOf(records, reference, historyCutoff), null);
});

test('exact revision still requires original observed/ingested eligibility and cannot use old publication time', () => {
  const initial = record();
  const later = record({
    temporal: {
      ...initial.temporal,
      sourcePublishedAt: '2026-08-01T00:00:00.000Z',
      observedAt: '2026-09-03T00:00:00.000Z',
      ingestedAt: '2026-09-03T00:00:05.000Z',
    },
  });
  assert.equal(selectExactRevisionAsOf([later], consumedReference, historyCutoff), null);
  assert.equal(selectExactRevisionAsOf([initial], consumedReference, '2026-09-01T01:00:02.000Z'), null);
  assert.equal(selectExactRevisionAsOf([initial], consumedReference, 'invalid'), null);
  assert.deepEqual(selectExactRevisionAsOf([initial], consumedReference, initial.temporal.ingestedAt), initial);
});

test('ambiguous exact identity is rejected even if one conflicting record was learned after cutoff', () => {
  const initial = record();
  const conflict = record({ payload: { value: 'rewritten' } });
  const futureConflict = record({
    temporal: { ...initial.temporal, ingestedAt: '2026-09-03T00:00:00.000Z' },
  });
  for (const conflicting of [conflict, futureConflict]) {
    for (const records of [[initial, conflicting], [conflicting, initial]]) {
      assert.throws(() => selectExactRevisionAsOf(records, consumedReference, historyCutoff), /conflicting Canonical revision identity/);
    }
  }
  assert.deepEqual(selectExactRevisionAsOf([initial, structuredClone(initial)], consumedReference, historyCutoff), initial);
});

test('exact resolution rejects unsupported contract and invalid temporal order', () => {
  const unsupported = record({ contractVersion: 'bo.canonical-data.v0' as typeof CANONICAL_DATA_CONTRACT_VERSION });
  const unordered = record({ temporal: { ...record().temporal, ingestedAt: '2026-09-01T00:00:00.000Z' } });
  assert.equal(selectExactRevisionAsOf([unsupported], consumedReference, historyCutoff), null);
  assert.equal(selectExactRevisionAsOf([unordered], consumedReference, historyCutoff), null);
});

test('exact revision resolution returns detached data and leaves source input untouched', () => {
  const initial = record();
  const before = structuredClone(initial);
  const selected = selectExactRevisionAsOf([initial], consumedReference, historyCutoff)!;
  selected.payload.value = 'caller mutation';
  selected.revision.revisionId = 'caller-revision';
  assert.deepEqual(initial, before);
  assert.deepEqual(selectExactRevisionAsOf([initial], consumedReference, historyCutoff), before);
});
