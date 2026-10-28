import { PrismaClient } from "@prisma/client";
import { PrismaD1 } from "@prisma/adapter-d1";
import { getCloudflareContext } from "@opennextjs/cloudflare";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function getLocalPrismaClient(): PrismaClient {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = new PrismaClient({
      log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    });
  }
  return globalForPrisma.prisma;
}

function getPrismaClient(): PrismaClient {
  try {
    const { env } = getCloudflareContext();
    const d1Database = env && (env as Record<string, unknown>).DB;
    if (d1Database) {
      const adapter = new PrismaD1(d1Database as any);
      return new PrismaClient({ adapter });
    }
  } catch {
    // getCloudflareContext throws when called outside Cloudflare Workers runtime
  }

  return getLocalPrismaClient();
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
