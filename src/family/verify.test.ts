import { describe, expect, it } from "vitest";
import {
  isValidDocNumber,
  maskDocNumber,
  isValidMobile,
  formatPhone,
  maskPhone,
  lookupServiceUser,
  isDuplicatePhone,
} from "./verify";

describe("가족 증명서 발급번호", () => {
  it("온라인 가족관계증명서 문서확인번호는 숫자 16자리(하이픈 허용)", () => {
    expect(isValidDocNumber("1234-5678-9012-3456")).toBe(true);
    expect(isValidDocNumber("1234567890123456")).toBe(true);
    expect(isValidDocNumber("1234-5678")).toBe(false);
    expect(isValidDocNumber("abcd-5678-9012-3456")).toBe(false);
  });

  it("저장할 땐 앞뒤 4자리만 남기고 가린다", () => {
    expect(maskDocNumber("1234-5678-9012-3456")).toBe("1234-****-****-3456");
  });
});

describe("연락처", () => {
  it("휴대폰 번호 형식을 확인한다", () => {
    expect(isValidMobile("010-1234-5678")).toBe(true);
    expect(isValidMobile("01012345678")).toBe(true);
    expect(isValidMobile("02-123-4567")).toBe(false);
    expect(isValidMobile("010-12")).toBe(false);
  });

  it("보기 좋게 쓰고, 공개할 땐 가운데를 가린다", () => {
    expect(formatPhone("01012345678")).toBe("010-1234-5678");
    expect(maskPhone("01012345678")).toBe("010-****-5678");
  });
});

describe("서비스 회원 조회", () => {
  it("이름과 연락처가 모두 맞으면 회원으로 찾는다", () => {
    const r = lookupServiceUser("김복순", "010-1234-5678");
    expect(r.status).toBe("member");
    if (r.status === "member") expect(r.user.userId).toBeTruthy();
  });

  it("연락처는 회원인데 이름이 증명서와 다르면 막는다", () => {
    expect(lookupServiceUser("김영희", "010-1234-5678").status).toBe("name-mismatch");
  });

  it("회원이 아니면 not-member", () => {
    expect(lookupServiceUser("홍길동", "010-5555-0000").status).toBe("not-member");
  });

  it("이미 가족에 있는 연락처는 중복이다", () => {
    const members = [{ phone: "01012345678" }, { phone: undefined }];
    expect(isDuplicatePhone("010-1234-5678", members)).toBe(true);
    expect(isDuplicatePhone("010-9999-0000", members)).toBe(false);
  });
});
