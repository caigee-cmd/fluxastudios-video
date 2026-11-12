import { formatCredits } from "@/constant/credits";
import type { GenerationTask } from "@/services/api/task-center";

type TaskBilling = NonNullable<GenerationTask["billing"]>;

export type TaskBillingDisplay = {
    /** 主金额：已结算为实收，已退回为退回额，其余为冻结额。 */
    amount: string;
    /** 状态：已结算、已预冻结、已退回、待核对。 */
    note: string;
    /** 鼠标悬停或明细里使用的完整说明，与代码终态一致。 */
    detail: string;
    /** 已结算且有差额退回时为“退回 X”，其余为空串。 */
    refundNote: string;
    tone: "settled" | "held" | "refunded" | "uncertain";
};

/** 任务计费的展示口径：冻结额不是扣费，只有已结算才显示实收。任务中心与画布任务列表共用。 */
export function taskBillingDisplay(billing: TaskBilling): TaskBillingDisplay {
    switch (billing.status) {
        case "settled":
            return {
                amount: formatCredits(billing.chargedMicrocredits ?? 0),
                note: "已结算",
                detail: "已按成功结果结算。若预冻结高于实收，差额会退回。",
                refundNote: billing.refundedMicrocredits > 0 ? `退回 ${formatCredits(billing.refundedMicrocredits)}` : "",
                tone: "settled",
            };
        case "refunded":
            return {
                amount: formatCredits(billing.refundedMicrocredits || billing.reservedMicrocredits),
                note: "已退回",
                detail: "明确失败且没有成功计费证据，已退回冻结积分。",
                refundNote: "",
                tone: "refunded",
            };
        case "uncertain":
            return {
                amount: formatCredits(billing.reservedMicrocredits),
                note: "待核对",
                detail: "费用待核对：可能是上游已成功但本地保存失败，或超时等状态不明。不会自动当作失败退款。",
                refundNote: "",
                tone: "uncertain",
            };
        default:
            return {
                amount: formatCredits(billing.reservedMicrocredits),
                note: "已预冻结",
                detail: "已按当前请求预冻结积分，成功后结算；这不是最终扣费。",
                refundNote: "",
                tone: "held",
            };
    }
}

/** 单行计费文案，例如“已结算 0.6 积分 · 退回 0.4”“已预冻结 1 积分”。 */
export function taskBillingLabel(billing: TaskBilling) {
    const display = taskBillingDisplay(billing);
    const label = `${display.note} ${display.amount} 积分`;
    return display.refundNote ? `${label} · ${display.refundNote}` : label;
}

/** 完整计费说明，适合放在 title，不承诺所有失败立即退款。 */
export function taskBillingTitle(billing: TaskBilling) {
    const display = taskBillingDisplay(billing);
    const title = `${display.detail} ${display.amount} 积分。`;
    return display.refundNote ? `${title}${display.refundNote}。` : title;
}
