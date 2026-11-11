/**
 * 브랜드 마크 — 앱 아이콘(public/icon.svg)과 같은 말풍선 + 맥박선.
 * 배경 타일은 쓰는 쪽이 감싼다(로딩 화면·온보딩).
 */
export function BrandMark({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="80 100 352 352" fill="none" aria-hidden="true">
      <path
        d="M176 120h160a72 72 0 0 1 72 72v80a72 72 0 0 1-72 72H236l-82 58 14-58h8a72 72 0 0 1-72-72v-80a72 72 0 0 1 72-72z"
        fill="#ffffff"
      />
      <polyline
        points="146,234 204,234 230,184 270,290 296,234 366,234"
        stroke="#ff5a4d"
        strokeWidth="28"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
