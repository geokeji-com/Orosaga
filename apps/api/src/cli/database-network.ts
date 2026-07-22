import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

export type ResolvedAddress = { address: string; family: number };
export type DatabaseResolver = (
  hostname: string,
) => Promise<readonly ResolvedAddress[]>;

export function isPrivateIpAddress(address: string): boolean {
  const normalized = address.toLowerCase();
  if (normalized.startsWith("::ffff:"))
    return isPrivateIpAddress(normalized.slice("::ffff:".length));
  if (isIP(normalized) === 6)
    return normalized.startsWith("fc") || normalized.startsWith("fd");
  if (isIP(normalized) !== 4) return false;
  const octets = normalized.split(".").map(Number);
  const first = octets[0];
  const second = octets[1];
  return (
    first === 10 ||
    (first === 172 && second !== undefined && second >= 16 && second <= 31) ||
    (first === 192 && second === 168)
  );
}

const defaultResolver: DatabaseResolver = (hostname) =>
  lookup(hostname, { all: true, verbatim: true });

export async function requirePrivateDatabaseAddresses(
  hostname: string,
  resolve: DatabaseResolver = defaultResolver,
): Promise<readonly ResolvedAddress[]> {
  const addresses = await resolve(hostname);
  if (!addresses.length)
    throw new Error("database hostname did not resolve to an address");
  if (addresses.some(({ address }) => !isPrivateIpAddress(address)))
    throw new Error("database hostname resolved outside RFC1918 or IPv6 ULA");
  return addresses;
}
