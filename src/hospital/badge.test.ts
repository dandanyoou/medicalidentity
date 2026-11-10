// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import {
  badgeCode,
  currentSession,
  decodeBadge,
  getHospital,
  issueBadge,
  listBadges,
  loginWithBadge,
  logout,
  registerHospital,
  revokeBadge,
  verifyBadge,
} from "./badge";

beforeEach(() => localStorage.clear());

const DAY = 86_400;

describe("병원 등록 · 직원 배지(서명된 자격증명) — 시연", () => {
  it("병원을 등록하면 병원 키가 생기고, 등록 전에는 배지를 발급할 수 없다", () => {
    expect(getHospital()).toBeNull();
    expect(() => issueBadge({ name: "김의사", role: "doctor" })).toThrow();
    const h = registerHospital({ name: "행복의원", admin: "박원무" });
    expect(h.name).toBe("행복의원");
    expect(h.pk).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(getHospital()?.id).toBe(h.id);
  });

  it("배지에는 발급 병원·역할·만료가 들어가고, 병원 키로 서명돼 검증된다", async () => {
    registerHospital({ name: "행복의원", admin: "박원무" });
    const b = issueBadge({ name: "김의사", role: "doctor", now: 1_000_000, days: 30 });
    expect(b.hospitalName).toBe("행복의원");
    expect(b.role).toBe("doctor");
    expect(b.exp).toBe(1_000_000 + 30 * DAY);
    expect(await verifyBadge(b, { now: 1_000_000 + DAY })).toEqual({ ok: true });
  });

  it("배지 코드는 복사해 붙여넣을 수 있는 한 줄이고, 되돌리면 같은 배지다", () => {
    registerHospital({ name: "행복의원", admin: "박원무" });
    const b = issueBadge({ name: "김의사", role: "doctor" });
    const code = badgeCode(b);
    expect(code).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(decodeBadge(code)).toEqual(b);
    expect(decodeBadge("not-a-badge")).toBeNull();
  });

  it("내용을 고치면 서명이 맞지 않고, 만료되면 통과하지 않는다", async () => {
    registerHospital({ name: "행복의원", admin: "박원무" });
    const b = issueBadge({ name: "김의사", role: "staff", now: 1_000_000, days: 1 });
    const forged = { ...b, role: "doctor" as const };
    expect((await verifyBadge(forged, { now: 1_000_000 })).ok).toBe(false);
    expect(await verifyBadge(b, { now: 1_000_000 + 2 * DAY })).toEqual({ ok: false, reason: "expired" });
  });

  it("다른 병원 키로 서명된 배지는 이 기기의 병원에서 통과하지 않는다", async () => {
    registerHospital({ name: "행복의원", admin: "박원무" });
    const other = issueBadge({ name: "김의사", role: "doctor" });
    localStorage.clear();
    registerHospital({ name: "다른의원", admin: "최원무" });
    expect((await verifyBadge(other)).ok).toBe(false);
  });

  it("배지로 로그인하면 세션이 남고, 폐기하면 로그인도 세션도 사라진다", async () => {
    registerHospital({ name: "행복의원", admin: "박원무" });
    const b = issueBadge({ name: "김의사", role: "doctor" });
    expect(currentSession()).toBeNull();
    expect(await loginWithBadge(badgeCode(b))).toEqual({ ok: true });
    expect(currentSession()?.name).toBe("김의사");
    expect(currentSession()?.role).toBe("doctor");

    revokeBadge(b.id);
    expect(listBadges()[0].status).toBe("revoked");
    expect(currentSession()).toBeNull();
    expect((await loginWithBadge(badgeCode(b))).ok).toBe(false);
  });

  it("로그아웃하면 세션만 지우고 배지는 남는다", async () => {
    registerHospital({ name: "행복의원", admin: "박원무" });
    const b = issueBadge({ name: "이간호", role: "staff" });
    await loginWithBadge(badgeCode(b));
    logout();
    expect(currentSession()).toBeNull();
    expect(listBadges()).toHaveLength(1);
  });

  it("저장 키는 모두 medid.* 이라 동의 철회 시 함께 지워진다", () => {
    registerHospital({ name: "행복의원", admin: "박원무" });
    issueBadge({ name: "김의사", role: "doctor" });
    const keys = Object.keys(localStorage);
    expect(keys.length).toBeGreaterThan(0);
    expect(keys.every((k) => k.startsWith("medid."))).toBe(true);
  });
});
