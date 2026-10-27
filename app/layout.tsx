import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Quick-Expense Logger — Catat Pengeluaran Harian",
  description:
    "Aplikasi pencatat pengeluaran harian cepat dengan Next.js App Router, Tailwind CSS, TypeScript, dan SQLite via Prisma ORM.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <head>
        <meta name="color-scheme" content="light dark" />
      </head>
      <body className="min-h-screen bg-zinc-50 font-sans tracking-tight text-zinc-900 antialiased selection:bg-emerald-500/20 selection:text-emerald-700 dark:bg-zinc-950 dark:text-zinc-100 dark:selection:text-emerald-300">
        {children}
      </body>
    </html>
  );
}
