import { format, formatDistanceToNow, parse } from "date-fns";

export const OFFER_EXPIRED_DATE_FORMAT = "MMM dd, yyyy";
export const OFFER_EXPIRED_DATE_FORMAT_WITH_COMMA = "MMM dd, yyyy, h:mm a";

export const DATE_FORMAT_DD_MM_YYYY = "dd/MM/yyyy";
export const DATE_FORMAT_DD_MM_YYYY_WITH_TIME = "dd/MM/yyyy, h:mm a";

export const dateHelper = (
  input: string,
  dateFormat: string = OFFER_EXPIRED_DATE_FORMAT,
) => {
  try {
    // Case 1: YYYY-MM-DD → Safe
    if (/^\d{4}-\d{2}-\d{2}$/.test(input)) {
      return format(parse(input, "yyyy-MM-dd", new Date()), dateFormat);
    }

    // Case 2: Full ISO timestamp → extract yyyy-mm-dd manually
    const match = input.match(/^(\d{4}-\d{2}-\d{2})/);
    if (match) {
      const dateOnly = match[1]; // "2025-11-16"
      const date = parse(dateOnly, "yyyy-MM-dd", new Date());
      return format(date, dateFormat); // "Nov 16, 2025"
    }

    return input;
  } catch {
    return input;
  }
};

export const formatDateDDMMYYYY = (
  input: string,
  dateFormat: string = DATE_FORMAT_DD_MM_YYYY,
) => {
  try {
    if (!input) return "";

    // Case 1: YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(input)) {
      return format(parse(input, "yyyy-MM-dd", new Date()), dateFormat);
    }

    // Case 2: Full ISO timestamp
    const match = input.match(/^(\d{4}-\d{2}-\d{2})/);
    if (match) {
      const dateOnly = match[1];
      const date = parse(dateOnly, "yyyy-MM-dd", new Date());
      return format(date, dateFormat);
    }

    // Case 3: fallback for general date string
    const date = new Date(input);
    if (!isNaN(date.getTime())) {
      return format(date, dateFormat);
    }

    return input;
  } catch {
    return input;
  }
};

export const getTimeAgo = (date: Date) => {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 30) return "just now";
  return formatDistanceToNow(date, { addSuffix: true });
};

export const getFormattedExpiredDate = (date: Date | string) => {
  if (!date) return "";
  return format(date, OFFER_EXPIRED_DATE_FORMAT_WITH_COMMA);
};
