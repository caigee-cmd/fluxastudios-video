import type { CreditLedgerEntry } from "@/services/api/wallet";

export type LedgerDisplayType = CreditLedgerEntry["type"] | "reserve" | "signup_bonus" | "checkin_bonus" | "admin_grant" | "admin_adjustment";

/** 展示用的有符号微积分：预冻结流水可能只写了可用/冻结差额，未填 amount。 */
export function ledgerSignedMicrocredits(entry: Pick<CreditLedgerEntry, "type" | "amountMicrocredits" | "availableDeltaMicrocredits" | "reservedDeltaMicrocredits">) {
    if (entry.type === "reserve") {
        if (entry.amountMicrocredits) return entry.amountMicrocredits;
        if (entry.availableDeltaMicrocredits) return entry.availableDeltaMicrocredits;
        if (entry.reservedDeltaMicrocredits) return -Math.abs(entry.reservedDeltaMicrocredits);
        return 0;
    }
    if (entry.amountMicrocredits) return entry.amountMicrocredits;
    return entry.availableDeltaMicrocredits || 0;
}

/** 仅拼接流水里真实存在的模型、场景和备注，不编造分辨率或时长。 */
export function ledgerSpecParts(entry: Pick<CreditLedgerEntry, "model" | "scene" | "note">) {
    return [entry.model?.trim(), entry.scene?.trim(), entry.note?.trim()].filter((part): part is string => Boolean(part));
}

export function ledgerTitleKey(type: string) {
    switch (type) {
        case "reserve":
            return "account.wallet.ledger.reserve";
        case "consume":
            return "account.wallet.ledger.consume";
        case "refund":
            return "account.wallet.ledger.refund";
        case "payment_topup":
            return "account.wallet.ledger.paymentTopup";
        case "redeem":
            return "account.wallet.ledger.redeem";
        case "referral_commission":
            return "account.wallet.ledger.referral";
        case "signup_bonus":
            return "account.wallet.ledger.signupBonus";
        case "checkin_bonus":
            return "account.wallet.ledger.checkinBonus";
        case "admin_grant":
            return "account.wallet.ledger.adminGrant";
        case "admin_adjustment":
            return "account.wallet.ledger.adjust";
        default:
            return "account.wallet.ledger.change";
    }
}

export function ledgerExplanationKey(type: string) {
    switch (type) {
        case "reserve":
            return "account.wallet.ledger.reserveHint";
        case "consume":
            return "account.wallet.ledger.consumeHint";
        case "refund":
            return "account.wallet.ledger.refundHint";
        default:
            return "";
    }
}
