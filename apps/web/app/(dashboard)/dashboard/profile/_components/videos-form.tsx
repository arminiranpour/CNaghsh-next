"use client";

import { useEffect, useState, useTransition, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { VideoUploadField } from "@/components/media/VideoUploadField";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";

import { updateVideos } from "../actions";

type VideoFormEntry = {
  id: string;
  mediaId: string;
  title: string;
  order: string;
};

type VideosFormProps = {
  initialVideos: { mediaId: string; title?: string; order?: number }[];
};

function VideoPreview({ mediaId }: { mediaId: string }) {
  const [posterUrl, setPosterUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setPosterUrl(null);

    fetch(`/api/media/${mediaId}/manifest`, { cache: "no-store" })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP_${response.status}`);
        }
        return response.json() as Promise<{ posterUrl?: string | null }>;
      })
      .then((data) => {
        if (!active) {
          return;
        }
        const nextPoster =
          typeof data.posterUrl === "string" ? data.posterUrl : null;
        setPosterUrl(nextPoster);
      })
      .catch(() => {
        if (!active) {
          return;
        }
        setPosterUrl(null);
      })
      .finally(() => {
        if (active) {
          setIsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [mediaId]);

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-md border border-border/60 bg-muted">
      {posterUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={posterUrl}
          alt="پیش‌نمایش ویدئو"
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center px-2 text-center text-xs text-muted-foreground">
          {isLoading ? "در حال بارگذاری پیش‌نمایش..." : "پیش‌نمایش در دسترس نیست"}
        </div>
      )}
      <div className="absolute inset-x-2 bottom-2 truncate rounded bg-black/60 px-2 py-1 text-[11px] text-white" dir="ltr">
        {mediaId}
      </div>
    </div>
  );
}

export function VideosForm({ initialVideos }: VideosFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const [isUploadBusy, setIsUploadBusy] = useState(false);
  const [uploadKey, setUploadKey] = useState<number>(Date.now());
  const [uploadValue, setUploadValue] = useState<string | null>(null);
  const [entries, setEntries] = useState<VideoFormEntry[]>(() =>
    initialVideos.map((video, index) => ({
      id: `${video.mediaId}-${index}`,
      mediaId: video.mediaId,
      title: video.title ?? "",
      order: typeof video.order === "number" ? String(video.order) : "",
    })),
  );

  const getNextOrder = (list: VideoFormEntry[]) => {
    const numericOrders = list
      .map((entry) => Number.parseInt(entry.order, 10))
      .filter((value) => Number.isInteger(value));

    if (numericOrders.length === 0) {
      return list.length + 1;
    }

    return Math.max(...numericOrders) + 1;
  };

  const handleTitleChange = (id: string) => (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setEntries((prev) => prev.map((entry) => (entry.id === id ? { ...entry, title: value } : entry)));
    setFormError(null);
  };

  const handleOrderChange = (id: string) => (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setEntries((prev) => prev.map((entry) => (entry.id === id ? { ...entry, order: value } : entry)));
    setFormError(null);
  };

  const removeEntry = (id: string) => {
    setEntries((prev) => prev.filter((entry) => entry.id !== id));
    setFormError(null);
  };

  const handleNewVideoChange = (mediaId: string | null) => {
    setUploadValue(mediaId);

    if (!mediaId) {
      return;
    }

    let didAdd = false;

    setEntries((prev) => {
      if (prev.some((entry) => entry.mediaId === mediaId)) {
        setFormError("این ویدئو قبلاً اضافه شده است.");
        return prev;
      }

      const nextOrder = getNextOrder(prev);
      didAdd = true;

      return [
        ...prev,
        {
          id: `video-${Date.now()}`,
          mediaId,
          title: "",
          order: String(nextOrder),
        },
      ];
    });

    setUploadValue(null);
    setUploadKey(Date.now());
    if (didAdd) {
      setFormError(null);
    }
  };

  const buildPayload = (): { mediaId: string; title?: string; order?: number }[] | null => {
    const cleaned: { mediaId: string; title?: string; order?: number }[] = [];
    const seen = new Set<string>();

    for (const entry of entries) {
      const mediaId = entry.mediaId.trim();

      if (!mediaId) {
        continue;
      }

      if (seen.has(mediaId)) {
        setFormError("هر ویدئو باید یکتا باشد.");
        return null;
      }

      seen.add(mediaId);

      const title = entry.title.trim();
      const orderValue = entry.order.trim()
        ? Number.parseInt(entry.order.trim(), 10)
        : undefined;
      const order =
        orderValue !== undefined && Number.isInteger(orderValue) ? orderValue : undefined;

      cleaned.push({
        mediaId,
        ...(title ? { title } : {}),
        ...(order !== undefined ? { order } : {}),
      });
    }

    return cleaned;
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const payload = buildPayload();

    if (payload === null) {
      return;
    }

    const formData = new FormData();
    formData.set("videos", JSON.stringify(payload));

    startTransition(() => {
      updateVideos(formData)
        .then((result) => {
          if (result.ok) {
            toast({
              title: "ویدئوها ذخیره شد.",
              description: "لیست ویدئوها با موفقیت به‌روزرسانی شد.",
            });
            setFormError(null);
            router.refresh();
          } else {
            setFormError(result.error ?? "خطایی رخ داد. لطفاً دوباره تلاش کنید.");
          }
        })
        .catch(() => {
          setFormError("خطایی رخ داد. لطفاً دوباره تلاش کنید.");
        });
    });
  };

  const isBusy = isPending || isUploadBusy;

  return (
    <form className="space-y-6" dir="rtl" onSubmit={handleSubmit}>
      <div className="space-y-4">
        {entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">ویدیویی ثبت نشده است.</p>
        ) : (
          entries.map((entry, index) => {
            const titleId = `video-title-${entry.id}`;
            const orderId = `video-order-${entry.id}`;

            return (
              <div
                key={entry.id}
                className="grid gap-4 rounded-md border border-border p-4 shadow-sm lg:grid-cols-[220px,1fr,140px,auto]"
              >
                <div className="space-y-2">
                  <Label>پیش‌نمایش</Label>
                  <VideoPreview mediaId={entry.mediaId} />
                  <p className="text-xs text-muted-foreground" dir="ltr">
                    {entry.mediaId}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor={titleId}>عنوان</Label>
                  <Input
                    id={titleId}
                    value={entry.title}
                    onChange={handleTitleChange(entry.id)}
                    placeholder="مثلاً تیزر معرفی"
                    maxLength={200}
                    disabled={isBusy}
                  />
                  <p className="text-xs text-muted-foreground">
                    ویدئوی شماره {index + 1}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor={orderId}>ترتیب نمایش (اختیاری)</Label>
                  <Input
                    id={orderId}
                    type="number"
                    inputMode="numeric"
                    value={entry.order}
                    onChange={handleOrderChange(entry.id)}
                    placeholder="مثلاً 1"
                    disabled={isBusy}
                  />
                </div>

                <div className="flex items-end justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeEntry(entry.id)}
                    disabled={isBusy}
                  >
                    حذف
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="space-y-3 rounded-md border border-dashed border-border p-4">
        <VideoUploadField
          key={uploadKey}
          label="افزودن ویدئو جدید"
          description="پس از آماده شدن ویدئو، به لیست اضافه می‌شود."
          value={uploadValue}
          onValueChange={handleNewVideoChange}
          onBusyChange={setIsUploadBusy}
          disabled={isPending}
        />
      </div>

      {formError ? <p className="text-sm text-destructive">{formError}</p> : null}

      <div className="flex items-center justify-end">
        <Button type="submit" disabled={isBusy}>
          {isPending ? "در حال ذخیره..." : "ذخیره ویدئوها"}
        </Button>
      </div>
    </form>
  );
}
