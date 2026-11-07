// Vercel 서버리스 함수 — 토스페이먼츠 결제 승인.
//
// 프론트에서 결제 후 successUrl로 받은 (paymentKey, orderId, amount)를 받아
// 토스 결제 승인 API로 확정한다. 시크릿 키는 서버 환경변수 TOSS_SECRET_KEY로만
// 다룬다(클라이언트에 절대 노출하지 않는다).
//
// 환경변수 미설정 시 503으로 응답 — 프론트가 "연동 설정 필요"를 안내한다.
//
// 참고: 이 파일은 Vercel이 별도 Node 런타임으로 빌드한다(앱 번들과 무관).

/* eslint-disable @typescript-eslint/no-explicit-any */
export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.status(405).json({ message: "POST만 허용됩니다." });
    return;
  }

  const secret = process.env.TOSS_SECRET_KEY;
  if (!secret) {
    res.status(503).json({
      message:
        "TOSS_SECRET_KEY가 설정되지 않았습니다. Vercel 환경변수에 추가 후 재배포하세요.",
    });
    return;
  }

  const { paymentKey, orderId, amount } = req.body ?? {};
  if (!paymentKey || !orderId || !amount) {
    res.status(400).json({ message: "paymentKey·orderId·amount가 필요합니다." });
    return;
  }

  // 토스 승인 API는 Basic 인증(시크릿 키 + ':') 을 쓴다.
  const auth = Buffer.from(`${secret}:`).toString("base64");

  try {
    const tossRes = await fetch("https://api.tosspayments.com/v1/payments/confirm", {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ paymentKey, orderId, amount: Number(amount) }),
    });
    const data = await tossRes.json();
    res.status(tossRes.ok ? 200 : tossRes.status).json(data);
  } catch {
    res.status(502).json({ message: "토스 승인 API 호출에 실패했습니다." });
  }
}
