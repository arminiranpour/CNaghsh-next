export const ALL_SELECT_OPTION_VALUE = "__all__" as const;

export function normalizeSelectValue(value?: string | null): string | undefined {
  if (!value) {
    return undefined;
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return undefined;
  }

  if (trimmed === ALL_SELECT_OPTION_VALUE || trimmed === "all") {
    return undefined;
  }

  return trimmed;
}
