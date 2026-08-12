<script setup lang="ts">
const profileStore = useProfileStore();
</script>

<template>
  <div class="min-h-screen bg-muted/30">
    <header class="border-b bg-background">
      <div class="container flex h-16 items-center justify-between px-4">
        <NuxtLink to="/" class="flex items-center gap-2 font-semibold">
          <img src="/logo-mascot.png" alt="ScholarshipOwl" class="h-8 w-auto" />
          <span>Admissions Readiness</span>
        </NuxtLink>
        <nav class="flex items-center gap-1 text-sm">
          <NuxtLink
            to="/programs"
            class="rounded-md px-3 py-2 hover:bg-accent"
            active-class="bg-accent font-medium underline decoration-secondary decoration-2 underline-offset-8"
          >
            Programs
          </NuxtLink>
          <NuxtLink
            to="/dashboard"
            class="rounded-md px-3 py-2 hover:bg-accent"
            active-class="bg-accent font-medium underline decoration-secondary decoration-2 underline-offset-8"
          >
            Dashboard
          </NuxtLink>
          <NuxtLink
            v-if="profileStore.hasProfile"
            to="/my-programs"
            class="rounded-md px-3 py-2 hover:bg-accent"
            active-class="bg-accent font-medium underline decoration-secondary decoration-2 underline-offset-8"
          >
            My Programs
          </NuxtLink>
          <NuxtLink
            v-if="profileStore.hasProfile"
            to="/reminders"
            class="rounded-md px-3 py-2 hover:bg-accent"
            active-class="bg-accent font-medium underline decoration-secondary decoration-2 underline-offset-8"
          >
            Reminders
          </NuxtLink>
          <div class="ml-2 flex items-center gap-2">
            <template v-if="profileStore.hasProfile">
              <NuxtLink
                to="/profile"
                class="flex items-center rounded-full p-0.5 hover:bg-accent"
                active-class="bg-accent"
                data-testid="nav-profile"
                :title="profileStore.profile?.name"
                :aria-label="`Profile: ${profileStore.profile?.name}`"
              >
                <UserAvatar :name="profileStore.profile?.name" size="sm" />
              </NuxtLink>
            </template>
            <Button v-else size="sm" variant="outline" @click="navigateTo('/')">
              Get started
            </Button>
          </div>
        </nav>
      </div>
    </header>

    <main class="container px-4 py-8">
      <slot />
    </main>
  </div>
</template>
