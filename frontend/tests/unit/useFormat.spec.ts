import { describe, expect, it } from "vitest";
import { useFormat } from "~/composables/useFormat";

const { formatDate, daysUntil, typeLabels, statusLabels } = useFormat();

describe("useFormat", () => {
  it("formats an ISO date into a readable string", () => {
    const out = formatDate("2026-12-01");
    expect(out).toContain("2026");
    expect(out.length).toBeGreaterThan(0);
  });

  it("computes days until a date by sign", () => {
    expect(daysUntil("2999-01-01")).toBeGreaterThan(0); // far future
    expect(daysUntil("2000-01-01")).toBeLessThan(0); // far past
  });

  it("maps requirement types to human labels", () => {
    expect(typeLabels.transcript).toBe("Transcripts");
    expect(typeLabels.test_score).toBe("Test Scores");
    expect(typeLabels.recommendation).toBe("Recommendations");
  });

  it("maps checklist statuses to human labels", () => {
    expect(statusLabels.not_started).toBe("Not started");
    expect(statusLabels.in_progress).toBe("In progress");
    expect(statusLabels.complete).toBe("Complete");
  });
});
