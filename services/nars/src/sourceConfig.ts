import type { Env, SourceOperationalState, SourceRecord } from './types.ts';

const VERIFICATION = new Set(['unreviewed', 'provisional', 'reviewed', 'suspended']);
const FRESHNESS = new Set(['unknown', 'current', 'stale']);
const AVAILABILITY = new Set(['primary', 'fallback', 'failed']);

export function isSourceOperationalState(value: unknown): value is SourceOperationalState {
  if (!value || typeof value !== 'object') return false;
  const v = value as Partial<SourceOperationalState>;
  if (!v.verification || !VERIFICATION.has(v.verification)) return false;
  if (!v.freshness || !FRESHNESS.has(v.freshness)) return false;
  if (!v.availability || !AVAILABILITY.has(v.availability)) return false;
  if (!v.assessedAt || Number.isNaN(Date.parse(v.assessedAt))) return false;
  if (v.availability === 'fallback' && !v.fallbackSourceKey) return false;
  if (v.availability === 'failed' && !v.failureCode) return false;
  return true;
}

function isSource(value: unknown): value is SourceRecord {
  if (!value || typeof value !== 'object') return false;
  const v = value as Partial<SourceRecord>;
  if (!(v.key && v.name && v.type && v.endpoint && /^https?:\/\//i.test(v.endpoint))) return false;
  return v.operationalState === undefined || isSourceOperationalState(v.operationalState);
}

export function readSourceConfig(env: Env): SourceRecord[] {
  if (!env.NARS_SOURCE_CONFIG_JSON) return [];
  const parsed = JSON.parse(env.NARS_SOURCE_CONFIG_JSON) as unknown;
  if (!Array.isArray(parsed)) throw new Error('NARS_SOURCE_CONFIG_JSON must be an array');
  return parsed.filter(isSource);
}
