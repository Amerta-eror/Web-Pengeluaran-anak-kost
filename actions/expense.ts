"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import type {
  CreateExpenseInput,
  ExpenseSummaryData,
} from "@/lib/constants";

export async function getExpenses(
  categoryFilter?: string
): Promise<ExpenseSummaryData> {
  const now = new Date();
  const currentMonthLabel = new Intl.DateTimeFormat("id-ID", {
    month: "long",
    year: "numeric",
  }).format(now);

  const user = await getCurrentUser();
  if (!user) {
    return {
      expenses: [],
      monthlyTotal: 0,
      monthlyCount: 0,
      currentMonthLabel,
      topCategory: null,
    };
  }

  const startOfMonth = new Date(
    now.getFullYear(),
    now.getMonth(),
    1,
    0,
    0,
    0,
    0
  );
  const endOfMonth = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0,
    23,
    59,
    59,
    999
  );

  const whereClause =
    categoryFilter && categoryFilter !== "Semua"
      ? { userId: user.id, category: categoryFilter }
      : { userId: user.id };

  const [expenses, monthlyExpenses] = await Promise.all([
    prisma.expense.findMany({
      where: whereClause,
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    }),
    prisma.expense.findMany({
      where: {
        userId: user.id,
        date: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
      select: {
        amount: true,
        category: true,
      },
    }),
  ]);

  const monthlyTotal = monthlyExpenses.reduce(
    (acc, item) => acc + item.amount,
    0
  );
  const monthlyCount = monthlyExpenses.length;

  const categoryTotals: Record<string, number> = {};
  for (const item of monthlyExpenses) {
    categoryTotals[item.category] =
      (categoryTotals[item.category] ?? 0) + item.amount;
  }

  let topCategory: { name: string; total: number } | null = null;
  for (const [name, total] of Object.entries(categoryTotals)) {
    if (!topCategory || total > topCategory.total) {
      topCategory = { name, total };
    }
  }

  return {
    expenses: expenses.map((item) => ({
      id: item.id,
      amount: item.amount,
      category: item.category,
      note: item.note,
      date: item.date.toISOString(),
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    })),
    monthlyTotal,
    monthlyCount,
    currentMonthLabel,
    topCategory,
  };
}

export async function createExpense(
  input: CreateExpenseInput
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return {
        success: false,
        error: "Anda harus masuk ke akun terlebih dahulu.",
      };
    }

    const amount = Number(input.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return {
        success: false,
        error: "Nominal pengeluaran harus lebih dari Rp 0.",
      };
    }

    const category = input.category?.trim();
    if (!category) {
      return { success: false, error: "Kategori wajib dipilih." };
    }

    const parsedDate = input.date
      ? new Date(`${input.date}T12:00:00`)
      : new Date();
    if (Number.isNaN(parsedDate.getTime())) {
      return { success: false, error: "Format tanggal tidak valid." };
    }

    const note = input.note?.trim() ? input.note.trim() : null;

    await prisma.expense.create({
      data: {
        amount,
        category,
        note,
        date: parsedDate,
        userId: user.id,
      },
    });

    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Failed to create expense:", error);
    return {
      success: false,
      error: "Gagal menyimpan transaksi. Silakan coba lagi.",
    };
  }
}

export async function deleteExpense(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return {
        success: false,
        error: "Anda harus masuk ke akun terlebih dahulu.",
      };
    }

    if (!id) {
      return { success: false, error: "ID transaksi tidak ditemukan." };
    }

    const deleted = await prisma.expense.deleteMany({
      where: {
        id,
        userId: user.id,
      },
    });

    if (deleted.count === 0) {
      return {
        success: false,
        error: "Transaksi tidak ditemukan atau bukan milik akun Anda.",
      };
    }

    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Failed to delete expense:", error);
    return {
      success: false,
      error: "Gagal menghapus transaksi. Silakan coba lagi.",
    };
  }
}
