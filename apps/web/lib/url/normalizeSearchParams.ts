export type NormalizedSearchParams = {
  query?: string;
  city?: string;
  skills?: string[];
  gender?: GenderKey[];
  ageMin?: number;
  ageMax?: number;
  edu?: string[];
  lang?: string[];
  accent?: string[];
  sort?: string;
  page?: number;
  remote?: "true" | "false";
  category?: string;
  payType?: PayType;
  featured?: "true" | "false";
};

type GenderKey = "male" | "female" | "other";
type InputRecord = Record<string, string | string[] | undefined>;

type Input = URLSearchParams | InputRecord;

const ALLOWED_GENDERS = new Set<GenderKey>(["male", "female", "other"]);
const PAY_TYPES = ["paid", "unpaid", "negotiable"] as const;
type PayType = (typeof PAY_TYPES)[number];
const ALLOWED_PAY_TYPES = new Set<string>(PAY_TYPES);
const BOOLEAN_TRUE_FALSE = new Set(["true", "false"]);
const AGE_MAX = 120;

export function normalizeSearchParams(input: Input): NormalizedSearchParams {
  const normalized: NormalizedSearchParams = {};
  const values = collectValues(input);

  assignString(normalized, "query", values.get("query"));
  assignString(normalized, "city", values.get("city"));
  assignString(normalized, "sort", values.get("sort"));
  assignString(normalized, "category", values.get("category"));

  const skills = buildStringArray(values.get("skills"));
  if (skills.length > 0) {
    normalized.skills = skills;
  }

  const genders = parseGenders(values.get("gender"));
  if (genders.length > 0) {
    normalized.gender = genders;
  }

  const edu = buildStringArray(values.get("edu"));
  if (edu.length > 0) {
    normalized.edu = edu;
  }

  const lang = buildStringArray(values.get("lang"));
  if (lang.length > 0) {
    normalized.lang = lang;
  }

  const accent = buildStringArray(values.get("accent"));
  if (accent.length > 0) {
    normalized.accent = accent;
  }

  const ageMin = toAge(values.get("ageMin"));
  if (ageMin !== undefined) {
    normalized.ageMin = ageMin;
  }

  const ageMax = toAge(values.get("ageMax"));
  if (ageMax !== undefined) {
    normalized.ageMax = ageMax;
  }

  const page = toPageNumber(values.get("page"));
  if (page !== undefined) {
    normalized.page = page;
  }

  assignBooleanString(normalized, "remote", values.get("remote"));

  const payType = getFirst(values.get("payType"));
  if (isAllowedPayType(payType)) {
    normalized.payType = payType;
  }

  assignBooleanString(normalized, "featured", values.get("featured"));

  return normalized;
}

function collectValues(input: Input): Map<string, string[]> {
  const map = new Map<string, string[]>();

  if (input instanceof URLSearchParams) {
    for (const [key, value] of input.entries()) {
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push(value);
    }
    return map;
  }

  for (const [key, value] of Object.entries(input)) {
    if (value === undefined) {
      continue;
    }

    const list = Array.isArray(value) ? value : [value];
    map.set(key, list);
  }

  return map;
}

function assignString(
  target: NormalizedSearchParams,
  key: keyof Pick<NormalizedSearchParams, "query" | "city" | "sort" | "category">,
  rawValues: string[] | undefined,
) {
  const value = getFirst(rawValues);
  if (value) {
    target[key] = value;
  }
}

function assignBooleanString(
  target: NormalizedSearchParams,
  key: keyof Pick<NormalizedSearchParams, "remote" | "featured">,
  rawValues: string[] | undefined,
) {
  const value = getFirst(rawValues);
  if (value && BOOLEAN_TRUE_FALSE.has(value)) {
    target[key] = value as "true" | "false";
  }
}

function getFirst(values: string[] | undefined): string | undefined {
  if (!values || values.length === 0) {
    return undefined;
  }

  for (const value of values) {
    const trimmed = value.trim();
    if (!trimmed) {
      continue;
    }
    return trimmed;
  }

  return undefined;
}

function buildStringArray(values: string[] | undefined): string[] {
  if (!values) {
    return [];
  }

  const parts: string[] = [];
  const seen = new Set<string>();
  for (const value of values) {
    const rawSegments = value.split(",");
    for (const segment of rawSegments) {
      const trimmed = segment.trim();
      if (!trimmed || seen.has(trimmed)) {
        continue;
      }
      seen.add(trimmed);
      parts.push(trimmed);
    }
  }

  return parts;
}

function parseGenders(rawValues: string[] | undefined): GenderKey[] {
  return buildStringArray(rawValues).filter((value): value is GenderKey =>
    ALLOWED_GENDERS.has(value as GenderKey),
  );
}

function isAllowedPayType(value: string | undefined): value is PayType {
  return value !== undefined && ALLOWED_PAY_TYPES.has(value);
}

function toPageNumber(values: string[] | undefined): number | undefined {
  const first = getFirst(values);
  if (!first) {
    return undefined;
  }

  const parsed = Number.parseInt(first, 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return undefined;
  }

  return parsed;
}

function toAge(values: string[] | undefined): number | undefined {
  const first = getFirst(values);
  if (!first) {
    return undefined;
  }

  const parsed = Number.parseInt(first, 10);
  if (!Number.isFinite(parsed) || parsed < 1 || parsed > AGE_MAX) {
    return undefined;
  }

  return parsed;
}
