// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { addVisit, resetVisits, type Visit } from "../visits/store";
import { issueBadge, registerHospital, type Session } from "../hospital/badge";
import {
  DOC_KINDS,
  RELAY_DAYS,
  documentsForMember,
  documentsForVisit,
  expireRelays,
  issueDocument,
  listDocuments,
  markReceived,
  verifyDocument,
} from "./store";

const DAY = 86_400_000;
const NOW = 1_800_000_000_000;

function session(role: "doctor" | "staff"): Session {
  const b = issueBadge({ name: role === "doctor" ? "김의사" : "이원무", role });
  return { badgeId: b.id, hospitalName: b.hospitalName, name: b.name, role, exp: b.exp };
}

function completedVisit(over: Partial<Visit> = {}): Visit {
  return addVisit({
    memberId: "self",
    patientName: "박영희",
    hospital: "행복의원",
    dept: "가정의학과",
    date: "2026-11-11",
    time: "10:00",
    reason: "머리가 아파요",
    opinion: "긴장성 두통 의심 소견. 휴식 권고.",
    prescriptions: [{ drug: "아세트아미노펜 500mg", dose: "1정 3회/일", days: 3 }],
    amount: 18_500,
    paid: false,
    status: "수납대기",
    ...over,
  });
}

beforeEach(() => {
  localStorage.clear();
  resetVisits();
  registerHospital({ name: "행복의원", admin: "박원무" });
});

describe("서류 발급 저장소 — 병원이 환자 지갑에 넣는 서류(시연)", () => {
  it("기본 서류 4종이 있고 진단서·소견서는 의사만 발급할 수 있다", () => {
    expect(DOC_KINDS.map((k) => k.kind)).toEqual(["진단서", "소견서", "처방전 사본", "진료비 영수증"]);
    expect(DOC_KINDS.filter((k) => k.doctorOnly).map((k) => k.kind)).toEqual(["진단서", "소견서"]);
  });

  it("의사가 진단서를 발급하면 병원 키 서명이 붙고, 환자 이름·내용·중계 만료(7일)가 들어간다", async () => {
    const v = completedVisit();
    const d = issueDocument({ visit: v, kind: "진단서", session: session("doctor"), now: NOW });
    expect(d.patientName).toBe("박영희");
    expect(d.hospitalName).toBe("행복의원");
    expect(d.issuedBy).toEqual({ name: "김의사", role: "doctor" });
    expect(d.body.opinion).toMatch(/두통/);
    expect(d.relayExpiresAt).toBe(NOW + RELAY_DAYS * DAY);
    expect(d.status).toBe("sent");
    expect(await verifyDocument(d)).toBe(true);
    expect(await verifyDocument({ ...d, body: { ...d.body, opinion: "고친 소견" } })).toBe(false);
    expect(listDocuments()).toHaveLength(1);
    expect(documentsForVisit(v.id)).toHaveLength(1);
    expect(documentsForMember("self")).toHaveLength(1);
  });

  it("간호·원무는 진단서를 발급할 수 없고, 처방전 사본·영수증은 발급할 수 있다", () => {
    const v = completedVisit();
    const s = session("staff");
    expect(() => issueDocument({ visit: v, kind: "진단서", session: s, now: NOW })).toThrow(/의사/);
    expect(issueDocument({ visit: v, kind: "처방전 사본", session: s, now: NOW }).body.prescriptions).toHaveLength(1);
    expect(issueDocument({ visit: v, kind: "진료비 영수증", session: s, now: NOW }).body.amount).toBe(18_500);
  });

  it("내용이 없는 서류는 발급하지 않는다 — 처방 없이 처방전 사본, 소견 없이 진단서", () => {
    const noRx = completedVisit({ prescriptions: [] });
    expect(() => issueDocument({ visit: noRx, kind: "처방전 사본", session: session("doctor"), now: NOW })).toThrow(/처방/);
    const noOpinion = completedVisit({ opinion: "" });
    expect(() => issueDocument({ visit: noOpinion, kind: "진단서", session: session("doctor"), now: NOW })).toThrow(/소견/);
  });

  it("진료를 마치기 전(예약 상태)에는 발급할 수 없다", () => {
    const booked = completedVisit({ status: "예약" });
    expect(() => issueDocument({ visit: booked, kind: "진료비 영수증", session: session("staff"), now: NOW })).toThrow(/진료/);
  });

  it("환자가 받으면 received, 7일 안에 안 받으면 expireRelays가 expired로 바꾼다", () => {
    const v = completedVisit();
    const a = issueDocument({ visit: v, kind: "소견서", session: session("doctor"), now: NOW });
    const b = issueDocument({ visit: v, kind: "진료비 영수증", session: session("doctor"), now: NOW });
    markReceived(a.id, NOW + DAY);
    expect(listDocuments().find((d) => d.id === a.id)?.status).toBe("received");
    expireRelays(NOW + (RELAY_DAYS + 1) * DAY);
    const after = listDocuments();
    expect(after.find((d) => d.id === a.id)?.status).toBe("received");
    expect(after.find((d) => d.id === b.id)?.status).toBe("expired");
  });

  it("저장 키는 medid.* 이고, 주민번호 같은 항목은 서류에 없다", () => {
    const v = completedVisit();
    const d = issueDocument({ visit: v, kind: "진단서", session: session("doctor"), now: NOW });
    expect(Object.keys(localStorage).every((k) => k.startsWith("medid."))).toBe(true);
    expect(JSON.stringify(d)).not.toMatch(/주민|rrn|ssn/i);
  });
});
