/**
 * Pure reminder selection — no DB, no `Date.now()`. The caller passes `today`
 * so this stays deterministic and unit-testable.
 */
import type { ChecklistStatus } from "./readiness.ts";

export interface ReminderCandidate {
  requirementId: string;
  programId: string;
  programName: string;
  title: string;
  type: string;
  dueDate: string; // YYYY-MM-DD
  status: ChecklistStatus;
  required: boolean;
}

export interface Reminder extends ReminderCandidate {
  daysUntil: number; // negative = overdue
  overdue: boolean;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const toMs = (d: string) => Date.parse(`${d}T00:00:00Z`);

/**
 * Reminders = incomplete items whose due date falls on/before `today +
 * withinDays` (overdue items are always included), sorted by due date ascending.
 */
export function selectReminders(
  candidates: ReminderCandidate[],
  today: string,
  withinDays: number,
): Reminder[] {
  const todayMs = toMs(today);
  const horizonMs = todayMs + withinDays * DAY_MS;

  return candidates
    .filter((c) => c.status !== "complete")
    .filter((c) => toMs(c.dueDate) <= horizonMs)
    .map((c) => {
      const dueMs = toMs(c.dueDate);
      return {
        ...c,
        daysUntil: Math.round((dueMs - todayMs) / DAY_MS),
        overdue: dueMs < todayMs,
      };
    })
    .sort((a, b) =>
      a.dueDate < b.dueDate ? -1 : a.dueDate > b.dueDate ? 1 : a.title.localeCompare(b.title),
    );
}
