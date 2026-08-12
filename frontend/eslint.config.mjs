// @ts-check
import withNuxt from "./.nuxt/eslint.config.mjs";

export default withNuxt({
  rules: {
    "vue/multi-word-component-names": "off",
    // Optional `class` passthrough props are idiomatic in shadcn-vue components.
    "vue/require-default-prop": "off",
    // Defer HTML tag formatting to Prettier to avoid a rule tug-of-war.
    "vue/html-self-closing": "off",
    "@typescript-eslint/no-explicit-any": "off",
    "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
  },
});
