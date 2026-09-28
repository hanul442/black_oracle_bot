import type {
  Env,
  SourceAvailabilityState,
  SourceFreshnessState,
  SourceRecord,
  SourceType,
  SourceVerificationState,
} from './types.ts';

const SOURCE_TYPES = new Set<SourceType>(['rss', 'api', 'filing', 'government', 'research', 'newsletter', 'social', 'other']);
const VERIFICATION_STATES = new Set<SourceVerificationState>(['unreviewed', 'provisional', 'reviewed', 'suspended']);
const FRESHNESS_STATES = new Set<SourceFreshnessState>(['unknown', 'current', 'stale']);
const AVAILABILITY_STATES = new Set<SourceAvailabilityState>(['primary', 'fallback', 'failed']);

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function parseSource(value: unknown, index: number): SourceRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`NARS_SOURCE_CONFIG_JSON[${index}] must be an object`);
  }

  const v = value as Partial<SourceRecord>;
  if (!isNonEmptyString(v.key)) throw new Error(`NARS_SOURCE_CONFIG_JSON[${index}].key is required`);
  if (!isNonEmptyString(v.name)) throw new Error(`NARS_SOURCE_CONFIG_JSON[${index}].name is required`);
  if (!v.type || !SOURCE_TYPES.has(v.type)) throw new Error(`NARS_SOURCE_CONFIG_JSON[${index}].type is invalid`);
  if (!isNonEmptyString(v.endpoint) || !/^https?:\/\//i.test(v.endpoint)) {
    throw new Error(`NARS_SOURCE_CONFIG_JSON[${index}].endpoint must be http(s)`);
  }
  if (!v.verificationState || !VERIFICATION_STATES.has(v.verificationState)) {
    throw new Error(`NARS_SOURCE_CONFIG_JSON[${index}].verificationState is invalid`);
  }
  if (!v.freshnessState || !FRESHNESS_STATES.has(v.freshnessState)) {
    throw new Error(`NARS_SOURCE_CONFIG_JSON[${index}].freshnessState is invalid`);
  }
  if (!v.availabilityState || !AVAILABILITY_STATES.has(v.availabilityState)) {
    throw new Error(`NARS_SOURCE_CONFIG_JSON[${index}].availabilityState is invalid`);
  }
  if (!isNonEmptyString(v.assessedAt) || Number.isNaN(Date.parse(v.assessedAt))) {
    throw new Error(`NARS_SOURCE_CONFIG_JSON[${index}].assessedAt must be a valid timestamp`);
  }
  if (v.availabilityState === 'fallback' && !isNonEmptyString(v.fallbackSourceKey)) {
    throw new Error(`NARS_SOURCE_CONFIG_JSON[${index}].fallbackSourceKey is required for fallback`);
  }
  if (v.availabilityState === 'failed' && !isNonEmptyString(v.failureCode)) {
    throw new Error(`NARS_SOURCE_CONFIG_JSON[${index}].failureCode is required for failed`);
  }

  const assessment = {
    verificationState: v.verificationState,
    freshnessState: v.freshnessState,
    availabilityState: v.availabilityState,
    assessedAt: v.assessedAt,
    ...(isNonEmptyString(v.fallbackSourceKey) ? { fallbackSourceKey: v.fallbackSourceKey } : {}),
    ...(isNonEmptyString(v.failureCode) ? { failureCode: v.failureCode } : {}),
  };

  return {
    ...v,
    key: v.key.trim(),
    name: v.name.trim(),
    endpoint: v.endpoint.trim(),
    metadata: {
      ...(v.metadata ?? {}),
      ...assessment,
    },
  } as SourceRecord;
}

export function readSourceConfig(env: Env): SourceRecord[] {
  if (!env.NARS_SOURCE_CONFIG_JSON) return [];
  const parsed = JSON.parse(env.NARS_SOURCE_CONFIG_JSON) as unknown;
  if (!Array.isArray(parsed)) throw new Error('NARS_SOURCE_CONFIG_JSON must be an array');
  return parsed.map(parseSource);
}
