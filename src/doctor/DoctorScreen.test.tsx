// @vitest-environment jsdom
import { describe, it, expect, afterEach, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup, within } from "@testing-library/react";
import { addVisit, getVisit, resetVisits } from "../visits/store";
import { localDateKey } from "./queue";
import { EMPTY_ANSWERS, answer, buildRecord, summarize, type IntakeAnswers } from "../intake/engine";
import { MemoryRouter } from "react-router-dom";
import { DoctorScreen } from "./DoctorScreen";
import { getPatientVCs } from "../data/patient-vcs";
import { presentVP, randomNonce } from "../lib/sdjwt";
import { DEMO_AUDIENCE, DEMO_HOLDER } from "../data/issuer-keys";
import { badgeCode, issueBadge, loginWithBadge, logout, registerHospital } from "../hospital/badge";

// R2: 의사 화면은 직원 배지 로그인 뒤에만 열린다(시연). 기존 테스트는 모두 로그인된 상태를
// 전제로 두고, 로그인 안 된 경우는 아래 별도 describe에서 본다.
beforeEach(async () => {
  registerHospital({ name: "시연의원", admin: "박원무" });
  const b = issueBadge({ name: "김의사", role: "doctor" });
  await loginWithBadge(badgeCode(b));
});

describe("DoctorScreen — 직원 배지 로그인 게이트(R2)", () => {
  afterEach(() => cleanup());

  it("배지 로그인이 없으면 대기열·VP 입력 대신 로그인 안내와 병원 포털 링크를 보여준다", () => {
    logout();
    render(
      <MemoryRouter>
        <DoctorScreen />
      </MemoryRouter>,
    );
    expect(screen.queryByRole("region", { name: "오늘 진료 대기열" })).toBeNull();
    expect(screen.queryByPlaceholderText(/wallet에서 복사한 JSON/)).toBeNull();
    expect(screen.getByRole("heading", { name: /배지 로그인이 필요해요/ })).toBeTruthy();
    expect(screen.getByRole("link", { name: /병원 포털/ })).toBeTruthy();
  });

  it("로그인돼 있으면 헤더에 병원 이름과 직원 이름·역할이 보이고 로그아웃할 수 있다", () => {
    render(
      <MemoryRouter>
        <DoctorScreen />
      </MemoryRouter>,
    );
    expect(screen.getByText(/시연의원/)).toBeTruthy();
    expect(screen.getByText(/김의사/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /로그아웃/ }));
    expect(screen.getByRole("heading", { name: /배지 로그인이 필요해요/ })).toBeTruthy();
  });
});

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

// R3: VP 검증은 '응급 신원 확인' 탭 안에 있다. 기본 탭은 '진료 대기열'.
function openEmergencyTab() {
  fireEvent.click(screen.getByRole("tab", { name: "응급 신원 확인" }));
}

async function renderAndVerify() {
  render(
    <MemoryRouter>
      <DoctorScreen />
    </MemoryRouter>,
  );
  openEmergencyTab();
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
    openEmergencyTab();
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

  it("문진 카드에서 '추천 과가 맞았나요?'에 답하면 방문에 의사 확인이 저장된다", () => {
    resetVisits();
    const answers = [["머리", "목·어깨"], "머리", "욱신", "뻐근", "1-3일", 5, ["움직일 때"], ["없음"]].reduce<IntakeAnswers>(
      (a, v) => answer(a, v as string | string[] | number),
      EMPTY_ANSWERS,
    );
    const v = addVisit({
      memberId: "self",
      hospital: "서울대학교병원",
      dept: "가정의학과",
      date: localDateKey(),
      time: "10:00",
      reason: summarize(answers),
      intake: buildRecord(answers, "", 1),
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
    const review = screen.getByRole("group", { name: "추천 과가 맞았나요?" });
    fireEvent.click(within(review).getByRole("button", { name: "다른 과" }));
    fireEvent.change(within(review).getByLabelText("실제 진료과"), { target: { value: "신경과" } });
    fireEvent.click(within(review).getByRole("button", { name: "저장" }));

    expect(screen.getByText(/의사 확인: 다른 과 → 신경과/)).toBeTruthy();
    const saved = getVisit(v.id)!.doctorReview!;
    expect(saved.verdict).toBe("다른 과");
    expect(saved.actualDept).toBe("신경과");
    expect(saved.recommended).toEqual(["가정의학과", "신경과"]);
  });

  it("처방 입력 중 환자 알레르기 계열 약이면 바로 경고하고, 경고를 확인해야 진료 완료가 된다", () => {
    resetVisits();
    addVisit({
      memberId: "demo-patient",
      patientName: "박영희",
      patientAllergens: ["페니실린"],
      patientMeds: ["아스피린 100mg"],
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
    fireEvent.click(screen.getByRole("button", { name: "박영희 사전 문진 보기" }));
    const form = screen.getByRole("form", { name: "진료 완료 입력" });
    // 환자 안전 정보가 폼 위에 보인다.
    expect(within(form).getByText(/알레르기: 페니실린/)).toBeTruthy();
    expect(within(form).getByText(/복용 중: 아스피린 100mg/)).toBeTruthy();

    fireEvent.change(within(form).getByLabelText("약 이름"), { target: { value: "아목시실린 500mg" } });
    expect(within(form).getByRole("alert").textContent).toMatch(/페니실린계 알레르기/);
    fireEvent.change(within(form).getByLabelText("용법"), { target: { value: "1정 3회/일" } });
    fireEvent.change(within(form).getByLabelText("일수"), { target: { value: "5" } });
    fireEvent.click(within(form).getByRole("button", { name: "처방 추가" }));
    expect(within(form).getByText(/아목시실린 500mg/)).toBeTruthy();
    expect(within(form).getAllByText(/⚠/).length).toBeGreaterThan(0);

    fireEvent.change(within(form).getByLabelText("소견"), { target: { value: "소견" } });
    fireEvent.change(within(form).getByLabelText("진료비(원)"), { target: { value: "12000" } });
    const submit = within(form).getByRole("button", { name: /진료 완료/ }) as HTMLButtonElement;
    expect(submit.disabled).toBe(true);
    fireEvent.click(within(form).getByLabelText(/경고를 확인했고 그대로 처방해요/));
    expect(submit.disabled).toBe(false);
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
    openEmergencyTab();
    fireEvent.click(screen.getByText("데모 데이터로 먼저 보기"));
    await screen.findByText("환자 정보 (마스킹됨)", {}, { timeout: 3000 });
    expect(screen.getByText("A +")).toBeTruthy();
  });
});

function visitFor(name: string, time: string) {
  return addVisit({
    memberId: "self",
    patientName: name,
    hospital: "서울대학교병원",
    dept: "가정의학과",
    date: localDateKey(),
    time,
    reason: `${name} 사유`,
    amount: 0,
    paid: false,
    status: "예약",
  });
}

describe("DoctorScreen — 서류 발급(R5)", () => {
  afterEach(() => {
    cleanup();
    resetVisits();
  });

  function completedToday(name: string) {
    return addVisit({
      memberId: "self",
      patientName: name,
      hospital: "시연의원",
      dept: "가정의학과",
      date: localDateKey(),
      time: "09:30",
      reason: "머리가 아파요",
      opinion: "긴장성 두통 의심 소견.",
      prescriptions: [{ drug: "아세트아미노펜 500mg", dose: "1정 3회/일", days: 3 }],
      amount: 18_500,
      paid: false,
      status: "수납대기",
    });
  }

  it("오늘 진료를 마친 환자가 '서류 발급'에 보이고, 의사가 진단서를 발급하면 목록에 '환자 지갑으로 보냄'이 뜬다", () => {
    resetVisits();
    completedToday("박영희");
    render(
      <MemoryRouter>
        <DoctorScreen />
      </MemoryRouter>,
    );
    const region = screen.getByRole("region", { name: "서류 발급" });
    expect(within(region).getByText("박영희")).toBeTruthy();
    fireEvent.click(within(region).getByRole("button", { name: "박영희 진단서 발급" }));
    expect(within(region).getByText(/진단서 · .*환자 지갑으로 보냄/)).toBeTruthy();
    expect(within(region).getAllByText(/시연/).length).toBeGreaterThan(0);
  });

  it("대기열에서 진료를 마치면 그 환자가 바로 '서류 발급'에 나타난다(다시 열지 않아도)", () => {
    resetVisits();
    addVisit({
      memberId: "self",
      patientName: "이준호",
      hospital: "시연의원",
      dept: "소화기내과",
      date: localDateKey(),
      time: "11:00",
      reason: "배가 아파요",
      amount: 0,
      paid: false,
      status: "예약",
    });
    render(
      <MemoryRouter>
        <DoctorScreen />
      </MemoryRouter>,
    );
    const region = screen.getByRole("region", { name: "서류 발급" });
    expect(within(region).queryByText("이준호")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "이준호 사전 문진 보기" }));
    fireEvent.change(screen.getByPlaceholderText(/소견을 적어 주세요/), { target: { value: "급성 위염 의심 소견." } });
    fireEvent.change(screen.getByPlaceholderText("예: 18500"), { target: { value: "12000" } });
    fireEvent.click(screen.getByRole("button", { name: /진료 완료/ }));

    expect(within(screen.getByRole("region", { name: "서류 발급" })).getByText("이준호")).toBeTruthy();
  });

  it("간호·원무 배지로는 진단서·소견서 버튼이 잠기고 영수증은 발급된다", async () => {
    logout();
    await loginWithBadge(badgeCode(issueBadge({ name: "이원무", role: "staff" })));
    resetVisits();
    completedToday("박영희");
    render(
      <MemoryRouter>
        <DoctorScreen />
      </MemoryRouter>,
    );
    const region = screen.getByRole("region", { name: "서류 발급" });
    expect((within(region).getByRole("button", { name: "박영희 진단서 발급" }) as HTMLButtonElement).disabled).toBe(true);
    expect((within(region).getByRole("button", { name: "박영희 소견서 발급" }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(within(region).getByRole("button", { name: "박영희 진료비 영수증 발급" }));
    expect(within(region).getByText(/환자 지갑으로 보냄/)).toBeTruthy();
  });
});

describe("DoctorScreen — 과거 진료 이력(R6)", () => {
  afterEach(() => {
    cleanup();
    resetVisits();
  });

  it("문진 카드에 같은 환자의 지난 방문 소견·처방이 보이고, 다른 환자 것은 안 보인다", () => {
    resetVisits();
    const base = {
      memberId: "demo",
      hospital: "시연의원",
      dept: "가정의학과",
      amount: 0,
      paid: false,
    } as const;
    addVisit({ ...base, patientName: "박영희", date: "2026-10-20", time: "10:00", reason: "두통", opinion: "긴장성 두통 의심 소견.", prescriptions: [{ drug: "아세트아미노펜 500mg", dose: "1정 3회/일", days: 3 }], status: "완료", paid: true });
    addVisit({ ...base, patientName: "이준호", date: "2026-10-21", time: "10:00", reason: "복통", opinion: "급성 위염 의심 소견.", status: "완료", paid: true });
    addVisit({ ...base, patientName: "박영희", date: localDateKey(), time: "11:00", reason: "머리가 또 아파요", status: "예약" });
    render(
      <MemoryRouter>
        <DoctorScreen />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole("button", { name: "박영희 사전 문진 보기" }));
    const hist = screen.getByRole("region", { name: "지난 방문" });
    expect(within(hist).getByText(/2026-10-20/)).toBeTruthy();
    expect(within(hist).getByText(/긴장성 두통 의심 소견/)).toBeTruthy();
    expect(within(hist).getByText(/아세트아미노펜 500mg/)).toBeTruthy();
    expect(within(hist).queryByText(/급성 위염/)).toBeNull();
  });

  it("지난 방문이 없으면 그렇다고 알려준다", () => {
    resetVisits();
    addVisit({ memberId: "demo", patientName: "최민서", hospital: "시연의원", dept: "정형외과", date: localDateKey(), time: "09:00", reason: "허리", amount: 0, paid: false, status: "예약" });
    render(
      <MemoryRouter>
        <DoctorScreen />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole("button", { name: "최민서 사전 문진 보기" }));
    expect(within(screen.getByRole("region", { name: "지난 방문" })).getByText(/이 기기에 지난 방문 기록이 없어요/)).toBeTruthy();
  });
});

describe("DoctorScreen — 탭 분리 · 데스크톱 2단(R3)", () => {
  afterEach(() => {
    cleanup();
    resetVisits();
    // @ts-expect-error jsdom에는 matchMedia가 없다 — 테스트에서 넣었다 뺀다.
    delete window.matchMedia;
  });

  it("'진료 대기열' / '응급 신원 확인' 탭이 있고, 기본은 대기열이라 VP 입력이 안 보인다", () => {
    render(
      <MemoryRouter>
        <DoctorScreen />
      </MemoryRouter>,
    );
    const tabs = screen.getByRole("tablist", { name: "의사 화면 탭" });
    expect(within(tabs).getByRole("tab", { name: "진료 대기열", selected: true })).toBeTruthy();
    expect(within(tabs).getByRole("tab", { name: "응급 신원 확인", selected: false })).toBeTruthy();
    expect(screen.getByRole("region", { name: "오늘 진료 대기열" })).toBeTruthy();
    expect(screen.queryByPlaceholderText(/wallet에서 복사한 JSON/)).toBeNull();

    openEmergencyTab();
    expect(screen.getByPlaceholderText(/wallet에서 복사한 JSON/)).toBeTruthy();
    expect(screen.queryByRole("region", { name: "오늘 진료 대기열" })).toBeNull();
  });

  it("폰 폭(matchMedia 없음)에서는 지금처럼 항목 아래에 문진 카드가 펼쳐진다", () => {
    resetVisits();
    visitFor("박영희", "10:00");
    render(
      <MemoryRouter>
        <DoctorScreen />
      </MemoryRouter>,
    );
    expect(screen.queryByRole("region", { name: "선택한 환자" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "박영희 사전 문진 보기" }));
    const item = screen.getByRole("button", { name: "박영희 사전 문진 보기" }).closest("li")!;
    expect(within(item).getByText(/문진 없이 예약/)).toBeTruthy();
  });

  it("데스크톱(md 이상)에서는 왼쪽 목록에서 고른 환자가 오른쪽 '선택한 환자' 칸에 열리고 선택 상태가 표시된다", () => {
    resetVisits();
    visitFor("박영희", "10:00");
    visitFor("이준호", "10:30");
    window.matchMedia = ((q: string) => ({
      matches: q.includes("min-width"),
      media: q,
      addEventListener: () => {},
      removeEventListener: () => {},
    })) as unknown as typeof window.matchMedia;

    render(
      <MemoryRouter>
        <DoctorScreen />
      </MemoryRouter>,
    );
    const right = screen.getByRole("region", { name: "선택한 환자" });
    expect(within(right).getByText(/왼쪽에서 환자를 고르세요/)).toBeTruthy();

    const pick = screen.getByRole("button", { name: "이준호 사전 문진 보기" });
    fireEvent.click(pick);
    expect(pick.getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("button", { name: "박영희 사전 문진 보기" }).getAttribute("aria-pressed")).toBe("false");
    expect(within(right).getByText("이준호")).toBeTruthy();
    expect(within(right).getByText(/문진 없이 예약/)).toBeTruthy();
    // 목록 쪽 항목 안에는 카드가 펼쳐지지 않는다.
    expect(within(pick.closest("li")!).queryByText(/문진 없이 예약/)).toBeNull();
  });
});
