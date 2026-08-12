<script setup lang="ts">
import { reactive, ref } from "vue";

const profileStore = useProfileStore();
const router = useRouter();

const form = reactive({
  name: "",
  email: "",
  educationLevel: "",
  gpa: "",
  testScores: "",
  targetTerm: "",
});

const educationLevels = [
  { label: "High School", value: "High School" },
  { label: "Associate", value: "Associate" },
  { label: "Bachelors", value: "Bachelors" },
  { label: "Masters", value: "Masters" },
];

const errors = ref<Record<string, string>>({});
const submitting = ref(false);
const serverError = ref<string | null>(null);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Set/clear a single field error without dynamic delete ("" is falsy → hidden).
function setError(field: string, msg: string) {
  errors.value = { ...errors.value, [field]: msg };
}

// Live email validation (called on blur).
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
    form.gpa = value; // in-progress input, leave as-is
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

async function submit() {
  serverError.value = null;
  if (!validate()) return;
  submitting.value = true;
  try {
    await profileStore.create({
      name: form.name.trim(),
      email: form.email.trim(),
      educationLevel: form.educationLevel,
      gpa: form.gpa === "" ? undefined : Number(form.gpa),
      testScores: form.testScores.trim() || undefined,
      targetTerm: form.targetTerm.trim(),
    });
    router.push("/programs");
  } catch {
    serverError.value = profileStore.error ?? "Failed to create profile";
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <div class="mx-auto max-w-2xl">
    <div class="mb-6 text-center">
      <h1 class="text-3xl font-bold tracking-tight">Let's build your admissions plan</h1>
      <p class="mt-2 text-muted-foreground">
        Tell us about yourself. We'll generate a tailored readiness checklist for the programs you
        target.
      </p>
    </div>

    <Card>
      <CardHeader>
        <CardTitle>Student intake</CardTitle>
        <CardDescription>All fields marked required must be completed.</CardDescription>
      </CardHeader>
      <CardContent>
        <form class="space-y-5" novalidate @submit.prevent="submit">
          <div class="grid gap-2">
            <Label for="name">Full name *</Label>
            <Input id="name" v-model="form.name" placeholder="Ada Lovelace" data-testid="name" />
            <p v-if="errors.name" class="text-sm text-destructive" data-testid="error-name">
              {{ errors.name }}
            </p>
          </div>

          <div class="grid gap-2">
            <Label for="email">Email *</Label>
            <Input
              id="email"
              v-model="form.email"
              type="email"
              placeholder="ada@example.com"
              data-testid="email"
              @blur="validateEmail"
            />
            <p v-if="errors.email" class="text-sm text-destructive" data-testid="error-email">
              {{ errors.email }}
            </p>
          </div>

          <div class="grid gap-2">
            <Label>Education level *</Label>
            <Select
              v-model="form.educationLevel"
              :options="educationLevels"
              placeholder="Select level"
              aria-label="Education level"
              data-testid="education"
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
                placeholder="3.80"
                data-testid="gpa"
                @update:model-value="(v) => clampGpa(String(v))"
              />
              <p v-if="errors.gpa" class="text-sm text-destructive">{{ errors.gpa }}</p>
            </div>
            <div class="grid gap-2">
              <Label for="targetTerm">Target term *</Label>
              <Input
                id="targetTerm"
                v-model="form.targetTerm"
                placeholder="Fall 2027"
                data-testid="targetTerm"
              />
              <p v-if="errors.targetTerm" class="text-sm text-destructive">
                {{ errors.targetTerm }}
              </p>
            </div>
          </div>

          <div class="grid gap-2">
            <Label for="testScores">Test scores (optional)</Label>
            <Input
              id="testScores"
              v-model="form.testScores"
              placeholder="SAT 1450, TOEFL 105"
              data-testid="testScores"
            />
          </div>

          <p v-if="serverError" class="text-sm text-destructive">{{ serverError }}</p>

          <Button
            type="submit"
            variant="secondary"
            class="w-full"
            :disabled="submitting"
            data-testid="submit"
          >
            {{ submitting ? "Creating profile…" : "Create profile & browse programs" }}
          </Button>
        </form>
      </CardContent>
    </Card>
  </div>
</template>
