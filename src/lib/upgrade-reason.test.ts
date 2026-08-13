import { describe, expect, it } from "vitest";
import { upgradeReasonForKind } from "./upgrade-reason";
import { GenerationLimitError } from "./streamImage";

describe("upgradeReasonForKind", () => {
  it("shows the anonymous variant for visitors", () => {
    expect(upgradeReasonForKind("anonymous")).toBe("anonymous_used_free");
  });

  it("shows the free-account variant for signed-in users without a subscription", () => {
    expect(upgradeReasonForKind("free")).toBe("free_account");
  });

  it("shows the monthly-limit variant for paid subscribers", () => {
    expect(upgradeReasonForKind("paid")).toBe("paid_limit_reached");
  });

  it("maps a thrown GenerationLimitError from a paid subscriber to the limit modal", () => {
    const err = new GenerationLimitError({
      status: 402,
      code: "limit_reached",
      kind: "paid",
      used: 50,
      limit: 50,
    });
    expect(upgradeReasonForKind(err.kind)).toBe("paid_limit_reached");
  });
});
