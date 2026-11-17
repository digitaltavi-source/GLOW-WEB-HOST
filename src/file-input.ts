import dns from 'node:dns';
import https from 'node:https';
import type {IncomingMessage} from 'node:http';
import net from 'node:net';

export const MAX_AUTHORIZED_FILE_BYTES = 8 * 1024 * 1024;

export type AuthorizedFileInput = {
  download_url: string;
  file_id: string;
  mime_type?: string;
  file_name?: string;
};

type FetchLike = (input: string | URL, init?: RequestInit) => Promise<Response>;
export type DnsRecord = { address: string; family: number };
export type LookupAllLike = (hostname: string) => Promise<DnsRecord[]>;
export type HttpsRequestLike = typeof https.request;

function parseIpv4Uint32(ip: string): number | null {
  if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(ip)) return null;
  const parts = ip.split('.');
  let out = 0;
  for (const part of parts) {
    if (part.length > 1 && part.startsWith('0')) return null;
    const n = Number(part);
    if (!Number.isInteger(n) || n < 0 || n > 255) return null;
    out = ((out << 8) | n) >>> 0;
  }
  return out;
}

function inIpv4Cidr(ip: number, base: number, prefixLen: number): boolean {
  if (prefixLen <= 0) return true;
  const mask = (0xffffffff << (32 - prefixLen)) >>> 0;
  return (ip & mask) === (base & mask);
}

const BLOCKED_IPV4_CIDRS: ReadonlyArray<readonly [number, number]> = [
  [0x00000000, 8],  // 0.0.0.0/8
  [0x0a000000, 8],  // 10.0.0.0/8
  [0x64400000, 10], // 100.64.0.0/10
  [0x7f000000, 8],  // 127.0.0.0/8
  [0xa9fe0000, 16], // 169.254.0.0/16
  [0xac100000, 12], // 172.16.0.0/12
  [0xc0000000, 24], // 192.0.0.0/24
  [0xc0000200, 24], // 192.0.2.0/24
  [0xc0a80000, 16], // 192.168.0.0/16
  [0xc6120000, 15], // 198.18.0.0/15
  [0xc6336400, 24], // 198.51.100.0/24
  [0xcb007100, 24], // 203.0.113.0/24
  [0xe0000000, 4],  // 224.0.0.0/4
  [0xf0000000, 4]   // 240.0.0.0/4
];

function isGlobalIpv4Uint32(ip: number): boolean {
  for (const [base, prefix] of BLOCKED_IPV4_CIDRS) {
    if (inIpv4Cidr(ip, base, prefix)) return false;
  }
  return true;
}

function parseIpv6BigInt(raw: string): bigint | null {
  if (raw.includes('%') || !net.isIPv6(raw)) return null;
  let normalized = raw.toLowerCase();
  const lastColon = normalized.lastIndexOf(':');
  if (lastColon >= 0 && normalized.slice(lastColon + 1).includes('.')) {
    const v4 = parseIpv4Uint32(normalized.slice(lastColon + 1));
    if (v4 === null) return null;
    const hi = ((v4 >>> 16) & 0xffff).toString(16);
    const lo = (v4 & 0xffff).toString(16);
    normalized = `${normalized.slice(0, lastColon + 1)}${hi}:${lo}`;
  }
  const halves = normalized.split('::');
  if (halves.length > 2) return null;
  let groups: string[];
  if (halves.length === 2) {
    const left = halves[0] ? halves[0].split(':') : [];
    const right = halves[1] ? halves[1].split(':') : [];
    const fill = 8 - left.length - right.length;
    if (fill < 1) return null;
    groups = [...left, ...Array<string>(fill).fill('0'), ...right];
  } else {
    groups = normalized.split(':');
  }
  if (groups.length !== 8) return null;
  let acc = 0n;
  for (const g of groups) {
    if (!/^[0-9a-f]{1,4}$/.test(g)) return null;
    acc = (acc << 16n) | BigInt(parseInt(g, 16));
  }
  return acc;
}

function inIpv6Cidr(ip: bigint, base: bigint, prefixLen: number): boolean {
  if (prefixLen <= 0) return true;
  const shift = BigInt(128 - prefixLen);
  return (ip >> shift) === (base >> shift);
}

const BLOCKED_IPV6_CIDRS: ReadonlyArray<readonly [bigint, number]> = [
  [0n, 128],                                                       // ::/128
  [1n, 128],                                                       // ::1/128
  [0n, 96],                                                        // ::/96 (IPv4-compatible)
  [(0x0064n << 112n) | (0xff9bn << 96n), 96],                      // 64:ff9b::/96
  [(0x0064n << 112n) | (0xff9bn << 96n) | (0x0001n << 80n), 48],   // 64:ff9b:1::/48
  [0x0100n << 112n, 64],                                           // 100::/64
  [0x2001n << 112n, 23],                                           // 2001::/23 (Teredo + IETF protocol assignments)
  [(0x2001n << 112n) | (0x0db8n << 96n), 32],                      // 2001:db8::/32 (documentation)
  [0x2002n << 112n, 16],                                           // 2002::/16 (6to4)
  [0xfc00n << 112n, 7],                                            // fc00::/7
  [0xfe80n << 112n, 10],                                           // fe80::/10
  [0xff00n << 112n, 8]                                             // ff00::/8
];

export function isGlobalIpAddress(rawIp: string): boolean {
  const ip = rawIp.trim().replace(/^\[|\]$/g, '');
  if (!ip || ip.includes('%')) return false;
  const v4 = parseIpv4Uint32(ip);
  if (v4 !== null) {
    return isGlobalIpv4Uint32(v4);
  }
  const v6 = parseIpv6BigInt(ip);
  if (v6 !== null) {
    if (inIpv6Cidr(v6, 0xffff00000000n, 96)) {
      const mappedV4 = Number(v6 & 0xffffffffn) >>> 0;
      return isGlobalIpv4Uint32(mappedV4);
    }
    for (const [base, prefix] of BLOCKED_IPV6_CIDRS) {
      if (inIpv6Cidr(v6, base, prefix)) return false;
    }
    return true;
  }
  return false;
}

function normalizeAndValidateUrl(raw: string): { url: URL; normalizedHost: string; literalFamily: 0 | 4 | 6 } {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw Error('FILE_DOWNLOAD_URL_INVALID');
  }
  if (url.protocol !== 'https:') throw Error('FILE_DOWNLOAD_HTTPS_REQUIRED');
  if (url.username || url.password) throw Error('FILE_DOWNLOAD_CREDENTIALS_FORBIDDEN');
  if (url.port && url.port !== '443') throw Error('FILE_DOWNLOAD_PORT_FORBIDDEN');

  const unbracketed = url.hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (!unbracketed || unbracketed.includes('%')) {
    throw Error('FILE_DOWNLOAD_PRIVATE_HOST_FORBIDDEN');
  }
  const normalizedHost = unbracketed.replace(/\.+$/, '');
  if (
    !normalizedHost ||
    normalizedHost === 'localhost' ||
    normalizedHost.endsWith('.localhost') ||
    normalizedHost === 'local' ||
    normalizedHost.endsWith('.local') ||
    normalizedHost === 'internal' ||
    normalizedHost.endsWith('.internal')
  ) {
    throw Error('FILE_DOWNLOAD_PRIVATE_HOST_FORBIDDEN');
  }

  const family = net.isIP(normalizedHost);
  if (family === 4 || family === 6) {
    if (!isGlobalIpAddress(normalizedHost)) {
      throw Error('FILE_DOWNLOAD_PRIVATE_HOST_FORBIDDEN');
    }
    return { url, normalizedHost, literalFamily: family };
  }
  if (/^\d+(\.\d+)*$/.test(normalizedHost) || normalizedHost.includes(':')) {
    throw Error('FILE_DOWNLOAD_PRIVATE_HOST_FORBIDDEN');
  }
  return { url, normalizedHost, literalFamily: 0 };
}

async function boundedBody(response: Response) {
  const length = response.headers.get('content-length');
  if (length !== null) {
    const n = Number(length);
    if (!Number.isFinite(n) || n < 0) throw Error('FILE_DOWNLOAD_LENGTH_INVALID');
    if (n > MAX_AUTHORIZED_FILE_BYTES) throw Error('FILE_TOO_LARGE');
  }
  if (!response.body) throw Error('FILE_DOWNLOAD_BODY_MISSING');
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        total += value.byteLength;
        if (total > MAX_AUTHORIZED_FILE_BYTES) {
          await reader.cancel();
          throw Error('FILE_TOO_LARGE');
        }
        chunks.push(value);
      }
    }
  } finally {
    reader.releaseLock();
  }
  const out = Buffer.allocUnsafe(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return out;
}

function pinnedHttpsGetBytes(params: {
  url: URL;
  hostname: string;
  pinnedIp: string;
  pinnedFamily: 4 | 6;
  timeoutMs: number;
  httpsRequestImpl: HttpsRequestLike;
}): Promise<Buffer> {
  const { url, hostname, pinnedIp, pinnedFamily, timeoutMs, httpsRequestImpl } = params;
  return new Promise<Buffer>((resolve, reject) => {
    let settled = false;
    const finishReject = (err: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(deadline);
      reject(err);
    };
    const finishResolve = (buf: Buffer) => {
      if (settled) return;
      settled = true;
      clearTimeout(deadline);
      resolve(buf);
    };

    const customLookup = (
      _host: string,
      opts: unknown,
      cb: (...args: unknown[]) => void
    ) => {
      const allRequested = Boolean(opts && typeof opts === 'object' && (opts as { all?: boolean }).all);
      if (allRequested) {
        cb(null, [{ address: pinnedIp, family: pinnedFamily }]);
      } else {
        cb(null, pinnedIp, pinnedFamily);
      }
    };

    const req = httpsRequestImpl(
      {
        protocol: 'https:',
        hostname,
        port: 443,
        path: `${url.pathname}${url.search}`,
        method: 'GET',
        headers: { accept: '*/*', host: hostname },
        servername: net.isIP(hostname) ? undefined : hostname,
        family: pinnedFamily,
        timeout: timeoutMs,
        agent: false,
        lookup: customLookup as unknown as https.RequestOptions['lookup']
      },
      (res: IncomingMessage) => {
        const status = res.statusCode ?? 0;
        if (status >= 300 && status < 400) {
          res.destroy();
          finishReject(Error('FILE_DOWNLOAD_REDIRECT_FORBIDDEN'));
          return;
        }
        if (status < 200 || status >= 300) {
          res.destroy();
          finishReject(Error('FILE_DOWNLOAD_HTTP_ERROR'));
          return;
        }
        const rawLen = res.headers['content-length'];
        const lengthHeader = Array.isArray(rawLen) ? rawLen[0] : rawLen;
        if (lengthHeader !== undefined) {
          const n = Number(lengthHeader);
          if (!Number.isFinite(n) || n < 0) {
            res.destroy();
            finishReject(Error('FILE_DOWNLOAD_LENGTH_INVALID'));
            return;
          }
          if (n > MAX_AUTHORIZED_FILE_BYTES) {
            res.destroy();
            finishReject(Error('FILE_TOO_LARGE'));
            return;
          }
        }
        const chunks: Buffer[] = [];
        let total = 0;
        res.on('data', (chunk: Buffer | Uint8Array) => {
          const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
          total += buf.byteLength;
          if (total > MAX_AUTHORIZED_FILE_BYTES) {
            res.destroy();
            req.destroy();
            finishReject(Error('FILE_TOO_LARGE'));
            return;
          }
          chunks.push(buf);
        });
        res.on('end', () => {
          finishResolve(Buffer.concat(chunks, total));
        });
        res.on('error', () => {
          finishReject(Error('FILE_DOWNLOAD_FAILED'));
        });
      }
    );

    const deadline = setTimeout(() => {
      req.destroy();
      finishReject(Error('FILE_DOWNLOAD_FAILED'));
    }, timeoutMs);

    req.on('timeout', () => {
      req.destroy();
      finishReject(Error('FILE_DOWNLOAD_FAILED'));
    });
    req.on('error', (err: Error) => {
      if (['FILE_TOO_LARGE', 'FILE_DOWNLOAD_REDIRECT_FORBIDDEN', 'FILE_DOWNLOAD_HTTP_ERROR', 'FILE_DOWNLOAD_LENGTH_INVALID'].includes(err.message)) {
        finishReject(err);
        return;
      }
      finishReject(Error('FILE_DOWNLOAD_FAILED'));
    });
    req.end();
  });
}

export async function fetchAuthorizedFile(
  file: AuthorizedFileInput,
  opts: {
    fetchImpl?: FetchLike;
    lookupImpl?: LookupAllLike;
    httpsRequestImpl?: HttpsRequestLike;
    timeoutMs?: number;
  } = {}
) {
  if (
    !file ||
    typeof file.file_id !== 'string' ||
    !file.file_id.trim() ||
    typeof file.download_url !== 'string' ||
    !file.download_url.trim()
  ) {
    throw Error('FILE_INPUT_INVALID');
  }
  const timeoutMs = opts.timeoutMs ?? 15000;
  const { url, normalizedHost, literalFamily } = normalizeAndValidateUrl(file.download_url);

  if (opts.fetchImpl) {
    let response: Response;
    try {
      response = await opts.fetchImpl(url, {
        method: 'GET',
        redirect: 'error',
        signal: AbortSignal.timeout(timeoutMs),
        headers: { accept: '*/*' }
      });
    } catch (error) {
      if (error instanceof Error && ['FILE_TOO_LARGE', 'FILE_DOWNLOAD_REDIRECT_FORBIDDEN', 'FILE_DOWNLOAD_PRIVATE_HOST_FORBIDDEN'].includes(error.message)) {
        throw error;
      }
      if (error instanceof Error && /redirect/i.test(error.message)) {
        throw Error('FILE_DOWNLOAD_REDIRECT_FORBIDDEN');
      }
      throw Error('FILE_DOWNLOAD_FAILED');
    }
    if (response.redirected || (response.status >= 300 && response.status < 400)) {
      throw Error('FILE_DOWNLOAD_REDIRECT_FORBIDDEN');
    }
    if (!response.ok) throw Error('FILE_DOWNLOAD_HTTP_ERROR');
    const bytes = await boundedBody(response);
    return {
      bytes,
      file_id: file.file_id,
      mime_type: file.mime_type ?? null,
      file_name: file.file_name ?? null
    };
  }

  let pinnedIp: string;
  let pinnedFamily: 4 | 6;
  if (literalFamily === 4 || literalFamily === 6) {
    pinnedIp = normalizedHost;
    pinnedFamily = literalFamily;
  } else {
    const lookupFn: LookupAllLike =
      opts.lookupImpl ?? ((h: string) => dns.promises.lookup(h, { all: true, verbatim: true }));
    let records: DnsRecord[];
    try {
      records = await lookupFn(normalizedHost);
    } catch {
      throw Error('FILE_DOWNLOAD_FAILED');
    }
    if (!Array.isArray(records) || records.length === 0) {
      throw Error('FILE_DOWNLOAD_FAILED');
    }
    for (const rec of records) {
      if (!rec || typeof rec.address !== 'string' || !isGlobalIpAddress(rec.address)) {
        throw Error('FILE_DOWNLOAD_PRIVATE_HOST_FORBIDDEN');
      }
    }
    const chosen = records[0]!;
    pinnedIp = chosen.address;
    pinnedFamily = chosen.family === 6 || net.isIP(chosen.address) === 6 ? 6 : 4;
  }

  const bytes = await pinnedHttpsGetBytes({
    url,
    hostname: normalizedHost,
    pinnedIp,
    pinnedFamily,
    timeoutMs,
    httpsRequestImpl: opts.httpsRequestImpl ?? https.request
  });
  return {
    bytes,
    file_id: file.file_id,
    mime_type: file.mime_type ?? null,
    file_name: file.file_name ?? null
  };
}
