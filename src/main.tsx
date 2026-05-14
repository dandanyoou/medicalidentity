import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import "./index.css";
import { WalletScreen } from "./wallet/WalletScreen";
import { DoctorScreen } from "./doctor/DoctorScreen";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/wallet" replace />} />
        <Route path="/wallet" element={<WalletScreen />} />
        <Route path="/doctor" element={<DoctorScreen />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
);
