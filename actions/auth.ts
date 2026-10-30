"use server";

import { revalidatePath } from "next/cache";
import { ensureDatabaseTables, prisma } from "@/lib/prisma";
import {
  claimOrphanExpensesForUser,
  createSession,
  deleteOtpVerificationByEmail,
  destroySession,
  generateCryptographicOtp,
  getOtpVerificationByEmail,
  hashPassword,
  incrementOtpAttempts,
  upsertOtpVerification,
  verifyPassword,
} from "@/lib/auth";
import { sendGmailOtpEmail } from "@/lib/mailer";
import type {
  RequestOtpResponse,
  RequestSignUpOtpInput,
  SignInInput,
  SignUpInput,
  VerifyOtpResponse,
  VerifySignUpOtpInput,
} from "@/lib/constants";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const OTP_TTL_MINUTES = 5;
const MAX_OTP_ATTEMPTS = 5;

export async function requestSignUpOtpAction(
  input: RequestSignUpOtpInput
): Promise<RequestOtpResponse> {
  try {
    const name = input.name?.trim();
    const email = input.email?.trim().toLowerCase();
    const password = input.password ?? "";

    if (!name || name.length < 2) {
      return {
        success: false,
        error: "Nama lengkap wajib diisi (minimal 2 karakter).",
      };
    }

    if (!email || !EMAIL_REGEX.test(email)) {
      return {
        success: false,
        error: "Masukkan alamat email Gmail yang valid.",
      };
    }

    if (password.length < 8) {
      return {
        success: false,
        error: "Kata sandi harus terdiri dari minimal 8 karakter.",
      };
    }

    await ensureDatabaseTables(prisma);

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return {
        success: false,
        error: "Email ini sudah terdaftar. Silakan masuk ke akun Anda.",
      };
    }

    const otpCode = generateCryptographicOtp();
    const passwordHash = hashPassword(password);
    const codeHash = hashPassword(otpCode);
    const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

    await upsertOtpVerification({
      email,
      name,
      passwordHash,
      codeHash,
      expiresAt,
    });

    const mailResult = await sendGmailOtpEmail({
      toEmail: email,
      recipientName: name,
      otpCode,
      expiresInMinutes: OTP_TTL_MINUTES,
    });

    return {
      success: true,
      email,
      deliveredVia: mailResult.deliveredVia,
      simulatedOtp: mailResult.simulatedOtp,
      expiresInSeconds: OTP_TTL_MINUTES * 60,
    };
  } catch (error) {
    console.error("Failed to generate/send OTP:", error);
    return {
      success: false,
      error: "Gagal membuat dan mengirim kode OTP. Silakan coba lagi.",
    };
  }
}

export async function verifySignUpOtpAction(
  input: VerifySignUpOtpInput
): Promise<VerifyOtpResponse> {
  try {
    const email = input.email?.trim().toLowerCase();
    const otpCode = input.otpCode?.replace(/\D/g, "") ?? "";

    if (!email || !EMAIL_REGEX.test(email)) {
      return {
        success: false,
        error: "Alamat email verifikasi tidak valid.",
      };
    }

    if (otpCode.length !== 6) {
      return {
        success: false,
        error: "Masukkan tepat 6 digit angka kode OTP.",
      };
    }

    const record = await getOtpVerificationByEmail(email);

    if (!record) {
      return {
        success: false,
        lockedOrExpired: true,
        error:
          "Sesi OTP tidak ditemukan atau sudah tidak berlaku. Silakan minta kode OTP baru.",
      };
    }

    if (record.expiresAt.getTime() < Date.now()) {
      await deleteOtpVerificationByEmail(email);
      return {
        success: false,
        lockedOrExpired: true,
        error:
          "Kode OTP sudah kedaluwarsa (lewat 5 menit). Silakan kirim ulang kode OTP baru.",
      };
    }

    if (record.attempts >= MAX_OTP_ATTEMPTS) {
      await deleteOtpVerificationByEmail(email);
      return {
        success: false,
        lockedOrExpired: true,
        remainingAttempts: 0,
        error:
          "Terlalu banyak percobaan salah! Demi keamanan siber, kode OTP ini telah hangus. Silakan minta kode baru.",
      };
    }

    const isMatch = verifyPassword(otpCode, record.codeHash);

    if (!isMatch) {
      const usedAttempts = await incrementOtpAttempts(email);
      const remaining = Math.max(0, MAX_OTP_ATTEMPTS - usedAttempts);

      if (remaining === 0) {
        await deleteOtpVerificationByEmail(email);
        return {
          success: false,
          lockedOrExpired: true,
          remainingAttempts: 0,
          error:
            "Kode OTP salah 5 kali berturut-turut! Demi mencegah serangan brute-force, kode OTP ini telah diblokir. Silakan minta kode baru.",
        };
      }

      return {
        success: false,
        remainingAttempts: remaining,
        error: `Kode OTP SALAH! Kode yang Anda masukkan tidak cocok. Sisa kesempatan percobaan: ${remaining} kali.`,
      };
    }

    // Double-check user hasn't been created in the meantime
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    const user =
      existingUser ??
      (await prisma.user.create({
        data: {
          name: record.name,
          email: record.email,
          passwordHash: record.passwordHash,
        },
      }));

    await deleteOtpVerificationByEmail(email);
    await claimOrphanExpensesForUser(user.id);
    await createSession(user.id);
    revalidatePath("/");

    return {
      success: true,
    };
  } catch (error) {
    console.error("Failed to verify OTP:", error);
    return {
      success: false,
      error: "Terjadi kesalahan saat memverifikasi kode OTP. Silakan coba lagi.",
    };
  }
}

export async function signUpAction(
  input: SignUpInput
): Promise<{ success: boolean; error?: string }> {
  return requestSignUpOtpAction(input);
}

export async function signInAction(
  input: SignInInput
): Promise<{ success: boolean; error?: string }> {
  try {
    const email = input.email?.trim().toLowerCase();
    const password = input.password ?? "";

    if (!email || !EMAIL_REGEX.test(email)) {
      return {
        success: false,
        error: "Masukkan alamat email yang valid.",
      };
    }

    if (!password) {
      return {
        success: false,
        error: "Kata sandi wajib diisi.",
      };
    }

    await ensureDatabaseTables(prisma);

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return {
        success: false,
        error: "Akun ini belum terdaftar di database. Silakan klik tab 'Daftar Akun (OTP)' di atas untuk mendaftar.",
      };
    }

    if (!verifyPassword(password, user.passwordHash)) {
      return {
        success: false,
        error: "Kata sandi salah. Silakan periksa kembali kata sandi Anda.",
      };
    }

    await claimOrphanExpensesForUser(user.id);
    await createSession(user.id);
    revalidatePath("/");

    return { success: true };
  } catch (error: any) {
    console.error("Failed to sign in:", error);
    const msg = error?.message || String(error);
    if (msg.includes("DB_NOT_BOUND")) {
      return {
        success: false,
        error: "Database D1 belum terhubung! Silakan tambahkan binding 'DB' di Cloudflare: Settings > Bindings.",
      };
    }
    return {
      success: false,
      error: `Gagal masuk (${msg}). Silakan coba lagi.`,
    };
  }
}

export async function signInDemoAction(): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    await ensureDatabaseTables(prisma);

    const demoEmail = "demo@expense.id";
    let user = await prisma.user.findUnique({
      where: { email: demoEmail },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          name: "Pengguna Demo",
          email: demoEmail,
          passwordHash: hashPassword("demo12345"),
        },
      });
    }

    await claimOrphanExpensesForUser(user.id);

    const existingCount = await prisma.expense.count({
      where: { userId: user.id },
    });

    if (existingCount === 0) {
      const now = new Date();
      const yesterday = new Date(
        now.getFullYear(),
        now.getMonth(),
        Math.max(1, now.getDate() - 1),
        12,
        0,
        0
      );
      await prisma.expense.createMany({
        data: [
          {
            amount: 28000,
            category: "Makanan",
            note: "Makan siang nasi padang & es teh",
            date: now,
            userId: user.id,
          },
          {
            amount: 15000,
            category: "Transportasi",
            note: "Ojek online ke kampus",
            date: now,
            userId: user.id,
          },
          {
            amount: 45000,
            category: "Kuliah/Belajar",
            note: "Cetak modul praktikum & jilid",
            date: yesterday,
            userId: user.id,
          },
        ],
      });
    }

    await createSession(user.id);
    revalidatePath("/");

    return { success: true };
  } catch (error) {
    console.error("Failed to sign in demo account:", error);
    return {
      success: false,
      error: "Gagal memuat akun demo. Silakan coba lagi.",
    };
  }
}

export async function signOutAction(): Promise<{ success: boolean }> {
  try {
    await destroySession();
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Failed to sign out:", error);
    return { success: false };
  }
}
