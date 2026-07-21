export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly requestId?: string,
  ) {
    super(message);
  }
}

function csrfToken() {
  return (
    document.cookie
      .split("; ")
      .find((item) => item.startsWith("orosaga_csrf="))
      ?.split("=")
      .slice(1)
      .join("=") ?? ""
  );
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const method = init.method?.toUpperCase() ?? "GET";
  const headers = new Headers(init.headers);
  if (init.body) headers.set("content-type", "application/json");
  if (!["GET", "HEAD", "OPTIONS"].includes(method))
    headers.set("x-csrf-token", csrfToken());
  const response = await fetch(path, {
    ...init,
    headers,
    credentials: "include",
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as {
      code?: string;
      message?: string;
      requestId?: string;
    };
    throw new ApiError(
      response.status,
      body.code ?? `HTTP_${response.status}`,
      body.message ?? "请求失败",
      body.requestId,
    );
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export function jsonBody(value: unknown) {
  return JSON.stringify(value);
}
