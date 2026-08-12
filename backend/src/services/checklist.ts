import { prisma } from "../db/client.ts";
import { computeDueDate } from "../domain/dueDate.ts";
import {
  computeReadiness,
  type ChecklistItemView,
  type ChecklistStatus,
  type RequirementView,
} from "../domain/readiness.ts";
import { selectReminders, type ReminderCandidate } from "../domain/reminders.ts";
import { ApiError } from "../middleware/errors.ts";
import { getProfile } from "./profiles.ts";
import { getProgram, getRequirementsForProgram } from "./programs.ts";

/**
 * Generate (or re-evaluate) the checklist for a profile + program.
 *
 * Idempotent: creates a checklist item per requirement with its computed
 * dueDate; existing items keep their status/notes but have their dueDate
 * refreshed from the current program deadline/offset. Revisiting a program
 * therefore re-evaluates without wiping the student's progress.
 */
export async function createOrRefreshChecklist(profileId: string, programId: string) {
  await getProfile(profileId); // 404 if missing
  const program = await getProgram(programId); // 404 if missing + returns requirements

  for (const r of program.requirements) {
    const dueDate = computeDueDate(program.applicationDeadline, r.dueOffsetDays);
    await prisma.checklistItem.upsert({
      where: { profileId_requirementId: { profileId, requirementId: r.id } },
      // Refresh only the dueDate on revisit; preserve status + notes.
      update: { dueDate },
      create: { profileId, requirementId: r.id, status: "not_started", dueDate, notes: "" },
    });
  }

  await syncTimelineEvents(profileId, programId);
  return getReadiness(profileId, programId);
}

/**
 * Keep the persisted timeline_events table in sync with the current checklist:
 * one event per requirement, carrying its due date + status. Called on checklist
 * generation and after every checklist-item change.
 */
export async function syncTimelineEvents(profileId: string, programId: string) {
  const { requirementViews, itemByReq } = await loadViews(profileId, programId);
  for (const r of requirementViews) {
    const status = (itemByReq.get(r.id)?.status as ChecklistStatus) ?? "not_started";
    await prisma.timelineEvent.upsert({
      where: { profileId_relatedRequirementId: { profileId, relatedRequirementId: r.id } },
      update: { title: r.title, date: r.dueDate, status, programId, required: r.required },
      create: {
        profileId,
        programId,
        relatedRequirementId: r.id,
        title: r.title,
        date: r.dueDate,
        status,
        required: r.required,
      },
    });
  }
}

/** Upsert status/notes for a single checklist item. */
export async function updateChecklistItem(
  profileId: string,
  requirementId: string,
  patch: { status?: ChecklistStatus; notes?: string; counselorNotes?: string },
) {
  await getProfile(profileId);

  const existing = await prisma.checklistItem.findUnique({
    where: { profileId_requirementId: { profileId, requirementId } },
  });

  // If the item wasn't generated yet, backfill it — but ONLY for a program the
  // student has actually started, otherwise we'd write an orphan item/timeline
  // event for a program they never opted into.
  if (!existing) {
    const req = await prisma.requirement.findUnique({
      where: { id: requirementId },
      include: { program: true },
    });
    if (!req) throw ApiError.notFound(`Requirement ${requirementId} not found`);
    const startedCount = await prisma.checklistItem.count({
      where: { profileId, requirement: { programId: req.programId } },
    });
    if (startedCount === 0) {
      throw ApiError.badRequest("Generate a checklist for this program before updating items.");
    }
    const dueDate = computeDueDate(req.program.applicationDeadline, req.dueOffsetDays);
    const created = await prisma.checklistItem.create({
      data: {
        profileId,
        requirementId,
        status: patch.status ?? "not_started",
        notes: patch.notes ?? "",
        counselorNotes: patch.counselorNotes ?? "",
        dueDate,
      },
    });
    await syncTimelineEvents(profileId, req.programId);
    return created;
  }

  const updated = await prisma.checklistItem.update({
    where: { profileId_requirementId: { profileId, requirementId } },
    data: {
      ...(patch.status !== undefined ? { status: patch.status } : {}),
      ...(patch.notes !== undefined ? { notes: patch.notes } : {}),
      ...(patch.counselorNotes !== undefined ? { counselorNotes: patch.counselorNotes } : {}),
    },
  });

  // Keep the persisted timeline event's status/date in sync.
  if (patch.status !== undefined) {
    const req = await prisma.requirement.findUnique({
      where: { id: requirementId },
      select: { programId: true },
    });
    if (req) await syncTimelineEvents(profileId, req.programId);
  }
  return updated;
}

/** Assemble requirement views (with computed dueDate) + current items. */
async function loadViews(profileId: string, programId: string) {
  const program = await getProgram(programId);
  const reqs = program.requirements.length
    ? program.requirements
    : await getRequirementsForProgram(programId);

  const items = await prisma.checklistItem.findMany({
    where: { profileId, requirementId: { in: reqs.map((r) => r.id) } },
  });
  const itemByReq = new Map(items.map((i) => [i.requirementId, i]));

  const requirementViews: RequirementView[] = reqs.map((r) => ({
    id: r.id,
    type: r.type,
    title: r.title,
    description: r.description,
    required: r.required,
    evidenceType: r.evidenceType,
    dueDate:
      itemByReq.get(r.id)?.dueDate ?? computeDueDate(program.applicationDeadline, r.dueOffsetDays),
  }));

  const itemViews: ChecklistItemView[] = items.map((i) => ({
    requirementId: i.requirementId,
    status: i.status as ChecklistStatus,
    notes: i.notes,
  }));

  return { program, requirementViews, itemViews, itemByReq };
}

/** Full readiness payload: score, missing requirements, next milestones. */
export async function getReadiness(profileId: string, programId: string) {
  await getProfile(profileId);
  const { program, requirementViews, itemViews } = await loadViews(profileId, programId);
  const readiness = computeReadiness(requirementViews, itemViews);
  return {
    profileId,
    programId,
    program: {
      id: program.id,
      name: program.name,
      applicationDeadline: program.applicationDeadline,
    },
    ...readiness,
  };
}

/** Full checklist (items grouped-ready, with requirement metadata). */
export async function getChecklist(profileId: string, programId: string) {
  await getProfile(profileId);
  const { requirementViews, itemByReq } = await loadViews(profileId, programId);
  return requirementViews.map((r) => {
    const item = itemByReq.get(r.id);
    return {
      id: item?.id ?? null,
      requirementId: r.id,
      type: r.type,
      title: r.title,
      description: r.description,
      required: r.required,
      evidenceType: r.evidenceType,
      dueDate: r.dueDate,
      status: item?.status ?? "not_started",
      notes: item?.notes ?? "",
      counselorNotes: item?.counselorNotes ?? "",
    };
  });
}

/**
 * Timeline events ordered chronologically — served from the persisted
 * timeline_events table. Lazily backfills for checklists generated before the
 * table existed (only if the student has actually started this program).
 */
export async function getTimeline(profileId: string, programId: string) {
  await getProfile(profileId);

  const read = () =>
    prisma.timelineEvent.findMany({
      where: { profileId, programId },
      orderBy: [{ date: "asc" }, { title: "asc" }],
    });

  let events = await read();
  if (events.length === 0) {
    const items = await prisma.checklistItem.findMany({
      where: { profileId, requirement: { programId } },
      select: { id: true },
    });
    if (items.length > 0) {
      await syncTimelineEvents(profileId, programId);
      events = await read();
    }
  }

  return events.map((e) => ({
    id: e.id,
    title: e.title,
    date: e.date,
    status: e.status,
    relatedRequirementId: e.relatedRequirementId,
    required: e.required,
  }));
}

/**
 * Stretch: all programs this profile has started (has ≥1 checklist item for),
 * each with its readiness score — for the multi-program comparison view.
 */
export async function getProfileProgramSummaries(profileId: string) {
  await getProfile(profileId);
  const items = await prisma.checklistItem.findMany({
    where: { profileId },
    include: { requirement: { select: { programId: true } } },
  });
  const programIds = [...new Set(items.map((i) => i.requirement.programId))];

  const summaries = [];
  for (const programId of programIds) {
    const [readiness, program] = await Promise.all([
      getReadiness(profileId, programId),
      getProgram(programId),
    ]);
    summaries.push({
      program: {
        id: program.id,
        name: program.name,
        degreeType: program.degreeType,
        institution: program.institution,
        applicationDeadline: program.applicationDeadline,
      },
      readinessScore: readiness.readinessScore,
      completedRequired: readiness.completedRequired,
      totalRequired: readiness.totalRequired,
      missingCount: readiness.missingRequirements.length,
      nextDueDate: readiness.nextMilestones[0]?.date ?? null,
    });
  }
  // Best-prepared first, then alphabetical.
  summaries.sort(
    (a, b) => b.readinessScore - a.readinessScore || a.program.name.localeCompare(b.program.name),
  );
  return summaries;
}

/**
 * Stretch: reminders for upcoming (and overdue) incomplete items across ALL of
 * the profile's programs, within `withinDays`.
 */
export async function getReminders(profileId: string, withinDays: number) {
  await getProfile(profileId);
  const items = await prisma.checklistItem.findMany({
    where: { profileId },
    include: { requirement: { include: { program: { select: { name: true } } } } },
  });

  const candidates: ReminderCandidate[] = items.map((i) => ({
    requirementId: i.requirementId,
    programId: i.requirement.programId,
    programName: i.requirement.program.name,
    title: i.requirement.title,
    type: i.requirement.type,
    dueDate: i.dueDate,
    status: i.status as ChecklistStatus,
    required: i.requirement.required,
  }));

  return selectReminders(candidates, todayUtc(), withinDays);
}

/** Current date as a UTC YYYY-MM-DD string (reminders are time-relative). */
function todayUtc(): string {
  const n = new Date();
  const mm = String(n.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(n.getUTCDate()).padStart(2, "0");
  return `${n.getUTCFullYear()}-${mm}-${dd}`;
}
