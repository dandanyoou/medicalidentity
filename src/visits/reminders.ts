import type { Visit } from "./store";

/**
 * 재방문 고리(R7) — 환자가 다시 오게 하는 두 가지 알림을 방문 기록에서 계산한다.
 *
 * - 재진: 의사가 진료 완료 때 "N일 뒤 재진"을 권고했으면 권고일. 그 뒤로 잡힌 예약이 있으면
 *   할 일이 끝난 것이라 알림을 내리지 않는다.
 * - 복약: 처방 일수 안에 있으면 "D-n". 기간이 끝나면 사라진다.
 *
 * 진료 전(예약) 방문의 처방·재진은 세지 않는다. 서버·푸시가 없어 알림은 앱을 열 때 기기에서
 * 만든다(시연).
 */
export type Reminder =
  | { kind: "재진"; visitId: string; date: string; daysLeft: number; hospital: string; dept: string }
  | { kind: "복약"; visitId: string; date: string; endDate: string; daysLeft: number; drug: string; dose: string; hospital: string };

const DAY = 86_400_000;

function toUTC(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

export function addDays(date: string, days: number): string {
  return new Date(toUTC(date) + days * DAY).toISOString().slice(0, 10);
}

function diffDays(from: string, to: string): number {
  return Math.round((toUTC(to) - toUTC(from)) / DAY);
}

export function buildReminders(visits: Visit[], opts: { today: string }): Reminder[] {
  const out: Reminder[] = [];
  const done = visits.filter((v) => v.status !== "예약");

  for (const v of done) {
    if (v.followUp) {
      const date = addDays(v.date, v.followUp.afterDays);
      const bookedAfter = visits.some(
        (b) => b.id !== v.id && b.status === "예약" && b.memberId === v.memberId && b.date >= date,
      );
      if (!bookedAfter) {
        out.push({ kind: "재진", visitId: v.id, date, daysLeft: diffDays(opts.today, date), hospital: v.hospital, dept: v.dept });
      }
    }
    for (const p of v.prescriptions ?? []) {
      if (!Number.isInteger(p.days) || p.days < 1) continue;
      const endDate = addDays(v.date, p.days - 1);
      if (opts.today >= v.date && opts.today <= endDate) {
        out.push({
          kind: "복약",
          visitId: v.id,
          date: opts.today,
          endDate,
          daysLeft: diffDays(opts.today, endDate),
          drug: p.drug,
          dose: p.dose,
          hospital: v.hospital,
        });
      }
    }
  }

  return out.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.kind === "복약" ? -1 : 1));
}
