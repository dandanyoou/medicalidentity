// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { hasSeenOnboarding, markOnboarded, resetOnboarding } from "./onboarding";

beforeEach(() => resetOnboarding());
afterEach(() => resetOnboarding());

describe("onboarding flag", () => {
  it("처음엔 안 본 상태, 보고 나면 본 상태", () => {
    expect(hasSeenOnboarding()).toBe(false);
    markOnboarded();
    expect(hasSeenOnboarding()).toBe(true);
  });
});
