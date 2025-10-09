"use client";

import { useEffect } from "react";

type JobViewTrackerProps = {
  jobId: string;
};

export function JobViewTracker({ jobId }: JobViewTrackerProps) {
  useEffect(() => {
    if (!jobId) {
      return;
    }

    const controller = new AbortController();

    fetch(`/api/jobs/${jobId}/views`, {
      method: "POST",
      signal: controller.signal,
    }).catch(() => {
      // Ignore view tracking errors in the UI
    });

    return () => {
      controller.abort();
    };
  }, [jobId]);

  return null;
}
