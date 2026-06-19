"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ChallengeStatus } from "@prisma/client";

import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

import {
  archiveChallengeAction,
  publishChallengeAction,
  unpublishChallengeAction,
} from "../actions";

type ChallengeActionsProps = {
  challengeId: string;
  status: ChallengeStatus;
};

export function ChallengeActions({ challengeId, status }: ChallengeActionsProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handlePublishToggle = () => {
    startTransition(async () => {
      const result =
        status === "published"
          ? await unpublishChallengeAction(challengeId)
          : await publishChallengeAction(challengeId);

      if (!result.ok) {
        toast({ variant: "destructive", description: result.error });
        return;
      }

      toast({ description: "وضعیت چالش به‌روزرسانی شد." });
      router.refresh();
    });
  };

  const handleArchive = () => {
    startTransition(async () => {
      const result = await archiveChallengeAction(challengeId);
      if (!result.ok) {
        toast({ variant: "destructive", description: result.error });
        return;
      }

      toast({ description: "چالش آرشیو شد." });
      router.refresh();
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button asChild size="sm" variant="outline">
        <Link href={`/admin/challenges/${challengeId}/edit`}>ویرایش</Link>
      </Button>
      <Button
        size="sm"
        variant="secondary"
        disabled={isPending || status === "archived"}
        onClick={handlePublishToggle}
      >
        {status === "published" ? "لغو انتشار" : "انتشار"}
      </Button>
      <Button
        size="sm"
        variant="destructive"
        disabled={isPending || status === "archived"}
        onClick={handleArchive}
      >
        آرشیو
      </Button>
    </div>
  );
}
