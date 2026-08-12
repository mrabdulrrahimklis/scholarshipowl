// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2025-01-01",
  devtools: { enabled: false },
  modules: ["@nuxtjs/tailwindcss", "@pinia/nuxt", "@nuxt/eslint"],
  css: ["~/assets/css/tailwind.css"],
  components: [
    // shadcn-vue components: use bare names (<Button>, <Card>…), no path prefix.
    { path: "~/components/ui", pathPrefix: false, extensions: [".vue"] },
    "~/components",
  ],
  ssr: true,
  runtimeConfig: {
    // Server-only GraphQL endpoint used during SSR. In Docker this is the
    // internal service name (http://api:4000/graphql); on the host it falls back
    // to the public URL. Overridable via NUXT_API_BASE_SERVER.
    apiBaseServer: process.env.NUXT_API_BASE_SERVER || "http://localhost:4000/graphql",
    public: {
      // GraphQL endpoint used in the browser. Overridable via NUXT_PUBLIC_API_BASE.
      apiBase: process.env.NUXT_PUBLIC_API_BASE || "http://localhost:4000/graphql",
    },
  },
  app: {
    head: {
      title: "Admissions Readiness Dashboard",
      meta: [
        { charset: "utf-8" },
        { name: "viewport", content: "width=device-width, initial-scale=1" },
      ],
    },
  },
  typescript: {
    typeCheck: false,
  },
});
