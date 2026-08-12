<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{
  pct: number;
  completed: number;
  total: number;
}>();

const radius = 52;
const circumference = 2 * Math.PI * radius;
const dash = computed(() => (props.pct / 100) * circumference);

// Ring colour by progress: orange < 60%, blue 60–99%, green at 100%.
const color = computed(() =>
  props.pct >= 100 ? "#059669" : props.pct >= 60 ? "#2563eb" : "hsl(var(--secondary))",
);
</script>

<template>
  <div class="flex items-center gap-6">
    <div class="relative h-32 w-32 shrink-0">
      <svg class="h-32 w-32 -rotate-90" viewBox="0 0 120 120">
        <!-- Track = the remaining portion, same colour at 50% opacity -->
        <circle
          cx="60"
          cy="60"
          :r="radius"
          fill="none"
          :stroke="color"
          stroke-opacity="0.5"
          stroke-width="10"
        />
        <!-- Progress = the completed portion, solid colour -->
        <circle
          cx="60"
          cy="60"
          :r="radius"
          fill="none"
          :stroke="color"
          stroke-width="10"
          stroke-linecap="round"
          :stroke-dasharray="`${dash} ${circumference}`"
          class="transition-all duration-500"
        />
      </svg>
      <div class="absolute inset-0 flex flex-col items-center justify-center">
        <span class="text-3xl font-bold" data-testid="score-pct">{{ pct }}%</span>
      </div>
    </div>
    <div>
      <p class="text-sm text-muted-foreground">Required requirements completed</p>
      <p class="text-2xl font-semibold">{{ completed }} / {{ total }}</p>
      <p class="mt-1 text-sm text-muted-foreground">
        {{
          pct >= 100
            ? "You're all set — every required item is complete."
            : `${total - completed} required item${total - completed === 1 ? "" : "s"} remaining.`
        }}
      </p>
    </div>
  </div>
</template>
