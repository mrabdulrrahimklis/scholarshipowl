import { defineStore } from "pinia";
import type { Profile } from "~/types/api";

const STORAGE_KEY = "arp.profileId";

export const useProfileStore = defineStore("profile", {
  state: () => ({
    profile: null as Profile | null,
    loading: false,
    error: null as string | null,
  }),
  getters: {
    hasProfile: (s) => !!s.profile,
    profileId: (s) => s.profile?.id ?? null,
  },
  actions: {
    /** Restore a profile from a previously stored id (persistence / revisit). */
    async restore() {
      if (import.meta.server) return;
      const id = localStorage.getItem(STORAGE_KEY);
      if (!id || this.profile) return;
      try {
        this.profile = await useApi().getProfile(id);
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    },

    /** Load a specific profile by id and remember it (e.g. ?profile=<id> deep link). */
    async loadById(id: string) {
      if (import.meta.server) return;
      try {
        this.profile = await useApi().getProfile(id);
        localStorage.setItem(STORAGE_KEY, id);
        return this.profile;
      } catch {
        this.error = `Profile ${id} not found`;
        return null;
      }
    },

    async create(input: Record<string, unknown>) {
      this.loading = true;
      this.error = null;
      try {
        const profile = await useApi().createProfile(input);
        this.profile = profile;
        if (import.meta.client) localStorage.setItem(STORAGE_KEY, profile.id);
        return profile;
      } catch (e: unknown) {
        this.error = extractError(e);
        throw e;
      } finally {
        this.loading = false;
      }
    },

    async update(input: Record<string, unknown>) {
      if (!this.profile) throw new Error("No profile to update");
      this.loading = true;
      try {
        this.profile = await useApi().updateProfile(this.profile.id, input);
        return this.profile;
      } finally {
        this.loading = false;
      }
    },

    reset() {
      this.profile = null;
      if (import.meta.client) localStorage.removeItem(STORAGE_KEY);
    },
  },
});

function extractError(e: unknown): string {
  const err = e as { data?: { error?: { message?: string } }; message?: string };
  return err?.data?.error?.message ?? err?.message ?? "Something went wrong";
}
