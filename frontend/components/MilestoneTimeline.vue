<script setup lang="ts">
import { CheckCircle2, Circle, Clock } from "lucide-vue-next";
import type { TimelineEvent } from "~/types/api";

defineProps<{ events: TimelineEvent[] }>();
const { formatDate, daysUntil } = useFormat();
</script>

<template>
  <ol class="relative border-l border-muted pl-6" data-testid="timeline">
    <li v-for="e in events" :key="e.id" class="mb-5 last:mb-0">
      <span
        class="absolute -left-[9px] flex h-4 w-4 items-center justify-center rounded-full"
        :class="e.status === 'complete' ? 'text-emerald-600' : 'text-muted-foreground'"
      >
        <CheckCircle2 v-if="e.status === 'complete'" class="h-4 w-4" />
        <Clock v-else-if="e.status === 'in_progress'" class="h-4 w-4 text-amber-500" />
        <Circle v-else class="h-4 w-4" />
      </span>
      <div class="flex items-center justify-between gap-2">
        <p
          class="text-sm font-medium"
          :class="e.status === 'complete' ? 'text-muted-foreground line-through' : ''"
        >
          {{ e.title }}
        </p>
        <time class="shrink-0 text-xs text-muted-foreground">{{ formatDate(e.date) }}</time>
      </div>
      <p
        v-if="e.status !== 'complete'"
        class="text-xs"
        :class="daysUntil(e.date) < 0 ? 'text-destructive' : 'text-muted-foreground'"
      >
        <template v-if="daysUntil(e.date) < 0"
          >{{ Math.abs(daysUntil(e.date)) }} days overdue</template
        >
        <template v-else-if="daysUntil(e.date) === 0">Due today</template>
        <template v-else>in {{ daysUntil(e.date) }} days</template>
      </p>
    </li>
  </ol>
</template>
