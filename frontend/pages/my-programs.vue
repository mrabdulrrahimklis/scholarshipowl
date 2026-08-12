<script setup lang="ts">
import { computed, onMounted } from "vue";

const profileStore = useProfileStore();
const readinessStore = useReadinessStore();
const { formatDate } = useFormat();
const router = useRouter();

onMounted(async () => {
  await profileStore.restore();
  if (!profileStore.profileId) {
    router.push("/");
    return;
  }
  await readinessStore.loadSummaries(profileStore.profileId);
});

const summaries = computed(() => readinessStore.summaries);

function pct(s: { readinessScore: number }) {
  return Math.round(s.readinessScore * 100);
}
function open(programId: string) {
  router.push({ path: "/dashboard", query: { program: programId } });
}
</script>

<template>
  <div>
    <div class="mb-6">
      <h1 class="text-2xl font-bold tracking-tight">My programs</h1>
      <p class="text-muted-foreground">
        Compare your readiness across every program you've started.
      </p>
    </div>

    <div
      v-if="!readinessStore.loading && summaries.length === 0"
      class="rounded-lg border border-dashed py-16 text-center"
    >
      <p class="text-muted-foreground">You haven't started any programs yet.</p>
      <Button variant="secondary" class="mt-4" @click="router.push('/programs')">
        Browse programs
      </Button>
    </div>

    <div v-else class="space-y-4" data-testid="program-comparison">
      <Card
        v-for="(s, i) in summaries"
        :key="s.program.id"
        class="transition-shadow hover:shadow-md"
        data-testid="comparison-row"
      >
        <CardContent class="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
          <div class="flex w-full items-center gap-3 sm:w-64">
            <span
              class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold"
            >
              {{ i + 1 }}
            </span>
            <div class="min-w-0">
              <p class="truncate font-medium">{{ s.program.name }}</p>
              <p class="truncate text-xs text-muted-foreground">
                {{ s.program.institution }} · deadline
                {{ formatDate(s.program.applicationDeadline) }}
              </p>
            </div>
          </div>

          <div class="flex-1">
            <div class="mb-1 flex items-center justify-between text-sm">
              <span class="text-muted-foreground">
                {{ s.completedRequired }}/{{ s.totalRequired }} required ·
                {{ s.missingCount }} missing
              </span>
              <span class="font-semibold" data-testid="comparison-score">{{ pct(s) }}%</span>
            </div>
            <Progress :model-value="pct(s)" />
            <p v-if="s.nextDueDate" class="mt-1 text-xs text-muted-foreground">
              Next due {{ formatDate(s.nextDueDate) }}
            </p>
          </div>

          <Button size="sm" variant="outline" class="shrink-0" @click="open(s.program.id)">
            Open
          </Button>
        </CardContent>
      </Card>
    </div>
  </div>
</template>
