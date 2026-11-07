import React, { Suspense, lazy } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Analytics } from "@vercel/analytics/react";
import "./index.css";
import { CheckerScreen } from "./checker/CheckerScreen";
import { TabBar } from "./shell/TabBar";
import { hasSeenOnboarding } from "./shell/onboarding";

// /wallet·/doctor는 html5-qrcode/qrcode(QR 스캔·생성) 번들을 쓴다 — 체커로
// 들어온 사용자(주 획득 채널, Distribution Plan 참고)가 그 무게를 다운로드할
// 이유가 없으므로 지연 로드한다(code-splitting). vite build가 500kB+ 경고를
// 냈던 단일 청크를 분리한다.
const WalletScreen = lazy(() =>
  import("./wallet/WalletScreen").then((m) => ({ default: m.WalletScreen })),
);
const DoctorScreen = lazy(() =>
  import("./doctor/DoctorScreen").then((m) => ({ default: m.DoctorScreen })),
);
const SymptomInfoScreen = lazy(() =>
  import("./symptom-info/SymptomInfoScreen").then((m) => ({ default: m.SymptomInfoScreen })),
);
const SymptomDiaryScreen = lazy(() =>
  import("./wallet/SymptomDiaryScreen").then((m) => ({ default: m.SymptomDiaryScreen })),
);
const LabelsDashboard = lazy(() =>
  import("./labeling/LabelsDashboard").then((m) => ({ default: m.LabelsDashboard })),
);
const BookingScreen = lazy(() =>
  import("./booking/BookingScreen").then((m) => ({ default: m.BookingScreen })),
);
const BillingScreen = lazy(() =>
  import("./billing/BillingScreen").then((m) => ({ default: m.BillingScreen })),
);
const FamilyScreen = lazy(() =>
  import("./family/FamilyScreen").then((m) => ({ default: m.FamilyScreen })),
);
const SubscribeScreen = lazy(() =>
  import("./subscribe/SubscribeScreen").then((m) => ({ default: m.SubscribeScreen })),
);
const InsuranceScreen = lazy(() =>
  import("./insurance/InsuranceScreen").then((m) => ({ default: m.InsuranceScreen })),
);
const MoreScreen = lazy(() =>
  import("./shell/MoreScreen").then((m) => ({ default: m.MoreScreen })),
);
const OnboardingScreen = lazy(() =>
  import("./shell/OnboardingScreen").then((m) => ({ default: m.OnboardingScreen })),
);

/** 첫 실행이면 온보딩, 아니면 홈. */
function RootRedirect() {
  return <Navigate to={hasSeenOnboarding() ? "/wallet" : "/onboarding"} replace />;
}

// VC 루프 iter 4: fallback={null}이었을 때 /wallet·/doctor 진입 시 청크
// 로딩 중 흰 화면이 깜빡였다(특히 느린 회선) — 최소한의 로딩 표시로 교체.
function RouteLoadingFallback() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-5 bg-[var(--paper)]">
      <div className="flex h-16 w-16 items-center justify-center rounded-[20px] bg-[var(--ink)] shadow-[0_10px_34px_rgba(11,59,60,0.28)]">
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M12 3.5v17M3.5 12h17"
            stroke="#ffffff"
            strokeWidth="2.6"
            strokeLinecap="round"
          />
          <circle cx="12" cy="12" r="2.4" fill="#ff5a4d" />
        </svg>
      </div>
      <div className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--mist)] border-t-[var(--ink)]" />
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Suspense fallback={<RouteLoadingFallback />}>
        <Routes>
          <Route path="/" element={<RootRedirect />} />
          <Route path="/onboarding" element={<OnboardingScreen />} />
          <Route path="/more" element={<MoreScreen />} />
          <Route path="/wallet" element={<WalletScreen />} />
          <Route path="/doctor" element={<DoctorScreen />} />
          <Route path="/checker" element={<CheckerScreen />} />
          <Route path="/symptom" element={<SymptomInfoScreen />} />
          <Route path="/diary" element={<SymptomDiaryScreen />} />
          <Route path="/labels" element={<LabelsDashboard />} />
          <Route path="/booking" element={<BookingScreen />} />
          <Route path="/billing" element={<BillingScreen />} />
          <Route path="/family" element={<FamilyScreen />} />
          <Route path="/subscribe" element={<SubscribeScreen />} />
          <Route path="/insurance" element={<InsuranceScreen />} />
          {/* 없는 경로는 홈으로 — 빈 화면 대신. */}
          <Route path="*" element={<Navigate to="/wallet" replace />} />
        </Routes>
      </Suspense>
      <TabBar />
    </BrowserRouter>
    <Analytics />
  </React.StrictMode>,
);
