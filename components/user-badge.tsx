"use client";

import React, { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, LogOut, UserCircle2 } from "lucide-react";
import { signOutAction } from "@/actions/auth";
import type { AuthenticatedUser } from "@/lib/constants";

interface UserBadgeProps {
  user: AuthenticatedUser;
}

export function UserBadge({ user }: UserBadgeProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleSignOut = () => {
    startTransition(async () => {
      await signOutAction();
      router.refresh();
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <div className="inline-flex items-center gap-2.5 rounded-xl border border-zinc-200/80 bg-white px-3.5 py-2 text-xs shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <UserCircle2
          className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400"
          aria-hidden="true"
        />
        <div className="flex flex-col leading-tight">
          <span className="font-semibold text-zinc-900 dark:text-zinc-100">
            {user.name}
          </span>
          <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
            {user.email}
          </span>
        </div>
      </div>

      <button
        type="button"
        disabled={isPending}
        onClick={handleSignOut}
        className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-zinc-200/80 bg-white px-3.5 py-2 text-xs font-semibold text-zinc-700 shadow-sm transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-rose-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-rose-900/60 dark:hover:bg-rose-950/50 dark:hover:text-rose-400"
      >
        {isPending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
        ) : (
          <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
        )}
        <span>Keluar</span>
      </button>
    </div>
  );
}

