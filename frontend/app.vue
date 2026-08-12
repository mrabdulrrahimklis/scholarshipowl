<script setup lang="ts">
import { onMounted } from "vue";

const profileStore = useProfileStore();
const route = useRoute();

onMounted(async () => {
  // Deep link: ?profile=<id> loads a specific profile (used for demo/tracking).
  const id = route.query.profile as string | undefined;
  if (id) {
    await profileStore.loadById(id);
  } else {
    // Otherwise restore any previously created profile (persistence / revisit).
    await profileStore.restore();
  }
});
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
