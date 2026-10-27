import React from "react";
import {
  ArrowUpRight,
  CalendarDays,
  CreditCard,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { getExpenses } from "@/actions/expense";
import { AuthCard } from "@/components/auth-card";
import { ExpenseForm } from "@/components/expense-form";
import { ExpenseList } from "@/components/expense-list";
import { UserBadge } from "@/components/user-badge";

export const dynamic = "force-dynamic";

function formatIDR(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export default async function HomePage() {
  const user = await getCurrentUser();

  if (!user) {
    return <AuthCard />;
  }

  const {
    expenses,
    monthlyTotal,
    monthlyCount,
    currentMonthLabel,
    topCategory,
  } = await getExpenses();

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Top Navbar / Header */}
      <header className="mb-8 flex flex-col justify-between gap-4 border-b border-zinc-200/80 pb-6 dark:border-zinc-800/80 lg:flex-row lg:items-center">
        <div className="flex items-center gap-3.5">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-sm shadow-emerald-600/25 dark:bg-emerald-500 dark:text-zinc-950">
            <CreditCard className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-2xl">
                Quick-Expense Logger
              </h1>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                <Sparkles className="h-3 w-3" aria-hidden="true" />
                IDR
              </span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 sm:text-sm">
              Buku catatan pengeluaran pribadi milik{" "}
              <strong className="font-semibold text-zinc-700 dark:text-zinc-200">
                {user.name}
              </strong>
              .
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="inline-flex items-center gap-2 rounded-xl border border-zinc-200/80 bg-white px-3.5 py-2 text-xs font-medium text-zinc-600 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
            <CalendarDays
              className="h-4 w-4 text-emerald-600 dark:text-emerald-400"
              aria-hidden="true"
            />
            <span>Periode:</span>
            <strong className="font-semibold text-zinc-900 dark:text-zinc-100">
              {currentMonthLabel}
            </strong>
          </div>

          <UserBadge user={user} />
        </div>
      </header>

      {/* Ringkasan Total Pengeluaran Bulan Ini (Kartu Metrik Sederhana di Bagian Atas) */}
      <section aria-label="Ringkasan Pengeluaran Bulan Ini" className="mb-8">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {/* Primary Metric Card: Total Pengeluaran Bulan Ini */}
          <div className="relative overflow-hidden rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-600 to-teal-700 p-5 text-white shadow-md shadow-emerald-900/10 sm:col-span-2 sm:p-6 dark:from-emerald-600 dark:to-teal-800">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-emerald-100/90">
                  Total Pengeluaran Bulan Ini ({currentMonthLabel})
                </p>
                <p className="mt-2 font-mono text-3xl font-bold tracking-tight tabular-nums sm:text-4xl">
                  {formatIDR(monthlyTotal)}
                </p>
              </div>
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15 backdrop-blur-sm">
                <TrendingUp className="h-5 w-5 text-white" aria-hidden="true" />
              </span>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-emerald-50/90">
              <span className="inline-flex items-center gap-1 rounded-lg bg-black/15 px-2.5 py-1 font-medium">
                {monthlyCount} transaksi tercatat bulan ini
              </span>
              {monthlyCount > 0 && (
                <span className="inline-flex items-center gap-1 text-emerald-100">
                  <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                  Rata-rata {formatIDR(Math.round(monthlyTotal / monthlyCount))}{" "}
                  / transaksi
                </span>
              )}
            </div>
          </div>

          {/* Secondary Metric Card: Kategori Terbesar Bulan Ini */}
          <div className="flex flex-col justify-between rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-sm dark:border-zinc-800/80 dark:bg-zinc-900/90 sm:p-6">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                Kategori Terbesar Bulan Ini
              </p>
              {topCategory ? (
                <>
                  <p className="mt-2 text-lg font-bold text-zinc-900 dark:text-zinc-100">
                    {topCategory.name}
                  </p>
                  <p className="mt-1 font-mono text-base font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                    {formatIDR(topCategory.total)}
                  </p>
                </>
              ) : (
                <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">
                  Belum ada data bulan ini
                </p>
              )}
            </div>
            <div className="mt-4 border-t border-zinc-100 pt-3 text-xs text-zinc-500 dark:border-zinc-800/80 dark:text-zinc-400">
              {topCategory && monthlyTotal > 0 ? (
                <span>
                  Mencakup{" "}
                  <strong className="font-semibold text-zinc-700 dark:text-zinc-200">
                    {Math.round((topCategory.total / monthlyTotal) * 100)}%
                  </strong>{" "}
                  dari pengeluaran bulan ini
                </span>
              ) : (
                <span>Mulai catat pengeluaran harian Anda</span>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Grid: Form Input & Tabel/List Transaksi */}
      <main className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        <div className="lg:col-span-4 lg:sticky lg:top-6">
          <ExpenseForm />
        </div>
        <div className="lg:col-span-8">
          <ExpenseList initialExpenses={expenses} />
        </div>
      </main>
    </div>
  );
}
