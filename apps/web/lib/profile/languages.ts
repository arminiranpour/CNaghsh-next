export type LanguageOptionKey = "fa" | "en" | "tr";

export type LanguageSkill = {
  label: string;
  level: number;
};

export const LANGUAGE_OPTIONS: { key: LanguageOptionKey; label: string }[] = [
  { key: "fa", label: "فارسی" },
  { key: "en", label: "انگلیسی" },
  { key: "tr", label: "ترکی" },
];

export const LANGUAGE_LEVEL_MAX = 5;

const LANGUAGE_OPTION_MAP = new Map(LANGUAGE_OPTIONS.map((item) => [item.key, item.label]));

export function getLanguageLabel(key: string): string {
  return LANGUAGE_OPTION_MAP.get(key as LanguageOptionKey) ?? key;
}

export function normalizeLanguageSkills(value: unknown): LanguageSkill[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const result: LanguageSkill[] = [];
  const seen = new Set<string>();

  for (const entry of value) {
    if (!entry || typeof entry !== "object") {
      continue;
    }

    const rawLabel =
      typeof (entry as { label?: unknown }).label === "string"
        ? ((entry as { label?: string }).label ?? "").trim()
        : "";
    const rawKey =
      typeof (entry as { key?: unknown }).key === "string"
        ? ((entry as { key?: string }).key ?? "").trim()
        : "";

    const levelValue = (entry as { level?: unknown }).level;
    const numericLevel =
      typeof levelValue === "number" && Number.isInteger(levelValue)
        ? levelValue
        : typeof levelValue === "string" && levelValue.trim() !== ""
          ? Number(levelValue)
          : NaN;

    if (!Number.isInteger(numericLevel) || numericLevel < 1 || numericLevel > LANGUAGE_LEVEL_MAX) {
      continue;
    }

    const label = rawLabel || (rawKey ? getLanguageLabel(rawKey) : "");

    if (!label) {
      continue;
    }

    const dedupeKey = label.toLowerCase();
    if (seen.has(dedupeKey)) {
      continue;
    }

    seen.add(dedupeKey);
    result.push({ label, level: numericLevel });
  }

  return result;
}
