import { Client, LoggerLevel } from "@larksuiteoapi/node-sdk";
import { z } from "zod";

export class FeishuRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly retryable: boolean,
  ) {
    super(message);
  }
}

type RequestFailure = {
  message?: string;
  response?: {
    status?: number;
    data?: { code?: number; msg?: string };
  };
};

export class FeishuClient {
  private client: Pick<Client, "request">;

  constructor(
    appId = process.env.FEISHU_APP_ID ?? "",
    appSecret = process.env.FEISHU_APP_SECRET ?? "",
    baseUrl = process.env.FEISHU_API_BASE_URL ?? "https://open.feishu.cn",
    client?: Pick<Client, "request">,
    private sleep: (milliseconds: number) => Promise<void> = (milliseconds) =>
      new Promise((resolve) => setTimeout(resolve, milliseconds)),
  ) {
    if (client) {
      this.client = client;
      return;
    }
    if (!appId || !appSecret)
      throw new Error("FEISHU_APP_ID and FEISHU_APP_SECRET are required");
    this.client = new Client({
      appId,
      appSecret,
      domain: baseUrl,
      loggerLevel: LoggerLevel.error,
      source: "orosaga-worker",
    });
  }

  async get<T>(
    path: string,
    schema: z.ZodType<T>,
    params: Record<string, string | number | undefined> = {},
  ) {
    for (let attempt = 0; attempt < 4; attempt += 1) {
      try {
        const body = await this.client.request<unknown>({
          method: "GET",
          url: path,
          params,
          timeout: 12_000,
        });
        const envelope = body as { code?: number; msg?: string };
        if (envelope.code === undefined || envelope.code === 0)
          return schema.parse(body);
        throw new FeishuRequestError(
          envelope.msg ?? `Feishu code ${envelope.code}`,
          400,
          false,
        );
      } catch (error) {
        if (error instanceof FeishuRequestError) throw error;
        const failure = error as RequestFailure;
        const status = failure.response?.status ?? 0;
        const retryable = status === 0 || status === 429 || status >= 500;
        if (!retryable || attempt === 3)
          throw new FeishuRequestError(
            failure.response?.data?.msg ??
              failure.message ??
              `Feishu HTTP ${status}`,
            status,
            retryable,
          );
        await this.sleep(500 * 2 ** attempt + Math.random() * 200);
      }
    }
    throw new FeishuRequestError("Feishu retry exhausted", 500, true);
  }
}
