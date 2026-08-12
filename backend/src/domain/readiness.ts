/**
 * Pure readiness computation — no DB, no I/O. This is the core business logic
 * and is unit-tested directly.
 */

export type ChecklistStatus = "not_started" | "in_progress" | "complete";

export interface RequirementView {
  id: string;
  type: string;
  title: string;
  description: string;
  required: boolean;
  evidenceType: string;
  dueDate: string; // YYYY-MM-DD (already computed from the program deadline)
}

export interface ChecklistItemView {
  requirementId: string;
  status: ChecklistStatus;
  notes: string;
}

export interface MissingRequirement {
  requirementId: string;
  type: string;
  title: string;
  dueDate: string;
  required: boolean;
}

export interface TimelineEvent {
  id: string; // requirementId (stable)
  title: string;
  date: string; // due date
  status: ChecklistStatus;
  relatedRequirementId: string;
  required: boolean;
}

export interface ReadinessResult {
  readinessScore: number; // 0..1, ratio of completed required over total required
  completedRequired: number;
  totalRequired: number;
  missingRequirements: MissingRequirement[];
  nextMilestones: TimelineEvent[]; // incomplete events ordered by date asc
  timeline: TimelineEvent[]; // all events ordered by date asc
}

/**
 * Compute readiness for a profile against a program's requirements + the
 * profile's checklist items.
 *
 * - Missing: a requirement with no checklist item, or an item whose status is
 *   not `complete`.
 * - Score: completed required requirements / total required requirements.
 *   0-of-0 required ⇒ 1.0 (nothing outstanding).
 */
export function computeReadiness(
  requirements: RequirementView[],
  items: ChecklistItemView[],
): ReadinessResult {
  const statusByRequirement = new Map<string, ChecklistStatus>();
  for (const item of items) {
    statusByRequirement.set(item.requirementId, item.status);
  }

  const requiredReqs = requirements.filter((r) => r.required);
  const totalRequired = requiredReqs.length;
  const completedRequired = requiredReqs.filter(
    (r) => statusByRequirement.get(r.id) === "complete",
  ).length;

  const readinessScore = totalRequired === 0 ? 1 : completedRequired / totalRequired;

  const missingRequirements: MissingRequirement[] = requirements
    .filter((r) => statusByRequirement.get(r.id) !== "complete")
    .map((r) => ({
      requirementId: r.id,
      type: r.type,
      title: r.title,
      dueDate: r.dueDate,
      required: r.required,
    }))
    .sort(byDateThenTitle);

  const timeline: TimelineEvent[] = requirements
    .map((r) => ({
      id: r.id,
      title: r.title,
      date: r.dueDate,
      status: statusByRequirement.get(r.id) ?? ("not_started" as ChecklistStatus),
      relatedRequirementId: r.id,
      required: r.required,
    }))
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.title.localeCompare(b.title)));

  const nextMilestones = timeline.filter((e) => e.status !== "complete");

  return {
    readinessScore,
    completedRequired,
    totalRequired,
    missingRequirements,
    nextMilestones,
    timeline,
  };
}

function byDateThenTitle(
  a: { dueDate: string; title: string },
  b: { dueDate: string; title: string },
) {
  if (a.dueDate < b.dueDate) return -1;
  if (a.dueDate > b.dueDate) return 1;
  return a.title.localeCompare(b.title);
}
