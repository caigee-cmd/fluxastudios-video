import type { TopupProduct } from "@/services/api/payments";

/** 本站默认兑换：1 元人民币 = 1 积分 = 1,000,000 微积分。与用户分组种子汇率一致。 */
export const DEFAULT_MICROCREDITS_PER_CNY = 1_000_000;

/** 1 元 = 100 分，按默认汇率对应的微积分。 */
export const DEFAULT_MICROCREDITS_PER_FEN = DEFAULT_MICROCREDITS_PER_CNY / 100;

export function isCreditTopupProduct(product: Pick<TopupProduct, "kind">) {
    return product.kind !== "storage";
}

/** 人民币积分套餐是否按默认 1 元 = 1 积分发放。促销或赠送套餐可能不是 1:1。 */
export function isDefaultCnyOneToOne(product: Pick<TopupProduct, "kind" | "currency" | "amountFen" | "creditsMicrocredits">) {
    if (!isCreditTopupProduct(product) || product.currency !== "CNY") return false;
    if (!Number.isSafeInteger(product.amountFen) || product.amountFen <= 0) return false;
    return product.creditsMicrocredits === product.amountFen * DEFAULT_MICROCREDITS_PER_FEN;
}

export function creditTopupGrant(product: Pick<TopupProduct, "kind" | "currency" | "amountFen" | "creditsMicrocredits">) {
    return {
        isCreditProduct: isCreditTopupProduct(product),
        matchesDefaultCnyRate: isDefaultCnyOneToOne(product),
        amountFen: product.amountFen,
        currency: product.currency,
        creditsMicrocredits: product.creditsMicrocredits,
    };
}
