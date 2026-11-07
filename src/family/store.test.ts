// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  listMembers,
  addMember,
  removeMember,
  getMember,
  resetFamily,
  SELF_ID,
} from "./store";

beforeEach(() => resetFamily());
afterEach(() => resetFamily());

describe("family store", () => {
  it("처음엔 본인 한 명이 시드되어 있다", () => {
    const members = listMembers();
    expect(members).toHaveLength(1);
    expect(members[0].id).toBe(SELF_ID);
    expect(members[0].relation).toBe("본인");
  });

  it("가족을 추가하면 목록에 들어가고 id가 붙는다", () => {
    const added = addMember({
      name: "김복순",
      relation: "부모",
      blood: "O",
      rh: "+",
      allergen: "아스피린",
      severity: "중등도",
      meds: ["와파린", "메트포르민"],
    });
    expect(added.id).toBeTruthy();
    expect(added.id).not.toBe(SELF_ID);
    const members = listMembers();
    expect(members).toHaveLength(2);
    expect(getMember(added.id)?.name).toBe("김복순");
  });

  it("추가한 가족은 삭제되지만 본인은 삭제되지 않는다", () => {
    const added = addMember({ name: "홍길동", relation: "자녀", blood: "B", rh: "-" });
    removeMember(added.id);
    expect(listMembers()).toHaveLength(1);

    removeMember(SELF_ID); // 본인 삭제 시도는 무시
    expect(listMembers().some((m) => m.id === SELF_ID)).toBe(true);
  });
});
