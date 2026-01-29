"use client";

import { useEffect, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";

type Genre = {
  id: string;
  slug: string;
  nameEn: string;
  nameFa: string;
};

type GenreListResponse = {
  items: Genre[];
};

type GenreMutationResponse = {
  ok: boolean;
  id?: string;
  error?: string;
  fieldErrors?: Partial<Record<"slug" | "nameEn" | "nameFa", string>>;
};

function GenreRow({
  genre,
  onUpdated,
  onDeleted,
}: {
  genre: Genre;
  onUpdated: (next: Genre) => void;
  onDeleted: (id: string) => void;
}) {
  const { toast } = useToast();
  const [values, setValues] = useState(genre);
  const [errors, setErrors] = useState<Partial<Record<"slug" | "nameEn" | "nameFa", string>>>({});
  const [isPending, startTransition] = useTransition();

  const handleSave = () => {
    startTransition(async () => {
      const response = await fetch(`/api/admin/genres/${genre.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const payload = (await response.json().catch(() => null)) as GenreMutationResponse | null;

      if (!response.ok || !payload?.ok) {
        setErrors(payload?.fieldErrors ?? {});
        toast({
          variant: "destructive",
          description: payload?.error ?? "ذخیره ژانر ناموفق بود.",
        });
        return;
      }

      setErrors({});
      onUpdated(values);
      toast({ description: "ژانر بروزرسانی شد." });
    });
  };

  const handleDelete = () => {
    const confirmed = window.confirm("آیا از حذف این ژانر مطمئن هستید؟");
    if (!confirmed) {
      return;
    }

    startTransition(async () => {
      const response = await fetch(`/api/admin/genres/${genre.id}`, {
        method: "DELETE",
      });
      const payload = (await response.json().catch(() => null)) as GenreMutationResponse | null;

      if (!response.ok || !payload?.ok) {
        toast({
          variant: "destructive",
          description: payload?.error ?? "حذف ژانر ناموفق بود.",
        });
        return;
      }

      onDeleted(genre.id);
      toast({ description: "ژانر حذف شد." });
    });
  };

  return (
    <div className="grid gap-3 rounded-md border border-border bg-background p-4 md:grid-cols-4 md:items-end">
      <div className="space-y-1">
        <Label htmlFor={`slug-${genre.id}`}>شناسه</Label>
        <Input
          id={`slug-${genre.id}`}
          value={values.slug}
          onChange={(event) => setValues((prev) => ({ ...prev, slug: event.target.value }))}
        />
        {errors.slug ? <p className="text-xs text-destructive">{errors.slug}</p> : null}
      </div>
      <div className="space-y-1">
        <Label htmlFor={`nameFa-${genre.id}`}>نام فارسی</Label>
        <Input
          id={`nameFa-${genre.id}`}
          value={values.nameFa}
          onChange={(event) => setValues((prev) => ({ ...prev, nameFa: event.target.value }))}
        />
        {errors.nameFa ? <p className="text-xs text-destructive">{errors.nameFa}</p> : null}
      </div>
      <div className="space-y-1">
        <Label htmlFor={`nameEn-${genre.id}`}>نام انگلیسی</Label>
        <Input
          id={`nameEn-${genre.id}`}
          value={values.nameEn}
          onChange={(event) => setValues((prev) => ({ ...prev, nameEn: event.target.value }))}
        />
        {errors.nameEn ? <p className="text-xs text-destructive">{errors.nameEn}</p> : null}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" disabled={isPending} onClick={handleSave}>
          {isPending ? "در حال ذخیره..." : "ذخیره"}
        </Button>
        <Button type="button" variant="destructive" size="sm" disabled={isPending} onClick={handleDelete}>
          حذف
        </Button>
      </div>
    </div>
  );
}

export function GenresPanel() {
  const { toast } = useToast();
  const [genres, setGenres] = useState<Genre[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [createValues, setCreateValues] = useState({ slug: "", nameFa: "", nameEn: "" });
  const [createErrors, setCreateErrors] = useState<Partial<Record<"slug" | "nameFa" | "nameEn", string>>>({});
  const [isPending, startTransition] = useTransition();

  const loadGenres = () => {
    setStatus("loading");
    fetch("/api/admin/genres")
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("failed");
        }
        const payload = (await response.json().catch(() => null)) as GenreListResponse | null;
        setGenres(payload?.items ?? []);
        setStatus("idle");
      })
      .catch(() => {
        setStatus("error");
      });
  };

  useEffect(() => {
    loadGenres();
  }, []);

  const handleCreate = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    startTransition(async () => {
      const response = await fetch("/api/admin/genres", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createValues),
      });
      const payload = (await response.json().catch(() => null)) as GenreMutationResponse | null;

      if (!response.ok || !payload?.ok) {
        setCreateErrors(payload?.fieldErrors ?? {});
        toast({
          variant: "destructive",
          description: payload?.error ?? "ثبت ژانر ناموفق بود.",
        });
        return;
      }

      setCreateErrors({});
      setCreateValues({ slug: "", nameFa: "", nameEn: "" });
      toast({ description: "ژانر ثبت شد." });
      loadGenres();
    });
  };

  return (
    <div className="space-y-6" dir="rtl">
      <form onSubmit={handleCreate} className="grid gap-3 rounded-md border border-border bg-background p-4 md:grid-cols-4 md:items-end">
        <div className="space-y-1">
          <Label htmlFor="new-slug">شناسه</Label>
          <Input
            id="new-slug"
            value={createValues.slug}
            onChange={(event) => setCreateValues((prev) => ({ ...prev, slug: event.target.value }))}
          />
          {createErrors.slug ? <p className="text-xs text-destructive">{createErrors.slug}</p> : null}
        </div>
        <div className="space-y-1">
          <Label htmlFor="new-name-fa">نام فارسی</Label>
          <Input
            id="new-name-fa"
            value={createValues.nameFa}
            onChange={(event) => setCreateValues((prev) => ({ ...prev, nameFa: event.target.value }))}
          />
          {createErrors.nameFa ? <p className="text-xs text-destructive">{createErrors.nameFa}</p> : null}
        </div>
        <div className="space-y-1">
          <Label htmlFor="new-name-en">نام انگلیسی</Label>
          <Input
            id="new-name-en"
            value={createValues.nameEn}
            onChange={(event) => setCreateValues((prev) => ({ ...prev, nameEn: event.target.value }))}
          />
          {createErrors.nameEn ? <p className="text-xs text-destructive">{createErrors.nameEn}</p> : null}
        </div>
        <div className="flex items-center gap-2">
          <Button type="submit" size="sm" disabled={isPending}>
            {isPending ? "در حال ذخیره..." : "افزودن ژانر"}
          </Button>
        </div>
      </form>

      {status === "error" ? (
        <p className="text-sm text-destructive">بارگذاری ژانرها ناموفق بود.</p>
      ) : null}

      <div className="space-y-3">
        {genres.map((genre) => (
          <GenreRow
            key={genre.id}
            genre={genre}
            onUpdated={(next) =>
              setGenres((prev) => prev.map((item) => (item.id === next.id ? next : item)))
            }
            onDeleted={(id) => setGenres((prev) => prev.filter((item) => item.id !== id))}
          />
        ))}
        {genres.length === 0 && status !== "loading" ? (
          <p className="text-sm text-muted-foreground">ژانری ثبت نشده است.</p>
        ) : null}
      </div>
    </div>
  );
}
