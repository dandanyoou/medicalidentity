/**
 * 스켈레톤 — 데이터가 오기 전 자리를 잡아주는 반짝임 블록.
 * 토스·삼쩜삼처럼 빈 화면 대신 "곧 온다"를 보여준다. reduced-motion이면 정적.
 */
export function Skeleton({ className = "", light = false }: { className?: string; light?: boolean }) {
  return (
    <span
      aria-hidden="true"
      data-testid="skeleton"
      className={`skeleton inline-block rounded-md ${light ? "skeleton-light" : ""} ${className}`}
    />
  );
}
