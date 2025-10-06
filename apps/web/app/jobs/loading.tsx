import { Skeleton } from "@/components/ui/skeleton";

const CARD_COUNT = 6;

export default function JobsLoading() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 pb-12" dir="rtl">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: CARD_COUNT }).map((_, index) => (
          <div key={index} className="space-y-3 rounded-md border border-border bg-background p-4 shadow-sm">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-full" />
            <div className="flex gap-2">
              <Skeleton className="h-6 w-16" />
              <Skeleton className="h-6 w-16" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
