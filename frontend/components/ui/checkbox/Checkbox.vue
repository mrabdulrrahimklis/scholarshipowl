<script setup lang="ts">
import { Check } from "lucide-vue-next";
import { cn } from "~/lib/utils";

// Headless UI has no Checkbox primitive, so this is an accessible toggle button
// with role="checkbox" + aria-checked.
const props = defineProps<{ modelValue?: boolean; class?: string; disabled?: boolean }>();
const emit = defineEmits<{ (e: "update:modelValue", value: boolean): void }>();

function toggle() {
  if (props.disabled) return;
  emit("update:modelValue", !props.modelValue);
}
</script>

<template>
  <button
    type="button"
    role="checkbox"
    :aria-checked="!!modelValue"
    :disabled="disabled"
    :class="
      cn(
        'inline-flex h-5 w-5 shrink-0 items-center justify-center rounded border border-secondary ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
        modelValue ? 'bg-secondary text-secondary-foreground' : 'bg-background',
        props.class,
      )
    "
    @click="toggle"
  >
    <Check v-if="modelValue" class="h-4 w-4" />
  </button>
</template>
