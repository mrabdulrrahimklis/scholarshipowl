import { describe, expect, it } from "vitest";
import { computeDueDate } from "../src/domain/dueDate.ts";

describe("computeDueDate", () => {
  it("subtracts the offset in days from the deadline", () => {
    expect(computeDueDate("2026-12-01", 30)).toBe("2026-11-01");
    expect(computeDueDate("2026-12-01", 14)).toBe("2026-11-17");
    expect(computeDueDate("2026-12-01", 0)).toBe("2026-12-01");
  });

  it("crosses month and year boundaries correctly", () => {
    expect(computeDueDate("2027-01-15", 30)).toBe("2026-12-16");
    expect(computeDueDate("2027-01-01", 1)).toBe("2026-12-31");
  });

  it("handles leap-year February", () => {
    expect(computeDueDate("2028-03-01", 1)).toBe("2028-02-29");
  });

  it("is deterministic regardless of timezone (UTC-based)", () => {
    // Same inputs → same output on every run/host.
    expect(computeDueDate("2026-06-15", 45)).toBe(computeDueDate("2026-06-15", 45));
    expect(computeDueDate("2026-06-15", 45)).toBe("2026-05-01");
  });

  it("throws on malformed dates", () => {
    expect(() => computeDueDate("not-a-date", 5)).toThrow();
  });

  it("rejects out-of-range dates instead of silently rolling over", () => {
    expect(() => computeDueDate("2026-13-01", 0)).toThrow(); // month 13
    expect(() => computeDueDate("2026-02-30", 0)).toThrow(); // Feb 30
  });
});
