export type PageItem = number | "...";

export function buildPageList(
  current: number,
  hasPrevPage: boolean,
  hasNextPage: boolean,
  lastPage?: number,
): PageItem[] {
  const inferredLast = lastPage ?? (hasNextPage ? current + 1 : current);
  const safeLast = Math.max(inferredLast, current);

  if (safeLast <= 1) return [1];
  if (safeLast <= 4) return Array.from({ length: safeLast }, (_, i) => i + 1);

  if (current <= 2) {
    return [1, 2, 3, "...", safeLast];
  }

  if (current >= safeLast - 1) {
    return [1, "...", safeLast - 2, safeLast - 1, safeLast];
  }

  return [1, current, current + 1, "...", safeLast];
}
