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

function isValidTimestamp(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(?:Z|([+-])(\d{2}):(\d{2}))$/.exec(value);
  if (!match) return false;

  const [, yearText, monthText, dayText, hourText, minuteText, secondText, , offsetHourText, offsetMinuteText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const hour = Number(hourText);
  const minute = Number(minuteText);
  const second = Number(secondText);
  const offsetHour = offsetHourText === undefined ? 0 : Number(offsetHourText);
  const offsetMinute = offsetMinuteText === undefined ? 0 : Number(offsetMinuteText);
  const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const daysInMonth = [31, leapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1];

  return (
    month >= 1 &&
    month <= 12 &&
    day >= 1 &&
    day <= daysInMonth &&
    hour <= 23 &&
    minute <= 59 &&
    second <= 59 &&
    offsetHour <= 23 &&
    offsetMinute <= 59 &&
    !Number.isNaN(Date.parse(value))
  );
}

function parseSource(value: unknown, index: number): SourceRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`NARS_SOURCE_CONFIG_JSON[${index}] must be an object`);
  }

  const v = value as Partial<SourceRecord>;
  if (!isNonEmptyString(v.key)) throw new Error(`NARS_SOURCE_CONFIG_JSON[${index}].key is required`);
  if (!isNonEmptyString(v.name)) throw new Error(`NARS_SOURCE_CONFIG_JSON[${index}].name is required`);
  if (!v.type || !SOURCE_TYPES.has(v.type)) throw new Error(`NARS_SOURCE_CONFIG_JSON[${index}].type is invalid`);
  if (!isNonEmptyString(v.endpoint) || !(v.endpoint.toLowerCase().startsWith('http://') || v.endpoint.toLowerCase().startsWith('https://'))) {
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
  if (!isValidTimestamp(v.assessedAt)) {
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
