import { describe, expect, it } from "vitest";
import {
  computeReadiness,
  type ChecklistItemView,
  type RequirementView,
} from "../src/domain/readiness.ts";

function req(id: string, opts: Partial<RequirementView> = {}): RequirementView {
  return {
    id,
    type: "essay",
    title: `Req ${id}`,
    description: "",
    required: true,
    evidenceType: "text",
    dueDate: "2026-11-01",
    ...opts,
  };
}

describe("computeReadiness", () => {
  it("scores completed required / total required", () => {
    const reqs = [req("1"), req("2"), req("3"), req("4")];
    const items: ChecklistItemView[] = [
      { requirementId: "1", status: "complete", notes: "" },
      { requirementId: "2", status: "complete", notes: "" },
      { requirementId: "3", status: "in_progress", notes: "" },
    ];
    const r = computeReadiness(reqs, items);
    expect(r.completedRequired).toBe(2);
    expect(r.totalRequired).toBe(4);
    expect(r.readinessScore).toBe(0.5);
  });

  it("excludes optional requirements from the score but tracks them as missing", () => {
    const reqs = [req("1"), req("2", { required: false })];
    const items: ChecklistItemView[] = [{ requirementId: "1", status: "complete", notes: "" }];
    const r = computeReadiness(reqs, items);
    expect(r.totalRequired).toBe(1);
    expect(r.completedRequired).toBe(1);
    expect(r.readinessScore).toBe(1);
    // Optional req 2 is incomplete → still surfaced as missing.
    expect(r.missingRequirements.map((m) => m.requirementId)).toContain("2");
  });

  it("treats a requirement with no checklist item as missing", () => {
    const reqs = [req("1"), req("2")];
    const r = computeReadiness(reqs, []);
    expect(r.missingRequirements).toHaveLength(2);
    expect(r.readinessScore).toBe(0);
  });

  it("returns 1.0 when there are no required requirements (nothing outstanding)", () => {
    const reqs = [req("1", { required: false })];
    const r = computeReadiness(reqs, []);
    expect(r.readinessScore).toBe(1);
    expect(r.totalRequired).toBe(0);
  });

  it("orders timeline chronologically and nextMilestones excludes completed", () => {
    const reqs = [
      req("a", { dueDate: "2026-12-01" }),
      req("b", { dueDate: "2026-10-01" }),
      req("c", { dueDate: "2026-11-01" }),
    ];
    const items: ChecklistItemView[] = [{ requirementId: "b", status: "complete", notes: "" }];
    const r = computeReadiness(reqs, items);
    expect(r.timeline.map((e) => e.date)).toEqual(["2026-10-01", "2026-11-01", "2026-12-01"]);
    // completed 'b' is dropped from nextMilestones
    expect(r.nextMilestones.map((e) => e.id)).toEqual(["c", "a"]);
  });

  it("keeps missing requirements sorted by due date", () => {
    const reqs = [req("a", { dueDate: "2026-12-01" }), req("b", { dueDate: "2026-10-01" })];
    const r = computeReadiness(reqs, []);
    expect(r.missingRequirements.map((m) => m.dueDate)).toEqual(["2026-10-01", "2026-12-01"]);
  });
});
