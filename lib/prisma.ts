import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

function getOrCreatePrismaClient(): PrismaClient {
  const cached = globalForPrisma.prisma;
  if (
    cached &&
    typeof cached.user !== "undefined" &&
    typeof cached.session !== "undefined" &&
    typeof cached.otpVerification !== "undefined"
  ) {
    return cached;
  }

  return createPrismaClient();
}

export const prisma = getOrCreatePrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
