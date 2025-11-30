import {
  CooperationOffer,
  CooperationOfferStatus,
  JobStatus,
  ModerationStatus,
  ProfileVisibility,
  Role,
} from "@prisma/client";

import { isAdminUser } from "@/lib/auth/admin";
import { prisma } from "@/lib/prisma";

export type OfferActor =
  | {
      id: string;
      role?: Role | null;
      email?: string | null;
    }
  | null
  | undefined;

type GuardResult<Reason extends string, Data = undefined> =
  | { ok: true; data?: Data }
  | { ok: false; reason: Reason; data?: Data };

const JOB_STATUSES_ALLOWING_COOPERATION = new Set<JobStatus>([
  JobStatus.DRAFT,
  JobStatus.PUBLISHED,
]);

const TERMINAL_OFFER_STATUSES = new Set<CooperationOfferStatus>([
  CooperationOfferStatus.accepted,
  CooperationOfferStatus.declined,
  CooperationOfferStatus.canceled,
  CooperationOfferStatus.expired,
]);

/**
 * Returns whether the provided user owns the given job.
 *
 * Used by cooperation offer creation flows to authorize job owners.
 */
export async function isJobOwner(
  userId: string | null | undefined,
  jobId: string,
): Promise<boolean> {
  if (!userId) {
    return false;
  }

  const job = await prisma.job.findUnique({
    where: { id: jobId },
    select: { userId: true },
  });

  return Boolean(job && job.userId === userId);
}

export type CreateOfferBlockReason =
  | "UNAUTHENTICATED"
  | "JOB_NOT_FOUND"
  | "NOT_JOB_OWNER"
  | "JOB_STATUS_INVALID"
  | "SELF_OFFER_NOT_ALLOWED"
  | "RECEIVER_NOT_FOUND"
  | "RECEIVER_PROFILE_MISSING"
  | "RECEIVER_PROFILE_NOT_PUBLISHED";

export type CreateOfferDecision = GuardResult<
  CreateOfferBlockReason,
  {
    job: { id: string; userId: string; status: JobStatus };
    receiverProfileId?: string;
    roleId: string | null;
  }
>;

/**
 * Guards cooperation offer creation.
 *
 * Rules:
 * - Sender must be authenticated.
 * - Sender must own the job or be an ADMIN (role or configured admin email).
 * - Job must not be closed.
 * - Sender cannot offer to self.
 * - Receiver must exist and have a published profile (PUBLIC + APPROVED).
 */
export async function canCreateCooperationOffer(params: {
  sender: OfferActor;
  jobId: string;
  receiverUserId: string;
  roleId?: string | null;
}): Promise<CreateOfferDecision> {
  const { sender, jobId, receiverUserId, roleId } = params;

  if (!sender?.id) {
    return { ok: false, reason: "UNAUTHENTICATED" };
  }

  const isAdmin = isAdminUser(sender);

  const job = await prisma.job.findUnique({
    where: { id: jobId },
    select: { id: true, userId: true, status: true },
  });

  if (!job) {
    return { ok: false, reason: "JOB_NOT_FOUND" };
  }

  const ownsJob = job.userId === sender.id;
  if (!ownsJob && !isAdmin) {
    return { ok: false, reason: "NOT_JOB_OWNER" };
  }

  if (!JOB_STATUSES_ALLOWING_COOPERATION.has(job.status)) {
    return { ok: false, reason: "JOB_STATUS_INVALID", data: { job, roleId: roleId ?? null } };
  }

  if (sender.id === receiverUserId) {
    return { ok: false, reason: "SELF_OFFER_NOT_ALLOWED" };
  }

  const receiver = await prisma.user.findUnique({
    where: { id: receiverUserId },
    select: {
      id: true,
      profile: {
        select: {
          id: true,
          visibility: true,
          moderationStatus: true,
          publishedAt: true,
        },
      },
    },
  });

  if (!receiver) {
    return { ok: false, reason: "RECEIVER_NOT_FOUND" };
  }

  if (!receiver.profile) {
    return { ok: false, reason: "RECEIVER_PROFILE_MISSING" };
  }

  const isProfilePublished =
    receiver.profile.visibility === ProfileVisibility.PUBLIC &&
    receiver.profile.moderationStatus === ModerationStatus.APPROVED &&
    Boolean(receiver.profile.publishedAt);

  if (!isProfilePublished) {
    return {
      ok: false,
      reason: "RECEIVER_PROFILE_NOT_PUBLISHED",
      data: { job, receiverProfileId: receiver.profile.id, roleId: roleId ?? null },
    };
  }

  return { ok: true, data: { job, receiverProfileId: receiver.profile.id, roleId: roleId ?? null } };
}

/**
 * Determines whether the given user can see an offer.
 * True for sender, receiver, or ADMIN.
 */
export function canViewCooperationOffer(
  user: OfferActor,
  offer: Pick<CooperationOffer, "senderUserId" | "receiverUserId">,
): boolean {
  if (!user?.id) {
    return false;
  }

  if (isAdminUser(user)) {
    return true;
  }

  return offer.senderUserId === user.id || offer.receiverUserId === user.id;
}

export type MutationBlockReason =
  | "UNAUTHENTICATED"
  | "NO_CHANGE"
  | "INVALID_TARGET"
  | "READONLY_STATE"
  | "FORBIDDEN"
  | "NOT_EXPIRED_YET";

type OfferForMutation = Pick<
  CooperationOffer,
  "senderUserId" | "receiverUserId" | "status" | "validUntil"
>;

/**
 * Guards cooperation offer status transitions.
 *
 * Allowed transitions:
 * - Receiver: pending -> accepted | declined
 * - Sender (job owner): pending -> canceled
 * - System job: pending -> expired (only if validUntil has passed)
 * - Admin: pending -> accepted | declined | canceled | expired; can override terminal states too.
 *
 * All terminal states (accepted/declined/canceled/expired) are read-only for non-admin users.
 */
export function canMutateCooperationOfferStatus(params: {
  actor: OfferActor;
  offer: OfferForMutation;
  targetStatus: CooperationOfferStatus;
  now?: Date;
  asSystem?: boolean;
}): GuardResult<MutationBlockReason> {
  const { actor, offer, targetStatus, now = new Date(), asSystem = false } = params;

  const isAdmin = Boolean(actor && isAdminUser(actor));
  const isSender = actor?.id === offer.senderUserId;
  const isReceiver = actor?.id === offer.receiverUserId;

  if (targetStatus === offer.status) {
    return { ok: false, reason: "NO_CHANGE" };
  }

  if (targetStatus === CooperationOfferStatus.pending) {
    return { ok: false, reason: "INVALID_TARGET" };
  }

  if (offer.status !== CooperationOfferStatus.pending) {
    if (!isAdmin) {
      return { ok: false, reason: "READONLY_STATE" };
    }

    if (TERMINAL_OFFER_STATUSES.has(targetStatus)) {
      return { ok: true };
    }

    return { ok: false, reason: "INVALID_TARGET" };
  }

  if (isAdmin && TERMINAL_OFFER_STATUSES.has(targetStatus)) {
    return { ok: true };
  }

  if (!actor && !asSystem) {
    return { ok: false, reason: "UNAUTHENTICATED" };
  }

  if (
    targetStatus === CooperationOfferStatus.accepted ||
    targetStatus === CooperationOfferStatus.declined
  ) {
    return isReceiver ? { ok: true } : { ok: false, reason: "FORBIDDEN" };
  }

  if (targetStatus === CooperationOfferStatus.canceled) {
    return isSender ? { ok: true } : { ok: false, reason: "FORBIDDEN" };
  }

  if (targetStatus === CooperationOfferStatus.expired) {
    if (asSystem && !actor) {
      if (!offer.validUntil || offer.validUntil > now) {
        return { ok: false, reason: "NOT_EXPIRED_YET" };
      }

      return { ok: true };
    }

    return { ok: false, reason: "FORBIDDEN" };
  }

  return { ok: false, reason: "INVALID_TARGET" };
}

/**
 * Returns whether a pending offer already exists for the requested job/receiver/role tuple.
 *
 * Rule:
 * - If roleId is provided, enforce uniqueness on (jobId, receiverUserId, roleId).
 * - If roleId is null/undefined, enforce uniqueness on (jobId, receiverUserId) where roleId is null.
 */
export async function hasExistingPendingOffer(params: {
  jobId: string;
  receiverUserId: string;
  roleId?: string | null;
}): Promise<{ exists: boolean; offerId?: string }> {
  const { jobId, receiverUserId, roleId } = params;

  const offer = await prisma.cooperationOffer.findFirst({
    where: {
      jobId,
      receiverUserId,
      status: CooperationOfferStatus.pending,
      roleId: roleId ?? null,
    },
    select: { id: true },
  });

  if (!offer) {
    return { exists: false };
  }

  return { exists: true, offerId: offer.id };
}
