import test from 'node:test';
import assert from 'node:assert/strict';
import { readSourceConfig } from '../src/sourceConfig.ts';
import type { Env } from '../src/types.ts';

function envWith(config: unknown): Env {
  return { NARS_SOURCE_CONFIG_JSON: JSON.stringify(config) } as Env;
}

const base = {
  key: 'primary-feed',
  name: 'Primary Feed',
  type: 'rss',
  endpoint: 'https://example.com/feed.xml',
  verificationState: 'unreviewed',
  freshnessState: 'unknown',
  availabilityState: 'primary',
  assessedAt: '2026-09-28T00:00:00.000Z',
};

test('accepts a complete source assessment and preserves it in metadata', () => {
  const [source] = readSourceConfig(envWith([{ ...base, metadata: { owner: 'research' } }]));
  assert.equal(source.verificationState, 'unreviewed');
  assert.equal(source.freshnessState, 'unknown');
  assert.equal(source.availabilityState, 'primary');
  assert.equal(source.assessedAt, '2026-09-28T00:00:00.000Z');
  assert.deepEqual(source.metadata, {
    owner: 'research',
    verificationState: 'unreviewed',
    freshnessState: 'unknown',
    availabilityState: 'primary',
    assessedAt: '2026-09-28T00:00:00.000Z',
  });
});

test('rejects legacy source config that omits the assessment contract', () => {
  const legacy = { key: 'legacy', name: 'Legacy', type: 'rss', endpoint: 'https://example.com/legacy.xml' };
  assert.throws(() => readSourceConfig(envWith([legacy])), /verificationState/);
});

test('requires verificationState independently', () => {
  const { verificationState: _verificationState, ...withoutVerificationState } = base;
  assert.throws(() => readSourceConfig(envWith([withoutVerificationState])), /verificationState/);
});

test('requires freshnessState independently', () => {
  const { freshnessState: _freshnessState, ...withoutFreshnessState } = base;
  assert.throws(() => readSourceConfig(envWith([withoutFreshnessState])), /freshnessState/);
});

test('requires availabilityState independently', () => {
  const { availabilityState: _availabilityState, ...withoutAvailabilityState } = base;
  assert.throws(() => readSourceConfig(envWith([withoutAvailabilityState])), /availabilityState/);
});

test('requires assessedAt', () => {
  const { assessedAt: _assessedAt, ...withoutAssessedAt } = base;
  assert.throws(() => readSourceConfig(envWith([withoutAssessedAt])), /assessedAt/);
});

test('rejects assessedAt with an impossible calendar date', () => {
  assert.throws(
    () => readSourceConfig(envWith([{ ...base, assessedAt: '2026-02-31T00:00:00Z' }])),
    /assessedAt/,
  );
});

test('rejects assessedAt without an explicit timestamp and timezone', () => {
  assert.throws(() => readSourceConfig(envWith([{ ...base, assessedAt: 'not-a-date' }])), /assessedAt/);
});

test('requires fallbackSourceKey when availability is fallback', () => {
  assert.throws(
    () => readSourceConfig(envWith([{ ...base, availabilityState: 'fallback' }])),
    /fallbackSourceKey/,
  );
});

test('requires failureCode when availability is failed', () => {
  assert.throws(
    () => readSourceConfig(envWith([{ ...base, availabilityState: 'failed' }])),
    /failureCode/,
  );
});

test('accepts required conditional fields without inventing calibration thresholds', () => {
  const [fallback, failed] = readSourceConfig(envWith([
    { ...base, key: 'fallback', availabilityState: 'fallback', fallbackSourceKey: 'primary-feed' },
    { ...base, key: 'failed', availabilityState: 'failed', failureCode: 'HTTP_503' },
  ]));
  assert.equal(fallback.metadata?.fallbackSourceKey, 'primary-feed');
  assert.equal(failed.metadata?.failureCode, 'HTTP_503');
});
