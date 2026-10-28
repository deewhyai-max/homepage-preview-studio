import dns from "node:dns/promises";
import net from "node:net";

import { isPrivateHost } from "../../src/lib/recording.ts";
import { JobError } from "./errors.ts";

// Stop the recorder from being pointed at private networks (cloud metadata,
// internal services) — it only ever records public websites.

function v4ToInt(ip: string): number {
  return ip.split(".").reduce((acc, part) => (acc << 8) + Number(part), 0) >>> 0;
}

const V4_BLOCKS: [string, number][] = [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["224.0.0.0", 3],
];

export function isBlockedIp(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const n = v4ToInt(ip);
    return V4_BLOCKS.some(([base, bits]) => {
      const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
      return (n & mask) === (v4ToInt(base) & mask);
    });
  }
  if (net.isIPv6(ip)) {
    const lower = ip.toLowerCase();
    const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(lower);
    if (mapped?.[1]) return isBlockedIp(mapped[1]);
    return (
      lower === "::" ||
      lower === "::1" ||
      lower.startsWith("fc") ||
      lower.startsWith("fd") ||
      lower.startsWith("fe8") ||
      lower.startsWith("fe9") ||
      lower.startsWith("fea") ||
      lower.startsWith("feb") ||
      lower.startsWith("ff")
    );
  }
  return false;
}

/** Fast check used on every browser request (no DNS). */
export function isBlockedRequestHost(hostname: string): boolean {
  const h = hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (isPrivateHost(h)) return true;
  return net.isIP(h) !== 0 && isBlockedIp(h);
}

/** Full check before navigating: resolve the name and refuse private addresses. */
export async function assertPublicHost(hostname: string): Promise<void> {
  const h = hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (isBlockedRequestHost(h)) {
    throw new JobError("That address points to a private network and can't be recorded.");
  }
  if (net.isIP(h)) return;
  let addresses: { address: string }[];
  try {
    addresses = await dns.lookup(h, { all: true, verbatim: true });
  } catch {
    throw new JobError("We couldn't find that website. Check the address and try again.");
  }
  if (addresses.length === 0) throw new JobError("We couldn't find that website. Check the address and try again.");
  if (addresses.some((a) => isBlockedIp(a.address))) {
    throw new JobError("That address points to a private network and can't be recorded.");
  }
}
