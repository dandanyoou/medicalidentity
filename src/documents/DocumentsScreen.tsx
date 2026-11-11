import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { RELAY_DAYS, expireRelays, listDocuments, markReceived, needsFee, payFee, verifyDocument, type IssuedDocument } from "./store";
import { ROLE_LABEL } from "../hospital/badge";

/**
 * 환자 서류함(/documents) — 병원이 보낸 서류를 보고, 브라우저 인쇄로 PDF 저장(P4).
 *
 * 열면 "받음"으로 바뀐다(실제 서비스에선 그 순간 중계 사본을 지운다). 7일 안에 안 열면
 * 폐기된 것으로 표시하고 병원에 다시 요청하게 안내한다. 서류를 열 때마다 병원 서명을 기기
 * 안에서 확인해 "서명 확인됨 / 맞지 않음"을 보여준다.
 *
 * 시연: 같은 기기 저장소라 시연 환자에게 보낸 서류도 함께 보인다(환자 이름으로 구분).
 */
const DAY = 86_400_000;

export function DocumentsScreen() {
  const [tick, setTick] = useState(0);
  const [openId, setOpenId] = useState<string | null>(null);
  const docs = useMemo(() => {
    expireRelays();
    return listDocuments().sort((a, b) => b.issuedAt - a.issuedAt);
  }, [tick]);
  const open = docs.find((d) => d.id === openId) ?? null;

  useEffect(() => {
    document.title = "서류함 — 가족 의료지갑";
  }, []);

  function openDoc(d: IssuedDocument) {
    if (needsFee(d)) return;
    markReceived(d.id);
    setOpenId(d.id);
    setTick((t) => t + 1);
  }

  /** P5 시연 결제 — 돈이 움직이지 않는다. 실제 PG(토스)는 수납 결제와 같은 경로로 붙인다. */
  function pay(d: IssuedDocument) {
    payFee(d.id);
    setTick((t) => t + 1);
  }

  return (
    <div className="min-h-screen bg-[var(--paper)] md:px-6 md:py-10 print:bg-white print:p-0">
      <div className="relative mx-auto flex min-h-screen w-full max-w-md flex-col bg-[var(--paper)] md:max-w-xl md:min-h-0 md:overflow-hidden md:rounded-[32px] md:shadow-[0_8px_60px_rgba(11,59,60,0.14)] print:max-w-none print:bg-white print:shadow-none">
        <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-[var(--mist)] bg-[var(--paper)]/92 px-5 py-4 backdrop-blur print:hidden">
          {open ? (
            <button
              type="button"
              onClick={() => setOpenId(null)}
              aria-label="목록으로"
              className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--ink-2)] hover:bg-[var(--surface)]"
            >
              ‹
            </button>
          ) : (
            <Link to="/billing" aria-label="진료로 돌아가기" className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--ink-2)] hover:bg-[var(--surface)]">
              ‹
            </Link>
          )}
          <h1 className="text-base font-extrabold tracking-tight text-[var(--ink)]">서류함</h1>
          <span className="ml-1 rounded-full bg-[var(--ink)] px-2 py-0.5 font-data text-[10px] font-bold text-white">시연</span>
        </header>

        <main className="flex-1 overflow-y-auto px-5 pb-24 pt-5 print:p-0">
          {open ? (
            <>
              <DocumentView doc={open} />
              <div className="mt-4 flex gap-2 print:hidden">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="h-12 flex-1 rounded-full bg-[var(--ink)] text-sm font-extrabold text-white"
                >
                  PDF로 저장 · 인쇄
                </button>
                <button type="button" onClick={() => setOpenId(null)} className="h-12 rounded-full border border-[var(--mist)] px-5 text-sm font-bold text-[var(--ink)]">
                  목록
                </button>
              </div>
              <p className="mt-3 text-[11px] leading-relaxed text-[var(--ink-2)] print:hidden">
                인쇄 창에서 "PDF로 저장"을 고르면 파일로 남아요. 서류는 이 기기에만 있고, 보험 청구·다른 병원 제출은 환자가 직접
                공유합니다.
              </p>
            </>
          ) : (
            <>
              <p className="mb-4 rounded-2xl border-l-4 border-[var(--ink)] bg-[var(--surface)] px-4 py-3 text-xs leading-relaxed text-[var(--ink-2)]">
                병원이 병원 키로 서명해 보낸 서류예요. 열면 받은 것으로 처리되고, {RELAY_DAYS}일 안에 안 열면 중계 사본은
                폐기돼요. <strong className="text-[var(--ink)]">시연</strong>: 같은 기기라 시연 환자의 서류도 함께 보여요.
              </p>
              {docs.length === 0 ? (
                <p className="rounded-3xl bg-[var(--surface)] px-5 py-8 text-center text-sm text-[var(--ink-2)]">
                  병원에서 보낸 서류가 여기에 와요. 아직 받은 서류가 없어요.
                </p>
              ) : (
                <ul aria-label="받은 서류" className="space-y-2">
                  {docs.map((d) => (
                    <DocRow key={d.id} doc={d} onOpen={() => openDoc(d)} onPay={() => pay(d)} />
                  ))}
                </ul>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}

function DocRow({ doc, onOpen, onPay }: { doc: IssuedDocument; onOpen: () => void; onPay: () => void }) {
  const expired = doc.status === "expired";
  const unpaid = !expired && needsFee(doc);
  const daysLeft = Math.max(0, Math.ceil((doc.relayExpiresAt - Date.now()) / DAY));
  return (
    <li className={`rounded-3xl bg-[var(--surface)] px-5 py-4 shadow-[0_1px_12px_rgba(11,59,60,0.07)] ${expired ? "opacity-70" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-extrabold text-[var(--ink)]">{doc.kind}</p>
          <p className="mt-0.5 text-xs text-[var(--ink-2)]">{doc.hospitalName} · {doc.body.visitDate}</p>
          <p className="mt-0.5 text-[11px] text-[var(--ink-2)]">
            {doc.patientName}
            {doc.memberId !== "self" && <span className="ml-1 font-data text-[9px]">시연 환자</span>}
          </p>
          <p className={`mt-1.5 text-[11px] font-bold ${expired ? "text-[var(--vital-ink)]" : doc.status === "received" ? "text-[var(--refund-ink)]" : "text-[var(--ink)]"}`}>
            {expired
              ? "기한이 지나 폐기됨 — 병원에 다시 요청하세요"
              : doc.status === "received"
                ? `받음 · ${new Date(doc.receivedAt ?? doc.issuedAt).toLocaleDateString("ko-KR")}`
                : `${RELAY_DAYS}일 안에 열어주세요 (D-${daysLeft})`}
          </p>
          {doc.fee > 0 && (
            <p className="mt-1 text-[11px] text-[var(--ink-2)]">
              수수료 {doc.fee.toLocaleString("ko-KR")}원
              {doc.feePaidAt !== undefined && <span className="ml-1 font-bold text-[var(--refund-ink)]">· 시연 결제 완료</span>}
            </p>
          )}
        </div>
        {!expired && !unpaid && (
          <button
            type="button"
            aria-label={`${doc.kind} 열기`}
            onClick={onOpen}
            className="flex min-h-[44px] flex-none items-center rounded-full bg-[var(--ink)] px-4 text-xs font-extrabold text-white active:scale-95"
          >
            열기
          </button>
        )}
      </div>
      {unpaid && (
        <div className="mt-3 rounded-2xl bg-[var(--paper)] px-4 py-3">
          <p className="text-xs leading-relaxed text-[var(--ink-2)]">
            병원이 정한 제증명 수수료를 결제하면 열 수 있어요. <strong className="text-[var(--ink)]">실제 결제가 아닙니다</strong> — PG 연동 전
            시연이라 돈이 움직이지 않아요.
          </p>
          <button
            type="button"
            aria-label={`${doc.kind} 수수료 결제`}
            onClick={onPay}
            className="mt-2 h-11 w-full rounded-full bg-[var(--refund)] text-sm font-extrabold text-[var(--ink-deep)]"
          >
            수수료 {doc.fee.toLocaleString("ko-KR")}원 결제 (시연)
          </button>
        </div>
      )}
    </li>
  );
}

/** 서류 본문 — 인쇄하면 이것만 남는다. 내용은 병원이 보낸 그대로, 우리가 고치지 않는다. */
export function DocumentView({ doc }: { doc: IssuedDocument }) {
  const [verified, setVerified] = useState<boolean | null>(null);
  useEffect(() => {
    let alive = true;
    verifyDocument(doc).then((ok) => alive && setVerified(ok));
    return () => {
      alive = false;
    };
  }, [doc]);

  const issued = new Date(doc.issuedAt);
  return (
    <article aria-label={doc.kind} className="rounded-3xl bg-white p-6 text-[var(--ink)] shadow-[0_1px_12px_rgba(11,59,60,0.07)] print:rounded-none print:p-10 print:shadow-none">
      <p className="font-data text-[11px] uppercase tracking-[0.2em] text-[var(--ink-2)]">{doc.hospitalName}</p>
      <h2 className="mt-1 text-2xl font-extrabold tracking-tight">{doc.kind}</h2>

      <dl className="mt-5 grid grid-cols-[88px_1fr] gap-y-2 text-sm">
        <dt className="text-[var(--ink-2)]">환자</dt>
        <dd className="font-bold">{doc.patientName}</dd>
        <dt className="text-[var(--ink-2)]">진료일</dt>
        <dd>{doc.body.visitDate}{doc.body.time ? ` ${doc.body.time}` : ""}</dd>
        <dt className="text-[var(--ink-2)]">진료과</dt>
        <dd>{doc.body.dept}</dd>
        <dt className="text-[var(--ink-2)]">방문 사유</dt>
        <dd>{doc.body.reason}</dd>
      </dl>

      {doc.body.opinion !== undefined && (
        <section className="mt-5">
          <h3 className="text-xs font-bold text-[var(--ink-2)]">{doc.kind === "진단서" ? "진단 소견" : "소견"}</h3>
          <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">{doc.body.opinion}</p>
        </section>
      )}

      {doc.body.prescriptions && (
        <section className="mt-5">
          <h3 className="text-xs font-bold text-[var(--ink-2)]">처방 (환자 보관용 사본)</h3>
          <table className="mt-1 w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] text-[var(--ink-2)]">
                <th className="py-1 font-medium">약</th>
                <th className="py-1 font-medium">용법</th>
                <th className="py-1 text-right font-medium">일수</th>
              </tr>
            </thead>
            <tbody>
              {doc.body.prescriptions.map((p, i) => (
                <tr key={i} className="border-t border-[var(--mist)]">
                  <td className="py-1.5">{p.drug}</td>
                  <td className="py-1.5">{p.dose}</td>
                  <td className="py-1.5 text-right font-data">{p.days}일</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-1 text-[11px] text-[var(--ink-2)]">약국 제출용 처방전이 아닙니다.</p>
        </section>
      )}

      {doc.body.amount !== undefined && (
        <section className="mt-5">
          <h3 className="text-xs font-bold text-[var(--ink-2)]">진료비</h3>
          <p className="mt-1 font-data text-2xl font-bold">{doc.body.amount.toLocaleString("ko-KR")}원</p>
        </section>
      )}

      <footer className="mt-6 border-t border-[var(--mist)] pt-4 text-xs text-[var(--ink-2)]">
        <p>
          발급: {doc.issuedBy.name} ({ROLE_LABEL[doc.issuedBy.role]}) · {issued.toLocaleDateString("ko-KR")}{" "}
          {issued.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}
        </p>
        <p className={`mt-1 font-bold ${verified === false ? "text-[var(--vital-ink)]" : verified ? "text-[var(--refund-ink)]" : ""}`}>
          {verified === null
            ? "서명 확인 중…"
            : verified
              ? `${doc.hospitalName} 서명 확인됨`
              : "서명이 맞지 않음 — 내용이 바뀌었을 수 있어요. 이 서류를 신뢰하지 마세요."}
        </p>
        <p className="mt-2 text-[10px] leading-relaxed">
          시연 — 전자서명·전자문서의 법적 효력은 변호사 검토 전이며, 실제 발급 전에는 병원 인증과 서버 보관이 필요합니다.
        </p>
      </footer>
    </article>
  );
}
