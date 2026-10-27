export const EXPENSE_CATEGORIES = [
  "Makanan",
  "Transportasi",
  "Kuliah/Belajar",
  "Hiburan",
  "Kebutuhan Kost",
  "Lainnya",
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export interface SignInInput {
  email: string;
  password: string;
}

export interface SignUpInput {
  name: string;
  email: string;
  password: string;
}

export interface RequestSignUpOtpInput {
  name: string;
  email: string;
  password: string;
}

export interface RequestOtpResponse {
  success: boolean;
  error?: string;
  email?: string;
  deliveredVia?: "gmail-smtp" | "gmail-simulation";
  simulatedOtp?: string;
  expiresInSeconds?: number;
}

export interface VerifySignUpOtpInput {
  email: string;
  otpCode: string;
}

export interface VerifyOtpResponse {
  success: boolean;
  error?: string;
  remainingAttempts?: number;
  lockedOrExpired?: boolean;
}

export interface SerializedExpense {
  id: string;
  amount: number;
  category: string;
  note: string | null;
  date: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateExpenseInput {
  amount: number;
  category: string;
  note?: string;
  date: string;
}

export interface ExpenseSummaryData {
  expenses: SerializedExpense[];
  monthlyTotal: number;
  monthlyCount: number;
  currentMonthLabel: string;
  topCategory: { name: string; total: number } | null;
}
