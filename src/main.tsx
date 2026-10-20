import React, { Suspense, lazy } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Analytics } from "@vercel/analytics/react";
import "./index.css";
import { CheckerScreen } from "./checker/CheckerScreen";

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

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Suspense fallback={null}>
        <Routes>
          <Route path="/" element={<Navigate to="/wallet" replace />} />
          <Route path="/wallet" element={<WalletScreen />} />
          <Route path="/doctor" element={<DoctorScreen />} />
          <Route path="/checker" element={<CheckerScreen />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
    <Analytics />
  </React.StrictMode>,
);
