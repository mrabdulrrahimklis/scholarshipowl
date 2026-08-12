import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import UserAvatar from "~/components/UserAvatar.vue";

describe("UserAvatar", () => {
  it("uses first + last initials for a full name", () => {
    expect(mount(UserAvatar, { props: { name: "Ada Lovelace" } }).text()).toBe("AL");
  });

  it("uses a single initial for a single name", () => {
    expect(mount(UserAvatar, { props: { name: "Grace" } }).text()).toBe("G");
  });

  it("uppercases and ignores extra whitespace", () => {
    expect(mount(UserAvatar, { props: { name: "  grace   hopper  " } }).text()).toBe("GH");
  });

  it("falls back to '?' when there is no name", () => {
    expect(mount(UserAvatar, { props: { name: "" } }).text()).toBe("?");
  });
});
