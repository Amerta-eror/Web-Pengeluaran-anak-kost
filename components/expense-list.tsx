"use client";

import React, { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Filter,
  Loader2,
  ReceiptText,
  Trash2,
  Utensils,
  Car,
  GraduationCap,
  Gamepad2,
  Home,
  MoreHorizontal,
} from "lucide-react";
import { deleteExpense } from "@/actions/expense";
import {
  EXPENSE_CATEGORIES,
  type SerializedExpense,
} from "@/lib/constants";

interface ExpenseListProps {
  initialExpenses: SerializedExpense[];
}

const CATEGORY_BADGE_STYLES: Record<string, string> = {
  Makanan:
    "bg-amber-50 text-amber-700 border-amber-200/80 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800/60",
  Transportasi:
    "bg-sky-50 text-sky-700 border-sky-200/80 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-800/60",
  "Kuliah/Belajar":
    "bg-indigo-50 text-indigo-700 border-indigo-200/80 dark:bg-indigo-950/50 dark:text-indigo-300 dark:border-indigo-800/60",
  Hiburan:
    "bg-purple-50 text-purple-700 border-purple-200/80 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-800/60",
  "Kebutuhan Kost":
    "bg-teal-50 text-teal-700 border-teal-200/80 dark:bg-teal-950/50 dark:text-teal-300 dark:border-teal-800/60",
  Lainnya:
    "bg-zinc-100 text-zinc-700 border-zinc-200/80 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700",
};

function CategoryIcon({ category }: { category: string }) {
  const props = { className: "h-3.5 w-3.5 shrink-0", "aria-hidden": true };
  switch (category) {
    case "Makanan":
      return <Utensils {...props} />;
    case "Transportasi":
      return <Car {...props} />;
    case "Kuliah/Belajar":
      return <GraduationCap {...props} />;
    case "Hiburan":
      return <Gamepad2 {...props} />;
    case "Kebutuhan Kost":
      return <Home {...props} />;
    default:
      return <MoreHorizontal {...props} />;
  }
}

function formatIDR(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDateID(isoDate: string): string {
  const date = new Date(isoDate);
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function ExpenseList({ initialExpenses }: ExpenseListProps) {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState<string>("Semua");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const filteredExpenses = useMemo(() => {
    if (selectedCategory === "Semua") return initialExpenses;
    return initialExpenses.filter((item) => item.category === selectedCategory);
  }, [initialExpenses, selectedCategory]);

  const filteredTotal = useMemo(() => {
    return filteredExpenses.reduce((acc, item) => acc + item.amount, 0);
  }, [filteredExpenses]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { Semua: initialExpenses.length };
    for (const cat of EXPENSE_CATEGORIES) {
      counts[cat] = 0;
    }
    for (const item of initialExpenses) {
      counts[item.category] = (counts[item.category] ?? 0) + 1;
    }
    return counts;
  }, [initialExpenses]);

  const handleDelete = (id: string) => {
    setDeletingId(id);
    startTransition(async () => {
      const res = await deleteExpense(id);
      if (res.success) {
        router.refresh();
      }
      setDeletingId(null);
    });
  };

  const allCategories = ["Semua", ...EXPENSE_CATEGORIES];

  return (
    <section
      aria-labelledby="list-heading"
      className="flex flex-col rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-sm dark:border-zinc-800/80 dark:bg-zinc-900/90 sm:p-6"
    >
      {/* Header & Filtered Subtotal */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2
            id="list-heading"
            className="text-base font-semibold text-zinc-900 dark:text-zinc-100"
          >
            Daftar Transaksi Terbaru
          </h2>
          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
            Menampilkan {filteredExpenses.length} transaksi
            {selectedCategory !== "Semua"
              ? ` dalam kategori "${selectedCategory}"`
              : ""}
            .
          </p>
        </div>

        <div className="rounded-xl border border-zinc-200/70 bg-zinc-50 px-3 py-1.5 text-right dark:border-zinc-800 dark:bg-zinc-950/60">
          <span className="block text-[10px] font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
            Subtotal Filter
          </span>
          <span className="font-mono text-sm font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
            {formatIDR(filteredTotal)}
          </span>
        </div>
      </div>

      {/* Tombol Filter Cepat Berdasarkan Kategori */}
      <div className="mb-5">
        <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-zinc-500 dark:text-zinc-400">
          <Filter className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Filter Cepat Kategori:</span>
        </div>
        <div
          role="group"
          aria-label="Filter transaksi berdasarkan kategori"
          className="flex flex-wrap gap-1.5"
        >
          {allCategories.map((cat) => {
            const isActive = selectedCategory === cat;
            const count = categoryCounts[cat] ?? 0;
            return (
              <button
                key={cat}
                type="button"
                aria-pressed={isActive}
                onClick={() => setSelectedCategory(cat)}
                className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium transition ${
                  isActive
                    ? "border-emerald-600 bg-emerald-600 text-white shadow-sm shadow-emerald-600/20 dark:border-emerald-400 dark:bg-emerald-400 dark:text-zinc-950"
                    : "border-zinc-200/80 bg-zinc-50/80 text-zinc-600 hover:border-zinc-300 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-950/50 dark:text-zinc-400 dark:hover:border-zinc-700 dark:hover:bg-zinc-800/70"
                }`}
              >
                <span>{cat}</span>
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] tabular-nums ${
                    isActive
                      ? "bg-white/20 text-white dark:bg-zinc-950/20 dark:text-zinc-950"
                      : "bg-zinc-200/70 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tabel / List Transaksi */}
      {filteredExpenses.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/40 px-6 py-14 text-center dark:border-zinc-800 dark:bg-zinc-950/30">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-400 dark:bg-zinc-800/80 dark:text-zinc-500">
            <ReceiptText className="h-6 w-6" aria-hidden="true" />
          </div>
          <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Belum ada catatan pengeluaran
            {selectedCategory !== "Semua"
              ? ` untuk kategori "${selectedCategory}"`
              : ""}
            .
          </p>
          <p className="mt-1 max-w-xs text-xs text-zinc-500 dark:text-zinc-400">
            Gunakan formulir di samping untuk menambahkan transaksi pertama Anda
            hari ini.
          </p>
          {selectedCategory !== "Semua" && (
            <button
              type="button"
              onClick={() => setSelectedCategory("Semua")}
              className="mt-4 rounded-xl border border-zinc-200 bg-white px-3.5 py-1.5 text-xs font-medium text-zinc-700 shadow-sm transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Tampilkan Semua Kategori
            </button>
          )}
        </div>
      ) : (
        <div
          tabIndex={0}
          role="region"
          aria-labelledby="expense-table-caption"
          className="table-wrapper rounded-xl border border-zinc-200/70 dark:border-zinc-800/80"
        >
          <table className="expense-table text-left text-sm">
            <caption id="expense-table-caption" className="sr-only">
              Daftar riwayat transaksi pengeluaran
            </caption>
            <thead className="bg-zinc-100/95 text-xs font-semibold uppercase tracking-wider text-zinc-500 backdrop-blur-sm dark:bg-zinc-950/95 dark:text-zinc-400">
              <tr>
                <th
                  scope="col"
                  className="border-b border-zinc-200/80 px-4 py-3 dark:border-zinc-800"
                >
                  Catatan / Deskripsi
                </th>
                <th
                  scope="col"
                  className="border-b border-zinc-200/80 px-4 py-3 dark:border-zinc-800"
                >
                  Kategori
                </th>
                <th
                  scope="col"
                  className="border-b border-zinc-200/80 px-4 py-3 dark:border-zinc-800"
                >
                  Tanggal
                </th>
                <th
                  scope="col"
                  className="border-b border-zinc-200/80 px-4 py-3 text-right dark:border-zinc-800"
                >
                  Nominal
                </th>
                <th
                  scope="col"
                  className="border-b border-zinc-200/80 px-4 py-3 text-right dark:border-zinc-800"
                >
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200/60 dark:divide-zinc-800/70">
              {filteredExpenses.map((expense) => {
                const isRowDeleting = isPending && deletingId === expense.id;
                const badgeClass =
                  CATEGORY_BADGE_STYLES[expense.category] ??
                  CATEGORY_BADGE_STYLES.Lainnya;

                return (
                  <tr
                    key={expense.id}
                    className={`group transition-colors ${
                      isRowDeleting
                        ? "bg-rose-50/40 opacity-50 dark:bg-rose-950/20"
                        : "bg-white hover:bg-zinc-50/80 dark:bg-zinc-900 dark:hover:bg-zinc-800/40"
                    }`}
                  >
                    <th
                      scope="row"
                      className="bg-white px-4 py-3.5 font-medium text-zinc-900 group-hover:bg-zinc-50/80 dark:bg-zinc-900 dark:text-zinc-100 dark:group-hover:bg-zinc-800/40"
                    >
                      <div className="max-w-[230px] truncate">
                        {expense.note ? (
                          <span>{expense.note}</span>
                        ) : (
                          <span className="italic text-zinc-400 dark:text-zinc-500">
                            Tanpa catatan
                          </span>
                        )}
                      </div>
                    </th>
                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium ${badgeClass}`}
                      >
                        <CategoryIcon category={expense.category} />
                        <span>{expense.category}</span>
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3.5 text-xs text-zinc-500 dark:text-zinc-400">
                      {formatDateID(expense.date)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3.5 text-right font-mono text-sm font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
                      {formatIDR(expense.amount)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3.5 text-right">
                      <button
                        type="button"
                        disabled={isRowDeleting}
                        onClick={() => handleDelete(expense.id)}
                        aria-label={`Hapus transaksi ${
                          expense.note || expense.category
                        } sebesar ${formatIDR(expense.amount)}`}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-transparent text-zinc-400 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-rose-500 disabled:cursor-not-allowed disabled:opacity-50 dark:text-zinc-500 dark:hover:border-rose-900/60 dark:hover:bg-rose-950/60 dark:hover:text-rose-400"
                        title="Hapus transaksi"
                      >
                        {isRowDeleting ? (
                          <Loader2
                            className="h-4 w-4 animate-spin text-rose-500"
                            aria-hidden="true"
                          />
                        ) : (
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        )}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
