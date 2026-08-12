/**
 * Pure due-date computation.
 *
 * Rule from the brief: `dueDate = applicationDeadline - dueOffsetDays`.
 *
 * All math is done in UTC on the calendar date only (no time component), so the
 * result is deterministic regardless of server timezone. Inputs and outputs use
 * ISO `YYYY-MM-DD` strings to match the Postgres `date` column.
 */
export function computeDueDate(applicationDeadline: string, dueOffsetDays: number): string {
  const [year, month, day] = applicationDeadline.split("-").map(Number);
  if (!year || !month || !day) {
    throw new Error(`Invalid deadline date: "${applicationDeadline}" (expected YYYY-MM-DD)`);
  }
  // Build a UTC timestamp for midnight of the deadline, subtract the offset in days.
  const deadlineUtc = Date.UTC(year, month - 1, day);
  // Reject out-of-range parts (e.g. "2026-13-01" or "2026-02-30") that Date.UTC
  // would otherwise silently roll over into a different month/year.
  const check = new Date(deadlineUtc);
  if (
    check.getUTCFullYear() !== year ||
    check.getUTCMonth() !== month - 1 ||
    check.getUTCDate() !== day
  ) {
    throw new Error(`Invalid deadline date: "${applicationDeadline}" (out of range)`);
  }
  const dueUtc = deadlineUtc - dueOffsetDays * 24 * 60 * 60 * 1000;
  const d = new Date(dueUtc);
  const yyyy = d.getUTCFullYear().toString().padStart(4, "0");
  const mm = (d.getUTCMonth() + 1).toString().padStart(2, "0");
  const dd = d.getUTCDate().toString().padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}
