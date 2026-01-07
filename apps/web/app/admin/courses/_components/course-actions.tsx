"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { CourseStatus } from "@prisma/client";

import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

import {
  archiveCourseAction,
  publishCourseAction,
  unpublishCourseAction,
} from "../actions";

type CourseActionsProps = {
  courseId: string;
  status: CourseStatus;
};

export function CourseActions({ courseId, status }: CourseActionsProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handlePublishToggle = () => {
    startTransition(async () => {
      const result =
        status === "published"
          ? await unpublishCourseAction(courseId)
          : await publishCourseAction(courseId);
      if (!result.ok) {
        toast({ variant: "destructive", description: result.error });
        return;
      }
      toast({ description: "Course updated." });
      router.refresh();
    });
  };

  const handleArchive = () => {
    startTransition(async () => {
      const result = await archiveCourseAction(courseId);
      if (!result.ok) {
        toast({ variant: "destructive", description: result.error });
        return;
      }
      toast({ description: "Course archived." });
      router.refresh();
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button asChild size="sm" variant="outline">
        <Link href={`/admin/courses/${courseId}`}>Edit</Link>
      </Button>
      <Button
        size="sm"
        variant="secondary"
        disabled={isPending || status === "archived"}
        onClick={handlePublishToggle}
      >
        {status === "published" ? "Unpublish" : "Publish"}
      </Button>
      <Button
        size="sm"
        variant="destructive"
        disabled={isPending || status === "archived"}
        onClick={handleArchive}
      >
        Archive
      </Button>
    </div>
  );
}
