// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ForHospitalsScreen } from "./ForHospitalsScreen";
import { listTrialRequests } from "./trial";

beforeEach(() => localStorage.clear());
afterEach(() => cleanup());

function mount() {
  return render(
    <MemoryRouter>
      <ForHospitalsScreen />
    </MemoryRouter>,
  );
}

describe("ForHospitalsScreen — 병원용 소개·요금", () => {
  it("병원이 얻는 것 3가지(진료 전 정보 확인 시간·예약 대비 방문·서류 업무)를 보여준다", () => {
    mount();
    expect(screen.getByRole("heading", { level: 1 })).toBeTruthy();
    // 같은 말이 본문·측정 안내에 함께 나올 수 있어 "하나 이상"으로 확인한다.
    for (const re of [/진료 전 정보 확인/, /예약 대비 방문/, /서류 업무/]) {
      expect(screen.getAllByText(re).length).toBeGreaterThan(0);
    }
  });

  it("요금안은 월 이용료 + 14일 무료 체험이고, 금액은 '안(가정)'으로 표시한다", () => {
    mount();
    expect(screen.getAllByText(/14일 무료 체험/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/안\(가정\)/).length).toBeGreaterThan(0);
    expect(screen.getByText(/\/월/)).toBeTruthy();
  });

  it("병원 추천 대가를 주고받지 않는다는 것과 진단이 아니라는 것을 밝힌다", () => {
    mount();
    expect(screen.getAllByText(/추천 대가/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/진단/).length).toBeGreaterThan(0);
  });

  it("효과 숫자를 주장하지 않는다 — 파일럿에서 측정한다고 밝힌다", () => {
    mount();
    expect(screen.getAllByText(/측정/).length).toBeGreaterThan(0);
    expect(screen.queryByText(/\d+%\s*(절감|감소|단축)/)).toBeNull();
  });

  it("체험 신청 폼: 기기 저장 시연 표기, 제출하면 저장되고 접수 안내가 뜬다", () => {
    mount();
    expect(screen.getAllByText(/시연/).length).toBeGreaterThan(0);
    const submit = screen.getByRole("button", { name: /체험 신청/ });
    expect((submit as HTMLButtonElement).disabled).toBe(true);

    fireEvent.change(screen.getByLabelText(/병원 이름/), { target: { value: "행복의원" } });
    fireEvent.change(screen.getByLabelText(/담당자/), { target: { value: "김원장" } });
    fireEvent.change(screen.getByLabelText(/연락처/), { target: { value: "02-123-4567" } });
    expect((submit as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(submit);

    expect(screen.getByRole("status").textContent).toMatch(/행복의원/);
    expect(listTrialRequests()).toHaveLength(1);
  });

  it("의사 화면으로 가는 링크가 있다", () => {
    mount();
    expect(screen.getByRole("link", { name: /의사 화면/ })).toBeTruthy();
  });
});
