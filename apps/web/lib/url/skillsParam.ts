export type SearchParamInput = Record<string, string | string[] | undefined>;

function collectRawValues(raw: string | string[] | undefined): string[] {
  if (raw === undefined) {
    return [];
  }

  if (Array.isArray(raw)) {
    return raw;
  }

  return [raw];
}

export function parseSkillsSearchParam(searchParams: SearchParamInput): string[] {
  const rawValues = collectRawValues(searchParams.skills);
  const seen = new Set<string>();
  const skills: string[] = [];

  for (const value of rawValues) {
    const segments = value.split(",");
    for (const segment of segments) {
      const trimmed = segment.trim();
      if (!trimmed || seen.has(trimmed)) {
        continue;
      }
      seen.add(trimmed);
      skills.push(trimmed);
    }
  }

  return skills;
}

export function setSkillsSearchParam(target: URLSearchParams, values: Iterable<string>) {
  target.delete("skills");

  const deduped: string[] = [];
  const seen = new Set<string>();

  for (const value of values) {
    const trimmed = value.trim();
    if (!trimmed || seen.has(trimmed)) {
      continue;
    }
    seen.add(trimmed);
    deduped.push(trimmed);
  }

  if (deduped.length > 0) {
    target.set("skills", deduped.join(","));
  }
}
