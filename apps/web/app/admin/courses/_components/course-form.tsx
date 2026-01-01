"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { CourseDurationUnit, CourseStatus } from "@prisma/client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";

import type { ActionResult, CourseFormValues } from "../actions";

type CourseAction = (values: CourseFormValues) => Promise<ActionResult<keyof CourseFormValues>>;

type CourseFormProps = {
  action: CourseAction;
  submitLabel: string;
  redirectTo?: string;
  initialValues?: CourseFormValues;
  showStatus?: boolean;
};

type FormErrors = Partial<Record<keyof CourseFormValues, string>>;

const durationOptions: Array<{ value: CourseDurationUnit; label: string }> = [
  { value: "day", label: "Day" },
  { value: "month", label: "Month" },
  { value: "year", label: "Year" },
];

const statusOptions: Array<{ value: CourseStatus; label: string }> = [
  { value: "draft", label: "Draft" },
  { value: "published", label: "Published" },
  { value: "archived", label: "Archived" },
];

const DEFAULT_VALUES: CourseFormValues = {
  title: "",
  description: "",
  ageRangeText: "",
  durationValue: 1,
  durationUnit: "month",
  instructorName: "",
  prerequisiteText: "",
  bannerMediaAssetId: "",
  introVideoMediaAssetId: "",
  status: "draft",
};

export function CourseForm({
  action,
  submitLabel,
  redirectTo,
  initialValues,
  showStatus = false,
}: CourseFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [values, setValues] = useState<CourseFormValues>(initialValues ?? DEFAULT_VALUES);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isPending, startTransition] = useTransition();
  const lastBannerMediaAssetId = useRef(initialValues?.bannerMediaAssetId ?? "");

  useEffect(() => {
    const nextBannerMediaAssetId = initialValues?.bannerMediaAssetId ?? "";
    setValues((prev) => {
      if (prev.bannerMediaAssetId !== lastBannerMediaAssetId.current) {
        return prev;
      }
      if (prev.bannerMediaAssetId === nextBannerMediaAssetId) {
        return prev;
      }
      return { ...prev, bannerMediaAssetId: nextBannerMediaAssetId };
    });
    lastBannerMediaAssetId.current = nextBannerMediaAssetId;
  }, [initialValues?.bannerMediaAssetId]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    startTransition(async () => {
      const result = await action(values);
      if (!result.ok) {
        setErrors(result.fieldErrors ?? {});
        toast({ variant: "destructive", description: result.error });
        return;
      }
      setErrors({});
      toast({ description: "Saved." });
      if (redirectTo) {
        router.push(redirectTo);
      } else {
        router.refresh();
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-6 rounded-md border border-border bg-background p-6">
        <div className="space-y-2">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            value={values.title}
            onChange={(event) => setValues((prev) => ({ ...prev, title: event.target.value }))}
          />
          {errors.title ? <p className="text-xs text-destructive">{errors.title}</p> : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={values.description}
            onChange={(event) =>
              setValues((prev) => ({ ...prev, description: event.target.value }))
            }
          />
          {errors.description ? (
            <p className="text-xs text-destructive">{errors.description}</p>
          ) : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor="ageRangeText">Age Range</Label>
          <Input
            id="ageRangeText"
            value={values.ageRangeText}
            onChange={(event) =>
              setValues((prev) => ({ ...prev, ageRangeText: event.target.value }))
            }
          />
          {errors.ageRangeText ? (
            <p className="text-xs text-destructive">{errors.ageRangeText}</p>
          ) : null}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="durationValue">Duration Value</Label>
            <Input
              id="durationValue"
              type="number"
              min={1}
              value={values.durationValue}
              onChange={(event) =>
                setValues((prev) => ({
                  ...prev,
                  durationValue: Number(event.target.value),
                }))
              }
            />
            {errors.durationValue ? (
              <p className="text-xs text-destructive">{errors.durationValue}</p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label>Duration Unit</Label>
            <Select
              value={values.durationUnit}
              onValueChange={(value: CourseDurationUnit) =>
                setValues((prev) => ({ ...prev, durationUnit: value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select unit" />
              </SelectTrigger>
              <SelectContent>
                {durationOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.durationUnit ? (
              <p className="text-xs text-destructive">{errors.durationUnit}</p>
            ) : null}
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="instructorName">Instructor</Label>
          <Input
            id="instructorName"
            value={values.instructorName}
            onChange={(event) =>
              setValues((prev) => ({ ...prev, instructorName: event.target.value }))
            }
          />
          {errors.instructorName ? (
            <p className="text-xs text-destructive">{errors.instructorName}</p>
          ) : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor="prerequisiteText">Prerequisites</Label>
          <Textarea
            id="prerequisiteText"
            value={values.prerequisiteText}
            onChange={(event) =>
              setValues((prev) => ({ ...prev, prerequisiteText: event.target.value }))
            }
          />
          {errors.prerequisiteText ? (
            <p className="text-xs text-destructive">{errors.prerequisiteText}</p>
          ) : null}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="bannerMediaAssetId">Banner Media Asset ID</Label>
            <Input
              id="bannerMediaAssetId"
              value={values.bannerMediaAssetId ?? ""}
              onChange={(event) =>
                setValues((prev) => ({ ...prev, bannerMediaAssetId: event.target.value }))
              }
            />
            {errors.bannerMediaAssetId ? (
              <p className="text-xs text-destructive">{errors.bannerMediaAssetId}</p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="introVideoMediaAssetId">Intro Video Media Asset ID</Label>
            <Input
              id="introVideoMediaAssetId"
              value={values.introVideoMediaAssetId ?? ""}
              onChange={(event) =>
                setValues((prev) => ({ ...prev, introVideoMediaAssetId: event.target.value }))
              }
            />
            {errors.introVideoMediaAssetId ? (
              <p className="text-xs text-destructive">{errors.introVideoMediaAssetId}</p>
            ) : null}
          </div>
        </div>
        {showStatus ? (
          <div className="space-y-2">
            <Label>Status</Label>
            <Select
              value={values.status ?? "draft"}
              onValueChange={(value: CourseStatus) =>
                setValues((prev) => ({ ...prev, status: value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.status ? <p className="text-xs text-destructive">{errors.status}</p> : null}
          </div>
        ) : null}
      </div>
      <div className="flex justify-end">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}
