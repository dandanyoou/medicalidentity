import { useEffect } from "react";
import { Link } from "react-router-dom";
import { CONSENT_VERSION } from "../shell/consent";

/**
 * 개인정보처리방침 · 이용약관.
 *
 * 초안이다. "법적 문제 없음"을 단정하지 않는다 — 실사용 전 변호사 검토가 필요하고,
 * 사업자 정보는 등록 후 채운다(지어내지 않는다). 내용은 지금 앱이 실제로 하는 것만 적는다:
 * 데이터는 기기에만 저장되고, 결제 승인 때만 주문번호·금액이 토스페이먼츠로 간다.
 */
const FILL = "[사업자 등록 후 기입]";

export function LegalScreen({ kind }: { kind: "privacy" | "terms" }) {
  const title = kind === "privacy" ? "개인정보처리방침" : "이용약관";
  useEffect(() => {
    document.title = `${title} — 가족 의료지갑`;
  }, [title]);

  return (
    <div className="min-h-screen bg-[var(--paper)] md:px-6 md:py-10">
      <div className="relative mx-auto flex min-h-screen w-full max-w-md flex-col bg-[var(--paper)] md:max-w-xl md:min-h-0 md:overflow-hidden md:rounded-[32px] md:shadow-[0_8px_60px_rgba(11,59,60,0.14)]">
        <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-[var(--mist)] bg-[var(--paper)]/92 px-5 py-4 backdrop-blur">
          <Link
            to="/more"
            aria-label="더보기로 돌아가기"
            className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--ink-2)] hover:bg-[var(--surface)]"
          >
            ‹
          </Link>
          <h1 className="text-base font-extrabold tracking-tight text-[var(--ink)]">{title}</h1>
        </header>

        <main className="flex-1 overflow-y-auto px-5 pb-12 pt-5 text-sm leading-relaxed text-[var(--ink)]">
          <p className="mb-4 rounded-2xl border-l-4 border-[var(--vital)] bg-[var(--vital)]/8 px-4 py-3 text-xs text-[var(--vital-ink)]">
            <strong>변호사 검토 전 초안</strong>입니다. 시행일 {CONSENT_VERSION}. 실제 서비스 개시 전에
            법률 검토를 거쳐 확정하고, 사업자 정보를 채웁니다.
          </p>

          {kind === "privacy" ? <Privacy /> : <Terms />}

          <p className="mt-8 text-xs text-[var(--ink-2)]">
            문의: {FILL} · 사업자: {FILL} · 개인정보 보호책임자: {FILL}
          </p>
        </main>
      </div>
    </div>
  );
}

function H({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-1.5 mt-6 text-sm font-extrabold text-[var(--ink)]">{children}</h2>;
}

function Privacy() {
  return (
    <>
      <p>
        가족 의료지갑(이하 "서비스")은 이용자의 개인정보를 다음과 같이 처리합니다. 서비스는 설계상
        이용자의 건강 정보를 서버로 보내지 않고 <strong>이 기기에만 저장</strong>합니다.
      </p>

      <H>1. 처리하는 개인정보</H>
      <ul className="list-disc space-y-1 pl-5">
        <li>본인·가족의 이름, 관계, 연락처(가족 연결·중복 확인용)</li>
        <li>
          <strong>건강 정보(민감정보)</strong>: 혈액형, 알레르기, 복용약, 증상 문진 답과 정리 문장,
          진료 예약·소견·처방·진료비 기록, 증상 일기
        </li>
        <li>가족 증명 확인 정보: 증명 방식, 가린 문서확인번호 일부, 확인 시각 (원본·주민등록번호·사진은 저장하지 않음)</li>
        <li>기기 설정: 알림 설정, 온보딩·동의 기록, 고른 구</li>
      </ul>

      <H>2. 어디에 저장되나</H>
      <p>
        위 정보는 모두 이용자 기기의 브라우저 저장소(localStorage)에만 저장됩니다. 서비스 운영자는 이
        정보를 받지도, 볼 수도 없습니다. 앱 데이터를 지우거나 브라우저 데이터를 삭제하면 함께
        삭제됩니다. 기기를 바꾸면 옮겨지지 않습니다.
      </p>

      <H>3. 민감정보 별도 동의</H>
      <p>
        건강 정보는 개인정보보호법 제23조의 민감정보입니다. 서비스는 첫 실행 시 일반 약관 동의와
        별도로 건강 정보 처리 동의를 받습니다. 동의하지 않으면 서비스를 쓸 수 없습니다(건강 정보
        기록이 서비스의 본질이기 때문).
      </p>

      <H>4. 가족 정보</H>
      <p>
        보호자가 가족의 건강 정보를 등록할 때는 그 가족 본인의 동의를 받았음을 확인합니다. 가족이
        서비스 회원이면 연결 요청 뒤 상대가 수락해야 연결됩니다(시연 단계에서는 안내만).
      </p>

      <H>5. 외부로 전송되는 경우</H>
      <ul className="list-disc space-y-1 pl-5">
        <li>
          <strong>결제</strong>: 가족 프리미엄을 결제할 때 주문번호·금액·결제수단 정보가{" "}
          <strong>토스페이먼츠</strong>(결제대행)로 전달됩니다. 건강 정보는 전달되지 않습니다.
        </li>
        <li>
          <strong>호스팅·방문 통계</strong>: 서비스는 Vercel에서 제공되며 페이지 방문 수 통계(Vercel
          Analytics)를 수집합니다. 개인을 식별하는 정보나 건강 정보는 포함되지 않습니다.
        </li>
        <li>
          <strong>의사 화면 QR 제시</strong>: 이용자가 직접 QR을 보여주거나 코드를 붙여넣을 때만, 이용자가
          고른 항목(혈액형·알레르기 등)이 상대 기기에 표시됩니다.
        </li>
      </ul>

      <H>6. 보유 기간</H>
      <p>이용자가 삭제할 때까지 기기에 보관됩니다. 운영자가 보관하는 개인정보는 없습니다.</p>

      <H>7. 제3자 제공·국외 이전</H>
      <p>제3자에게 제공하지 않습니다. 결제대행(토스페이먼츠)·호스팅(Vercel) 외 처리위탁은 없습니다.</p>

      <H>8. 이용자의 권리</H>
      <p>
        이용자는 앱 안에서 언제든 정보를 열람·수정·삭제할 수 있습니다. 동의는 설정에서 철회할 수
        있으며, 철회하면 서비스 이용이 중단됩니다.
      </p>

      <H>9. 만 14세 미만</H>
      <p>
        만 14세 미만 아동은 법정대리인의 동의 없이 서비스를 이용할 수 없습니다. 보호자가 자녀를 가족으로
        등록하는 경우 법정대리인으로서 동의하는 것으로 봅니다.
      </p>

      <H>10. 안전조치</H>
      <p>
        기기 저장소는 해당 브라우저·앱만 접근할 수 있습니다. 응급 신원 QR은 선택 공개(SD-JWT) 방식으로
        고른 항목만 담깁니다. 기기 잠금(비밀번호·생체인증)을 켜 두시길 권합니다.
      </p>
    </>
  );
}

function Terms() {
  return (
    <>
      <H>1. 서비스의 성격</H>
      <p>
        가족 의료지갑은 가족의 의료 정보를 기록·정리하고, 증상을 말로 정리해 진료 예약과 의료진 전달을
        돕는 도구입니다. 서비스가 제공하는 증상 정리, 진료과 안내, 위험 조합 안내는{" "}
        <strong>진단이나 의료행위가 아닙니다</strong>. 의학적 판단은 의료인이 합니다.
      </p>

      <H>2. 응급 상황</H>
      <p>
        위급하다고 느끼면 앱을 쓰기 전에 <strong>119</strong>에 연락하세요. 서비스의 안내는 의료 조언이
        아니며, 응급 대응을 대신하지 않습니다. 안내가 없었거나 늦었다는 이유로 응급 조치를 미루지
        마세요.
      </p>

      <H>3. 병원 정보</H>
      <p>
        병원 목록은 <strong>건강보험심사평가원</strong> "전국 병의원 및 약국 현황" 공공데이터(공공누리
        제1유형)를 바탕으로 합니다. 진료 시간·휴무·과목 변경은 반영이 늦을 수 있으니 방문 전 병원에
        확인하세요. 서비스는 특정 병원으로부터 대가를 받고 추천하지 않습니다.
      </p>

      <H>4. 시연 기능</H>
      <p>
        "시연"으로 표시된 기능(진료 예약, 수납, 의사 화면 기록 등)은 병원·보험사·결제 시스템과 연동되기
        전의 흐름 미리보기입니다. 실제 예약·수납이 이뤄지지 않습니다.
      </p>

      <H>5. 가족 프리미엄 (유료)</H>
      <ul className="list-disc space-y-1 pl-5">
        <li>가격: 월 3,900원(부가세 포함). 결제 시점에 1개월분을 결제하며, 자동으로 갱신 결제되지 않습니다.</li>
        <li>
          <strong>청약철회</strong>: 결제일로부터 <strong>7일 이내</strong>에는 전자상거래법에 따라 철회(전액
          환불)할 수 있습니다. 단, 그 기간에 프리미엄 기능을 이미 사용한 경우 법이 정한 범위에서 제한될 수
          있습니다.
        </li>
        <li>해지: 더보기 → 가족 프리미엄에서 해지하거나 문의처로 요청하세요. 해지해도 결제한 기간 끝까지 쓸 수 있습니다.</li>
        <li>환불 요청·문의: [사업자 등록 후 기입]</li>
      </ul>

      <H>6. 이용자의 책임</H>
      <p>
        입력한 정보의 정확성은 이용자가 책임집니다. 가족의 정보를 등록할 때는 본인 동의를 받아야 하며,
        타인의 정보를 동의 없이 등록해 생기는 문제는 이용자 책임입니다.
      </p>

      <H>7. 서비스의 책임 한계</H>
      <p>
        서비스는 기기 저장 데이터의 유실(기기 분실·초기화 등)에 책임지지 않습니다. 무료 기능은 현 상태로
        제공되며, 유료 기능의 장애는 이용 기간 연장 또는 환불로 보상합니다.
      </p>

      <H>8. 약관 변경</H>
      <p>약관이 바뀌면 앱에서 다시 동의를 받습니다. 변경 전 결제분에는 변경 전 약관이 적용됩니다.</p>

      <H>9. 준거법</H>
      <p>대한민국 법을 따릅니다.</p>
    </>
  );
}
