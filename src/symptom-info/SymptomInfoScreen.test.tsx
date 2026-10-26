// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { SymptomInfoScreen } from "./SymptomInfoScreen";

describe("SymptomInfoScreen — 법적 경계(진단 아님, 추천 아님)", () => {
  afterEach(() => cleanup());

  it("증상을 고르기 전에도 '의학적 진단이 아닙니다' 고지가 항상 보인다", () => {
    render(
      <MemoryRouter>
        <SymptomInfoScreen />
      </MemoryRouter>,
    );
    const alertText = screen.getByRole("alert").textContent ?? "";
    expect(alertText).toContain("의학적 진단이 아닙니다");
    expect(alertText).toContain("119");
  });

  it("증상을 고르면 참고 정보와 응급 신호 목록이 뜬다", () => {
    render(
      <MemoryRouter>
        <SymptomInfoScreen />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByText("발열"));
    expect(screen.getByText(/39도 이상 고열이 하루 이상 지속/)).toBeTruthy();
    expect(screen.getByText("이런 증상이 함께 있으면 바로 응급실/119")).toBeTruthy();
  });

  it("'찾기' 버튼 옆에 특정 병원을 추천하지 않는다는 문구가 항상 붙어있다", () => {
    render(
      <MemoryRouter>
        <SymptomInfoScreen />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByText("기침"));
    expect(screen.getByText(/특정 병원을\s*추천하지 않습니다/)).toBeTruthy();
  });
});

describe("SymptomInfoScreen — 주변 찾기 (지도로 그대로 넘기기, 알고리즘 추천 아님)", () => {
  beforeEach(() => {
    vi.spyOn(window, "open").mockImplementation(() => null);
  });
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    // @ts-expect-error — 테스트 간 geolocation stub 정리
    delete navigator.geolocation;
  });

  it("위치 허용 시 좌표를 포함한 구글 지도 검색 링크를 연다", () => {
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: {
        getCurrentPosition: (success: PositionCallback) =>
          success({
            coords: { latitude: 37.5, longitude: 127.0 },
          } as GeolocationPosition),
      },
    });

    render(
      <MemoryRouter>
        <SymptomInfoScreen />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByText("두통"));
    fireEvent.click(screen.getByText("주변 신경과 찾기"));

    expect(window.open).toHaveBeenCalledTimes(1);
    const [url] = (window.open as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toContain("google.com/maps/search");
    expect(url).toContain("37.5");
  });

  it("위치 거부/실패해도 카테고리 검색만으로 지도를 연다(막히지 않음)", () => {
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: {
        getCurrentPosition: (_success: PositionCallback, error: PositionErrorCallback) =>
          error({ code: 1, message: "denied" } as GeolocationPositionError),
      },
    });

    render(
      <MemoryRouter>
        <SymptomInfoScreen />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByText("복통"));
    fireEvent.click(screen.getByText("주변 외과 찾기"));

    expect(window.open).toHaveBeenCalledTimes(1);
    const [url] = (window.open as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toContain("google.com/maps/search");
  });
});
