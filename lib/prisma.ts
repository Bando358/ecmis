// lib/prisma.ts
import { PrismaClient } from "@prisma/client";

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
        const maxRetries = 4;
        let lastError;
        for (let i = 0; i < maxRetries; i++) {
          try {
            return await query(args);
          } catch (error: unknown) {
            lastError = error;
            const isRetryable =
              error &&
              typeof error === "object" &&
              (("code" in error &&
                ((error as { code: string }).code === "P1017" ||
                  (error as { code: string }).code === "P1001" ||
                  (error as { code: string }).code === "P2024")) ||
                (error instanceof Error &&
                  (error.message.includes("Closed") ||
                    error.message.includes("connection") ||
                    error.message.includes("timed out"))));
            if (isRetryable) {
              const delay = 1000 * (i + 1);
              console.warn(`Prisma retry ${i + 1}/${maxRetries} for ${model}.${operation} (wait ${delay}ms)`);
              await new Promise((resolve) => setTimeout(resolve, delay));
              continue;
            }
            throw error;
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
