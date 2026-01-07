"use client";

import { useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { DayOfWeek } from "@prisma/client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";

import {
  addScheduleDayAction,
  addScheduleSlotAction,
  removeScheduleDayAction,
  removeScheduleSlotAction,
  updateScheduleSlotAction,
} from "../actions";

type ScheduleSlot = {
  id: string;
  title: string | null;
  startMinute: number;
  endMinute: number;
};

type ScheduleDay = {
  id: string;
  dayOfWeek: DayOfWeek;
  classSlots: ScheduleSlot[];
};

type ScheduleEditorProps = {
  courseId: string;
  semesterId: string;
  days: ScheduleDay[];
};

const dayOptions: Array<{ value: DayOfWeek; label: string }> = [
  { value: "sat", label: "Saturday" },
  { value: "sun", label: "Sunday" },
  { value: "mon", label: "Monday" },
  { value: "tue", label: "Tuesday" },
  { value: "wed", label: "Wednesday" },
  { value: "thu", label: "Thursday" },
  { value: "fri", label: "Friday" },
];

const dayOrder = dayOptions.map((option) => option.value);

function toTimeValue(minutes: number) {
  const safeMinutes = Math.max(0, Math.min(1440, minutes));
  const hours = Math.floor(safeMinutes / 60)
    .toString()
    .padStart(2, "0");
  const mins = (safeMinutes % 60).toString().padStart(2, "0");
  return `${hours}:${mins}`;
}

function toMinutes(value: string) {
  const [hoursRaw, minutesRaw] = value.split(":");
  const hours = Number(hoursRaw);
  const minutes = Number(minutesRaw);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return null;
  }
  const total = hours * 60 + minutes;
  if (total < 0 || total > 1440) {
    return null;
  }
  return total;
}

export function ScheduleEditor({ courseId, semesterId, days }: ScheduleEditorProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const orderedDays = useMemo(() => {
    return [...days].sort(
      (a, b) => dayOrder.indexOf(a.dayOfWeek) - dayOrder.indexOf(b.dayOfWeek)
    );
  }, [days]);

  const availableDays = useMemo(() => {
    const used = new Set(days.map((day) => day.dayOfWeek));
    return dayOptions.filter((option) => !used.has(option.value));
  }, [days]);

  const handleAddDay = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(event.currentTarget);
    const dayOfWeek = formData.get("dayOfWeek");
    if (typeof dayOfWeek !== "string") {
      toast({ variant: "destructive", description: "Select a day." });
      return;
    }
    startTransition(async () => {
      const result = await addScheduleDayAction({
        courseId,
        semesterId,
        dayOfWeek: dayOfWeek as DayOfWeek,
      });
      if (!result.ok) {
        toast({ variant: "destructive", description: result.error });
        return;
      }
      form.reset();
      router.refresh();
    });
  };

  const handleRemoveDay = (scheduleDayId: string) => {
    startTransition(async () => {
      const result = await removeScheduleDayAction(courseId, semesterId, scheduleDayId);
      if (!result.ok) {
        toast({ variant: "destructive", description: result.error });
        return;
      }
      router.refresh();
    });
  };

  const handleAddSlot = (scheduleDayId: string, event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(event.currentTarget);
    const title = (formData.get("title") as string | null) ?? "";
    const start = formData.get("start") as string | null;
    const end = formData.get("end") as string | null;
    const startMinute = start ? toMinutes(start) : null;
    const endMinute = end ? toMinutes(end) : null;
    if (startMinute === null || endMinute === null) {
      toast({ variant: "destructive", description: "Invalid time range." });
      return;
    }
    startTransition(async () => {
      const result = await addScheduleSlotAction({
        courseId,
        semesterId,
        scheduleDayId,
        title: title?.trim() || null,
        startMinute,
        endMinute,
      });
      if (!result.ok) {
        toast({ variant: "destructive", description: result.error });
        return;
      }
      form.reset();
      router.refresh();
    });
  };

  const handleUpdateSlot = (slotId: string, scheduleDayId: string, event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const title = (formData.get("title") as string | null) ?? "";
    const start = formData.get("start") as string | null;
    const end = formData.get("end") as string | null;
    const startMinute = start ? toMinutes(start) : null;
    const endMinute = end ? toMinutes(end) : null;
    if (startMinute === null || endMinute === null) {
      toast({ variant: "destructive", description: "Invalid time range." });
      return;
    }
    startTransition(async () => {
      const result = await updateScheduleSlotAction({
        courseId,
        semesterId,
        scheduleDayId,
        slotId,
        title: title?.trim() || null,
        startMinute,
        endMinute,
      });
      if (!result.ok) {
        toast({ variant: "destructive", description: result.error });
        return;
      }
      router.refresh();
    });
  };

  const handleRemoveSlot = (slotId: string) => {
    startTransition(async () => {
      const result = await removeScheduleSlotAction(courseId, semesterId, slotId);
      if (!result.ok) {
        toast({ variant: "destructive", description: result.error });
        return;
      }
      router.refresh();
    });
  };

  return (
    <div className="space-y-6 rounded-md border border-border bg-background p-6">
      <div className="space-y-2">
        <h2 className="text-lg font-semibold">Weekly Schedule</h2>
        <p className="text-sm text-muted-foreground">
          Add days and class slots. Times are in local time.
        </p>
      </div>
      <form className="flex flex-wrap items-end gap-3" onSubmit={handleAddDay}>
        <div className="space-y-2">
          <Label htmlFor="dayOfWeek">Day</Label>
          <select
            id="dayOfWeek"
            name="dayOfWeek"
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            disabled={availableDays.length === 0}
            defaultValue={availableDays[0]?.value}
          >
            {availableDays.length === 0 ? (
              <option value="">All days added</option>
            ) : (
              availableDays.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))
            )}
          </select>
        </div>
        <Button type="submit" size="sm" disabled={isPending || availableDays.length === 0}>
          Add Day
        </Button>
      </form>
      <div className="space-y-6">
        {orderedDays.length === 0 ? (
          <p className="text-sm text-muted-foreground">No schedule days yet.</p>
        ) : (
          orderedDays.map((day) => (
            <div key={day.id} className="space-y-4 rounded-md border border-border p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-base font-semibold">
                  {dayOptions.find((option) => option.value === day.dayOfWeek)?.label ??
                    day.dayOfWeek}
                </h3>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={isPending}
                  onClick={() => handleRemoveDay(day.id)}
                >
                  Remove Day
                </Button>
              </div>
              <div className="space-y-3">
                {day.classSlots.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No slots yet.</p>
                ) : (
                  day.classSlots
                    .slice()
                    .sort((a, b) => a.startMinute - b.startMinute)
                    .map((slot) => (
                      <form
                        key={slot.id}
                        className="grid gap-3 rounded-md border border-border p-3 md:grid-cols-5"
                        onSubmit={(event) => handleUpdateSlot(slot.id, day.id, event)}
                      >
                        <div className="space-y-1 md:col-span-2">
                          <Label>Title</Label>
                          <Input name="title" defaultValue={slot.title ?? ""} />
                        </div>
                        <div className="space-y-1">
                          <Label>Start</Label>
                          <Input name="start" type="time" defaultValue={toTimeValue(slot.startMinute)} />
                        </div>
                        <div className="space-y-1">
                          <Label>End</Label>
                          <Input name="end" type="time" defaultValue={toTimeValue(slot.endMinute)} />
                        </div>
                        <div className="flex items-end gap-2">
                          <Button type="submit" size="sm" disabled={isPending}>
                            Update
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="destructive"
                            disabled={isPending}
                            onClick={() => handleRemoveSlot(slot.id)}
                          >
                            Remove
                          </Button>
                        </div>
                      </form>
                    ))
                )}
              </div>
              <form
                className="grid gap-3 rounded-md border border-dashed border-border p-3 md:grid-cols-5"
                onSubmit={(event) => handleAddSlot(day.id, event)}
              >
                <div className="space-y-1 md:col-span-2">
                  <Label>Title</Label>
                  <Input name="title" placeholder="Optional" />
                </div>
                <div className="space-y-1">
                  <Label>Start</Label>
                  <Input name="start" type="time" required />
                </div>
                <div className="space-y-1">
                  <Label>End</Label>
                  <Input name="end" type="time" required />
                </div>
                <div className="flex items-end">
                  <Button type="submit" size="sm" disabled={isPending}>
                    Add Slot
                  </Button>
                </div>
              </form>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
