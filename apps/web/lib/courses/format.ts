import type { CourseDurationUnit, DayOfWeek } from "@prisma/client";

const rialFormatter = new Intl.NumberFormat("fa-IR", {
  maximumFractionDigits: 0,
  minimumFractionDigits: 0,
});

const durationLabels: Record<CourseDurationUnit, string> = {
  day: "روز",
  month: "ماه",
  year: "سال",
};

const dayLabels: Record<DayOfWeek, string> = {
  sat: "شنبه",
  sun: "یکشنبه",
  mon: "دوشنبه",
  tue: "سه‌شنبه",
  wed: "چهارشنبه",
  thu: "پنج‌شنبه",
  fri: "جمعه",
};

export function formatIrr(amount: number): string {
  if (!Number.isFinite(amount)) {
    return "0 ریال";
  }
  return `${rialFormatter.format(Math.abs(Math.trunc(amount)))} ریال`;
}

export function formatMinutesToTime(totalMinutes: number): string {
  if (!Number.isFinite(totalMinutes)) {
    return "—";
  }
  const normalized = Math.min(Math.max(Math.trunc(totalMinutes), 0), 24 * 60);
  const hours = Math.floor(normalized / 60);
  const minutes = normalized % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function formatCourseDuration(value: number, unit: CourseDurationUnit): string {
  const label = durationLabels[unit] ?? unit;
  return `${value} ${label}`;
}

export function formatDayOfWeek(day: DayOfWeek): string {
  return dayLabels[day] ?? day;
}
