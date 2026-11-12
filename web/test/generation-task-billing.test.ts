import { describe, expect, test } from "bun:test";

import { taskBillingDisplay, taskBillingLabel, taskBillingTitle } from "@/lib/generation-task-billing";
import type { GenerationTask } from "@/services/api/task-center";

type Billing = NonNullable<GenerationTask["billing"]>;

const hold = { amountMicrocredits: 1_000_000, reservedMicrocredits: 1_000_000, refundedMicrocredits: 0 };

describe("task billing display", () => {
    test("settled shows the charged amount, not the hold, with the difference refund", () => {
        const billing: Billing = { ...hold, status: "settled", chargedMicrocredits: 600_000, refundedMicrocredits: 400_000 };
        expect(taskBillingDisplay(billing)).toMatchObject({ amount: "0.6", note: "已结算", refundNote: "退回 0.4", tone: "settled" });
        expect(taskBillingDisplay(billing).detail).toContain("成功结果结算");
        expect(taskBillingLabel(billing)).toBe("已结算 0.6 积分 · 退回 0.4");
        expect(taskBillingTitle(billing)).toContain("退回 0.4");
    });

    test("settled without a refund has no refund note", () => {
        const billing: Billing = { ...hold, status: "settled", chargedMicrocredits: 1_000_000 };
        expect(taskBillingLabel(billing)).toBe("已结算 1 积分");
    });

    test("reserved and running show the hold as a pre-authorization, not a final charge", () => {
        for (const status of ["reserved", "running"] as const) {
            expect(taskBillingLabel({ ...hold, status })).toBe("已预冻结 1 积分");
            expect(taskBillingTitle({ ...hold, status })).toContain("不是最终扣费");
        }
    });

    test("refunded and uncertain keep terminal-accurate explanations", () => {
        const refunded = taskBillingDisplay({ ...hold, status: "refunded", refundedMicrocredits: 1_000_000 });
        expect(refunded).toMatchObject({ note: "已退回", amount: "1", tone: "refunded" });
        expect(refunded.detail).toContain("明确失败");
        expect(refunded.detail).toContain("没有成功计费证据");
        const uncertain = taskBillingDisplay({ ...hold, status: "uncertain" });
        expect(uncertain).toMatchObject({ note: "待核对", tone: "uncertain" });
        expect(uncertain.detail).toContain("不会自动当作失败退款");
        expect(taskBillingTitle({ ...hold, status: "uncertain" })).not.toContain("立即退");
    });
});
