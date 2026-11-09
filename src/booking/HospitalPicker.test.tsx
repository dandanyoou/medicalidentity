// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { HospitalPicker } from "./HospitalPicker";
import { clearHospitalCache, type Hospital } from "./hospitals";

const GU_LIST: Hospital[] = [
  { id: "1", name: "서울대학교병원", type: "상급종합", gu: "종로구", dong: "연건동", addr: "서울특별시 종로구 대학로 101", tel: "1588-5700", doctors: 1512, depts: ["내과", "가정의학과", "안과"] },
  { id: "2", name: "혜화튼튼정형외과의원", type: "의원", gu: "종로구", dong: "혜화동", addr: "서울특별시 종로구 혜화로 1", doctors: 1, depts: ["정형외과"] },
  { id: "3", name: "재단법인푸른재단 푸른가정의학과의원", shortName: "푸른가정의학과의원", type: "의원", gu: "종로구", dong: "명륜동", addr: "서울특별시 종로구 명륜길 2", doctors: 1, depts: ["가정의학과"] },
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

describe("HospitalPicker — 서울 병원 고르기", () => {
  it("큰 병원은 바로 누를 수 있고, 구를 고르면 그 구 병원이 진료과 기준으로 걸러져 나온다", async () => {
    const onPick = vi.fn();
    render(<HospitalPicker dept="가정의학과" onPick={onPick} />);

    // 상급종합병원은 파일을 받기 전에도 바로 보인다.
    fireEvent.click(screen.getByRole("button", { name: /서울대학교병원/ }));
    expect(onPick).toHaveBeenCalledWith("서울대학교병원");

    fireEvent.change(screen.getByLabelText("구 선택"), { target: { value: "종로구" } });
    const list = await screen.findByRole("list", { name: "종로구 병원 목록" });
    // 가정의학과가 있는 곳만: 서울대학교병원·푸른가정의학과의원. 정형외과만 있는 곳은 빠진다.
    expect(within(list).getAllByRole("listitem")).toHaveLength(2);
    expect(within(list).getByText("푸른가정의학과의원")).toBeTruthy();
    expect(within(list).queryByText(/튼튼정형외과/)).toBeNull();
    expect(within(list).getByText("의원 · 명륜동")).toBeTruthy();

    fireEvent.click(within(list).getByRole("button", { name: /푸른가정의학과의원/ }));
    // 저장되는 이름은 화면용 짧은 이름이 아니라 공식 이름이다.
    expect(onPick).toHaveBeenLastCalledWith("재단법인푸른재단 푸른가정의학과의원");
  });

  it("검색어로 더 좁힐 수 있고, 아무것도 없으면 빈 상태를 보여준다", async () => {
    render(<HospitalPicker dept={null} onPick={() => {}} />);
    fireEvent.change(screen.getByLabelText("구 선택"), { target: { value: "종로구" } });
    await screen.findByRole("list", { name: "종로구 병원 목록" });
    fireEvent.change(screen.getByLabelText("병원 이름·동으로 검색"), { target: { value: "혜화" } });
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
    fireEvent.change(screen.getByLabelText("병원 이름·동으로 검색"), { target: { value: "없는병원" } });
    expect(screen.getByText(/찾는 병원이 없어요/)).toBeTruthy();
  });

  it("고른 구를 기억해 다음에 바로 그 구를 불러온다", async () => {
    localStorage.setItem("medid.booking.gu.v1", "종로구");
    render(<HospitalPicker dept={null} onPick={() => {}} />);
    await screen.findByRole("list", { name: "종로구 병원 목록" });
    expect((screen.getByLabelText("구 선택") as HTMLSelectElement).value).toBe("종로구");
  });

  it("파일을 못 받으면 사과 대신 원인과 다시 시도 버튼을 보여준다", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("x", { status: 500 })));
    render(<HospitalPicker dept={null} onPick={() => {}} />);
    fireEvent.change(screen.getByLabelText("구 선택"), { target: { value: "강남구" } });
    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(screen.getByRole("button", { name: "다시 시도" })).toBeTruthy();
  });

  it("'가까운 순'을 누를 때만 위치 권한을 요청하고, 거리를 붙여 가까운 순으로 정렬하며, 위치는 저장하지 않는다", async () => {
    const getCurrentPosition = vi.fn((ok: (p: { coords: { latitude: number; longitude: number } }) => void) =>
      ok({ coords: { latitude: 37.5797, longitude: 126.999 } }), // 서울대학교병원 바로 옆
    );
    vi.stubGlobal("navigator", { ...navigator, geolocation: { getCurrentPosition } });
    const near: Hospital[] = [
      { id: "a", name: "먼의원", type: "의원", gu: "종로구", addr: "서울", doctors: 1, depts: ["내과"], lat: 37.65, lng: 127.08 },
      { id: "b", name: "가까운의원", type: "의원", gu: "종로구", addr: "서울", doctors: 1, depts: ["내과"], lat: 37.58, lng: 126.999 },
    ];
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(near))));
    render(<HospitalPicker dept={null} onPick={() => {}} />);
    // 열기만 해서는 위치를 묻지 않는다.
    expect(getCurrentPosition).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText("구 선택"), { target: { value: "종로구" } });
    await screen.findByRole("list", { name: "종로구 병원 목록" });
    fireEvent.click(screen.getByRole("button", { name: "가까운 순" }));
    expect(getCurrentPosition).toHaveBeenCalledTimes(1);

    const items = await screen.findAllByRole("listitem");
    expect(within(items[0]).getByText("가까운의원")).toBeTruthy();
    expect(within(items[0]).getByText(/\d+m|\d+(\.\d)?km/)).toBeTruthy();
    // 상급종합병원 목록에도 거리가 붙고 가까운 순이 된다.
    expect(screen.getAllByRole("button", { name: /서울대학교병원/ })[0].textContent).toMatch(/\d+m|\d+(\.\d)?km/);
    // 저장은 하지 않는다.
    expect(Object.keys(localStorage).some((k) => /lat|lng|geo|위치/i.test(k))).toBe(false);
  });

  it("위치 권한을 거부하면 이유를 알리고 목록은 그대로 둔다", async () => {
    const getCurrentPosition = vi.fn((_ok: unknown, fail: (e: { code: number; message: string }) => void) =>
      fail({ code: 1, message: "denied" }),
    );
    vi.stubGlobal("navigator", { ...navigator, geolocation: { getCurrentPosition } });
    render(<HospitalPicker dept={null} onPick={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: "가까운 순" }));
    expect(await screen.findByText(/위치 권한이 없어요/)).toBeTruthy();
    expect(screen.getAllByRole("button", { name: /서울대학교병원/ }).length).toBeGreaterThan(0);
  });

  it("데이터 출처와 기준일을 밝힌다", () => {
    render(<HospitalPicker dept={null} onPick={() => {}} />);
    expect(screen.getByText(/건강보험심사평가원/)).toBeTruthy();
    expect(screen.getByText(/2026-09-30/)).toBeTruthy();
  });

  it("목록이 길면 30개씩 보여주고 '더 보기'로 늘린다", async () => {
    const many: Hospital[] = Array.from({ length: 45 }, (_, i) => ({
      id: `m${i}`, name: `의원${i}`, type: "의원", gu: "강남구", addr: "서울", doctors: 1, depts: ["내과"],
    }));
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(many))));
    render(<HospitalPicker dept={null} onPick={() => {}} />);
    fireEvent.change(screen.getByLabelText("구 선택"), { target: { value: "강남구" } });
    await screen.findByRole("list", { name: "강남구 병원 목록" });
    expect(screen.getAllByRole("listitem")).toHaveLength(30);
    fireEvent.click(screen.getByRole("button", { name: /더 보기/ }));
    await waitFor(() => expect(screen.getAllByRole("listitem")).toHaveLength(45));
  });
});
