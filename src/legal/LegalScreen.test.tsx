// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { LegalScreen } from "./LegalScreen";

afterEach(() => cleanup());

describe("LegalScreen — 개인정보처리방침·이용약관", () => {
  it("개인정보처리방침: 기기 저장, 민감정보 별도 동의, 결제 시 토스페이먼츠 전달, 만 14세, 변호사 검토 전 초안 표시", () => {
    render(
      <MemoryRouter>
        <LegalScreen kind="privacy" />
      </MemoryRouter>,
    );
    expect(screen.getByRole("heading", { level: 1, name: "개인정보처리방침" })).toBeTruthy();
    // 같은 말이 제목과 본문에 함께 나올 수 있어 "하나 이상"으로 확인한다.
    for (const re of [/이 기기에만 저장/, /민감정보/, /토스페이먼츠/, /만 14세/, /변호사 검토 전 초안/]) {
      expect(screen.getAllByText(re).length).toBeGreaterThan(0);
    }
    // 사업자 정보는 아직 없다 — 지어내지 않고 채울 자리를 표시한다.
    expect(screen.getAllByText(/\[사업자 등록 후 기입\]/).length).toBeGreaterThan(0);
  });

  it("이용약관: 의료행위·진단 아님, 응급 시 119, 구독 청약철회 7일, 병원 정보 출처", () => {
    render(
      <MemoryRouter>
        <LegalScreen kind="terms" />
      </MemoryRouter>,
    );
    expect(screen.getByRole("heading", { level: 1, name: "이용약관" })).toBeTruthy();
    expect(screen.getByText(/진단이나 의료행위가 아닙니다/)).toBeTruthy();
    expect(screen.getByText(/119/)).toBeTruthy();
    expect(screen.getByText(/7일 이내/)).toBeTruthy();
    expect(screen.getByText(/건강보험심사평가원/)).toBeTruthy();
  });
});
