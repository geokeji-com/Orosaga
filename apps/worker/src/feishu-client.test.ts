import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { FeishuClient, FeishuRequestError } from "./feishu-client.js";

const schema = z.object({
  code: z.number(),
  data: z.object({ ok: z.boolean() }),
});

describe("FeishuClient", () => {
  it("uses the SDK response and validates the envelope", async () => {
    const request = vi.fn().mockResolvedValue({ code: 0, data: { ok: true } });
    const client = new FeishuClient("", "", "", { request });
    await expect(client.get("/open-apis/test", schema)).resolves.toEqual({
      code: 0,
      data: { ok: true },
    });
    expect(request).toHaveBeenCalledOnce();
  });

  it("retries 5xx but not authorization failures", async () => {
    const request = vi
      .fn()
      .mockRejectedValueOnce({ response: { status: 500 } })
      .mockResolvedValue({ code: 0, data: { ok: true } });
    const retrying = new FeishuClient("", "", "", { request }, async () => {});
    await retrying.get("/open-apis/test", schema);
    expect(request).toHaveBeenCalledTimes(2);

    const forbidden = new FeishuClient("", "", "", {
      request: vi.fn().mockRejectedValue({ response: { status: 403 } }),
    });
    await expect(
      forbidden.get("/open-apis/test", schema),
    ).rejects.toMatchObject<Partial<FeishuRequestError>>({
      status: 403,
      retryable: false,
    });
  });
});
