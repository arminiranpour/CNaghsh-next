import type { EntitlementKey } from "@prisma/client";

export const CAN_PUBLISH_PROFILE: EntitlementKey = "CAN_PUBLISH_PROFILE";
export const JOB_POST_CREDIT: EntitlementKey = "JOB_POST_CREDIT";

export const ENTITLEMENT_KEYS = {
  CAN_PUBLISH_PROFILE,
  JOB_POST_CREDIT,
} as const;