import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

/**
 * Neon: pakai URL **pooling** (host berakhiran `-pooler` atau parameter `?pgbouncer=true`)
 * di `DATABASE_URL` agar koneksi tidak mudah diputus saat idle.
 * Lihat `.env.example`.
 */
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({ log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"] });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
