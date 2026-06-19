const persianDateFormatter = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
  dateStyle: "medium",
});

const persianDateTimeFormatter = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
  dateStyle: "medium",
  timeStyle: "short",
});

export const formatJalaliDate = (value?: Date | string | null): string => {
  if (!value) {
    return "—";
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }
  return persianDateFormatter.format(date);
};

export const formatJalaliDateTime = (value?: Date | string | null): string => {
  if (!value) {
    return "—";
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }
  return persianDateTimeFormatter.format(date);
};

export const toIsoString = (value?: Date | string | null): string | null => {
  if (!value) {
    return null;
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toISOString();
};

export const parseDateInput = (value: string | undefined | null): Date | undefined => {
  if (!value) {
    return undefined;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return undefined;
  }
  return date;
};

export const formatJalaliDateRangeNoYear = (
  startValue?: Date | string | null,
  endValue?: Date | string | null,
): string => {
  if (!startValue || !endValue) return "—";

  const startDate = startValue instanceof Date ? startValue : new Date(startValue);
  const endDate = endValue instanceof Date ? endValue : new Date(endValue);

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return "—";
  }

  const dayFormatter = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
    day: "numeric",
  });

  const monthFormatter = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
    month: "long",
  });

  const startDay = dayFormatter.format(startDate);
  const endDay = dayFormatter.format(endDate);
  const startMonth = monthFormatter.format(startDate);
  const endMonth = monthFormatter.format(endDate);

  if (startMonth === endMonth) {
    return `${startDay} تا ${endDay} ${endMonth}`;
  }

  return `${startDay} ${startMonth} تا ${endDay} ${endMonth}`;
};