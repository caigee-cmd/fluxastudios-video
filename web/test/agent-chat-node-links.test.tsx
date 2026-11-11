import { expect, test } from "bun:test";
import { resolve } from "node:path";

// SSR 模块必须在独立进程、没有其他 DOM 测试残留的环境中初始化。
test("Agent 节点链接的改写与真实消息卡片 SSR", () => {
    const result = Bun.spawnSync([process.execPath, "test", "./test/fixtures/agent-chat-node-links.harness.tsx"], { cwd: resolve(import.meta.dir, ".."), timeout: 15000 });
    const output = new TextDecoder().decode(result.stdout) + new TextDecoder().decode(result.stderr);
    expect(result.exitCode, output).toBe(0);
    expect(output).toContain("7 pass");
    expect(output).toContain("0 fail");
}, 20000);
