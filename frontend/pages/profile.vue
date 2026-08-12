<script setup lang="ts">
import { onMounted, reactive, ref, watch } from "vue";

const profileStore = useProfileStore();
const router = useRouter();

const educationLevels = [
  { label: "High School", value: "High School" },
  { label: "Associate", value: "Associate" },
  { label: "Bachelors", value: "Bachelors" },
  { label: "Masters", value: "Masters" },
];

const form = reactive({
  name: "",
  email: "",
  educationLevel: "",
  gpa: "",
  testScores: "",
  targetTerm: "",
});

const errors = ref<Record<string, string>>({});
const saving = ref(false);
const saved = ref(false);
const serverError = ref<string | null>(null);

// Populate the form from the current profile (once restored).
function hydrate() {
  const p = profileStore.profile;
  if (!p) return;
  form.name = p.name;
  form.email = p.email;
  form.educationLevel = p.educationLevel;
  form.gpa = p.gpa === null ? "" : String(p.gpa);
  form.testScores = p.testScores ?? "";
  form.targetTerm = p.targetTerm;
}

onMounted(async () => {
  await profileStore.restore();
  if (!profileStore.hasProfile) {
    router.push("/");
    return;
  }
  hydrate();
});
watch(() => profileStore.profile, hydrate);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function setError(field: string, msg: string) {
  errors.value = { ...errors.value, [field]: msg };
}

function validateEmail() {
  setError("email", EMAIL_RE.test(form.email.trim()) ? "" : "Valid email required");
}

// Clamp GPA into [0, 4] as the user types; allow partial input like "3." or "-".
function clampGpa(value: string) {
  if (value === "") {
    form.gpa = "";
    return;
  }
  const n = Number(value);
  if (Number.isNaN(n)) {
    form.gpa = value;
  } else if (n > 4) {
    form.gpa = "4";
  } else if (n < 0) {
    form.gpa = "0";
  } else {
    form.gpa = value;
  }
}

function validate() {
  const next: Record<string, string> = {};
  if (!form.name.trim()) next.name = "Name is required";
  if (!EMAIL_RE.test(form.email.trim())) next.email = "Valid email required";
  if (!form.educationLevel) next.educationLevel = "Select your education level";
  if (!form.targetTerm.trim()) next.targetTerm = "Target term is required";
  if (form.gpa !== "") {
    const n = Number(form.gpa);
    if (Number.isNaN(n) || n < 0 || n > 4) next.gpa = "GPA must be between 0 and 4";
  }
  errors.value = next;
  return Object.keys(next).length === 0;
}

async function save() {
  serverError.value = null;
  saved.value = false;
  if (!validate()) return;
  saving.value = true;
  try {
    await profileStore.update({
      name: form.name.trim(),
      email: form.email.trim(),
      educationLevel: form.educationLevel,
      // null (not undefined) so an emptied field is actually cleared server-side.
      gpa: form.gpa === "" ? null : Number(form.gpa),
      testScores: form.testScores.trim() || null,
      targetTerm: form.targetTerm.trim(),
    });
    saved.value = true;
  } catch {
    serverError.value = profileStore.error ?? "Failed to update profile";
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <div class="mx-auto max-w-2xl">
    <div class="mb-6 flex items-center gap-4">
      <UserAvatar :name="form.name || profileStore.profile?.name" size="lg" />
      <div>
        <h1 class="text-2xl font-bold tracking-tight">Edit profile</h1>
        <p class="text-muted-foreground">
          Update your details. Revisit a program to re-evaluate readiness.
        </p>
      </div>
    </div>

    <Card>
      <CardHeader>
        <CardTitle>Student profile</CardTitle>
        <CardDescription>Changes are saved to your profile immediately.</CardDescription>
      </CardHeader>
      <CardContent>
        <form class="space-y-5" novalidate @submit.prevent="save">
          <div class="grid gap-2">
            <Label for="name">Full name *</Label>
            <Input id="name" v-model="form.name" data-testid="edit-name" />
            <p v-if="errors.name" class="text-sm text-destructive">{{ errors.name }}</p>
          </div>

          <div class="grid gap-2">
            <Label for="email">Email *</Label>
            <Input
              id="email"
              v-model="form.email"
              type="email"
              data-testid="edit-email"
              @blur="validateEmail"
            />
            <p v-if="errors.email" class="text-sm text-destructive">{{ errors.email }}</p>
          </div>

          <div class="grid gap-2">
            <Label>Education level *</Label>
            <Select
              v-model="form.educationLevel"
              :options="educationLevels"
              placeholder="Select level"
              aria-label="Education level"
            />
            <p v-if="errors.educationLevel" class="text-sm text-destructive">
              {{ errors.educationLevel }}
            </p>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div class="grid gap-2">
              <Label for="gpa">GPA (0–4)</Label>
              <Input
                id="gpa"
                :model-value="form.gpa"
                type="number"
                step="0.01"
                min="0"
                max="4"
                data-testid="edit-gpa"
                @update:model-value="(v) => clampGpa(String(v))"
              />
              <p v-if="errors.gpa" class="text-sm text-destructive">{{ errors.gpa }}</p>
            </div>
            <div class="grid gap-2">
              <Label for="targetTerm">Target term *</Label>
              <Input id="targetTerm" v-model="form.targetTerm" data-testid="edit-targetTerm" />
              <p v-if="errors.targetTerm" class="text-sm text-destructive">
                {{ errors.targetTerm }}
              </p>
            </div>
          </div>

          <div class="grid gap-2">
            <Label for="testScores">Test scores (optional)</Label>
            <Input id="testScores" v-model="form.testScores" data-testid="edit-testScores" />
          </div>

          <p v-if="serverError" class="text-sm text-destructive">{{ serverError }}</p>
          <p v-if="saved" class="text-sm text-emerald-600" data-testid="edit-saved">
            Profile updated.
          </p>

          <div class="flex gap-2">
            <Button type="submit" variant="secondary" :disabled="saving" data-testid="edit-submit">
              {{ saving ? "Saving…" : "Save changes" }}
            </Button>
            <Button type="button" variant="outline" @click="router.push('/programs')">
              Back to programs
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  </div>
</template>
