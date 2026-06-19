"use client";

import { useEffect, useState } from "react";

import { CHALLENGE_SUBMISSION_FORM_STATE_EVENT } from "@/components/challenges/challengeSubmissionFormEvents";

type ChallengeSubmissionCtaButtonProps = {
  formId: string;
  label: string;
  className?: string;
};

type SubmissionFormStateDetail = {
  formId: string;
  isPending: boolean;
  isVideoBusy: boolean;
};

export function ChallengeSubmissionCtaButton({
  formId,
  label,
  className,
}: ChallengeSubmissionCtaButtonProps) {
  const [isPending, setIsPending] = useState(false);
  const [isVideoBusy, setIsVideoBusy] = useState(false);

  useEffect(() => {
    const handleStateChange = (event: Event) => {
      const detail = (event as CustomEvent<SubmissionFormStateDetail>).detail;
      if (!detail || detail.formId !== formId) {
        return;
      }

      setIsPending(detail.isPending);
      setIsVideoBusy(detail.isVideoBusy);
    };

    window.addEventListener(CHALLENGE_SUBMISSION_FORM_STATE_EVENT, handleStateChange);
    return () => {
      window.removeEventListener(CHALLENGE_SUBMISSION_FORM_STATE_EVENT, handleStateChange);
    };
  }, [formId]);

  return (
    <button type="submit" form={formId} disabled={isPending || isVideoBusy} className={className}>
      {isPending ? "در حال ثبت..." : isVideoBusy ? "در حال آماده‌سازی ویدیو..." : label}
    </button>
  );
}
