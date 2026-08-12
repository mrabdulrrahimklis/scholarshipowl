<script setup lang="ts">
import { onMounted, ref } from "vue";
import { watchDebounced } from "@vueuse/core";
import { Search } from "lucide-vue-next";

const programStore = useProgramStore();
const searchInput = ref("");

// "all" is the sentinel option for "no degree filter"; it's translated to an
// empty filter before the API call.
const ALL = "all";
const degreeOptions = [
  { label: "All degrees", value: ALL },
  { label: "Bachelors", value: "bachelors" },
  { label: "Masters", value: "masters" },
  { label: "PhD", value: "phd" },
  { label: "Certificate", value: "certificate" },
];

onMounted(() => {
  searchInput.value = programStore.search;
  if (programStore.items.length === 0) programStore.fetch();
});

// Debounce search input → store filter. watchDebounced auto-clears its timer
// when the component unmounts, so a pending search can't fire after navigation.
watchDebounced(searchInput, (v) => programStore.setFilters({ search: v }), { debounce: 300 });

function onDegree(v: string) {
  programStore.setFilters({ degreeType: v === ALL ? "" : v });
}

function go(page: number) {
  if (page < 1 || page > programStore.totalPages) return;
  programStore.setFilters({
    search: programStore.search,
    degreeType: programStore.degreeType,
    page,
  });
}

function formatDate(d: string) {
  return new Date(d + "T00:00:00Z").toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}
</script>

<template>
  <div>
    <div class="mb-6">
      <h1 class="text-2xl font-bold tracking-tight">Program catalog</h1>
      <p class="text-muted-foreground">
        Search and filter programs, then open one to view details.
      </p>
    </div>

    <div class="mb-6 flex flex-col gap-3 sm:flex-row">
      <div class="relative flex-1">
        <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          v-model="searchInput"
          placeholder="Search by name or institution…"
          class="pl-9"
          data-testid="program-search"
        />
      </div>
      <div class="w-full sm:w-56">
        <Select
          :model-value="programStore.degreeType || ALL"
          :options="degreeOptions"
          aria-label="Filter by degree type"
          @update:model-value="onDegree"
        />
      </div>
    </div>

    <div v-if="programStore.loading" class="py-16 text-center text-muted-foreground">Loading…</div>

    <div
      v-else-if="programStore.items.length === 0"
      class="rounded-lg border border-dashed py-16 text-center text-muted-foreground"
    >
      No programs match your filters.
    </div>

    <div v-else class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" data-testid="program-grid">
      <Card
        v-for="p in programStore.items"
        :key="p.id"
        class="flex flex-col transition-shadow hover:shadow-md"
      >
        <CardHeader>
          <div class="flex items-start justify-between gap-2">
            <CardTitle class="text-base">{{ p.name }}</CardTitle>
            <Badge variant="secondary" class="capitalize">{{ p.degreeType }}</Badge>
          </div>
          <CardDescription>{{ p.institution }}</CardDescription>
        </CardHeader>
        <CardContent class="flex flex-1 flex-col">
          <p class="line-clamp-2 flex-1 text-sm text-muted-foreground">{{ p.description }}</p>
          <div class="mt-4 flex items-center justify-between">
            <span class="text-xs text-muted-foreground">
              Deadline {{ formatDate(p.applicationDeadline) }}
            </span>
            <Button
              size="sm"
              variant="outline"
              data-testid="view-program"
              @click="navigateTo(`/programs/${p.id}`)"
            >
              View
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>

    <div v-if="programStore.totalPages > 1" class="mt-8 flex items-center justify-center gap-3">
      <Button
        size="sm"
        variant="outline"
        :disabled="programStore.page <= 1"
        @click="go(programStore.page - 1)"
      >
        Previous
      </Button>
      <span class="text-sm text-muted-foreground">
        Page {{ programStore.page }} of {{ programStore.totalPages }}
      </span>
      <Button
        size="sm"
        variant="outline"
        :disabled="programStore.page >= programStore.totalPages"
        @click="go(programStore.page + 1)"
      >
        Next
      </Button>
    </div>
  </div>
</template>
