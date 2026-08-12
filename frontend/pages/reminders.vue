<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { BellRing } from "lucide-vue-next";
import type { Reminder } from "~/types/api";

const profileStore = useProfileStore();
const { formatDate } = useFormat();
const router = useRouter();

const withinDays = ref(14);
// Fetch the widest window once, then filter by the selected window client-side.
// This lets the empty state point at the soonest item further out.
const all = ref<Reminder[]>([]);
const loading = ref(false);

const ALL_DAYS = 3650; // 10 years — effectively "everything"
const windowOptions = [
  { label: "Next 7 days", value: "7" },
  { label: "Next 14 days", value: "14" },
  { label: "Next 30 days", value: "30" },
  { label: "Next 90 days", value: "90" },
  { label: "Next year", value: "365" },
  { label: "All upcoming", value: String(ALL_DAYS) },
];

async function load() {
  if (!profileStore.profileId) return;
  loading.value = true;
  try {
    // Fetch the full horizon once; the selected window filters client-side, and
    // the empty-state hint can point at genuinely far-future items.
    all.value = await useApi().getReminders(profileStore.profileId, ALL_DAYS);
  } finally {
    loading.value = false;
  }
}

onMounted(async () => {
  await profileStore.restore();
  if (!profileStore.profileId) {
    router.push("/");
    return;
  }
  await load();
});

function onWindow(v: string) {
  withinDays.value = Number(v);
}

// Overdue always shows; upcoming shows if within the selected window.
const reminders = computed(() =>
  all.value.filter((r) => r.overdue || r.daysUntil <= withinDays.value),
);
const overdue = computed(() => reminders.value.filter((r) => r.overdue));
const upcoming = computed(() => reminders.value.filter((r) => !r.overdue));

// The soonest item that exists but falls beyond the current window (to guide).
const nextBeyondWindow = computed(() =>
  all.value.find((r) => !r.overdue && r.daysUntil > withinDays.value),
);

function urgencyVariant(r: Reminder) {
  if (r.overdue) return "destructive" as const;
  if (r.daysUntil <= 7) return "warning" as const;
  return "outline" as const;
}
function urgencyText(r: Reminder) {
  if (r.overdue) return `${Math.abs(r.daysUntil)}d overdue`;
  if (r.daysUntil === 0) return "Due today";
  return `in ${r.daysUntil}d`;
}
</script>

<template>
  <div class="mx-auto max-w-3xl">
    <div class="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 class="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <BellRing class="h-6 w-6 text-secondary" /> Reminders
        </h1>
        <p class="text-muted-foreground">
          Requirement due dates (deadline minus lead time) coming up or overdue, across all your
          programs.
        </p>
      </div>
      <div class="w-full sm:w-48">
        <Select
          :model-value="String(withinDays)"
          :options="windowOptions"
          aria-label="Reminder window"
          @update:model-value="onWindow"
        />
      </div>
    </div>

    <div v-if="loading" class="py-16 text-center text-muted-foreground">Loading…</div>

    <div
      v-else-if="reminders.length === 0"
      class="rounded-lg border border-dashed px-6 py-16 text-center"
      data-testid="reminders-empty"
    >
      <!-- There ARE items, just further out than the current window. -->
      <template v-if="nextBeyondWindow">
        <p class="text-muted-foreground">Nothing due in the next {{ withinDays }} days.</p>
        <p class="mt-1 text-sm">
          Your next item is <strong>{{ nextBeyondWindow.title }}</strong> ({{
            nextBeyondWindow.programName
          }}), due {{ formatDate(nextBeyondWindow.dueDate) }} —
          <strong>{{ nextBeyondWindow.daysUntil }} days away</strong>.
        </p>
        <Button variant="secondary" class="mt-4" @click="withinDays = ALL_DAYS">
          Show all upcoming
        </Button>
      </template>
      <!-- Genuinely nothing tracked yet. -->
      <template v-else>
        <p class="text-muted-foreground">
          No upcoming items. Generate a checklist for a program to start tracking due dates.
        </p>
        <Button variant="secondary" class="mt-4" @click="router.push('/programs')">
          Browse programs
        </Button>
      </template>
    </div>

    <div v-else class="space-y-6" data-testid="reminders-list">
      <div v-if="overdue.length">
        <h2 class="mb-2 text-sm font-semibold text-destructive">Overdue ({{ overdue.length }})</h2>
        <div class="space-y-2">
          <Card
            v-for="r in overdue"
            :key="r.requirementId"
            class="flex items-center justify-between gap-3 border-destructive/40 p-3"
            data-testid="reminder-item"
          >
            <div class="min-w-0">
              <p class="truncate text-sm font-medium">{{ r.title }}</p>
              <p class="truncate text-xs text-muted-foreground">
                {{ r.programName }} · due {{ formatDate(r.dueDate) }}
              </p>
            </div>
            <Badge :variant="urgencyVariant(r)">{{ urgencyText(r) }}</Badge>
          </Card>
        </div>
      </div>
      <div v-if="upcoming.length">
        <h2 class="mb-2 text-sm font-semibold text-muted-foreground">
          Upcoming ({{ upcoming.length }})
        </h2>
        <div class="space-y-2">
          <Card
            v-for="r in upcoming"
            :key="r.requirementId"
            class="flex items-center justify-between gap-3 p-3"
            data-testid="reminder-item"
          >
            <div class="min-w-0">
              <p class="truncate text-sm font-medium">{{ r.title }}</p>
              <p class="truncate text-xs text-muted-foreground">
                {{ r.programName }} · due {{ formatDate(r.dueDate) }}
              </p>
            </div>
            <Badge :variant="urgencyVariant(r)">{{ urgencyText(r) }}</Badge>
          </Card>
        </div>
      </div>
    </div>
  </div>
</template>
