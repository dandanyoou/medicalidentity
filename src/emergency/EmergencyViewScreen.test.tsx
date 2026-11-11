// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { EmergencyViewScreen } from "./EmergencyViewScreen";
import { buildTier1Url, type Tier1 } from "./lockscreen";
import { DEMO_HOLDER } from "../data/issuer-keys";
import { TabBar } from "../shell/TabBar";

afterEach(() => cleanup());

const t1: Tier1 = {
  blood: "A+",
  allergens: ["페니실린(중증)"],
  meds: ["아스피린 100mg"],
  contact: { label: "딸 김단유", phone: "01012345678" },
};

async function urlFor(t: Tier1 = t1) {
  // origin 없이 경로+조각만 — MemoryRouter 진입 주소로 쓴다.
  return (await buildTier1Url(t, { origin: "", holder: DEMO_HOLDER, now: 1700000000 })).replace(/^\/e/, "/e");
}

function renderAt(entry: string) {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <EmergencyViewScreen />
      <TabBar />
    </MemoryRouter>,
  );
}

describe("EmergencyViewScreen — 구급대원이 QR을 읽으면 열리는 페이지", () => {
  it("서명이 맞으면 1층 정보를 크게 보여주고, 비상연락은 바로 전화 링크, 생성 시각·변조 없음 표시", async () => {
    renderAt(await urlFor());
    const main = await screen.findByRole("main");
    expect(within(main).getByText("A+")).toBeTruthy();
    expect(within(main).getByText(/페니실린\(중증\)/)).toBeTruthy();
    expect(within(main).getByText(/아스피린 100mg/)).toBeTruthy();
    expect(within(main).getByRole("link", { name: /딸 김단유.*010-1234-5678/ }).getAttribute("href")).toBe("tel:01012345678");
    expect(within(main).getByText(/변조 없음/)).toBeTruthy();
    expect(within(main).getByText(/2023\.\s?11\.\s?15/)).toBeTruthy(); // 1700000000 → 2023-11-15 (KST)
    // 119 버튼은 헤더에 항상 있다.
    expect(screen.getByRole("link", { name: /119/ }).getAttribute("href")).toBe("tel:119");
    // 2층은 아직 — 숨기지 않고 말한다.
    expect(within(main).getByText(/진료 이력.*준비 중/)).toBeTruthy();
    // 탭바 없는 전체 화면.
    expect(screen.queryByRole("navigation")).toBeNull();
  });

  it("내용이 바뀐(서명 불일치) 정보는 보여주지 않고 신뢰할 수 없다고 알린다", async () => {
    const url = await urlFor();
    const i = url.indexOf("#");
    // 페이로드의 한 글자를 바꾼다 — base64url이 깨지지 않게 끝에서 두 번째 글자를 다른 글자로.
    const frag = url.slice(i + 1);
    const pos = frag.length - 2;
    const swapped = frag[pos] === "A" ? "B" : "A";
    renderAt(url.slice(0, i + 1) + frag.slice(0, pos) + swapped + frag.slice(pos + 1));
    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(screen.getByText(/신뢰할 수 없어요|읽을 수 없어요/)).toBeTruthy();
    expect(screen.queryByText("A+")).toBeNull();
  });

  it("QR 없이 그냥 열면 안내만 보여준다", () => {
    renderAt("/e");
    expect(screen.getByText(/QR을 읽어서 열어주세요/)).toBeTruthy();
    expect(screen.getByRole("link", { name: /119/ })).toBeTruthy();
  });
});
