import { describe, expect, test } from "bun:test";

import { ledgerExplanationKey, ledgerSignedMicrocredits, ledgerSpecParts, ledgerTitleKey } from "@/lib/credit-ledger-display";

describe("credit ledger display", () => {
    test("reserve rows use available or reserved deltas when amount is unset, and appear as an outflow", () => {
        expect(ledgerSignedMicrocredits({ type: "reserve", amountMicrocredits: 0, availableDeltaMicrocredits: -2_000_000, reservedDeltaMicrocredits: 2_000_000 })).toBe(-2_000_000);
        expect(ledgerSignedMicrocredits({ type: "reserve", amountMicrocredits: 0, reservedDeltaMicrocredits: 500_000 })).toBe(-500_000);
        expect(ledgerTitleKey("reserve")).toBe("account.wallet.ledger.reserve");
        expect(ledgerExplanationKey("reserve")).toContain("reserveHint");
    });

    test("spec parts only include real model, scene and note fields", () => {
        expect(ledgerSpecParts({ model: "h3-video", scene: "text_to_video", note: "参考视频按 15 秒估算" })).toEqual(["h3-video", "text_to_video", "参考视频按 15 秒估算"]);
        expect(ledgerSpecParts({ model: "  ", scene: undefined, note: "" })).toEqual([]);
    });

    test("consume and refund titles stay mapped to settlement and return copy", () => {
        expect(ledgerTitleKey("consume")).toBe("account.wallet.ledger.consume");
        expect(ledgerExplanationKey("consume")).toBe("account.wallet.ledger.consumeHint");
        expect(ledgerTitleKey("refund")).toBe("account.wallet.ledger.refund");
        expect(ledgerExplanationKey("refund")).toBe("account.wallet.ledger.refundHint");
    });
});
