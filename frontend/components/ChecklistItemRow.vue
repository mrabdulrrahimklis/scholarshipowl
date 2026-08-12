<script setup lang="ts">
import { ref, watch } from "vue";
import { StickyNote } from "lucide-vue-next";
import type { ChecklistItem } from "~/types/api";

const props = defineProps<{ item: ChecklistItem }>();
const emit = defineEmits<{
  (e: "toggle", requirementId: string): void;
  (e: "notes", payload: { requirementId: string; notes: string }): void;
  (e: "counselorNotes", payload: { requirementId: string; counselorNotes: string }): void;
}>();

const { formatDate, daysUntil } = useFormat();

const showNotes = ref(!!props.item.notes || !!props.item.counselorNotes);
const notesDraft = ref(props.item.notes);
const counselorDraft = ref(props.item.counselorNotes);
watch(
  () => props.item.notes,
  (v) => (notesDraft.value = v),
);
watch(
  () => props.item.counselorNotes,
  (v) => (counselorDraft.value = v),
);

function saveNotes() {
  if (notesDraft.value !== props.item.notes) {
    emit("notes", { requirementId: props.item.requirementId, notes: notesDraft.value });
  }
}
function saveCounselorNotes() {
  if (counselorDraft.value !== props.item.counselorNotes) {
    emit("counselorNotes", {
      requirementId: props.item.requirementId,
      counselorNotes: counselorDraft.value,
    });
  }
}

const days = () => daysUntil(props.item.dueDate);
</script>

<template>
  <div
    class="flex flex-col gap-2 rounded-md border p-3"
    :class="item.status === 'complete' ? 'border-emerald-200 bg-emerald-50/50' : 'bg-background'"
    data-testid="checklist-item"
  >
    <div class="flex items-start gap-3">
      <Checkbox
        :model-value="item.status === 'complete'"
        class="mt-0.5"
        :aria-label="`Mark ${item.title} complete`"
        data-testid="item-checkbox"
        @update:model-value="emit('toggle', item.requirementId)"
      />
      <div class="flex-1">
        <div class="flex items-center gap-2">
          <p
            class="text-sm font-medium"
            :class="item.status === 'complete' ? 'text-muted-foreground line-through' : ''"
          >
            {{ item.title }}
          </p>
          <Badge v-if="!item.required" variant="secondary">Optional</Badge>
          <Badge v-if="item.counselorNotes" variant="warning">Counselor note</Badge>
        </div>
        <p class="text-xs text-muted-foreground">{{ item.description }}</p>
        <div class="mt-1 flex items-center gap-3 text-xs">
          <span class="text-muted-foreground">Due {{ formatDate(item.dueDate) }}</span>
          <Badge
            v-if="item.status !== 'complete'"
            :variant="days() < 0 ? 'destructive' : days() <= 14 ? 'warning' : 'outline'"
          >
            <template v-if="days() < 0">{{ Math.abs(days()) }}d overdue</template>
            <template v-else-if="days() === 0">Due today</template>
            <template v-else>in {{ days() }}d</template>
          </Badge>
          <Badge v-else variant="success">Done</Badge>
        </div>
      </div>
      <Button
        size="sm"
        variant="ghost"
        class="shrink-0"
        aria-label="Toggle notes"
        @click="showNotes = !showNotes"
      >
        <StickyNote class="h-4 w-4" />
      </Button>
    </div>

    <div v-if="showNotes" class="space-y-2 pl-8">
      <div class="grid gap-1">
        <Label class="text-xs text-muted-foreground">My notes</Label>
        <Textarea
          v-model="notesDraft"
          placeholder="Add your own notes…"
          class="min-h-[60px] text-sm"
          data-testid="item-notes"
          @blur="saveNotes"
        />
      </div>
      <div class="grid gap-1 rounded-md border border-amber-200 bg-amber-50/60 p-2">
        <Label class="text-xs font-medium text-amber-800">Counselor notes</Label>
        <Textarea
          v-model="counselorDraft"
          placeholder="Counselor guidance for this requirement…"
          class="min-h-[60px] bg-white text-sm"
          data-testid="item-counselor-notes"
          @blur="saveCounselorNotes"
        />
      </div>
    </div>
  </div>
</template>
