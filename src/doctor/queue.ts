import type { Visit } from "../visits/store";

/** 로컬(기기 시간대) 날짜를 YYYY-MM-DD로. toISOString()은 UTC라 쓰지 않는다. */
export function localDateKey(now: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/**
 * 오늘 진료 대기열 — 오늘 날짜로 잡힌 '예약' 방문을 예약 시각 순으로.
 * 시각이 없는 예약(이전 버전에서 저장된 것)은 맨 뒤에 둔다.
 */
export function todayQueue(visits: Visit[], now: Date = new Date()): Visit[] {
  const today = localDateKey(now);
  return visits
    .filter((v) => v.status === "예약" && v.date === today)
    .sort((a, b) => {
      if (a.time && b.time) return a.time < b.time ? -1 : a.time > b.time ? 1 : 0;
      if (a.time) return -1;
      if (b.time) return 1;
      return 0;
    });
}
