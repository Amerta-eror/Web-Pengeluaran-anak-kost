import { PrismaClient } from "@prisma/client";
import { PrismaD1 } from "@prisma/adapter-d1";
import { getCloudflareContext } from "@opennextjs/cloudflare";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  d1Client: PrismaClient | undefined;
  tablesInitialized: boolean | undefined;
};

function getLocalPrismaClient(): PrismaClient {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = new PrismaClient({
      log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    });
  }
  return globalForPrisma.prisma;
}

export function getPrismaClient(): PrismaClient {
  try {
    const { env } = getCloudflareContext();
    const d1Database = env && (env as Record<string, unknown>).DB;
    if (d1Database) {
      if (!globalForPrisma.d1Client) {
        const adapter = new PrismaD1(d1Database as any);
        globalForPrisma.d1Client = new PrismaClient({ adapter });
      }
      return globalForPrisma.d1Client;
    } else if (process.env.NODE_ENV === "production") {
      throw new Error(
        "DB_NOT_BOUND: Binding database D1 dengan nama 'DB' belum ditambahkan di Cloudflare Settings > Bindings."
      );
    }
  } catch (err: any) {
    if (err?.message?.includes("DB_NOT_BOUND")) {
      throw err;
    }
    // Called outside Cloudflare Workers runtime (e.g. during next build or local testing)
  }

  return getLocalPrismaClient();
}

export async function ensureDatabaseTables(client: PrismaClient): Promise<void> {
  if (globalForPrisma.tablesInitialized) return;
  try {
    await client.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "User" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "name" TEXT NOT NULL,
        "email" TEXT NOT NULL UNIQUE,
        "passwordHash" TEXT NOT NULL,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await client.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Session" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "token" TEXT NOT NULL UNIQUE,
        "userId" TEXT NOT NULL,
        "expiresAt" DATETIME NOT NULL,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
      );
    `);
    await client.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "OtpVerification" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "email" TEXT NOT NULL UNIQUE,
        "name" TEXT NOT NULL,
        "passwordHash" TEXT NOT NULL,
        "codeHash" TEXT NOT NULL,
        "attempts" INTEGER NOT NULL DEFAULT 0,
        "expiresAt" DATETIME NOT NULL,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await client.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Expense" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "amount" REAL NOT NULL,
        "category" TEXT NOT NULL,
        "note" TEXT,
        "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "userId" TEXT,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
      );
    `);
    globalForPrisma.tablesInitialized = true;
  } catch (err) {
    console.error("Auto-table initialization check:", err);
  }
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = getPrismaClient();
    const value = Reflect.get(client, prop);
    if (typeof value === "function") {
      return value.bind(client);
    }
    return value;
  },
});
