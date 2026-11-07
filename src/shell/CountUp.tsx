import { useEffect, useRef, useState } from "react";

/**
 * 금액 카운트업 — 삼쩜삼·토스의 "숨은 돈 발견" 시그니처.
 * 0에서 목표값까지 ease-out으로 올라간다. prefers-reduced-motion이면 즉시 최종값.
 */
function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

export function CountUp({
  value,
  duration = 900,
  suffix = "",
  prefix = "",
}: {
  value: number;
  duration?: number;
  suffix?: string;
  prefix?: string;
}) {
  const reduced = prefersReducedMotion();
  const [n, setN] = useState(reduced ? value : 0);
  const raf = useRef<number | null>(null);

  useEffect(() => {
    if (reduced) {
      setN(value);
      return;
    }
    const start = performance.now();
    const from = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
      setN(Math.round(from + (value - from) * eased));
      if (t < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => {
      if (raf.current != null) cancelAnimationFrame(raf.current);
    };
  }, [value, duration, reduced]);

  return (
    <>
      {prefix}
      {n.toLocaleString("ko-KR")}
      {suffix}
    </>
  );
}
