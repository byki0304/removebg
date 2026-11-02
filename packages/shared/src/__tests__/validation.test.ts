import { describe, expect, it } from "vitest";
import { isValidEmail, isValidNickname, isValidPassword } from "../validation";
import { translate, translations } from "../i18n";

describe("validation", () => {
  it("validates password policy", () => {
    expect(isValidPassword("abcd1234")).toBe(true);
    expect(isValidPassword("abcdefgh")).toBe(false);
    expect(isValidPassword("12345678")).toBe(false);
    expect(isValidPassword("ab12")).toBe(false);
  });

  it("validates email", () => {
    expect(isValidEmail("user@example.com")).toBe(true);
    expect(isValidEmail("user@example")).toBe(false);
  });

  it("validates nickname in ko/en/ja", () => {
    expect(isValidNickname("게임왕")).toBe(true);
    expect(isValidNickname("player_01")).toBe(true);
    expect(isValidNickname("ゲーマー")).toBe(true);
    expect(isValidNickname("a")).toBe(false);
    expect(isValidNickname("has space")).toBe(false);
    expect(isValidNickname("x".repeat(17))).toBe(false);
  });
});

describe("i18n", () => {
  it("has identical key sets for all locales", () => {
    const koKeys = Object.keys(translations.ko).sort();
    expect(Object.keys(translations.en).sort()).toEqual(koKeys);
    expect(Object.keys(translations.ja).sort()).toEqual(koKeys);
  });

  it("never uses the word 전화번호", () => {
    expect(JSON.stringify(translations.ko)).not.toContain("전화번호");
  });

  it("interpolates variables", () => {
    expect(translate("ko", "menu_welcome", { name: "홍길동" })).toBe("홍길동님, 환영합니다");
  });
});
