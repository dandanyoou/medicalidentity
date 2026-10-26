// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { DoctorScreen } from "./DoctorScreen";
import { getPatientVCs } from "../data/patient-vcs";
import { presentVP, randomNonce } from "../lib/sdjwt";
import { DEMO_AUDIENCE, DEMO_HOLDER } from "../data/issuer-keys";

async function buildFullBundle() {
  const vcs = await getPatientVCs();
  const nonce = randomNonce();
  const args = {
    holderPrivateKey: DEMO_HOLDER.privateKey,
    holderDid: DEMO_HOLDER.did,
    audience: DEMO_AUDIENCE,
    nonce,
  };
  const blood = await presentVP({ vc: vcs.bloodType, revealClaimNames: ["bloodType", "rhFactor"], ...args });
  const allergy = await presentVP({ vc: vcs.allergy, revealClaimNames: ["allergens", "severity"], ...args });
  const mDL = await presentVP({ vc: vcs.mDL, revealClaimNames: [], ...args });
  const controlledSubstance = await presentVP({
    vc: vcs.controlledSubstance,
    revealClaimNames: ["priorVisits"],
    ...args,
  });
  return JSON.stringify({
    blood: blood.compact,
    allergy: allergy.compact,
    mDL: mDL.compact,
    controlledSubstance: controlledSubstance.compact,
    nonce,
  });
}

async function renderAndVerify() {
  render(
    <MemoryRouter>
      <DoctorScreen />
    </MemoryRouter>,
  );
  const textarea = screen.getByPlaceholderText(/wallet에서 복사한 JSON/);
  const bundle = await buildFullBundle();
  fireEvent.change(textarea, { target: { value: bundle } });
  fireEvent.click(screen.getByText("페이스트 검증"));
  // verifyText is async (verifyVP now awaits the SD-JWT library) — wait for
  // the verified panel to actually render before asserting on it.
  await screen.findByText("환자 정보 (마스킹됨)");
}

describe("DoctorScreen — D6 regression coverage (관리약물 모드 토글 추가)", () => {
  afterEach(() => cleanup());

  it("[#1] 응급모드가 기본값 — 관리약물 모드가 자동으로 켜지지 않는다", async () => {
    await renderAndVerify();
    // 기존 응급실 패널(혈액형/알레르기)이 기본으로 보여야 한다.
    expect(screen.getByText("환자 정보 (마스킹됨)")).toBeTruthy();
    expect(screen.getByText("처방 예정 약물 (DDI)")).toBeTruthy();
    // 관리약물 패널은 아직 없어야 한다.
    expect(screen.queryByText(/관리약물 처방 이력/)).toBeNull();
  });

  it("[#2] 관리약물 모드로 전환해도 기존 VC 카드·DDI 데이터는 그대로 유지된다", async () => {
    await renderAndVerify();
    fireEvent.click(screen.getByText("관리약물 모드"));
    // 응급실 패널은 숨겨지고 관리약물 패널이 나온다 — 이때도 bundle(검증 결과) 자체는
    // 유지되어야 하므로, 다시 응급 모드로 돌아왔을 때 재검증 없이 그대로 복원돼야 함(#3).
    expect(screen.getByText(/관리약물 처방 이력/)).toBeTruthy();
    expect(screen.queryByText("환자 정보 (마스킹됨)")).toBeNull();
  });

  it("[#3] 관리약물 모드에서 응급 모드로 복귀하면 동일한 검증 결과(혈액형·알레르기)가 재검증 없이 그대로 보인다", async () => {
    await renderAndVerify();
    fireEvent.click(screen.getByText("관리약물 모드"));
    fireEvent.click(screen.getByText("응급 모드"));
    expect(screen.getByText("환자 정보 (마스킹됨)")).toBeTruthy();
    expect(screen.getByText("A +")).toBeTruthy(); // 혈액형 A+ 그대로, 재검증 아님
    expect(screen.getByText("처방 예정 약물 (DDI)")).toBeTruthy();
  });
});

describe("DoctorScreen — 로직 견고화 (필드 누락 입력)", () => {
  afterEach(() => cleanup());

  it("blood/allergy/nonce가 빠진 JSON은 저수준 라이브러리 에러 대신 명확한 안내를 보여준다", async () => {
    render(
      <MemoryRouter>
        <DoctorScreen />
      </MemoryRouter>,
    );
    const textarea = screen.getByPlaceholderText(/wallet에서 복사한 JSON/);
    fireEvent.change(textarea, { target: { value: JSON.stringify({ blood: "x" }) } });
    fireEvent.click(screen.getByText("페이스트 검증"));
    expect(await screen.findByText(/필수 항목\(blood, allergy, nonce\)이 빠져 있습니다/)).toBeTruthy();
  });
});

describe("DoctorScreen — 데모 데이터로 보기 (실제 검증 경로, 가짜 화면 아님)", () => {
  afterEach(() => cleanup());

  it("QR 스캔·페이스트 없이도 버튼 하나로 실제 서명 검증을 거쳐 결과를 보여준다", async () => {
    render(
      <MemoryRouter>
        <DoctorScreen />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByText("데모 데이터로 먼저 보기"));
    await screen.findByText("환자 정보 (마스킹됨)", {}, { timeout: 3000 });
    expect(screen.getByText("A +")).toBeTruthy();
  });
});
