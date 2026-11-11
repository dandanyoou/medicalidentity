// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { HospitalPicker } from "./HospitalPicker";
import { clearHospitalCache, type Hospital } from "./hospitals";

/**
 * U3 — 병원 선택 리디자인(참고 영상 규칙: 알약 세그먼트 · 행 목록 · 카드 속 카드).
 * 정렬 동작·검색·구 선택·onPick 값은 바꾸지 않는다.
 */
const GU_LIST: Hospital[] = [
  { id: "1", name: "서울대학교병원", type: "상급종합", gu: "종로구", dong: "연건동", addr: "서울", tel: "1588-5700", doctors: 1512, depts: ["내과"] },
  { id: "2", name: "종로연세의원", type: "의원", gu: "종로구", dong: "관철동", addr: "서울", tel: "02-000-0000", doctors: 2, depts: ["내과"] },
];

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(GU_LIST))));
});
afterEach(() => {
  cleanup();
  clearHospitalCache();
  vi.unstubAllGlobals();
});

describe("U3 병원 선택 — 정렬 알약 세그먼트", () => {
  it("잉크색 알약 컨테이너 안에서 선택된 정렬만 흰 알약이다", () => {
    render(<HospitalPicker dept={null} onPick={() => {}} />);
    const group = screen.getByRole("group", { name: "정렬" });
    expect(group.className).toMatch(/rounded-full/);
    expect(group.className).toMatch(/bg-\[var\(--ink\)\]/);
    const active = within(group).getAllByRole("button").filter((b) => b.getAttribute("aria-pressed") === "true");
    expect(active).toHaveLength(1);
    expect(active[0].className).toMatch(/bg-\[var\(--surface\)\]/);
  });
});

describe("U3 병원 선택 — 카드 속 카드", () => {
  it("상급종합병원 묶음은 paper 면 안쪽 카드이고 버튼은 44px 흰 칩이다", () => {
    render(<HospitalPicker dept={null} onPick={() => {}} />);
    const region = screen.getByRole("region", { name: "서울 상급종합병원" });
    expect(region.className).toMatch(/bg-\[var\(--paper\)\]/);
    for (const b of within(region).getAllByRole("button")) {
      expect(b.className).toMatch(/min-h-\[44px\]/);
      expect(b.className).toMatch(/bg-\[var\(--surface\)\]/);
    }
  });
});

describe("U3 병원 선택 — 행 목록", () => {
  it("구를 고르면 병원이 이니셜 원 · 굵은 이름 · 흐린 메타 행으로, 헤어라인으로 나뉘어 보인다", async () => {
    render(<HospitalPicker dept={null} onPick={() => {}} />);
    fireEvent.change(screen.getByLabelText("구 선택"), { target: { value: "종로구" } });
    const list = await screen.findByRole("list", { name: "종로구 병원 목록" });
    expect(list.className).toMatch(/divide-y/);
    const rows = within(list).getAllByRole("button");
    expect(rows).toHaveLength(2);
    for (const r of rows) expect(r.className).toMatch(/min-h-\[44px\]/);
    // 이니셜 원: 이름 첫 글자
    expect(within(rows[0]).getByText("서").className).toMatch(/rounded-full/);
    expect(within(rows[1]).getByText("종").className).toMatch(/rounded-full/);
  });
});
