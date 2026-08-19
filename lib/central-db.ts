import { PrismaClient } from "@/generated/central";

const globalForCentralPrisma = globalThis as unknown as {
  centralPrisma: PrismaClient | undefined;
};

export const centralPrisma =
  globalForCentralPrisma.centralPrisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForCentralPrisma.centralPrisma = centralPrisma;
}