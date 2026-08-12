<script setup lang="ts">
import { ref } from "vue";
import { ArrowLeft, CalendarClock, FileText } from "lucide-vue-next";

const route = useRoute();
const router = useRouter();
const id = route.params.id as string;

const programStore = useProgramStore();
const profileStore = useProfileStore();
const readinessStore = useReadinessStore();
const { formatDate, typeLabels } = useFormat();

const { data: program } = await useAsyncData(`program-${id}`, () => programStore.fetchOne(id));

const generating = ref(false);
const genError = ref<string | null>(null);

async function generate() {
  if (!profileStore.profileId) {
    router.push("/");
    return;
  }
  generating.value = true;
  genError.value = null;
  try {
    await readinessStore.generate(profileStore.profileId, id);
    router.push({ path: "/dashboard", query: { program: id } });
  } catch {
    genError.value = readinessStore.error ?? "Failed to generate checklist";
  } finally {
    generating.value = false;
  }
}
</script>

<template>
  <div v-if="program" class="mx-auto max-w-3xl">
    <NuxtLink
      to="/programs"
      class="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft class="h-4 w-4" /> Back to catalog
    </NuxtLink>

    <Card>
      <CardHeader>
        <div class="flex items-start justify-between gap-3">
          <div>
            <CardTitle class="text-2xl">{{ program.name }}</CardTitle>
            <CardDescription class="mt-1">{{ program.institution }}</CardDescription>
          </div>
          <Badge variant="secondary" class="capitalize">{{ program.degreeType }}</Badge>
        </div>
      </CardHeader>
      <CardContent class="space-y-6">
        <p class="text-sm text-muted-foreground">{{ program.description }}</p>

        <div class="flex items-center gap-2 rounded-md bg-muted p-3 text-sm">
          <CalendarClock class="h-4 w-4 text-primary" />
          <span
            >Application deadline:
            <strong>{{ formatDate(program.applicationDeadline) }}</strong></span
          >
        </div>

        <div>
          <h3 class="mb-3 flex items-center gap-2 font-semibold">
            <FileText class="h-4 w-4" /> Requirements ({{ program.requirements?.length ?? 0 }})
          </h3>
          <ul class="divide-y rounded-md border">
            <li
              v-for="r in program.requirements"
              :key="r.id"
              class="flex items-center justify-between gap-3 p-3"
            >
              <div>
                <p class="text-sm font-medium">{{ r.title }}</p>
                <p class="text-xs text-muted-foreground">{{ r.description }}</p>
              </div>
              <div class="flex shrink-0 items-center gap-2">
                <Badge variant="outline">{{ typeLabels[r.type] }}</Badge>
                <Badge :variant="r.required ? 'default' : 'secondary'">
                  {{ r.required ? "Required" : "Optional" }}
                </Badge>
              </div>
            </li>
          </ul>
        </div>

        <div class="space-y-2">
          <p v-if="!profileStore.hasProfile" class="text-sm text-amber-700">
            Create a profile first to generate your readiness checklist.
          </p>
          <p v-if="genError" class="text-sm text-destructive">{{ genError }}</p>
          <Button
            variant="secondary"
            class="w-full"
            :disabled="generating"
            data-testid="generate-checklist"
            @click="generate"
          >
            {{
              !profileStore.hasProfile
                ? "Create a profile to continue"
                : generating
                  ? "Generating…"
                  : "Generate readiness checklist"
            }}
          </Button>
        </div>
      </CardContent>
    </Card>
  </div>
  <div v-else class="py-16 text-center text-muted-foreground">Loading program…</div>
</template>
