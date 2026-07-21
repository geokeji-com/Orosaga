import { isIP } from "node:net";

export function isAllowedSystemUrl(value: string, allowedHosts: string[]) {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    const allowed = allowedHosts
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean);
    return (
      url.protocol === "https:" &&
      host !== "localhost" &&
      isIP(host) === 0 &&
      allowed.includes(host) &&
      !url.username &&
      !url.password
    );
  } catch {
    return false;
  }
}
