import type { NextWebVitalsMetric } from "next/app";

export function reportWebVitals(metric: NextWebVitalsMetric): void {
  if (typeof window === "undefined") {
    return;
  }
  console.info("web-vitals", {
    id: metric.id,
    name: metric.name,
    label: metric.label,
    value: metric.value,
    startTime: metric.startTime,
  });
}
