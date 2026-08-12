import { defineStore } from "pinia";
import type { ChecklistItem, ChecklistStatus, ProgramSummary, Readiness } from "~/types/api";

export const useReadinessStore = defineStore("readiness", {
  state: () => ({
    programId: null as string | null,
    readiness: null as Readiness | null,
    checklist: [] as ChecklistItem[],
    summaries: [] as ProgramSummary[], // stretch: multi-program comparison
    loading: false,
    error: null as string | null,
  }),
  getters: {
    scorePct: (s) => Math.round((s.readiness?.readinessScore ?? 0) * 100),
    missing: (s) => s.readiness?.missingRequirements ?? [],
    timeline: (s) => s.readiness?.timeline ?? [],
    nextMilestones: (s) => s.readiness?.nextMilestones ?? [],
    /**
     * Checklist items grouped by requirement type for the dashboard, ordered so
     * the "Application" category (the Submit online application step) is always
     * last — it's the final action a student takes.
     */
    grouped: (s) => {
      const CATEGORY_ORDER = ["transcript", "test_score", "essay", "recommendation", "financial"];
      const groups: Record<string, ChecklistItem[]> = {};
      for (const item of s.checklist) {
        (groups[item.type] ??= []).push(item);
      }
      const ordered: Record<string, ChecklistItem[]> = {};
      // Known categories first (in order)…
      for (const type of CATEGORY_ORDER) if (groups[type]) ordered[type] = groups[type];
      // …then any other non-application categories…
      for (const type of Object.keys(groups)) {
        if (type !== "application" && !ordered[type]) ordered[type] = groups[type];
      }
      // …and "application" always last.
      if (groups.application) ordered.application = groups.application;
      return ordered;
    },
  },
  actions: {
    /** Generate (or re-evaluate) the checklist and load readiness + items. */
    async generate(profileId: string, programId: string) {
      this.loading = true;
      this.error = null;
      this.programId = programId;
      try {
        this.readiness = await useApi().createChecklist(profileId, programId);
        this.checklist = await useApi().getChecklist(profileId, programId);
      } catch (e: unknown) {
        this.error = extractError(e);
        throw e;
      } finally {
        this.loading = false;
      }
    },

    /** Load an existing checklist without regenerating (revisit). */
    async load(profileId: string, programId: string) {
      this.loading = true;
      this.error = null;
      this.programId = programId;
      try {
        this.checklist = await useApi().getChecklist(profileId, programId);
        this.readiness = await useApi().getReadiness(profileId, programId);
      } finally {
        this.loading = false;
      }
    },

    /**
     * Update a checklist item. Optimistically patches local state so the UI
     * reacts immediately, then refetches readiness for authoritative
     * score/missing/timeline sync.
     */
    async updateItem(
      profileId: string,
      requirementId: string,
      patch: { status?: ChecklistStatus; notes?: string; counselorNotes?: string },
    ) {
      const item = this.checklist.find((i) => i.requirementId === requirementId);
      const prev = item
        ? { status: item.status, notes: item.notes, counselorNotes: item.counselorNotes }
        : null;
      if (item) {
        if (patch.status !== undefined) item.status = patch.status;
        if (patch.notes !== undefined) item.notes = patch.notes;
        if (patch.counselorNotes !== undefined) item.counselorNotes = patch.counselorNotes;
      }
      try {
        await useApi().updateChecklistItem(profileId, requirementId, patch);
        // Only status changes affect the score/missing/timeline.
        if (patch.status !== undefined && this.programId) {
          this.readiness = await useApi().getReadiness(profileId, this.programId);
        }
      } catch (e) {
        // Roll back optimistic change on failure.
        if (item && prev) {
          item.status = prev.status;
          item.notes = prev.notes;
          item.counselorNotes = prev.counselorNotes;
        }
        throw e;
      }
    },

    toggleComplete(profileId: string, requirementId: string) {
      const item = this.checklist.find((i) => i.requirementId === requirementId);
      const next: ChecklistStatus = item?.status === "complete" ? "not_started" : "complete";
      return this.updateItem(profileId, requirementId, { status: next });
    },

    /** Stretch: load readiness summaries for every program the profile started. */
    async loadSummaries(profileId: string) {
      this.loading = true;
      try {
        this.summaries = await useApi().listProfilePrograms(profileId);
      } finally {
        this.loading = false;
      }
    },
  },
});

function extractError(e: unknown): string {
  const err = e as { data?: { error?: { message?: string } }; message?: string };
  return err?.data?.error?.message ?? err?.message ?? "Something went wrong";
}
