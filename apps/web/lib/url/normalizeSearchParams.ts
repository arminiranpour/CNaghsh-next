export type NormalizedSearchParams = {
  query?: string;
  city?: string;
  skills?: string[];
  gender?: "male" | "female" | "other";
  sort?: string;
  page?: number;
  remote?: "true" | "false";
  category?: string;
  payType?: "paid" | "unpaid" | "negotiable";
  featured?: "true" | "false";
};

type InputRecord = Record<string, string | string[] | undefined>;

type Input = URLSearchParams | InputRecord;

const ALLOWED_GENDERS = new Set<NormalizedSearchParams["gender"]>(["male", "female", "other"]);
const PAY_TYPES = ["paid", "unpaid", "negotiable"] as const;
type PayType = (typeof PAY_TYPES)[number];
const ALLOWED_PAY_TYPES = new Set<string>(PAY_TYPES);

const BOOLEAN_TRUE_FALSE = new Set(["true", "false"]);

export function normalizeSearchParams(input: Input): NormalizedSearchParams {
  const normalized: NormalizedSearchParams = {};
  const values = collectValues(input);

  assignString(normalized, "query", values.get("query"));
  assignString(normalized, "city", values.get("city"));

  const skills = buildStringArray(values.get("skills"));
  if (skills.length > 0) {
    normalized.skills = skills;
  }

  const gender = getFirst(values.get("gender"));
  if (gender && ALLOWED_GENDERS.has(gender as NormalizedSearchParams["gender"])) {
    normalized.gender = gender as NormalizedSearchParams["gender"];
  }

  assignString(normalized, "sort", values.get("sort"));

  const page = toPageNumber(values.get("page"));
  if (page !== undefined) {
    normalized.page = page;
  }

  assignBooleanString(normalized, "remote", values.get("remote"));
  assignString(normalized, "category", values.get("category"));

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
