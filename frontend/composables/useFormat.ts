import type { ChecklistStatus, RequirementType } from "~/types/api";

export function useFormat() {
  const formatDate = (d: string) =>
    new Date(d + "T00:00:00Z").toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    });

  const daysUntil = (d: string) => {
    const now = new Date();
    const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
    const [y, m, day] = d.split("-").map(Number);
    const target = Date.UTC(y, m - 1, day);
    return Math.round((target - today) / 86_400_000);
  };

  const typeLabels: Record<RequirementType, string> = {
    transcript: "Transcripts",
    test_score: "Test Scores",
    essay: "Essays",
    recommendation: "Recommendations",
    application: "Application",
    financial: "Financial",
  };

  const statusLabels: Record<ChecklistStatus, string> = {
    not_started: "Not started",
    in_progress: "In progress",
    complete: "Complete",
  };

  return { formatDate, daysUntil, typeLabels, statusLabels };
}
