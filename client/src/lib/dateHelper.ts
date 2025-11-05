import { format, formatDistanceToNow, parseISO } from "date-fns";

export const OFFER_EXPIRED_DATE_FORMAT = "MMM dd, yyyy";
export const OFFER_EXPIRED_DATE_FORMAT_WITH_COMMA = "MMM dd, yyyy, h:mm a";

export const dateHelper = (
  isoDateStr: string,
  dateFormat: string = OFFER_EXPIRED_DATE_FORMAT
) => {
  try {
    const date = parseISO(isoDateStr);
    return format(date, dateFormat);
  } catch {
    return isoDateStr;
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
