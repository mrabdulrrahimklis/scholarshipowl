<script setup lang="ts">
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "~/lib/utils";

const alertVariants = cva(
  "relative w-full rounded-lg border p-4 [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground [&>svg~*]:pl-7",
  {
    variants: {
      variant: {
        default: "bg-background text-foreground",
        warning: "border-amber-300 bg-amber-50 text-amber-900 [&>svg]:text-amber-600",
        success: "border-emerald-300 bg-emerald-50 text-emerald-900 [&>svg]:text-emerald-600",
        destructive: "border-destructive/50 text-destructive [&>svg]:text-destructive",
      },
    },
    defaultVariants: { variant: "default" },
  },
);
type AlertVariants = VariantProps<typeof alertVariants>;
const props = defineProps<{ variant?: AlertVariants["variant"]; class?: string }>();
</script>

<template>
  <div role="alert" :class="cn(alertVariants({ variant }), props.class)">
    <slot />
  </div>
</template>
