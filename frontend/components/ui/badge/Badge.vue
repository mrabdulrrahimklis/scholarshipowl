<script setup lang="ts">
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "~/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        destructive: "border-transparent bg-destructive text-destructive-foreground",
        outline: "text-foreground",
        success: "border-transparent bg-emerald-100 text-emerald-800",
        warning: "border-transparent bg-amber-100 text-amber-800",
      },
    },
    defaultVariants: { variant: "default" },
  },
);
type BadgeVariants = VariantProps<typeof badgeVariants>;
const props = defineProps<{ variant?: BadgeVariants["variant"]; class?: string }>();
</script>

<template>
  <span :class="cn(badgeVariants({ variant }), props.class)">
    <slot />
  </span>
</template>
