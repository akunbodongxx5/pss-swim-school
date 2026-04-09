/**
 * Neon / Postgres serverless sering memutus koneksi idle → Prisma melempar
 * "Server has closed the connection". Retry singkat membantu request RSC/API.
 */
function isTransientDbError(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e);
  return (
    msg.includes("closed the connection") ||
    msg.includes("Connection reset") ||
    msg.includes("ECONNRESET") ||
    msg.includes("ETIMEDOUT") ||
    msg.includes("P1001") ||
    msg.includes("P1017") ||
    msg.includes("Can't reach database server") ||
    msg.includes("Timeout")
  );
}

export async function withDbRetry<T>(
  fn: () => Promise<T>,
  opts: { attempts?: number; baseDelayMs?: number } = {},
): Promise<T> {
  const attempts = opts.attempts ?? 4;
  const baseDelayMs = opts.baseDelayMs ?? 80;
  let last: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (e) {
      last = e;
      if (i < attempts - 1 && isTransientDbError(e)) {
        await new Promise((r) => setTimeout(r, baseDelayMs * (i + 1)));
        continue;
      }
      throw e;
    }
  }
  throw last;
}
