import { describe, expect, test } from "bun:test";

import { creditTopupGrant, isDefaultCnyOneToOne } from "@/lib/topup-credit-policy";

describe("topup credit grant vs default 1 CNY = 1 credit", () => {
    test("CNY packs whose grant equals fen times the default rate match 1:1, including fractional credits", () => {
        expect(isDefaultCnyOneToOne({ kind: "credits", currency: "CNY", amountFen: 100, creditsMicrocredits: 1_000_000 })).toBe(true);
        expect(isDefaultCnyOneToOne({ kind: "credits", currency: "CNY", amountFen: 990, creditsMicrocredits: 9_900_000 })).toBe(true);
    });

    test("promotional or foreign-currency packs are not unconditionally treated as 1:1", () => {
        expect(isDefaultCnyOneToOne({ kind: "credits", currency: "CNY", amountFen: 10000, creditsMicrocredits: 12_000_000 })).toBe(false);
        expect(isDefaultCnyOneToOne({ kind: "credits", currency: "USD", amountFen: 100, creditsMicrocredits: 1_000_000 })).toBe(false);
        expect(isDefaultCnyOneToOne({ kind: "storage", currency: "CNY", amountFen: 100, creditsMicrocredits: 1_000_000 })).toBe(false);
        expect(creditTopupGrant({ kind: "credits", currency: "CNY", amountFen: 10000, creditsMicrocredits: 12_000_000 }).matchesDefaultCnyRate).toBe(false);
    });
});
