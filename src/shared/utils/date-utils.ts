/**
 * Get current UTC timestamp
 */
export function now(): Date {
  return new Date();
}

/**
 * Get current ISO string
 */
export function nowISO(): string {
  return now().toISOString();
}

/**
 * Add milliseconds to a date
 */
export function addMilliseconds(date: Date, ms: number): Date {
  return new Date(date.getTime() + ms);
}

/**
 * Add seconds to a date
 */
export function addSeconds(date: Date, seconds: number): Date {
  return addMilliseconds(date, seconds * 1000);
}

/**
 * Add minutes to a date
 */
export function addMinutes(date: Date, minutes: number): Date {
  return addSeconds(date, minutes * 60);
}

/**
 * Add hours to a date
 */
export function addHours(date: Date, hours: number): Date {
  return addMinutes(date, hours * 60);
}

/**
 * Add days to a date
 */
export function addDays(date: Date, days: number): Date {
  return addHours(date, days * 24);
}

/**
 * Check if a date is expired (older than given milliseconds)
 */
export function isExpired(date: Date, maxAgeMs: number): boolean {
  return now().getTime() - date.getTime() > maxAgeMs;
}

/**
 * Get Unix timestamp in seconds
 */
export function toUnixTimestamp(date: Date): number {
  return Math.floor(date.getTime() / 1000);
}

/**
 * Create date from Unix timestamp (seconds)
 */
export function fromUnixTimestamp(timestamp: number): Date {
  return new Date(timestamp * 1000);
}
