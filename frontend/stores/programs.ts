import { defineStore } from "pinia";
import type { Program } from "~/types/api";

export const useProgramStore = defineStore("programs", {
  state: () => ({
    items: [] as Program[],
    total: 0,
    page: 1,
    pageSize: 6,
    search: "",
    degreeType: "" as string,
    loading: false,
    current: null as Program | null,
  }),
  getters: {
    totalPages: (s) => Math.max(1, Math.ceil(s.total / s.pageSize)),
  },
  actions: {
    async fetch() {
      this.loading = true;
      try {
        const res = await useApi().listPrograms({
          search: this.search || undefined,
          degreeType: this.degreeType || undefined,
          page: this.page,
          pageSize: this.pageSize,
        });
        this.items = res.data;
        this.total = res.total;
      } finally {
        this.loading = false;
      }
    },

    async setFilters(partial: { search?: string; degreeType?: string; page?: number }) {
      if (partial.search !== undefined) this.search = partial.search;
      if (partial.degreeType !== undefined) this.degreeType = partial.degreeType;
      // Reset to page 1 when filters change; explicit page overrides.
      this.page = partial.page ?? 1;
      await this.fetch();
    },

    async fetchOne(id: string) {
      this.loading = true;
      try {
        this.current = await useApi().getProgram(id);
        return this.current;
      } finally {
        this.loading = false;
      }
    },
  },
});
