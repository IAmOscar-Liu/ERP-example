import { Response } from "express";
import { ServiceResponse } from "../type/general";

export function sendJsonResponse<T>(res: Response, result: ServiceResponse<T>) {
  res.status(result.statusCode ?? 200).json(result);
}

/**
 * Convert a JS Date to "YYYY-MM-DD" in a specific timezone.
 *
 * @param date JS Date object
 * @param timeZone e.g. "Asia/Taipei", "America/New_York"
 */
export function toDateOnlyString(date: Date, timeZone: string = "UTC"): string {
  // Use Intl API to convert the date to the target timezone
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  // en-CA outputs YYYY-MM-DD format by default
  // but it may contain slashes depending on environment, so normalize:
  const parts = formatter.formatToParts(date);

  const year = parts.find((p) => p.type === "year")!.value;
  const month = parts.find((p) => p.type === "month")!.value;
  const day = parts.find((p) => p.type === "day")!.value;

  return `${year}-${month}-${day}`;
}
