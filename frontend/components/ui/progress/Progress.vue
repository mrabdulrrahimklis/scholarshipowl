<script setup lang="ts">
import { computed } from "vue";
import { cn } from "~/lib/utils";

const props = defineProps<{ modelValue?: number; class?: string }>();
const value = computed(() => Math.max(0, Math.min(100, props.modelValue ?? 0)));
</script>

<template>
  <div
    role="progressbar"
    :aria-valuenow="value"
    aria-valuemin="0"
    aria-valuemax="100"
    :class="cn('relative h-3 w-full overflow-hidden rounded-full bg-secondary/20', props.class)"
  >
    <div
      class="h-full rounded-full bg-secondary transition-all duration-500"
      :style="{ width: `${value}%` }"
    />
  </div>
</template>
