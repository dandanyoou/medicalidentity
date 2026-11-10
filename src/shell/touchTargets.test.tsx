// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { HospitalPicker } from "../booking/HospitalPicker";
import { clearHospitalCache, type Hospital } from "../booking/hospitals";
import { IntakeChat } from "../intake/IntakeChat";
import { QueuePanel } from "../doctor/QueuePanel";
import { resetVisits } from "../visits/store";

/**
 * R9 — 누르는 것은 44px 이상(손가락 기준). 클래스로 고정해 되돌아가지 않게 한다.
 * 색·글꼴 토큰은 바꾸지 않는다.
 */
const GU_LIST: Hospital[] = [
  { id: "1", name: "서울대학교병원", type: "상급종합", gu: "종로구", dong: "연건동", addr: "서울", tel: "1588-5700", doctors: 1512, depts: ["내과"] },
];

beforeEach(() => {
  localStorage.clear();
  resetVisits();
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(GU_LIST))));
});
afterEach(() => {
  cleanup();
  clearHospitalCache();
  vi.unstubAllGlobals();
});

const has44 = (el: Element) => /min-h-\[44px\]|h-11|h-12|min-h-\[48px\]/.test(el.className);

describe("터치 영역 44px — 병원 선택 · 문진 · 의사 대기열", () => {
  it("병원 선택 정렬 버튼", () => {
    render(<HospitalPicker dept={null} onPick={() => {}} />);
    const sort = screen.getByRole("group", { name: "정렬" });
    for (const b of within(sort).getAllByRole("button")) expect(has44(b)).toBe(true);
  });

  it("문진 답 버튼과 '다음'", () => {
    render(<IntakeChat seedText="" onDone={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: "머리" }));
    const next = screen.getByRole("button", { name: "다음" });
    expect(has44(next)).toBe(true);
    expect(has44(screen.getByRole("button", { name: "머리" }))).toBe(true);
  });

  it("의사 대기열 '시연 환자 불러오기'", () => {
    render(
      <MemoryRouter>
        <QueuePanel />
      </MemoryRouter>,
    );
    expect(has44(screen.getByRole("button", { name: /시연 환자/ }))).toBe(true);
  });
});
