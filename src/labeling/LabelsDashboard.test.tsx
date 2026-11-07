// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { LabelsDashboard } from "./LabelsDashboard";
import { addRecord, clearRecords } from "./store";

beforeEach(() => clearRecords());
afterEach(() => {
  cleanup();
  clearRecords();
});

function renderDash() {
  render(
    <MemoryRouter>
      <LabelsDashboard />
    </MemoryRouter>,
  );
}

describe("LabelsDashboard", () => {
  it("레코드가 없으면 빈 상태 안내", () => {
    renderDash();
    expect(screen.getByText(/아직 수집된 라벨이 없어요/)).toBeTruthy();
  });

  it("레코드가 있으면 수집량·검증 수와 내보내기 버튼을 보여준다", () => {
    addRecord({
      rawText: "머리가 아파요",
      autoTags: ["두통"],
      confirmedTags: ["두통"],
      rejectedTags: [],
      addedTags: [],
    });
    addRecord({
      rawText: "다리가 아파요",
      autoTags: ["다리 통증"],
      confirmedTags: [],
      rejectedTags: [],
      addedTags: [],
    });
    renderDash();
    expect(screen.getByText(/총 2건/)).toBeTruthy();
    expect(screen.getByText(/검증 1건/)).toBeTruthy();
    expect(screen.getByRole("button", { name: /CSV/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /JSONL/ })).toBeTruthy();
    expect(screen.getAllByText("두통").length).toBeGreaterThan(0);
  });
});
