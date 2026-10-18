import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Analytics } from "@vercel/analytics/react";
import "./index.css";
import { WalletScreen } from "./wallet/WalletScreen";
import { DoctorScreen } from "./doctor/DoctorScreen";
import { CheckerScreen } from "./checker/CheckerScreen";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/wallet" replace />} />
        <Route path="/wallet" element={<WalletScreen />} />
        <Route path="/doctor" element={<DoctorScreen />} />
        <Route path="/checker" element={<CheckerScreen />} />
      </Routes>
    </BrowserRouter>
    <Analytics />
  </React.StrictMode>,
);
