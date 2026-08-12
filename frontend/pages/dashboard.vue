<script setup lang="ts">
import { computed, onMounted, watch } from "vue";
import { AlertTriangle, CheckCircle2 } from "lucide-vue-next";

const profileStore = useProfileStore();
const readinessStore = useReadinessStore();
const { typeLabels, formatDate } = useFormat();
const router = useRouter();
const route = useRoute();

// Which program the dashboard shows: ?program=<id> wins, else the store context.
async function loadProgram(programId: string | null) {
  if (!profileStore.profileId || !programId) return;
  await readinessStore.load(profileStore.profileId, programId);
}

onMounted(async () => {
  await profileStore.restore();
  if (!profileStore.profileId) return;
  // Load the comparison summaries (also used by the program switcher).
  await readinessStore.loadSummaries(profileStore.profileId);
  // Which program to show: ?program= wins, else the store context, else the
  // student's first started program (so a returning student isn't shown the
  // "no checklist" empty state).
  const target =
    (route.query.program as string) ||
    readinessStore.programId ||
    readinessStore.summaries[0]?.program.id;
  if (target && (target !== readinessStore.programId || readinessStore.checklist.length === 0)) {
    await loadProgram(target);
  }
});

// React to switching programs via the ?program= query.
watch(
  () => route.query.program,
  (id) => {
    if (id && id !== readinessStore.programId) loadProgram(id as string);
  },
);

const hasData = computed(() => !!readinessStore.readiness && readinessStore.checklist.length > 0);

// Program switcher options (only shown when the student has ≥2 programs).
const programOptions = computed(() =>
  readinessStore.summaries.map((s) => ({ label: s.program.name, value: s.program.id })),
);
function switchProgram(programId: string) {
  router.push({ path: "/dashboard", query: { program: programId } });
}

function toggle(requirementId: string) {
  if (!profileStore.profileId) return;
  readinessStore.toggleComplete(profileStore.profileId, requirementId);
}

function saveNotes(payload: { requirementId: string; notes: string }) {
  if (!profileStore.profileId) return;
  readinessStore.updateItem(profileStore.profileId, payload.requirementId, {
    notes: payload.notes,
  });
}

function saveCounselorNotes(payload: { requirementId: string; counselorNotes: string }) {
  if (!profileStore.profileId) return;
  readinessStore.updateItem(profileStore.profileId, payload.requirementId, {
    counselorNotes: payload.counselorNotes,
  });
}
</script>

<template>
  <div>
    <!-- Empty states -->
    <div v-if="!profileStore.hasProfile" class="rounded-lg border border-dashed py-16 text-center">
      <p class="text-muted-foreground">Create a profile to view your readiness dashboard.</p>
      <Button variant="secondary" class="mt-4" @click="router.push('/')">Get started</Button>
    </div>

    <div v-else-if="!hasData" class="rounded-lg border border-dashed py-16 text-center">
      <p class="text-muted-foreground">
        No checklist yet. Pick a program and generate your readiness checklist.
      </p>
      <Button variant="secondary" class="mt-4" @click="router.push('/programs')">
        Browse programs
      </Button>
    </div>

    <div v-else class="space-y-6">
      <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 class="text-2xl font-bold tracking-tight">Readiness dashboard</h1>
          <p class="text-muted-foreground">
            {{ readinessStore.readiness?.program.name }} · deadline
            {{ formatDate(readinessStore.readiness!.program.applicationDeadline) }}
          </p>
        </div>
        <!-- Stretch: switch between the student's programs -->
        <div v-if="programOptions.length > 1" class="w-full sm:w-64">
          <Label class="text-xs text-muted-foreground">Program</Label>
          <Select
            :model-value="readinessStore.programId ?? undefined"
            :options="programOptions"
            aria-label="Switch program"
            @update:model-value="switchProgram"
          />
        </div>
      </div>

      <div class="grid gap-6 lg:grid-cols-3">
        <!-- Left: score + missing + checklist -->
        <div class="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader><CardTitle>Readiness score</CardTitle></CardHeader>
            <CardContent>
              <ReadinessScore
                :pct="readinessStore.scorePct"
                :completed="readinessStore.readiness!.completedRequired"
                :total="readinessStore.readiness!.totalRequired"
              />
            </CardContent>
          </Card>

          <!-- Missing requirements callout -->
          <Alert
            v-if="readinessStore.missing.length > 0"
            variant="warning"
            data-testid="missing-callout"
          >
            <AlertTriangle class="h-4 w-4" />
            <div>
              <p class="font-medium">
                {{ readinessStore.missing.length }} requirement{{
                  readinessStore.missing.length === 1 ? "" : "s"
                }}
                still missing
              </p>
              <ul class="mt-1 list-inside list-disc text-sm">
                <li v-for="m in readinessStore.missing" :key="m.requirementId">
                  {{ m.title }} — due {{ formatDate(m.dueDate) }}
                  <span v-if="!m.required" class="text-xs opacity-70">(optional)</span>
                </li>
              </ul>
            </div>
          </Alert>
          <Alert v-else variant="success">
            <CheckCircle2 class="h-4 w-4" />
            <p class="font-medium">Nothing missing — every requirement is complete.</p>
          </Alert>

          <!-- Checklist grouped by category -->
          <Card>
            <CardHeader>
              <CardTitle>Checklist</CardTitle>
              <CardDescription
                >Grouped by category. Toggle items as you complete them.</CardDescription
              >
            </CardHeader>
            <CardContent class="space-y-6">
              <div v-for="(items, type) in readinessStore.grouped" :key="type">
                <h3
                  class="mb-2 text-sm font-semibold text-muted-foreground"
                  data-testid="checklist-group"
                >
                  {{ typeLabels[type as keyof typeof typeLabels] ?? type }}
                </h3>
                <div class="space-y-2">
                  <ChecklistItemRow
                    v-for="item in items"
                    :key="item.requirementId"
                    :item="item"
                    @toggle="toggle"
                    @notes="saveNotes"
                    @counselor-notes="saveCounselorNotes"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <!-- Right: timeline -->
        <div>
          <Card class="lg:sticky lg:top-6">
            <CardHeader>
              <CardTitle>Timeline</CardTitle>
              <CardDescription>Milestones ordered by due date.</CardDescription>
            </CardHeader>
            <CardContent>
              <MilestoneTimeline :events="readinessStore.timeline" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  </div>
</template>
