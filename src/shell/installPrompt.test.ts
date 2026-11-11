// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  captureInstallPrompt,
  getInstallState,
  promptInstall,
  _resetInstallPrompt,
} from "./installPrompt";

function stubMatchMedia(standalone: boolean) {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: (q: string) => ({ matches: q.includes("standalone") ? standalone : false }),
  });
}

beforeEach(() => {
  _resetInstallPrompt();
  stubMatchMedia(false);
});
afterEach(() => _resetInstallPrompt());

describe("installPrompt", () => {
  it("standalone으로 실행 중이면 installed", () => {
    stubMatchMedia(true);
    expect(getInstallState()).toBe("installed");
  });

  it("아무 신호도 없으면 manual, iOS UA면 ios", () => {
    expect(getInstallState()).toBe("manual");
    vi.spyOn(navigator, "userAgent", "get").mockReturnValue("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)");
    expect(getInstallState()).toBe("ios");
    vi.restoreAllMocks();
  });

  it("beforeinstallprompt를 잡으면 promptable이 되고, 수락하면 true", async () => {
    captureInstallPrompt();
    const ev = new Event("beforeinstallprompt") as Event & {
      prompt: () => Promise<void>;
      userChoice: Promise<{ outcome: "accepted" }>;
    };
    ev.prompt = () => Promise.resolve();
    ev.userChoice = Promise.resolve({ outcome: "accepted" });
    window.dispatchEvent(ev);
    expect(getInstallState()).toBe("promptable");
    expect(await promptInstall()).toBe(true);
    expect(getInstallState()).toBe("manual");
  });
});
