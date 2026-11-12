import { describe, expect, test } from "bun:test";

import { composerQuoteView, visibleRouteQuote } from "@/lib/route-quote-display";
import type { LogicalModelQuote } from "@/services/api/logical-models";

const quote: LogicalModelQuote = { logicalModelId: "video-1", billingMode: "per_second", quantity: 6, amountMicrocredits: 216_000, estimated: true };

describe("composer quote visibility", () => {
    test("loading and failed quotes do not keep a stale amount or show 0 as free", () => {
        expect(visibleRouteQuote(true, "loading", quote)).toEqual({ kind: "loading" });
        expect(visibleRouteQuote(true, "unavailable", quote)).toEqual({ kind: "unavailable" });
        expect(visibleRouteQuote(true, "loading", null)).toEqual({ kind: "loading" });
        expect(visibleRouteQuote(false, "ready", quote)).toEqual({ kind: "hidden" });
    });

    test("a successful server quote can show 0 because that is the configured amount, not a missing estimate", () => {
        const free: LogicalModelQuote = { ...quote, amountMicrocredits: 0, estimated: false };
        const view = visibleRouteQuote(true, "ready", free);
        expect(view).toMatchObject({ kind: "ready", credits: 0, estimated: false });
    });

    test("batch image counts multiply the server quote and never use the local fallback while a request is in flight", () => {
        const ready = composerQuoteView({ enabled: true, hasQuoteRequest: true, status: "ready", quote, taskCount: 2, localCredits: 0 });
        expect(ready).toMatchObject({ kind: "ready", credits: 0.432, estimated: true });
        const loading = composerQuoteView({ enabled: true, hasQuoteRequest: true, status: "loading", quote: null, localCredits: 9 });
        expect(loading).toEqual({ kind: "loading" });
    });

    test("models without a quote request can still show a local configured price, but not a missing one as 0", () => {
        expect(composerQuoteView({ enabled: true, hasQuoteRequest: false, status: "idle", quote: null, localCredits: 1.5 })).toMatchObject({ kind: "ready", credits: 1.5, estimated: false });
        expect(composerQuoteView({ enabled: true, hasQuoteRequest: false, status: "idle", quote: null, localCredits: null })).toEqual({ kind: "hidden" });
    });
});
