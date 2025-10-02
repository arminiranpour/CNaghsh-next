export const formatRials = (amount: number): string => {
  const formatter = new Intl.NumberFormat("fa-IR", {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0
  });

  return `${formatter.format(Math.trunc(amount))} ریال`;
};