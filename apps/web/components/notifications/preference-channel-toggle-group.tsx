"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { NotificationCategory } from "@prisma/client";

import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { updatePreferenceAction } from "@/app/(dashboard)/dashboard/notifications/actions";

type PreferenceChannelToggleGroupProps = {
  category: NotificationCategory;
  emailEnabled: boolean;
  inAppEnabled: boolean;
  locked: boolean;
  token?: string;
};

export function PreferenceChannelToggleGroup({
  category,
  emailEnabled,
  inAppEnabled,
  locked,
  token,
}: PreferenceChannelToggleGroupProps) {
  const { toast } = useToast();
  const [emailChecked, setEmailChecked] = useState(emailEnabled);
  const [inAppChecked, setInAppChecked] = useState(inAppEnabled);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setEmailChecked(emailEnabled);
  }, [emailEnabled]);

  useEffect(() => {
    setInAppChecked(inAppEnabled);
  }, [inAppEnabled]);

  const disableToggle = locked || isPending;

  const successMessage = useMemo(() => {
    return locked
      ? "این دسته‌بندی همیشه فعال است."
      : "تنظیمات اعلان با موفقیت به‌روزرسانی شد.";
  }, [locked]);

  const handleError = (error: unknown) => {
    const description =
      error instanceof Error ? error.message : "در به‌روزرسانی تنظیمات مشکلی پیش آمد.";
    toast({
      variant: "destructive",
      title: "خطا",
      description,
    });
  };

  const applyChange = (
    nextEmail: boolean,
    nextInApp: boolean,
    previousEmail: boolean,
    previousInApp: boolean,
  ) => {
    startTransition(async () => {
      try {
        await updatePreferenceAction({
          category,
          emailEnabled: nextEmail,
          inAppEnabled: nextInApp,
          token,
        });
        toast({ description: successMessage });
      } catch (error) {
        handleError(error);
        setEmailChecked(previousEmail);
        setInAppChecked(previousInApp);
      }
    });
  };

  const onEmailChange = (next: boolean) => {
    if (locked) {
      return;
    }

    const previousEmail = emailChecked;
    const previousInApp = inAppChecked;

    setEmailChecked(next);
    applyChange(next, inAppChecked, previousEmail, previousInApp);
  };

  const onInAppChange = (next: boolean) => {
    if (locked) {
      return;
    }

    const previousEmail = emailChecked;
    const previousInApp = inAppChecked;

    setInAppChecked(next);
    applyChange(emailChecked, next, previousEmail, previousInApp);
  };

  const emailId = `pref-email-${category}`;
  const inAppId = `pref-inapp-${category}`;

  return (
    <div className="flex flex-wrap items-center gap-6">
      <div className="flex items-center gap-2">
        <Switch
          id={emailId}
          checked={emailChecked}
          disabled={disableToggle}
          onCheckedChange={onEmailChange}
        />
        <div className="space-y-1">
          <Label htmlFor={emailId} className="text-xs font-medium">
            اعلان ایمیلی
          </Label>
          <p className="text-[11px] text-muted-foreground">
            {emailChecked ? "فعال" : "غیرفعال"}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Switch
          id={inAppId}
          checked={inAppChecked}
          disabled={disableToggle}
          onCheckedChange={onInAppChange}
        />
        <div className="space-y-1">
          <Label htmlFor={inAppId} className="text-xs font-medium">
            اعلان درون‌برنامه
          </Label>
          <p className="text-[11px] text-muted-foreground">
            {inAppChecked ? "فعال" : "غیرفعال"}
          </p>
        </div>
      </div>
    </div>
  );
}
