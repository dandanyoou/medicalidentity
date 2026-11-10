// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { HospitalPortalScreen } from "./HospitalPortalScreen";
import { currentSession, listBadges, registerHospital } from "./badge";

beforeEach(() => localStorage.clear());
afterEach(() => cleanup());

function mount() {
  return render(
    <MemoryRouter>
      <HospitalPortalScreen />
    </MemoryRouter>,
  );
}

describe("HospitalPortalScreen — 병원 등록 → 직원 배지 → 로그인 (시연)", () => {
  it("등록 전에는 등록 폼만 보이고, 등록하면 병원 이름과 '인증됨(시연)'이 보인다", () => {
    mount();
    expect(screen.getAllByText(/시연/).length).toBeGreaterThan(0);
    const btn = screen.getByRole("button", { name: /병원 등록/ });
    expect((btn as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(screen.getByLabelText(/병원 이름/), { target: { value: "행복의원" } });
    fireEvent.change(screen.getByLabelText(/관리자 이름/), { target: { value: "박원무" } });
    // 관리자 확인 체크(시연)를 해야 등록된다.
    expect((btn as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(btn);
    expect(screen.getByRole("heading", { name: /행복의원/ })).toBeTruthy();
    expect(screen.getAllByText(/인증됨\(시연\)/).length).toBeGreaterThan(0);
  });

  it("직원 배지를 발급하면 목록에 이름·역할·만료가 뜨고 코드가 생긴다", () => {
    registerHospital({ name: "행복의원", admin: "박원무" });
    mount();
    fireEvent.change(screen.getByLabelText(/직원 이름/), { target: { value: "김의사" } });
    fireEvent.change(screen.getByLabelText(/역할/), { target: { value: "doctor" } });
    fireEvent.click(screen.getByRole("button", { name: /배지 발급/ }));
    const list = screen.getByRole("list", { name: /직원 배지/ });
    expect(list.textContent).toMatch(/김의사/);
    expect(list.textContent).toMatch(/의사/);
    expect(list.textContent).toMatch(/만료/);
    expect(listBadges()).toHaveLength(1);
  });

  it("'이 배지로 로그인'을 누르면 세션이 생기고 의사 화면 링크가 보인다; 폐기하면 세션이 사라진다", async () => {
    registerHospital({ name: "행복의원", admin: "박원무" });
    mount();
    fireEvent.change(screen.getByLabelText(/직원 이름/), { target: { value: "김의사" } });
    fireEvent.click(screen.getByRole("button", { name: /배지 발급/ }));
    fireEvent.click(screen.getByRole("button", { name: /이 배지로 로그인/ }));
    await waitFor(() => expect(currentSession()?.name).toBe("김의사"));
    expect(screen.getByRole("status").textContent).toMatch(/김의사/);
    expect(screen.getByRole("link", { name: /의사 화면/ })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /폐기/ }));
    await waitFor(() => expect(currentSession()).toBeNull());
    expect(screen.getByRole("list", { name: /직원 배지/ }).textContent).toMatch(/폐기됨/);
  });

  it("배지 코드를 붙여넣어 로그인할 수 있고, 엉뚱한 코드는 안내만 한다", async () => {
    registerHospital({ name: "행복의원", admin: "박원무" });
    mount();
    fireEvent.change(screen.getByLabelText(/배지 코드/), { target: { value: "garbage" } });
    fireEvent.click(screen.getByRole("button", { name: /코드로 로그인/ }));
    await screen.findByRole("alert");
    expect(currentSession()).toBeNull();
  });
});
