import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import Button from "~/components/ui/button/Button.vue";

describe("Button", () => {
  it("renders slot content", () => {
    const wrapper = mount(Button, { slots: { default: "Generate checklist" } });
    expect(wrapper.text()).toBe("Generate checklist");
    expect(wrapper.element.tagName).toBe("BUTTON");
  });

  it("applies the secondary (orange) variant classes", () => {
    const wrapper = mount(Button, {
      props: { variant: "secondary" },
      slots: { default: "Go" },
    });
    expect(wrapper.classes()).toContain("bg-secondary");
  });

  it("respects the disabled prop", () => {
    const wrapper = mount(Button, { props: { disabled: true }, slots: { default: "x" } });
    expect(wrapper.attributes("disabled")).toBeDefined();
  });
});
