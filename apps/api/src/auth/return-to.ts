const fallbackOrigin = "http://localhost:5173";

export function safeReturnTo(
  value: unknown,
  publicOrigin = process.env.PUBLIC_ORIGIN ?? fallbackOrigin,
) {
  if (typeof value !== "string" || value.length === 0 || value.length > 2_048)
    return "/";
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\"))
    return "/";
  try {
    const origin = new URL(publicOrigin);
    const target = new URL(value, origin);
    if (target.origin !== origin.origin) return "/";
    return `${target.pathname}${target.search}${target.hash}`;
  } catch {
    return "/";
  }
}
