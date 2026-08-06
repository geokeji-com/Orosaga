const databaseCodes = new Set([
  "08000",
  "08001",
  "08003",
  "08006",
  "57P01",
  "53300",
  "ECONNREFUSED",
  "ECONNRESET",
  "ETIMEDOUT",
]);

export function safeWorkerError(error: unknown) {
  const message =
    error instanceof Error ? error.message : "Unknown worker error";
  return message.replace(/:\/\/[^\s@/]+@/g, "://[redacted]@").slice(0, 500);
}

export function isDatabaseConnectionError(error: unknown) {
  const code =
    error && typeof error === "object" && "code" in error
      ? String(error.code)
      : "";
  if (databaseCodes.has(code)) return true;
  return /remaining connection slots|connection (?:terminated|refused|reset)|database system is starting|connection timeout|timeout exceeded/i.test(
    safeWorkerError(error),
  );
}

export function databaseRetryDelayMs(failureCount: number) {
  const normalized = Math.max(1, failureCount);
  return Math.min(60_000, 1_000 * 2 ** (normalized - 1));
}
