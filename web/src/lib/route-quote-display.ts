import { batchQuoteTotal } from "@/lib/generation-batch-limit";
import { modelQuoteDescription } from "@/lib/model-pricing";
import type { LogicalModelQuote } from "@/services/api/logical-models";

export type RouteQuoteStatus = "disabled" | "idle" | "loading" | "ready" | "unavailable";

export type VisibleRouteQuote =
    | { kind: "hidden" }
    | { kind: "loading" }
    | { kind: "unavailable" }
    | { kind: "ready"; credits: number; estimated: boolean; description: string };

/**
 * 按钮旁只展示当前询价结果。加载中或失败时不沿用旧报价，也不把缺失报价显示成 0 积分免费。
 * 服务端明确返回 0 时可以展示，因为那是已配置的报价而不是「无法估算」。
 */
export function visibleRouteQuote(enabled: boolean, status: RouteQuoteStatus, quote: LogicalModelQuote | null, taskCount = 1): VisibleRouteQuote {
    if (!enabled) return { kind: "hidden" };
    if (status === "loading") return { kind: "loading" };
    if (status === "ready" && quote) {
        const credits = batchQuoteTotal(quote.amountMicrocredits, taskCount);
        const amountMicrocredits = quote.amountMicrocredits * Math.max(1, Math.floor(taskCount) || 1);
        return {
            kind: "ready",
            credits,
            estimated: quote.estimated,
            description: modelQuoteDescription({ ...quote, amountMicrocredits }),
        };
    }
    if (status === "unavailable") return { kind: "unavailable" };
    return { kind: "hidden" };
}

/** 无需服务端询价时（部分直连图文档位），仅展示本地已算出的配置价，缺失时不显示 0。 */
export function visibleConfiguredCredits(enabled: boolean, credits: number | null | undefined): VisibleRouteQuote {
    if (!enabled || credits == null) return { kind: "hidden" };
    const amount = credits.toLocaleString("zh-CN", { maximumFractionDigits: 6 });
    return { kind: "ready", credits, estimated: false, description: `本次消耗 ${amount} 积分` };
}

/** 有报价请求时只用服务端 quote；没有请求时才回退到本地配置价。加载中不混用旧报价或本地价。 */
export function composerQuoteView(options: {
    enabled: boolean;
    hasQuoteRequest: boolean;
    status: RouteQuoteStatus;
    quote: LogicalModelQuote | null;
    taskCount?: number;
    localCredits?: number | null;
}): VisibleRouteQuote {
    if (options.hasQuoteRequest) return visibleRouteQuote(options.enabled, options.status, options.quote, options.taskCount ?? 1);
    return visibleConfiguredCredits(options.enabled, options.localCredits);
}

