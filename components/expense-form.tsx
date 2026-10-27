"use client";

import React, { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  FileText,
  Loader2,
  PlusCircle,
  Tag,
  Wallet,
} from "lucide-react";
import { createExpense } from "@/actions/expense";
import { EXPENSE_CATEGORIES } from "@/lib/constants";

const QUICK_AMOUNTS = [15000, 25000, 50000, 100000];

function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatNumberToIDR(num: number): string {
  if (!num || Number.isNaN(num)) return "";
  return new Intl.NumberFormat("id-ID").format(num);
}

export function ExpenseForm() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();

  const [amountValue, setAmountValue] = useState<number>(0);
  const [displayAmount, setDisplayAmount] = useState<string>("");
  const [category, setCategory] = useState<string>(EXPENSE_CATEGORIES[0]);
  const [note, setNote] = useState<string>("");
  const [date, setDate] = useState<string>(getTodayDateString);
  const [feedback, setFeedback] = useState<{
    type: "error" | "success";
    message: string;
  } | null>(null);

  // Sync aria-invalid with native :user-invalid state & fallback for older browsers
  useEffect(() => {
    const form = formRef.current;
    if (!form) return;

    const dirtyState = new WeakMap<
      HTMLInputElement | HTMLSelectElement,
      { hasInteracted: boolean; hasBlurred: boolean }
    >();
    const supportsUserInvalid =
      typeof CSS !== "undefined" && CSS.supports("selector(:user-invalid)");

    const syncAriaInvalid = (
      control: HTMLInputElement | HTMLSelectElement
    ) => {
      const isValid = control.checkValidity();
      if (!supportsUserInvalid) {
        control.classList.toggle("user-invalid-fallback", !isValid);
        control.classList.toggle("user-valid-fallback", isValid);
      }
      if (!isValid) {
        control.setAttribute("aria-invalid", "true");
      } else {
        control.removeAttribute("aria-invalid");
      }
    };

    const handleBlur = (e: Event) => {
      const target = e.target;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLSelectElement
      ) {
        if (target.required) {
          const state = dirtyState.get(target) || {
            hasInteracted: false,
            hasBlurred: false,
          };
          state.hasBlurred = true;
          dirtyState.set(target, state);
          if (supportsUserInvalid || state.hasInteracted) {
            syncAriaInvalid(target);
          }
        }
      }
    };

    const handleInput = (e: Event) => {
      const target = e.target;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLSelectElement
      ) {
        if (target.required) {
          const state = dirtyState.get(target) || {
            hasInteracted: false,
            hasBlurred: false,
          };
          state.hasInteracted = true;
          dirtyState.set(target, state);
          if (target.checkValidity()) {
            target.removeAttribute("aria-invalid");
            target.classList.remove("user-invalid-fallback");
          } else if (state.hasBlurred) {
            syncAriaInvalid(target);
          }
        }
      }
    };

    form.addEventListener("blur", handleBlur, true);
    form.addEventListener("input", handleInput);
    form.addEventListener("change", handleInput);

    return () => {
      form.removeEventListener("blur", handleBlur, true);
      form.removeEventListener("input", handleInput);
      form.removeEventListener("change", handleInput);
    };
  }, []);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawDigits = e.target.value.replace(/\D/g, "");
    if (!rawDigits) {
      setAmountValue(0);
      setDisplayAmount("");
      return;
    }
    const parsed = parseInt(rawDigits, 10);
    setAmountValue(parsed);
    setDisplayAmount(formatNumberToIDR(parsed));
    if (feedback?.type === "error") setFeedback(null);
  };

  const handleQuickAddAmount = (addAmount: number) => {
    const nextAmount = amountValue + addAmount;
    setAmountValue(nextAmount);
    setDisplayAmount(formatNumberToIDR(nextAmount));
    if (feedback?.type === "error") setFeedback(null);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFeedback(null);

    const form = formRef.current;
    if (form) {
      const requiredControls = form.querySelectorAll<
        HTMLInputElement | HTMLSelectElement
      >("input[required], select[required]");
      requiredControls.forEach((control) => {
        if (!control.checkValidity()) {
          control.setAttribute("aria-invalid", "true");
        } else {
          control.removeAttribute("aria-invalid");
        }
      });
    }

    if (!amountValue || amountValue <= 0) {
      setFeedback({
        type: "error",
        message: "Masukkan nominal pengeluaran lebih dari Rp 0.",
      });
      return;
    }

    startTransition(async () => {
      const result = await createExpense({
        amount: amountValue,
        category,
        note,
        date,
      });

      if (!result.success) {
        setFeedback({
          type: "error",
          message: result.error ?? "Gagal menyimpan transaksi.",
        });
        return;
      }

      setAmountValue(0);
      setDisplayAmount("");
      setNote("");
      setFeedback({
        type: "success",
        message: "Transaksi berhasil dicatat!",
      });
      router.refresh();

      setTimeout(() => {
        setFeedback((prev) => (prev?.type === "success" ? null : prev));
      }, 2800);
    });
  };

  return (
    <section
      aria-labelledby="form-heading"
      className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-sm dark:border-zinc-800/80 dark:bg-zinc-900/90 sm:p-6"
    >
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2
            id="form-heading"
            className="text-base font-semibold text-zinc-900 dark:text-zinc-100"
          >
            Catat Pengeluaran Baru
          </h2>
          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
            Format IDR otomatis & tersimpan instan tanpa muat ulang.
          </p>
        </div>
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400">
          <Wallet className="h-4 w-4" aria-hidden="true" />
        </span>
      </div>

      <form
        ref={formRef}
        action="/#"
        method="POST"
        onSubmit={handleSubmit}
        noValidate={false}
        className="space-y-4"
      >
        <fieldset className="space-y-4" disabled={isPending}>
          <legend className="sr-only">Detail Transaksi Pengeluaran</legend>

          {/* Nominal Pengeluaran */}
          <div className="field-group">
            <label
              htmlFor="expense-amount"
              className="mb-1.5 flex items-center justify-between text-xs font-medium text-zinc-700 dark:text-zinc-300"
            >
              <span>
                Nominal Pengeluaran <span className="text-rose-500">*</span>
              </span>
              {amountValue > 0 && (
                <span className="font-mono text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                  Rp {displayAmount}
                </span>
              )}
            </label>
            <div className="relative">
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-sm font-semibold text-zinc-400 dark:text-zinc-500"
              >
                Rp
              </span>
              <input
                id="expense-amount"
                name="amount_display"
                type="text"
                inputMode="numeric"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                required
                placeholder="0"
                value={displayAmount}
                onChange={handleAmountChange}
                aria-describedby="amount-hint"
                aria-errormessage="amount-error"
                className="min-h-[48px] w-full rounded-xl border border-zinc-200 bg-zinc-50/70 py-2.5 pl-10 pr-4 text-base font-semibold tabular-nums text-zinc-900 placeholder:text-zinc-400 transition focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-800 dark:bg-zinc-950/60 dark:text-zinc-100 dark:placeholder:text-zinc-600 dark:focus:border-emerald-400 dark:focus:bg-zinc-950"
              />
              <input type="hidden" name="amount" value={amountValue} />
            </div>

            <div
              id="amount-error"
              className="field-error-msg mt-1.5 items-center gap-1.5 text-xs font-medium text-rose-600 dark:text-rose-400"
            >
              <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>Nominal pengeluaran wajib diisi.</span>
            </div>

            {/* Quick Nominal Chips */}
            <div
              id="amount-hint"
              className="mt-2 flex flex-wrap items-center gap-1.5"
            >
              <span className="mr-1 text-[11px] text-zinc-400 dark:text-zinc-500">
                Cepat:
              </span>
              {QUICK_AMOUNTS.map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => handleQuickAddAmount(amt)}
                  className="rounded-lg border border-zinc-200/80 bg-zinc-100/70 px-2 py-1 text-[11px] font-medium text-zinc-600 transition hover:border-emerald-500/40 hover:bg-emerald-50 hover:text-emerald-700 dark:border-zinc-800 dark:bg-zinc-800/60 dark:text-zinc-300 dark:hover:border-emerald-500/40 dark:hover:bg-emerald-950/50 dark:hover:text-emerald-300"
                >
                  +{amt / 1000}rb
                </button>
              ))}
              {amountValue > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setAmountValue(0);
                    setDisplayAmount("");
                  }}
                  className="ml-auto text-[11px] font-medium text-zinc-400 underline-offset-2 hover:text-rose-500 hover:underline dark:text-zinc-500"
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* Kategori (Dropdown 6 opsi) */}
          <div className="field-group">
            <label
              htmlFor="expense-category"
              className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300"
            >
              <Tag className="h-3.5 w-3.5 text-zinc-400" aria-hidden="true" />
              <span>
                Kategori <span className="text-rose-500">*</span>
              </span>
            </label>
            <div className="relative">
              <select
                id="expense-category"
                name="category"
                required
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                aria-errormessage="category-error"
                className="min-h-[48px] w-full appearance-none rounded-xl border border-zinc-200 bg-zinc-50/70 px-3.5 py-2.5 pr-9 text-base text-zinc-900 transition focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-800 dark:bg-zinc-950/60 dark:text-zinc-100 dark:focus:border-emerald-400 dark:focus:bg-zinc-950"
              >
                {EXPENSE_CATEGORIES.map((cat) => (
                  <option
                    key={cat}
                    value={cat}
                    className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100"
                  >
                    {cat}
                  </option>
                ))}
              </select>
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3.5 text-zinc-400"
              >
                ▾
              </span>
            </div>
            <div
              id="category-error"
              className="field-error-msg mt-1.5 items-center gap-1.5 text-xs font-medium text-rose-600 dark:text-rose-400"
            >
              <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>Pilih salah satu kategori pengeluaran.</span>
            </div>
          </div>

          {/* Tanggal Transaksi */}
          <div className="field-group">
            <label
              htmlFor="expense-date"
              className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300"
            >
              <Calendar
                className="h-3.5 w-3.5 text-zinc-400"
                aria-hidden="true"
              />
              <span>
                Tanggal Transaksi <span className="text-rose-500">*</span>
              </span>
            </label>
            <input
              id="expense-date"
              name="date"
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              aria-errormessage="date-error"
              className="min-h-[48px] w-full rounded-xl border border-zinc-200 bg-zinc-50/70 px-3.5 py-2.5 text-base text-zinc-900 transition focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-800 dark:bg-zinc-950/60 dark:text-zinc-100 dark:focus:border-emerald-400 dark:focus:bg-zinc-950"
            />
            <div
              id="date-error"
              className="field-error-msg mt-1.5 items-center gap-1.5 text-xs font-medium text-rose-600 dark:text-rose-400"
            >
              <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>Tanggal transaksi wajib diisi.</span>
            </div>
          </div>

          {/* Catatan Singkat (Opsional) */}
          <div className="field-group">
            <label
              htmlFor="expense-note"
              className="mb-1.5 flex items-center justify-between text-xs font-medium text-zinc-700 dark:text-zinc-300"
            >
              <span className="flex items-center gap-1.5">
                <FileText
                  className="h-3.5 w-3.5 text-zinc-400"
                  aria-hidden="true"
                />
                <span>Catatan Singkat</span>
              </span>
              <span className="text-[11px] font-normal text-zinc-400 dark:text-zinc-500">
                Opsional
              </span>
            </label>
            <input
              id="expense-note"
              name="note"
              type="text"
              maxLength={120}
              placeholder="Contoh: Makan siang ayam geprek, fotokopi modul..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="min-h-[48px] w-full rounded-xl border border-zinc-200 bg-zinc-50/70 px-3.5 py-2.5 text-base text-zinc-900 placeholder:text-zinc-400 transition focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-800 dark:bg-zinc-950/60 dark:text-zinc-100 dark:placeholder:text-zinc-600 dark:focus:border-emerald-400 dark:focus:bg-zinc-950"
            />
          </div>

          {/* Live ARIA Status Banner */}
          <div aria-live="polite" className="min-h-[4px]">
            {feedback && (
              <div
                className={`flex items-center gap-2 rounded-xl border px-3.5 py-2.5 text-xs font-medium ${
                  feedback.type === "error"
                    ? "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/50 dark:text-rose-300"
                    : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/50 dark:text-emerald-300"
                }`}
              >
                {feedback.type === "error" ? (
                  <AlertCircle
                    className="h-4 w-4 shrink-0"
                    aria-hidden="true"
                  />
                ) : (
                  <CheckCircle2
                    className="h-4 w-4 shrink-0"
                    aria-hidden="true"
                  />
                )}
                <span>{feedback.message}</span>
              </div>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-emerald-600/20 transition hover:bg-emerald-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-emerald-500 dark:text-zinc-950 dark:shadow-emerald-500/10 dark:hover:bg-emerald-400"
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                <span>Menyimpan Transaksi...</span>
              </>
            ) : (
              <>
                <PlusCircle className="h-4 w-4" aria-hidden="true" />
                <span>Simpan Pengeluaran</span>
              </>
            )}
          </button>
        </fieldset>
      </form>
    </section>
  );
}
