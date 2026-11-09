const MS_PER_DAY = 86_400_000;
// IST is UTC+5:30 with no DST; the day starts at 06:00 IST, so shift by +5:30 − 6:00 = −0:30.
const DAY_START_OFFSET_MS = -30 * 60 * 1000;

/** The tracker day (YYYY-MM-DD) for an instant: 06:00–06:00 Asia/Kolkata. */
export function currentDay(now: Date): string {
  return new Date(now.getTime() + DAY_START_OFFSET_MS).toISOString().slice(0, 10);
}

export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / MS_PER_DAY);
}
