import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { getServerAuthSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";

import { markAllRead, markOneRead } from "./actions";

function formatNumber(value: number): string {
  return new Intl.NumberFormat("fa-IR").format(value);
}

const markAllReadAction = async () => {
  "use server";
  await markAllRead();
};

const markOneReadAction = async (formData: FormData) => {
  "use server";
  const id = formData.get("notificationId");

  if (typeof id === "string" && id.length > 0) {
    await markOneRead(id);
  }
};

const dateFormatter = new Intl.DateTimeFormat("fa-IR", {
  dateStyle: "medium",
  timeStyle: "short",
});

export default async function NotificationsPage() {
  const session = await getServerAuthSession();

  if (!session?.user?.id) {
    redirect("/auth/signin");
  }

  const userId = session.user.id;

  const notifications = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const unreadCount = notifications.reduce(
    (total, item) => (item.readAt ? total : total + 1),
    0,
  );

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold">اعلان‌ها</h2>
          <p className="text-sm text-muted-foreground">
            جدیدترین اعلان‌های حساب شما در این بخش نمایش داده می‌شود. تعداد اعلان‌های خوانده‌نشده: {" "}
            <span className="font-medium text-foreground">{formatNumber(unreadCount)}</span>
          </p>
        </div>
        {notifications.length > 0 ? (
          <form action={markAllReadAction}>
            <Button type="submit" variant="secondary">
              علامت‌گذاری همه به عنوان خوانده‌شده
            </Button>
          </form>
        ) : null}
      </div>

      {notifications.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-10 text-center text-sm text-muted-foreground">
          هنوز اعلانی دریافت نکرده‌اید.
        </div>
      ) : (
        <ul className="space-y-4">
          {notifications.map((notification) => {
            const isUnread = !notification.readAt;
            return (
              <li
                key={notification.id}
                className={cn(
                  "rounded-2xl border border-border/60 bg-background p-5 shadow-sm transition-colors",
                  isUnread && "border-primary/50 bg-primary/5",
                )}
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-2">
                    <h3 className="text-base font-semibold text-foreground">
                      {notification.title}
                    </h3>
                    <p className="text-sm leading-7 text-muted-foreground">
                      {notification.body}
                    </p>
                    <time className="text-xs text-muted-foreground" dateTime={notification.createdAt.toISOString()}>
                      {dateFormatter.format(notification.createdAt)}
                    </time>
                  </div>
                  {isUnread ? (
                    <form action={markOneReadAction} className="shrink-0">
                      <input type="hidden" name="notificationId" value={notification.id} />
                      <Button type="submit" variant="outline" size="sm">
                        خوانده شد
                      </Button>
                    </form>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
