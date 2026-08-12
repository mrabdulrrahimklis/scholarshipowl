<script setup lang="ts">
import { computed } from "vue";
import { cn } from "~/lib/utils";

const props = withDefaults(defineProps<{ name?: string; size?: "sm" | "md" | "lg" }>(), {
  size: "sm",
});

// Initials = first letter of the first and last name parts (uppercased).
const initials = computed(() => {
  const parts = (props.name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.charAt(0).toUpperCase();
  return (parts[0]!.charAt(0) + parts[parts.length - 1]!.charAt(0)).toUpperCase();
});

const sizeClass = computed(
  () =>
    ({
      sm: "h-8 w-8 text-xs",
      md: "h-10 w-10 text-sm",
      lg: "h-16 w-16 text-xl",
    })[props.size],
);
</script>

<template>
  <span
    :title="name"
    :aria-label="name ? `${name} avatar` : 'avatar'"
    data-testid="user-avatar"
    :class="
      cn(
        'inline-flex shrink-0 select-none items-center justify-center rounded-full bg-secondary font-semibold text-secondary-foreground',
        sizeClass,
      )
    "
  >
    {{ initials }}
  </span>
</template>
