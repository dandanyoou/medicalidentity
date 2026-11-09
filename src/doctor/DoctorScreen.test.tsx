// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, within } from "@testing-library/react";
import { addVisit, getVisit, resetVisits } from "../visits/store";
import { localDateKey } from "./queue";
import { EMPTY_ANSWERS, answer, buildRecord, summarize, type IntakeAnswers } from "../intake/engine";
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

describe("DoctorScreen — 오늘 진료 대기열", () => {
  afterEach(() => {
    cleanup();
    resetVisits();
  });

  it("환자가 오늘로 예약한 방문이 대기열에 시각·이름·사유와 함께 보인다", () => {
    resetVisits();
    addVisit({
      memberId: "self",
      hospital: "서울대학교병원",
      dept: "가정의학과",
      date: localDateKey(),
      time: "15:30",
      reason: "머리가 아프고 어깨가 뻐근해요",
      amount: 0,
      paid: false,
      status: "예약",
    });
    render(
      <MemoryRouter>
        <DoctorScreen />
      </MemoryRouter>,
    );
    const queue = screen.getByRole("region", { name: "오늘 진료 대기열" });
    expect(within(queue).getByText("대기 1명")).toBeTruthy();
    expect(within(queue).getByText("15:30")).toBeTruthy();
    expect(within(queue).getByText("김단유")).toBeTruthy();
    expect(within(queue).getByText("머리가 아프고 어깨가 뻐근해요")).toBeTruthy();
    // 실제 병원 예약 연동이 아니라 같은 기기 저장소를 쓰는 시연임을 밝힌다.
    expect(within(queue).getByText(/같은 기기/)).toBeTruthy();
  });

  it("대기열에서 환자를 누르면 사전 문진 카드가 열린다 — 환자 답 그대로, 우리 안내는 작게", () => {
    resetVisits();
    const answers = [["머리", "목·어깨"], "머리", "욱신", "뻐근", "1-3일", 5, ["움직일 때"], ["없음"]].reduce<IntakeAnswers>(
      (a, v) => answer(a, v as string | string[] | number),
      EMPTY_ANSWERS,
    );
    addVisit({
      memberId: "self",
      hospital: "서울대학교병원",
      dept: "가정의학과",
      date: localDateKey(),
      time: "10:00",
      reason: summarize(answers),
      intake: buildRecord(answers, "진통제를 먹어도 그대로예요", 1),
      amount: 0,
      paid: false,
      status: "예약",
    });
    render(
      <MemoryRouter>
        <DoctorScreen />
      </MemoryRouter>,
    );
    const open = screen.getByRole("button", { name: "김단유 사전 문진 보기" });
    expect(open.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(open);
    expect(open.getAttribute("aria-expanded")).toBe("true");

    const card = screen.getByRole("region", { name: "사전 문진" });
    expect(within(card).getByText("가장 불편한 곳")).toBeTruthy();
    expect(within(card).getByText("욱신욱신")).toBeTruthy();
    expect(within(card).getByText("맥박이 뛰듯 쿵쿵")).toBeTruthy();
    expect(within(card).getByText("5/10 · 일상이 불편한 정도")).toBeTruthy();
    expect(within(card).getByText(/없다고 답함/)).toBeTruthy();
    expect(within(card).getByText("“진통제를 먹어도 그대로예요”")).toBeTruthy();
    // 우리 추천은 '환자가 받은 안내'로만 — 진단이 아님을 밝힌다.
    expect(within(card).getByText(/환자가 받은 안내/)).toBeTruthy();
    expect(within(card).getByText(/진단 아님/)).toBeTruthy();
  });

  it("문진 없이 예약한 환자는 그렇다고 알려주고 예약 사유만 보여준다", () => {
    resetVisits();
    addVisit({
      memberId: "self",
      hospital: "서울대학교병원",
      dept: "내과",
      date: localDateKey(),
      time: "11:00",
      reason: "직접 선택",
      amount: 0,
      paid: false,
      status: "예약",
    });
    render(
      <MemoryRouter>
        <DoctorScreen />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole("button", { name: "김단유 사전 문진 보기" }));
    const card = screen.getByRole("region", { name: "사전 문진" });
    expect(within(card).getByText(/대화형 문진 없이 예약/)).toBeTruthy();
  });

  it("'시연 환자 불러오기'를 누르면 대기열이 4명으로 차고, '시연 환자 지우기'로 되돌린다", () => {
    resetVisits();
    render(
      <MemoryRouter>
        <DoctorScreen />
      </MemoryRouter>,
    );
    const queue = screen.getByRole("region", { name: "오늘 진료 대기열" });
    fireEvent.click(within(queue).getByRole("button", { name: "시연 환자 불러오기" }));
    expect(within(queue).getByText("대기 4명")).toBeTruthy();
    expect(within(queue).getByText("박영희")).toBeTruthy();
    // 시연 환자임을 숨기지 않는다.
    expect(within(queue).getAllByText("시연").length).toBeGreaterThanOrEqual(1);
    fireEvent.click(within(queue).getByRole("button", { name: "시연 환자 지우기" }));
    expect(within(queue).getByText("대기 0명")).toBeTruthy();
    expect(within(queue).getByText(/오늘 예약된 환자가 없어요/)).toBeTruthy();
  });

  it("문진 카드에서 소견·처방·진료비를 입력해 진료를 마치면 대기열에서 빠지고 수납대기가 된다", () => {
    resetVisits();
    const v = addVisit({
      memberId: "self",
      hospital: "서울대학교병원",
      dept: "가정의학과",
      date: localDateKey(),
      time: "09:30",
      reason: "머리가 아파요",
      amount: 0,
      paid: false,
      status: "예약",
    });
    render(
      <MemoryRouter>
        <DoctorScreen />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole("button", { name: "김단유 사전 문진 보기" }));
    const form = screen.getByRole("form", { name: "진료 완료 입력" });
    // 비어 있으면 완료할 수 없다.
    expect((within(form).getByRole("button", { name: /진료 완료/ }) as HTMLButtonElement).disabled).toBe(true);

    fireEvent.change(within(form).getByLabelText("소견"), { target: { value: "긴장성 두통 소견. 휴식 권고." } });
    fireEvent.change(within(form).getByLabelText("약 이름"), { target: { value: "아세트아미노펜 500mg" } });
    fireEvent.change(within(form).getByLabelText("용법"), { target: { value: "1정 3회/일" } });
    fireEvent.change(within(form).getByLabelText("일수"), { target: { value: "3" } });
    fireEvent.click(within(form).getByRole("button", { name: "처방 추가" }));
    expect(within(form).getByText("아세트아미노펜 500mg")).toBeTruthy();
    fireEvent.change(within(form).getByLabelText("진료비(원)"), { target: { value: "18500" } });
    fireEvent.click(within(form).getByRole("button", { name: /진료 완료/ }));

    // 대기열에서 빠지고 완료 안내가 뜬다.
    const queue = screen.getByRole("region", { name: "오늘 진료 대기열" });
    expect(within(queue).getByText("대기 0명")).toBeTruthy();
    expect(screen.getByText(/김단유.*진료를 마쳤어요/)).toBeTruthy();
    const after = getVisit(v.id)!;
    expect(after.status).toBe("수납대기");
    expect(after.amount).toBe(18500);
    expect(after.prescriptions?.[0].drug).toBe("아세트아미노펜 500mg");
  });

  it("오늘 예약이 없으면 빈 상태 안내를 보여준다", () => {
    resetVisits();
    render(
      <MemoryRouter>
        <DoctorScreen />
      </MemoryRouter>,
    );
    const queue = screen.getByRole("region", { name: "오늘 진료 대기열" });
    expect(within(queue).getByText(/오늘 예약된 환자가 없어요/)).toBeTruthy();
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
