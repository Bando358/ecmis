// lib/prisma.ts
import { PrismaClient } from "@prisma/client";

const RETRYABLE_CODES = new Set(["P1017", "P1001", "P2024", "P1008", "P1002"]);
const RETRYABLE_MESSAGES = [
  "Closed", "connection", "timed out", "ECONNRESET",
  "ETIMEDOUT", "ENOTFOUND", "socket hang up", "fetch failed",
  "Connection pool timeout", "Can't reach database",
];

function isRetryableError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  if ("code" in error && RETRYABLE_CODES.has((error as { code: string }).code)) return true;
  if (error instanceof Error) {
    return RETRYABLE_MESSAGES.some((msg) => error.message.includes(msg));
  }
  return false;
}

const prismaClientSingleton = () => {
  return new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  }).$extends({
    query: {
      async $allOperations({ operation, model, args, query }) {
        const MAX_RETRIES = 4;
        const MAX_TOTAL_MS = 15_000; // abandon après 15s total
        const startTime = Date.now();
        let lastError: unknown;

        for (let i = 0; i < MAX_RETRIES; i++) {
          try {
            return await query(args);
          } catch (error: unknown) {
            lastError = error;
            if (!isRetryableError(error)) throw error;

            const elapsed = Date.now() - startTime;
            if (elapsed > MAX_TOTAL_MS) {
              console.error(`Prisma: abandon après ${elapsed}ms pour ${model}.${operation}`);
              throw error;
            }

            // Exponential backoff avec jitter : ~1s, ~2s, ~4s, ~8s
            const delay = Math.min(1000 * Math.pow(2, i) + Math.random() * 500, 8000);
            console.warn(`Prisma retry ${i + 1}/${MAX_RETRIES} pour ${model}.${operation} (${Math.round(delay)}ms)`);
            await new Promise((resolve) => setTimeout(resolve, delay));
          }
        }
        throw lastError;
      },
    },
  });
};

declare const globalThis: {
  prismaGlobal: ReturnType<typeof prismaClientSingleton>;
} & typeof global;

const prisma = globalThis.prismaGlobal ?? prismaClientSingleton();

export default prisma;

if (process.env.NODE_ENV !== "production") globalThis.prismaGlobal = prisma;
