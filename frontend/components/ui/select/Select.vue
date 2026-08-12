<script setup lang="ts">
import { Listbox, ListboxButton, ListboxOption, ListboxOptions } from "@headlessui/vue";
import { Check, ChevronDown } from "lucide-vue-next";
import { computed } from "vue";
import { cn } from "~/lib/utils";

interface Option {
  label: string;
  value: string;
}

const props = defineProps<{
  modelValue?: string;
  options: Option[];
  placeholder?: string;
  class?: string;
  ariaLabel?: string;
}>();
const emit = defineEmits<{ (e: "update:modelValue", value: string): void }>();

const selectedLabel = computed(
  () => props.options.find((o) => o.value === props.modelValue)?.label ?? null,
);
</script>

<template>
  <Listbox
    :model-value="modelValue"
    as="div"
    class="relative"
    @update:model-value="(v) => emit('update:modelValue', v as string)"
  >
    <ListboxButton
      :aria-label="ariaLabel"
      :class="
        cn(
          'flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
          props.class,
        )
      "
    >
      <span :class="selectedLabel ? '' : 'text-muted-foreground'">
        {{ selectedLabel ?? placeholder ?? "Select…" }}
      </span>
      <ChevronDown class="h-4 w-4 opacity-50" />
    </ListboxButton>

    <transition
      leave-active-class="transition duration-100 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <ListboxOptions
        class="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border bg-background p-1 text-sm shadow-md focus:outline-none"
      >
        <ListboxOption
          v-for="opt in options"
          :key="opt.value"
          v-slot="{ active, selected }"
          :value="opt.value"
          as="template"
        >
          <li
            :class="
              cn(
                'relative flex cursor-pointer select-none items-center rounded-sm py-1.5 pl-8 pr-2',
                active ? 'bg-accent text-accent-foreground' : '',
              )
            "
          >
            <span v-if="selected" class="absolute left-2 flex h-3.5 w-3.5 items-center">
              <Check class="h-4 w-4" />
            </span>
            {{ opt.label }}
          </li>
        </ListboxOption>
      </ListboxOptions>
    </transition>
  </Listbox>
</template>
