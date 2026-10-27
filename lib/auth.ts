import {
  randomBytes,
  randomInt,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import type { AuthenticatedUser } from "@/lib/constants";

const SESSION_COOKIE_NAME = "qel_session_token";
const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, key] = storedHash.split(":");
  if (!salt || !key) return false;
  const keyBuffer = Buffer.from(key, "hex");
  const derivedBuffer = scryptSync(password, salt, 64);
  if (keyBuffer.length !== derivedBuffer.length) return false;
  return timingSafeEqual(keyBuffer, derivedBuffer);
}

export function generateCryptographicOtp(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

export interface StoredOtpRecord {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  codeHash: string;
  attempts: number;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

async function ensureOtpTableExists(): Promise<void> {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "OtpVerification" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "email" TEXT NOT NULL,
      "name" TEXT NOT NULL,
      "passwordHash" TEXT NOT NULL,
      "codeHash" TEXT NOT NULL,
      "attempts" INTEGER NOT NULL DEFAULT 0,
      "expiresAt" DATETIME NOT NULL,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL
    )
  `);
  await prisma.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS "OtpVerification_email_key" ON "OtpVerification"("email")
  `);
}

export async function upsertOtpVerification(params: {
  email: string;
  name: string;
  passwordHash: string;
  codeHash: string;
  expiresAt: Date;
}): Promise<void> {
  await ensureOtpTableExists();

  if (typeof prisma.otpVerification !== "undefined") {
    await prisma.otpVerification.upsert({
      where: { email: params.email },
      update: {
        name: params.name,
        passwordHash: params.passwordHash,
        codeHash: params.codeHash,
        attempts: 0,
        expiresAt: params.expiresAt,
      },
      create: {
        email: params.email,
        name: params.name,
        passwordHash: params.passwordHash,
        codeHash: params.codeHash,
        attempts: 0,
        expiresAt: params.expiresAt,
      },
    });
    return;
  }

  const id = randomBytes(12).toString("hex");
  const now = new Date();

  await prisma.$executeRaw`
    INSERT INTO "OtpVerification" ("id", "email", "name", "passwordHash", "codeHash", "attempts", "expiresAt", "createdAt", "updatedAt")
    VALUES (${id}, ${params.email}, ${params.name}, ${params.passwordHash}, ${params.codeHash}, 0, ${params.expiresAt}, ${now}, ${now})
    ON CONFLICT("email") DO UPDATE SET
      "name" = excluded."name",
      "passwordHash" = excluded."passwordHash",
      "codeHash" = excluded."codeHash",
      "attempts" = 0,
      "expiresAt" = excluded."expiresAt",
      "updatedAt" = excluded."updatedAt"
  `;
}

export async function getOtpVerificationByEmail(
  email: string
): Promise<StoredOtpRecord | null> {
  await ensureOtpTableExists();

  if (typeof prisma.otpVerification !== "undefined") {
    return prisma.otpVerification.findUnique({
      where: { email },
    });
  }

  const rows = await prisma.$queryRaw<
    Array<{
      id: string;
      email: string;
      name: string;
      passwordHash: string;
      codeHash: string;
      attempts: number | bigint;
      expiresAt: string | number | Date;
      createdAt: string | number | Date;
      updatedAt: string | number | Date;
    }>
  >`
    SELECT "id", "email", "name", "passwordHash", "codeHash", "attempts", "expiresAt", "createdAt", "updatedAt"
    FROM "OtpVerification"
    WHERE "email" = ${email}
    LIMIT 1
  `;

  const row = rows[0];
  if (!row) return null;

  return {
    id: row.id,
    email: row.email,
    name: row.name,
    passwordHash: row.passwordHash,
    codeHash: row.codeHash,
    attempts: Number(row.attempts),
    expiresAt: new Date(row.expiresAt),
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
  };
}

export async function incrementOtpAttempts(email: string): Promise<number> {
  await ensureOtpTableExists();

  if (typeof prisma.otpVerification !== "undefined") {
    const updated = await prisma.otpVerification.update({
      where: { email },
      data: {
        attempts: { increment: 1 },
      },
    });
    return updated.attempts;
  }

  const now = new Date();
  await prisma.$executeRaw`
    UPDATE "OtpVerification"
    SET "attempts" = "attempts" + 1, "updatedAt" = ${now}
    WHERE "email" = ${email}
  `;
  const updated = await getOtpVerificationByEmail(email);
  return updated?.attempts ?? 0;
}

export async function deleteOtpVerificationByEmail(
  email: string
): Promise<void> {
  await ensureOtpTableExists();

  if (typeof prisma.otpVerification !== "undefined") {
    await prisma.otpVerification.deleteMany({
      where: { email },
    });
    return;
  }

  await prisma.$executeRaw`
    DELETE FROM "OtpVerification"
    WHERE "email" = ${email}
  `;
}

export async function createSession(userId: string): Promise<string> {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

  await prisma.session.create({
    data: {
      token,
      userId,
      expiresAt,
    },
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });

  return token;
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (token) {
    await prisma.session.deleteMany({
      where: { token },
    });
  }

  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function getCurrentUser(): Promise<AuthenticatedUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!token) return null;

    const session = await prisma.session.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!session) return null;

    if (session.expiresAt.getTime() < Date.now()) {
      await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
      return null;
    }

    return {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      createdAt: session.user.createdAt.toISOString(),
    };
  } catch (error) {
    console.error("Failed to read current user session:", error);
    return null;
  }
}

export async function claimOrphanExpensesForUser(userId: string): Promise<void> {
  try {
    const orphanCount = await prisma.expense.count({
      where: { userId: null },
    });

    if (orphanCount > 0) {
      await prisma.expense.updateMany({
        where: { userId: null },
        data: { userId },
      });
    }
  } catch (error) {
    console.error("Failed to claim orphan expenses:", error);
  }
}
