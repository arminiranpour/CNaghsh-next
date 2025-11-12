import { Skeleton } from "@/components/ui/skeleton";

export default function PricingLoading() {
  return (
    <div className="container space-y-10 py-12">
      <div className="space-y-3 text-center">
        <Skeleton className="mx-auto h-8 w-40" />
        <Skeleton className="mx-auto h-5 w-64" />
      </div>
      <div className="flex justify-center">
        <Skeleton className="h-12 w-64 rounded-full" />
      </div>
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="space-y-4 rounded-2xl border border-border/60 p-6">
            <div className="space-y-2">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-48" />
            </div>
            <Skeleton className="h-10 w-24" />
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((__, featureIndex) => (
                <Skeleton key={featureIndex} className="h-4 w-full" />
              ))}
            </div>
            <Skeleton className="h-10 w-full" />
          </div>
        ))}
      </div>
      <div className="space-y-3 rounded-2xl border border-border/60 p-6">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-4 w-64" />
        <Skeleton className="h-10 w-56" />
      </div>
    </div>
  );
}
