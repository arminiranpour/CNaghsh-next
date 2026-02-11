const PERSIAN_DIGITS = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];
const ASCII_DIGIT_REGEX = /\d/g;

export const toPersianDigits = (value: string | number | null | undefined): string => {
  if (value === null || value === undefined) {
    return "";
  }

  const input = typeof value === "number" ? value.toString() : value;
  if (input.length === 0) {
    return "";
  }

  return input.replace(ASCII_DIGIT_REGEX, (digit) => PERSIAN_DIGITS[Number(digit)] ?? digit);
};
