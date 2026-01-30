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
        const maxRetries = 3;
        let lastError;
        for (let i = 0; i < maxRetries; i++) {
          try {
            return await query(args);
          } catch (error: unknown) {
            lastError = error;
            // Retry only on connection errors (P1017)
            if (error && typeof error === "object" && "code" in error && error.code === "P1017") {
              console.warn(`Prisma retry ${i + 1}/${maxRetries} for ${model}.${operation}`);
              await new Promise((resolve) => setTimeout(resolve, 1000 * (i + 1)));
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
