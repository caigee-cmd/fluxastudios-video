import { useEffect, useState } from "react";

import type { RouteQuoteStatus } from "@/lib/route-quote-display";
import { quoteModel, type LogicalModelQuote, type ModelQuoteRequest } from "@/services/api/logical-models";

/** 按当前请求向现有报价接口询价。参数变化时先进入 loading，避免旧报价闪一下。 */
export function useRouteModelQuote(enabled: boolean, request: ModelQuoteRequest | null | undefined) {
    const requestKey = request ? JSON.stringify(request) : "";
    const [quote, setQuote] = useState<LogicalModelQuote | null>(null);
    const [status, setStatus] = useState<RouteQuoteStatus>(enabled ? "idle" : "disabled");

    useEffect(() => {
        if (!enabled) {
            setQuote(null);
            setStatus("disabled");
            return;
        }
        if (!request) {
            setQuote(null);
            setStatus("idle");
            return;
        }
        const controller = new AbortController();
        setQuote(null);
        setStatus("loading");
        quoteModel(request, controller.signal)
            .then(({ quote: next }) => {
                if (!controller.signal.aborted) {
                    setQuote(next);
                    setStatus("ready");
                }
            })
            .catch(() => {
                if (!controller.signal.aborted) {
                    setQuote(null);
                    setStatus("unavailable");
                }
            });
        return () => controller.abort();
        // requestKey 已覆盖规范化后的询价入参。
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [enabled, requestKey]);

    return { quote, status };
}
