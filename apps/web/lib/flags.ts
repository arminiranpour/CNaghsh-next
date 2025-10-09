const FLAG_SEPARATOR = ",";

type FlagSource = {
  value: string | undefined;
};

function normalize(flag: string): string {
  return flag.trim().toLowerCase();
}

function parseFlags(source: FlagSource): Set<string> {
  if (!source.value) {
    return new Set();
  }

  return new Set(
    source.value
      .split(FLAG_SEPARATOR)
      .map(normalize)
      .filter((flag) => flag.length > 0),
  );
}

function resolveRuntimeFlags(): Set<string> {
  const serverEnv = typeof process !== "undefined" ? process.env.FLAGS : undefined;
  const publicEnv =
    typeof process !== "undefined" ? process.env.NEXT_PUBLIC_FLAGS : undefined;

  const combined = new Set<string>();

  for (const flag of parseFlags({ value: publicEnv })) {
    combined.add(flag);
  }

  for (const flag of parseFlags({ value: serverEnv })) {
    combined.add(flag);
  }

  return combined;
}

export function isEnabled(flag: string): boolean {
  if (!flag) {
    return false;
  }

  const normalized = normalize(flag);

  return resolveRuntimeFlags().has(normalized);
}

export function getEnabledFlags(): string[] {
  return Array.from(resolveRuntimeFlags()).sort();
}

export function resetFlagsForTests(): void {
  // No-op placeholder to align with test helpers. Flags are resolved dynamically.
}
