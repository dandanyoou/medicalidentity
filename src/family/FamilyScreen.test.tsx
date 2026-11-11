// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { FamilyScreen } from "./FamilyScreen";
import { listMembers, resetFamily } from "./store";

beforeEach(() => resetFamily());
afterEach(() => {
  cleanup();
  resetFamily();
});

function renderScreen() {
  return render(
    <MemoryRouter>
      <FamilyScreen />
    </MemoryRouter>,
  );
}

const next = () => fireEvent.click(screen.getByRole("button", { name: "다음" }));

/** 1단계: 온라인 가족관계증명서 문서확인번호로 증명. */
function proveOnline() {
  fireEvent.click(screen.getByRole("button", { name: "가족 추가" }));
  fireEvent.click(screen.getByRole("button", { name: /온라인 가족관계증명서/ }));
  fireEvent.change(screen.getByLabelText("문서확인번호"), {
    target: { value: "1234-5678-9012-3456" },
  });
  next();
}

/** 2단계: 증명서에 기재된 성함·연락처. */
function fillPerson(name: string, phone: string) {
  fireEvent.change(screen.getByLabelText("성함"), { target: { value: name } });
  fireEvent.change(screen.getByLabelText("연락처"), { target: { value: phone } });
  fireEvent.click(screen.getByLabelText(/증명서에 이 가족이 기재되어 있어요/));
  // 2026-11-09 L1: 당사자 동의 확인이 필수 단계로 추가돼 도우미도 함께 누른다.
  fireEvent.click(screen.getByLabelText(/이 가족에게.*동의를 받았어요/));
  next();
}

describe("FamilyScreen (가족 관리)", () => {
  it("본인이 기본으로 보이고, 이니셜 아바타와 '본인' 배지가 붙는다", () => {
    renderScreen();
    expect(screen.getByText("김단유")).toBeTruthy();
    expect(screen.getByText("김", { selector: "[aria-hidden]" })).toBeTruthy();
    expect(screen.getByText("본인")).toBeTruthy();
  });

  it("가족이 본인뿐이면 빈 상태 안내가 보인다", () => {
    renderScreen();
    expect(screen.getByText(/아직 등록된 가족이 없어요/)).toBeTruthy();
  });

  it("증명서 → 가족 정보 → 회원 확인 → 추가 순서로, 회원이면 연결 요청으로 추가된다", () => {
    renderScreen();
    proveOnline();
    fillPerson("김복순", "010-1234-5678");

    // 3단계: 서비스 회원 대조
    expect(screen.getByText(/가족 의료지갑 회원이에요/)).toBeTruthy();
    expect(screen.getByText("010-****-5678")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "연결 요청하고 계속" }));

    // 4단계: 의료 정보 확인 후 추가
    fireEvent.click(screen.getByRole("button", { name: "추가하기" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByText("김복순")).toBeTruthy();
    expect(screen.getByText("연결 요청됨")).toBeTruthy();

    const added = listMembers().find((m) => m.name === "김복순");
    expect(added?.verification?.method).toBe("family-cert");
    expect(added?.verification?.docRef).toBe("1234-****-****-3456");
    expect(added?.link?.status).toBe("연결 요청됨");
    expect(added?.phone).toBe("01012345678");
  });

  it("문서확인번호 형식이 틀리면 다음으로 못 간다", () => {
    renderScreen();
    fireEvent.click(screen.getByRole("button", { name: "가족 추가" }));
    fireEvent.click(screen.getByRole("button", { name: /온라인 가족관계증명서/ }));
    fireEvent.change(screen.getByLabelText("문서확인번호"), { target: { value: "1234" } });
    expect((screen.getByRole("button", { name: "다음" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("종이 등본은 사진을 첨부해야 다음으로 간다", () => {
    renderScreen();
    fireEvent.click(screen.getByRole("button", { name: "가족 추가" }));
    fireEvent.click(screen.getByRole("button", { name: /종이 주민등록등본/ }));
    const nextBtn = screen.getByRole("button", { name: "다음" }) as HTMLButtonElement;
    expect(nextBtn.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText("등본 사진 첨부"), {
      target: { files: [new File(["x"], "deungbon.jpg", { type: "image/jpeg" })] },
    });
    expect(nextBtn.disabled).toBe(false);
  });

  it("증명서에 기재됐다는 확인 없이는 회원 확인으로 못 간다", () => {
    renderScreen();
    proveOnline();
    fireEvent.change(screen.getByLabelText("성함"), { target: { value: "김복순" } });
    fireEvent.change(screen.getByLabelText("연락처"), { target: { value: "010-1234-5678" } });
    expect((screen.getByRole("button", { name: "다음" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("당사자(그 가족) 동의 확인 없이는 회원 확인으로 못 간다 — 남의 건강정보 등록이기 때문", () => {
    renderScreen();
    proveOnline();
    fireEvent.change(screen.getByLabelText("성함"), { target: { value: "김복순" } });
    fireEvent.change(screen.getByLabelText("연락처"), { target: { value: "010-1234-5678" } });
    fireEvent.click(screen.getByLabelText(/증명서에 이 가족이 기재되어 있어요/));
    expect((screen.getByRole("button", { name: "다음" }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByLabelText(/이 가족에게.*동의를 받았어요/));
    expect((screen.getByRole("button", { name: "다음" }) as HTMLButtonElement).disabled).toBe(false);
  });

  it("연락처의 회원 이름이 증명서 성함과 다르면 추가를 막는다", () => {
    renderScreen();
    proveOnline();
    fillPerson("김영희", "010-1234-5678");
    expect(screen.getByText(/회원 이름이 증명서와 달라요/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: /계속/ })).toBeNull();
  });

  it("회원이 아니면 보호자 관리 프로필로 추가된다", () => {
    renderScreen();
    proveOnline();
    fillPerson("홍길동", "010-5555-0000");
    expect(screen.getByText(/아직 가족 의료지갑 회원이 아니에요/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "관리 프로필로 계속" }));
    fireEvent.click(screen.getByRole("button", { name: "추가하기" }));
    expect(screen.getByText("관리 프로필")).toBeTruthy();
  });
});
