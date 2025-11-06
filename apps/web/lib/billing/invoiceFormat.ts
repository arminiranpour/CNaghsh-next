const jalaliFormatter = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
  dateStyle: "long",
});

const isoFormatter = new Intl.DateTimeFormat("en-CA", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  timeZone: "UTC",
});

const currencyFormatter = new Intl.NumberFormat("fa-IR", {
  maximumFractionDigits: 0,
  minimumFractionDigits: 0,
});

const numberFormatter = new Intl.NumberFormat("fa-IR");

export const formatInvoiceJalaliDate = (value: Date | string | null | undefined): string => {
  if (!value) {
    return "—";
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }
  return jalaliFormatter.format(date);
};

export const formatInvoiceIsoDate = (value: Date | string | null | undefined): string => {
  if (!value) {
    return "—";
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }
  const formatted = isoFormatter.format(date);
  return formatted.replace(/\//g, "-");
};

export const formatInvoiceCurrency = (amount: number | null | undefined): string => {
  if (typeof amount !== "number" || Number.isNaN(amount)) {
    return "۰ ریال";
  }
  return `${currencyFormatter.format(Math.trunc(amount))} ریال`;
};

export const formatInvoiceNumber = (value: number | string | null | undefined): string => {
  if (value === null || value === undefined) {
    return "—";
  }
  if (typeof value === "number") {
    return numberFormatter.format(value);
  }
  if (typeof value === "string" && value.trim().length > 0) {
    return value.replace(/[0-9]/g, (digit) => numberFormatter.format(Number(digit)));
  }
  return "—";
};

export const maskProviderReference = (reference: string | null | undefined): string => {
  if (!reference || reference.trim().length === 0) {
    return "—";
  }
  const trimmed = reference.trim();
  if (trimmed.length <= 4) {
    return `****${trimmed}`;
  }
  const visible = trimmed.slice(-4);
  return `${"•".repeat(trimmed.length - 4)}${visible}`;
};
