import { useEffect, useId, type ReactNode } from "react";

/**
 * 바텀시트 — 토스·보맵식 확인 레이어.
 * 되돌리기 어려운 행동(응급 정보 공개, 수납 등) 앞에 "무엇이 일어나는지" 한 번 보여준다.
 * role=dialog + aria-modal, Escape·배경 탭으로 닫힘, reduced-motion이면 슬라이드 생략.
 */
export function BottomSheet({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center">
      <button
        type="button"
        data-testid="sheet-backdrop"
        aria-label="닫기"
        onClick={onClose}
        className="animate-fade-in absolute inset-0 bg-[var(--ink-deep)]/55 backdrop-blur-[2px]"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="animate-sheet-up relative w-full max-w-md rounded-t-[28px] bg-[var(--surface)] px-5 pb-6 pt-3 shadow-[0_-12px_40px_rgba(11,59,60,0.22)] md:max-w-xl"
        style={{ paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom))" }}
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-[var(--mist)]" aria-hidden="true" />
        <h2 id={titleId} className="text-lg font-extrabold tracking-tight text-[var(--ink)]">
          {title}
        </h2>
        <div className="mt-3">{children}</div>
      </div>
    </div>
  );
}
