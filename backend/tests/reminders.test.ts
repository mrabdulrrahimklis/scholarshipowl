import { describe, expect, it } from "vitest";
import { selectReminders, type ReminderCandidate } from "../src/domain/reminders.ts";

function cand(
  id: string,
  dueDate: string,
  over: Partial<ReminderCandidate> = {},
): ReminderCandidate {
  return {
    requirementId: id,
    programId: "p1",
    programName: "Program 1",
    title: `Req ${id}`,
    type: "essay",
    dueDate,
    status: "not_started",
    required: true,
    ...over,
  };
}

const TODAY = "2026-11-10";

describe("selectReminders", () => {
  it("includes items due within the window and excludes those beyond it", () => {
    const items = [
      cand("a", "2026-11-12"), // in 2 days → included (within 14)
      cand("b", "2026-11-30"), // in 20 days → excluded (beyond 14)
    ];
    const r = selectReminders(items, TODAY, 14);
    expect(r.map((x) => x.requirementId)).toEqual(["a"]);
  });

  it("always includes overdue items and flags them", () => {
    const r = selectReminders([cand("late", "2026-11-01")], TODAY, 14);
    expect(r).toHaveLength(1);
    expect(r[0]!.overdue).toBe(true);
    expect(r[0]!.daysUntil).toBe(-9);
  });

  it("excludes completed items", () => {
    const r = selectReminders([cand("done", "2026-11-11", { status: "complete" })], TODAY, 14);
    expect(r).toHaveLength(0);
  });

  it("orders reminders by due date ascending", () => {
    const items = [cand("c", "2026-11-14"), cand("a", "2026-11-10"), cand("b", "2026-11-12")];
    const r = selectReminders(items, TODAY, 14);
    expect(r.map((x) => x.dueDate)).toEqual(["2026-11-10", "2026-11-12", "2026-11-14"]);
  });

  it("computes daysUntil relative to today", () => {
    const r = selectReminders([cand("x", "2026-11-13")], TODAY, 14);
    expect(r[0]!.daysUntil).toBe(3);
    expect(r[0]!.overdue).toBe(false);
  });
});
