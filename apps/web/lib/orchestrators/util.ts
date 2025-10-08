import crypto from "node:crypto";
import { z, type ZodIssue } from "zod";

import { normalizeSearchParams } from "@/lib/url/normalizeSearchParams";

export function canonicalizeInput(raw: URLSearchParams | Record<string, unknown>) {
  const norm = normalizeSearchParams(
    raw instanceof URLSearchParams ? raw : toNormalizedRecord(raw),
  );
  const clean: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(norm)) {
    if (value === undefined || value === null || value === "") {
      continue;
    }
    clean[key] = value;
  }

  return clean;
}

function toNormalizedRecord(raw: Record<string, unknown>) {
  const record: Record<string, string | string[] | undefined> = {};

  for (const [key, value] of Object.entries(raw)) {
    if (value === undefined || value === null) {
      continue;
    }

    if (Array.isArray(value)) {
      record[key] = value.map((entry) => String(entry));
      continue;
    }

    record[key] = String(value);
  }

  return record;
}

export function hashKey(obj: unknown) {
  return crypto.createHash("sha1").update(JSON.stringify(obj)).digest("hex").slice(0, 10);
}

export function buildAppliedFilters(p: Record<string, unknown>) {
  const chips: { key: string; value: string }[] = [];

  if (p.city) {
    chips.push({ key: "city", value: String(p.city) });
  }
  if (Array.isArray(p.skills) && p.skills.length) {
    chips.push({ key: "skills", value: p.skills.join(", ") });
  }
  if (p.category) {
    chips.push({ key: "category", value: String(p.category) });
  }
  if (p.sort) {
    chips.push({ key: "sort", value: String(p.sort) });
  }
  if (p.query) {
    chips.push({ key: "query", value: String(p.query) });
  }

  return chips;
}

export type OrchestratedResult<T> = {
  items: T[];
  page: number;
  pageSize: number;
  canonical: string;
  appliedFilters: { key: string; value: string }[];
};

export function isMissingIncrementalCacheError(error: unknown): boolean {
  return (
    error instanceof Error &&
    error.message.includes("Invariant: incrementalCache missing in unstable_cache")
  );
}

export type ParseOutcome<T> = {
  params: T;
  issues: ZodIssue[];
  clamped: boolean;
  empty: boolean;
};

function hasUsableValue(record: Record<string, unknown>) {
  return Object.values(record).some((value) => value !== undefined);
}

export function parseWithClamp<T extends z.ZodTypeAny>(
  schema: T,
  normalized: Record<string, unknown>,
): ParseOutcome<z.infer<T>> {
  const initial = schema.safeParse(normalized);
  if (initial.success) {
    return {
      params: initial.data,
      issues: [],
      clamped: false,
      empty: !hasUsableValue(initial.data as Record<string, unknown>),
    };
  }

  const sanitized: Record<string, unknown> = { ...normalized };
  let removedAny = false;

  for (const issue of initial.error.issues) {
    const key = [...issue.path]
      .reverse()
      .find((segment): segment is string => typeof segment === "string");
    if (key && key in sanitized) {
      delete sanitized[key];
      removedAny = true;
    }
  }

  if (removedAny) {
    const retry = schema.safeParse(sanitized);
    if (retry.success) {
      return {
        params: retry.data,
        issues: initial.error.issues,
        clamped: true,
        empty: !hasUsableValue(retry.data as Record<string, unknown>),
      };
    }
  }

  return {
    params: {} as z.infer<T>,
    issues: initial.error.issues,
    clamped: true,
    empty: true,
  };
}
