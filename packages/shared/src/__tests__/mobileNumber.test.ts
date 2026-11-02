import { describe, expect, it } from "vitest";
import {
  formatMobileForDisplay,
  mobileToAuthEmail,
  normalizeMobile,
  tryNormalizeMobile,
} from "../mobileNumber";

describe("normalizeMobile", () => {
  const sameAccountInputs = [
    "010-1234-5678",
    "010 1234 5678",
    "01012345678",
    "10 1234 5678",
    "10-1234-5678",
    "1012345678",
    " 10  1234-5678 ",
  ];

  it.each(sameAccountInputs)("resolves %s to +821012345678", (input) => {
    expect(normalizeMobile("+82", input).e164).toBe("+821012345678");
  });

  it("accepts country code without plus or with spaces", () => {
    expect(normalizeMobile("82", "10 1234 5678").e164).toBe("+821012345678");
    expect(normalizeMobile(" +81 ", "90-1234-5678").e164).toBe("+819012345678");
  });

  it("rejects invalid input", () => {
    expect(tryNormalizeMobile("+82", "abc")).toBeNull();
    expect(tryNormalizeMobile("+82", "123")).toBeNull();
    expect(tryNormalizeMobile("", "1012345678")).toBeNull();
    expect(tryNormalizeMobile("+82", "")).toBeNull();
  });

  it("builds internal auth email and display format", () => {
    expect(mobileToAuthEmail("+821012345678")).toBe("p821012345678@phone.spritecut.local");
    expect(formatMobileForDisplay("+82", "1012345678")).toBe("+82 10 1234 5678");
  });
});
