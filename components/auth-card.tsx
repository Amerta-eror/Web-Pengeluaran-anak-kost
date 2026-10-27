"use client";

import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Copy,
  CreditCard,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  LogIn,
  Mail,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Timer,
  User,
  UserPlus,
} from "lucide-react";
import {
  requestSignUpOtpAction,
  signInAction,
  signInDemoAction,
  verifySignUpOtpAction,
} from "@/actions/auth";

function formatCountdown(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

export function AuthCard() {
  const router = useRouter();
  const signInFormRef = useRef<HTMLFormElement>(null);
  const signUpFormRef = useRef<HTMLFormElement>(null);
  const otpFormRef = useRef<HTMLFormElement>(null);
  const otpInputRef = useRef<HTMLInputElement>(null);
  const otpAbortRef = useRef<AbortController | null>(null);
  const [isPending, startTransition] = useTransition();

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [signUpStep, setSignUpStep] = useState<"details" | "otp">("details");

  // Sign-in state
  const [signInEmail, setSignInEmail] = useState("");
  const [signInPassword, setSignInPassword] = useState("");
  const [showSignInPassword, setShowSignInPassword] = useState(false);

  // Sign-up details state
  const [signUpName, setSignUpName] = useState("");
  const [signUpEmail, setSignUpEmail] = useState("");
  const [signUpPassword, setSignUpPassword] = useState("");
  const [showSignUpPassword, setShowSignUpPassword] = useState(false);

  // OTP verification state
  const [otpCode, setOtpCode] = useState("");
  const [deliveredVia, setDeliveredVia] = useState<
    "gmail-smtp" | "gmail-simulation" | null
  >(null);
  const [simulatedOtp, setSimulatedOtp] = useState<string | null>(null);
  const [remainingAttempts, setRemainingAttempts] = useState<number>(5);
  const [otpLockedOrExpired, setOtpLockedOrExpired] = useState<boolean>(false);
  const [secondsLeft, setSecondsLeft] = useState<number>(300);

  const [feedback, setFeedback] = useState<{
    type: "error" | "success";
    message: string;
  } | null>(null);

  // Countdown timer when on OTP step
  useEffect(() => {
    if (mode !== "signup" || signUpStep !== "otp" || secondsLeft <= 0) return;

    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          setOtpLockedOrExpired(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [mode, signUpStep, secondsLeft]);

  // WebOTP API progressive enhancement lifecycle with AbortController cleanup
  const stopWebOtpListener = useCallback(() => {
    if (otpAbortRef.current) {
      otpAbortRef.current.abort();
      otpAbortRef.current = null;
    }
  }, []);

  const startWebOtpListener = useCallback(() => {
    if (typeof window === "undefined" || !("OTPCredential" in window)) {
      return;
    }

    stopWebOtpListener();
    const ac = new AbortController();
    otpAbortRef.current = ac;

    (
      navigator.credentials as unknown as {
        get: (options: {
          otp: { transport: string[] };
          signal: AbortSignal;
        }) => Promise<{ code?: string } | null>;
      }
    )
      .get({
        otp: { transport: ["sms"] },
        signal: ac.signal,
      })
      .then((otp) => {
        if (!otp?.code) return;
        setOtpCode(otp.code);
        if (otpInputRef.current) {
          otpInputRef.current.value = otp.code;
        }
        if (otpFormRef.current) {
          otpFormRef.current.requestSubmit();
        }
      })
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === "AbortError") {
          return;
        }
      });
  }, [stopWebOtpListener]);

  useEffect(() => {
    if (mode === "signup" && signUpStep === "otp") {
      startWebOtpListener();
    } else {
      stopWebOtpListener();
    }
    return () => {
      stopWebOtpListener();
    };
  }, [mode, signUpStep, startWebOtpListener, stopWebOtpListener]);

  // Contextual validation on blur & reset on input (:user-invalid + fallback)
  useEffect(() => {
    const activeForm =
      mode === "signin"
        ? signInFormRef.current
        : signUpStep === "details"
        ? signUpFormRef.current
        : otpFormRef.current;
    if (!activeForm) return;

    const dirtyState = new WeakMap<
      HTMLInputElement,
      { hasInteracted: boolean; hasBlurred: boolean }
    >();
    const supportsUserInvalid =
      typeof CSS !== "undefined" && CSS.supports("selector(:user-invalid)");

    const syncAriaInvalid = (control: HTMLInputElement) => {
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
      if (target instanceof HTMLInputElement && target.required) {
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
    };

    const handleInput = (e: Event) => {
      const target = e.target;
      if (target instanceof HTMLInputElement && target.required) {
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
    };

    activeForm.addEventListener("blur", handleBlur, true);
    activeForm.addEventListener("input", handleInput);

    return () => {
      activeForm.removeEventListener("blur", handleBlur, true);
      activeForm.removeEventListener("input", handleInput);
    };
  }, [mode, signUpStep]);

  const switchMode = (nextMode: "signin" | "signup") => {
    stopWebOtpListener();
    setMode(nextMode);
    setSignUpStep("details");
    setFeedback(null);
  };

  const handleSignInSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFeedback(null);

    const form = signInFormRef.current;
    if (form && !form.checkValidity()) {
      const inputs = form.querySelectorAll<HTMLInputElement>("input[required]");
      inputs.forEach((input) => {
        if (!input.checkValidity()) {
          input.setAttribute("aria-invalid", "true");
          input.classList.add("user-invalid-fallback");
        }
      });
      form.reportValidity();
      return;
    }

    startTransition(async () => {
      const result = await signInAction({
        email: signInEmail,
        password: signInPassword,
      });

      if (!result.success) {
        setFeedback({
          type: "error",
          message: result.error ?? "Gagal masuk ke akun.",
        });
        return;
      }

      setFeedback({
        type: "success",
        message: "Berhasil masuk! Memuat data pengeluaran Anda...",
      });
      router.refresh();
    });
  };

  const handleRequestOtpSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFeedback(null);

    const form = signUpFormRef.current;
    if (form && !form.checkValidity()) {
      const inputs = form.querySelectorAll<HTMLInputElement>("input[required]");
      inputs.forEach((input) => {
        if (!input.checkValidity()) {
          input.setAttribute("aria-invalid", "true");
          input.classList.add("user-invalid-fallback");
        }
      });
      form.reportValidity();
      return;
    }

    startTransition(async () => {
      const result = await requestSignUpOtpAction({
        name: signUpName,
        email: signUpEmail,
        password: signUpPassword,
      });

      if (!result.success) {
        setFeedback({
          type: "error",
          message: result.error ?? "Gagal mengirim kode OTP.",
        });
        return;
      }

      setDeliveredVia(result.deliveredVia ?? "gmail-simulation");
      setSimulatedOtp(result.simulatedOtp ?? null);
      setSecondsLeft(result.expiresInSeconds ?? 300);
      setRemainingAttempts(5);
      setOtpLockedOrExpired(false);
      setOtpCode("");
      setSignUpStep("otp");
      setFeedback({
        type: "success",
        message:
          result.deliveredVia === "gmail-smtp"
            ? `Kode OTP 6 digit telah dikirim ke Gmail ${result.email}!`
            : `Kode OTP 6 digit telah dibuat dan dikirim secara otomatis untuk ${result.email}.`,
      });
    });
  };

  const handleResendOtp = () => {
    stopWebOtpListener();
    setFeedback(null);

    startTransition(async () => {
      const result = await requestSignUpOtpAction({
        name: signUpName,
        email: signUpEmail,
        password: signUpPassword,
      });

      if (!result.success) {
        setFeedback({
          type: "error",
          message: result.error ?? "Gagal mengirim ulang kode OTP.",
        });
        return;
      }

      setDeliveredVia(result.deliveredVia ?? "gmail-simulation");
      setSimulatedOtp(result.simulatedOtp ?? null);
      setSecondsLeft(result.expiresInSeconds ?? 300);
      setRemainingAttempts(5);
      setOtpLockedOrExpired(false);
      setOtpCode("");
      startWebOtpListener();
      setFeedback({
        type: "success",
        message: "Kode OTP baru berhasil dikirim ulang! Kode lama telah hangus.",
      });
    });
  };

  const handleVerifyOtpSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    stopWebOtpListener();
    setFeedback(null);

    const form = otpFormRef.current;
    if (form && !form.checkValidity()) {
      const inputs = form.querySelectorAll<HTMLInputElement>("input[required]");
      inputs.forEach((input) => {
        if (!input.checkValidity()) {
          input.setAttribute("aria-invalid", "true");
          input.classList.add("user-invalid-fallback");
        }
      });
      form.reportValidity();
      return;
    }

    startTransition(async () => {
      const result = await verifySignUpOtpAction({
        email: signUpEmail,
        otpCode,
      });

      if (!result.success) {
        if (typeof result.remainingAttempts === "number") {
          setRemainingAttempts(result.remainingAttempts);
        }
        if (result.lockedOrExpired) {
          setOtpLockedOrExpired(true);
        }
        setFeedback({
          type: "error",
          message: result.error ?? "Kode OTP salah atau tidak valid.",
        });
        return;
      }

      setFeedback({
        type: "success",
        message:
          "Kode OTP BENAR! Verifikasi berhasil, akun Anda telah aktif...",
      });
      router.refresh();
    });
  };

  const handleDemoLogin = () => {
    stopWebOtpListener();
    setFeedback(null);
    startTransition(async () => {
      const result = await signInDemoAction();
      if (!result.success) {
        setFeedback({
          type: "error",
          message: result.error ?? "Gagal memuat akun demo.",
        });
        return;
      }
      router.refresh();
    });
  };

  return (
    <div className="mx-auto flex min-h-[88vh] max-w-5xl flex-col justify-center px-4 py-8 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-12">
        {/* Form Card First on Mobile so Virtual Keyboard Doesn't Obstruct Primary Action */}
        <div className="order-1 lg:order-2 lg:col-span-6">
          <div className="rounded-3xl border border-zinc-200/90 bg-white p-6 shadow-xl shadow-zinc-900/5 dark:border-zinc-800/90 dark:bg-zinc-900/95 sm:p-8">
            {/* Brand Header */}
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-sm shadow-emerald-600/25 dark:bg-emerald-500 dark:text-zinc-950">
                  <CreditCard className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <h1 className="text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                    {mode === "signin"
                      ? "Masuk ke Akun"
                      : signUpStep === "details"
                      ? "Buat Akun Baru"
                      : "Verifikasi Kode OTP Gmail"}
                  </h1>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {mode === "signin"
                      ? "Lanjutkan mencatat pengeluaran pribadi Anda"
                      : signUpStep === "details"
                      ? "Dilengkapi proteksi OTP 2-langkah via Gmail"
                      : "Cocokkan 6 digit kode keamanan untuk mengaktifkan akun"}
                  </p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                OTP 2FA
              </span>
            </div>

            {/* Mode Switcher Tabs */}
            <div
              role="group"
              aria-label="Pilih metode autentikasi"
              className="mb-6 grid grid-cols-2 gap-1.5 rounded-2xl bg-zinc-100 p-1.5 dark:bg-zinc-950"
            >
              <button
                type="button"
                aria-pressed={mode === "signin"}
                onClick={() => switchMode("signin")}
                className={`inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition ${
                  mode === "signin"
                    ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-100"
                    : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
                }`}
              >
                <LogIn className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Masuk Akun</span>
              </button>
              <button
                type="button"
                aria-pressed={mode === "signup"}
                onClick={() => switchMode("signup")}
                className={`inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition ${
                  mode === "signup"
                    ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-100"
                    : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
                }`}
              >
                <UserPlus className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Daftar Akun (OTP)</span>
              </button>
            </div>

            {/* Multi-Step Progress Tracker when in Sign-Up Mode */}
            {mode === "signup" && (
              <nav aria-label="Tahapan Pendaftaran Akun" className="mb-5">
                <ol className="grid grid-cols-2 gap-2 text-xs font-medium">
                  <li
                    aria-current={signUpStep === "details" ? "step" : undefined}
                    className={`flex items-center gap-2 rounded-xl border px-3 py-2 ${
                      signUpStep === "details"
                        ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                        : "border-zinc-200/80 bg-zinc-50 text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950/60 dark:text-zinc-400"
                    }`}
                  >
                    <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-[11px] font-bold text-white dark:bg-emerald-500 dark:text-zinc-950">
                      1
                    </span>
                    <span className="truncate">Data & Buat OTP</span>
                  </li>
                  <li
                    aria-current={signUpStep === "otp" ? "step" : undefined}
                    className={`flex items-center gap-2 rounded-xl border px-3 py-2 ${
                      signUpStep === "otp"
                        ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                        : "border-zinc-200/80 bg-zinc-50 text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950/60 dark:text-zinc-400"
                    }`}
                  >
                    <span
                      className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                        signUpStep === "otp"
                          ? "bg-emerald-600 text-white dark:bg-emerald-500 dark:text-zinc-950"
                          : "bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                      }`}
                    >
                      2
                    </span>
                    <span className="truncate">Verifikasi OTP Gmail</span>
                  </li>
                </ol>
              </nav>
            )}

            {/* Dedicated Sign-In Form */}
            {mode === "signin" ? (
              <form
                ref={signInFormRef}
                action="/#signin"
                method="POST"
                onSubmit={handleSignInSubmit}
                className="space-y-4"
              >
                <fieldset className="space-y-4" disabled={isPending}>
                  <legend className="visually-hidden">
                    Formulir Masuk Akun
                  </legend>

                  <div className="field-group">
                    <label
                      htmlFor="signin-email"
                      className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300"
                    >
                      <Mail
                        className="h-3.5 w-3.5 text-zinc-400"
                        aria-hidden="true"
                      />
                      <span>
                        Alamat Email <span className="text-rose-500">*</span>
                      </span>
                    </label>
                    <input
                      id="signin-email"
                      name="email"
                      type="email"
                      autoComplete="username"
                      spellCheck={false}
                      required
                      enterKeyHint="next"
                      placeholder="nama@gmail.com"
                      value={signInEmail}
                      onChange={(e) => {
                        setSignInEmail(e.target.value);
                        if (feedback?.type === "error") setFeedback(null);
                      }}
                      aria-describedby="signin-email-error"
                      className="min-h-[48px] w-full rounded-xl border border-zinc-200 bg-zinc-50/70 px-3.5 py-2.5 text-base text-zinc-900 placeholder:text-zinc-400 transition focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-800 dark:bg-zinc-950/60 dark:text-zinc-100 dark:placeholder:text-zinc-600 dark:focus:border-emerald-400 dark:focus:bg-zinc-950"
                    />
                    <div
                      id="signin-email-error"
                      className="field-error-msg mt-1.5 items-center gap-1.5 text-xs font-medium text-rose-600 dark:text-rose-400"
                    >
                      <AlertCircle
                        className="h-3.5 w-3.5 shrink-0"
                        aria-hidden="true"
                      />
                      <span>Masukkan alamat email yang valid.</span>
                    </div>
                  </div>

                  <div className="field-group">
                    <label
                      htmlFor="current-password"
                      className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300"
                    >
                      <Lock
                        className="h-3.5 w-3.5 text-zinc-400"
                        aria-hidden="true"
                      />
                      <span>
                        Kata Sandi <span className="text-rose-500">*</span>
                      </span>
                    </label>
                    <div className="relative">
                      <input
                        id="current-password"
                        name="password"
                        type={showSignInPassword ? "text" : "password"}
                        autoComplete="current-password"
                        required
                        enterKeyHint="done"
                        placeholder="Masukkan kata sandi Anda"
                        value={signInPassword}
                        onChange={(e) => {
                          setSignInPassword(e.target.value);
                          if (feedback?.type === "error") setFeedback(null);
                        }}
                        aria-describedby="signin-password-error"
                        className="min-h-[48px] w-full rounded-xl border border-zinc-200 bg-zinc-50/70 py-2.5 pl-3.5 pr-12 text-base text-zinc-900 placeholder:text-zinc-400 transition focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-800 dark:bg-zinc-950/60 dark:text-zinc-100 dark:placeholder:text-zinc-600 dark:focus:border-emerald-400 dark:focus:bg-zinc-950"
                      />
                      <button
                        type="button"
                        onClick={() => setShowSignInPassword((prev) => !prev)}
                        aria-pressed={showSignInPassword}
                        aria-label={
                          showSignInPassword
                            ? "Sembunyikan kata sandi"
                            : "Tampilkan kata sandi"
                        }
                        aria-describedby="signin-toggle-warning"
                        className="absolute inset-y-0 right-0 flex min-w-[44px] items-center justify-center px-3 text-zinc-400 transition hover:text-zinc-700 dark:hover:text-zinc-200"
                      >
                        {showSignInPassword ? (
                          <EyeOff className="h-4 w-4" aria-hidden="true" />
                        ) : (
                          <Eye className="h-4 w-4" aria-hidden="true" />
                        )}
                      </button>
                      <span
                        id="signin-toggle-warning"
                        className="visually-hidden"
                      >
                        Peringatan: tombol ini akan menampilkan kata sandi Anda
                        di layar.
                      </span>
                    </div>
                    <div
                      id="signin-password-error"
                      className="field-error-msg mt-1.5 items-center gap-1.5 text-xs font-medium text-rose-600 dark:text-rose-400"
                    >
                      <AlertCircle
                        className="h-3.5 w-3.5 shrink-0"
                        aria-hidden="true"
                      />
                      <span>Kata sandi wajib diisi.</span>
                    </div>
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

                  <button
                    type="submit"
                    disabled={isPending}
                    className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-emerald-600/20 transition hover:bg-emerald-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-emerald-500 dark:text-zinc-950 dark:hover:bg-emerald-400"
                  >
                    {isPending ? (
                      <>
                        <Loader2
                          className="h-4 w-4 animate-spin"
                          aria-hidden="true"
                        />
                        <span>Memproses...</span>
                      </>
                    ) : (
                      <>
                        <LogIn className="h-4 w-4" aria-hidden="true" />
                        <span>Masuk ke Akun</span>
                      </>
                    )}
                  </button>
                </fieldset>
              </form>
            ) : signUpStep === "details" ? (
              /* Dedicated Sign-Up Step 1: Account Details & Request OTP */
              <form
                ref={signUpFormRef}
                action="/#signup-request-otp"
                method="POST"
                onSubmit={handleRequestOtpSubmit}
                className="space-y-4"
              >
                <fieldset className="space-y-4" disabled={isPending}>
                  <legend className="visually-hidden">
                    Langkah 1: Isi Data Akun dan Buat Kode OTP Gmail
                  </legend>

                  <div className="field-group">
                    <label
                      htmlFor="signup-name"
                      className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300"
                    >
                      <User
                        className="h-3.5 w-3.5 text-zinc-400"
                        aria-hidden="true"
                      />
                      <span>
                        Nama Lengkap <span className="text-rose-500">*</span>
                      </span>
                    </label>
                    <input
                      id="signup-name"
                      name="name"
                      type="text"
                      autoComplete="name"
                      required
                      minLength={2}
                      maxLength={100}
                      enterKeyHint="next"
                      placeholder="Contoh: Budi Santoso"
                      value={signUpName}
                      onChange={(e) => {
                        setSignUpName(e.target.value);
                        if (feedback?.type === "error") setFeedback(null);
                      }}
                      aria-describedby="signup-name-error"
                      className="min-h-[48px] w-full rounded-xl border border-zinc-200 bg-zinc-50/70 px-3.5 py-2.5 text-base text-zinc-900 placeholder:text-zinc-400 transition focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-800 dark:bg-zinc-950/60 dark:text-zinc-100 dark:placeholder:text-zinc-600 dark:focus:border-emerald-400 dark:focus:bg-zinc-950"
                    />
                    <div
                      id="signup-name-error"
                      className="field-error-msg mt-1.5 items-center gap-1.5 text-xs font-medium text-rose-600 dark:text-rose-400"
                    >
                      <AlertCircle
                        className="h-3.5 w-3.5 shrink-0"
                        aria-hidden="true"
                      />
                      <span>Nama lengkap wajib diisi (minimal 2 karakter).</span>
                    </div>
                  </div>

                  <div className="field-group">
                    <label
                      htmlFor="signup-email"
                      className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300"
                    >
                      <Mail
                        className="h-3.5 w-3.5 text-zinc-400"
                        aria-hidden="true"
                      />
                      <span>
                        Alamat Gmail Tujuan OTP{" "}
                        <span className="text-rose-500">*</span>
                      </span>
                    </label>
                    <input
                      id="signup-email"
                      name="email"
                      type="email"
                      autoComplete="username"
                      spellCheck={false}
                      required
                      enterKeyHint="next"
                      placeholder="nama@gmail.com"
                      value={signUpEmail}
                      onChange={(e) => {
                        setSignUpEmail(e.target.value);
                        if (feedback?.type === "error") setFeedback(null);
                      }}
                      aria-describedby="signup-email-error"
                      className="min-h-[48px] w-full rounded-xl border border-zinc-200 bg-zinc-50/70 px-3.5 py-2.5 text-base text-zinc-900 placeholder:text-zinc-400 transition focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-800 dark:bg-zinc-950/60 dark:text-zinc-100 dark:placeholder:text-zinc-600 dark:focus:border-emerald-400 dark:focus:bg-zinc-950"
                    />
                    <div
                      id="signup-email-error"
                      className="field-error-msg mt-1.5 items-center gap-1.5 text-xs font-medium text-rose-600 dark:text-rose-400"
                    >
                      <AlertCircle
                        className="h-3.5 w-3.5 shrink-0"
                        aria-hidden="true"
                      />
                      <span>Masukkan alamat email yang valid untuk menerima OTP.</span>
                    </div>
                  </div>

                  <div className="field-group">
                    <label
                      htmlFor="new-password"
                      className="mb-1.5 flex items-center justify-between text-xs font-medium text-zinc-700 dark:text-zinc-300"
                    >
                      <span className="flex items-center gap-1.5">
                        <Lock
                          className="h-3.5 w-3.5 text-zinc-400"
                          aria-hidden="true"
                        />
                        <span>
                          Kata Sandi Baru{" "}
                          <span className="text-rose-500">*</span>
                        </span>
                      </span>
                      <span
                        id="signup-password-constraints"
                        className="text-[11px] font-normal text-zinc-400 dark:text-zinc-500"
                      >
                        Minimal 8 karakter
                      </span>
                    </label>
                    <div className="relative">
                      <input
                        id="new-password"
                        name="new-password"
                        type={showSignUpPassword ? "text" : "password"}
                        autoComplete="new-password"
                        minLength={8}
                        required
                        enterKeyHint="next"
                        placeholder="Minimal 8 karakter"
                        value={signUpPassword}
                        onChange={(e) => {
                          setSignUpPassword(e.target.value);
                          if (feedback?.type === "error") setFeedback(null);
                        }}
                        aria-describedby="signup-password-constraints signup-password-error"
                        className="min-h-[48px] w-full rounded-xl border border-zinc-200 bg-zinc-50/70 py-2.5 pl-3.5 pr-12 text-base text-zinc-900 placeholder:text-zinc-400 transition focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-800 dark:bg-zinc-950/60 dark:text-zinc-100 dark:placeholder:text-zinc-600 dark:focus:border-emerald-400 dark:focus:bg-zinc-950"
                      />
                      <button
                        type="button"
                        onClick={() => setShowSignUpPassword((prev) => !prev)}
                        aria-pressed={showSignUpPassword}
                        aria-label={
                          showSignUpPassword
                            ? "Sembunyikan kata sandi"
                            : "Tampilkan kata sandi"
                        }
                        aria-describedby="signup-toggle-warning"
                        className="absolute inset-y-0 right-0 flex min-w-[44px] items-center justify-center px-3 text-zinc-400 transition hover:text-zinc-700 dark:hover:text-zinc-200"
                      >
                        {showSignUpPassword ? (
                          <EyeOff className="h-4 w-4" aria-hidden="true" />
                        ) : (
                          <Eye className="h-4 w-4" aria-hidden="true" />
                        )}
                      </button>
                      <span
                        id="signup-toggle-warning"
                        className="visually-hidden"
                      >
                        Peringatan: tombol ini akan menampilkan kata sandi Anda
                        di layar.
                      </span>
                    </div>
                    <div
                      id="signup-password-error"
                      className="field-error-msg mt-1.5 items-center gap-1.5 text-xs font-medium text-rose-600 dark:text-rose-400"
                    >
                      <AlertCircle
                        className="h-3.5 w-3.5 shrink-0"
                        aria-hidden="true"
                      />
                      <span>Kata sandi wajib minimal 8 karakter.</span>
                    </div>
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

                  <button
                    type="submit"
                    disabled={isPending}
                    enterKeyHint="next"
                    className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-emerald-600/20 transition hover:bg-emerald-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-emerald-500 dark:text-zinc-950 dark:hover:bg-emerald-400"
                  >
                    {isPending ? (
                      <>
                        <Loader2
                          className="h-4 w-4 animate-spin"
                          aria-hidden="true"
                        />
                        <span>Membuat & Mengirim Kode OTP...</span>
                      </>
                    ) : (
                      <>
                        <Mail className="h-4 w-4" aria-hidden="true" />
                        <span>Buat & Kirim Kode OTP via Gmail</span>
                      </>
                    )}
                  </button>
                </fieldset>
              </form>
            ) : (
              /* Dedicated Sign-Up Step 2: OTP Verification Form */
              <div className="space-y-4">
                {/* Automatic Gmail Delivery / Simulated Gmail Inbox Card */}
                {deliveredVia === "gmail-simulation" && simulatedOtp && (
                  <div
                    role="region"
                    aria-label="Notifikasi Kotak Masuk Gmail Otomatis"
                    className="rounded-2xl border border-emerald-500/30 bg-emerald-50/70 p-4 dark:border-emerald-500/30 dark:bg-emerald-950/30"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-600 text-white dark:bg-emerald-500 dark:text-zinc-950">
                          <Mail className="h-3.5 w-3.5" aria-hidden="true" />
                        </span>
                        <div>
                          <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                            Pesan Gmail Otomatis Masuk
                          </p>
                          <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                            Ke: <span className="font-medium">{signUpEmail}</span>
                          </p>
                        </div>
                      </div>
                      <span className="rounded-md bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">
                        Baru saja
                      </span>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-500/20 bg-white px-3.5 py-2.5 dark:bg-zinc-900">
                      <div>
                        <span className="block text-[10px] uppercase tracking-wider text-zinc-400">
                          Kode OTP Anda
                        </span>
                        <span className="font-mono text-xl font-extrabold tracking-[0.25em] text-emerald-700 dark:text-emerald-400">
                          {simulatedOtp}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setOtpCode(simulatedOtp);
                            setFeedback(null);
                          }}
                          className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-[11px] font-semibold text-white transition hover:bg-emerald-500 dark:bg-emerald-500 dark:text-zinc-950"
                        >
                          <Copy className="h-3 w-3" aria-hidden="true" />
                          <span>Isi OTP Benar</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const wrongCode =
                              simulatedOtp === "999999" ? "111111" : "999999";
                            setOtpCode(wrongCode);
                            setFeedback(null);
                          }}
                          className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-[11px] font-semibold text-rose-700 transition hover:bg-rose-100 dark:border-rose-900/60 dark:bg-rose-950/60 dark:text-rose-300"
                        >
                          <ShieldAlert className="h-3 w-3" aria-hidden="true" />
                          <span>Uji OTP Salah</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Security Metrics Bar: Expiration Countdown & Remaining Attempts */}
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-zinc-200/80 bg-zinc-50/80 px-3.5 py-2 text-xs dark:border-zinc-800 dark:bg-zinc-950/60">
                  <span className="inline-flex items-center gap-1.5 font-medium text-zinc-600 dark:text-zinc-300">
                    <Timer
                      className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400"
                      aria-hidden="true"
                    />
                    <span>Berlaku:</span>
                    <strong className="font-mono font-semibold text-zinc-900 dark:text-zinc-100">
                      {formatCountdown(secondsLeft)}
                    </strong>
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 font-medium ${
                      remainingAttempts <= 2
                        ? "text-rose-600 dark:text-rose-400"
                        : "text-zinc-600 dark:text-zinc-300"
                    }`}
                  >
                    <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Sisa percobaan: {remainingAttempts}/5</span>
                  </span>
                </div>

                {/* Single-Input Semantic OTP Verification Form */}
                <form
                  ref={otpFormRef}
                  id="otp-form"
                  action="/#verify-otp"
                  method="POST"
                  onSubmit={handleVerifyOtpSubmit}
                  className="space-y-4"
                >
                  <fieldset className="space-y-4" disabled={isPending}>
                    <legend className="visually-hidden">
                      Langkah 2: Verifikasi Kode OTP 6 Digit
                    </legend>

                    <div className="field-group">
                      <label
                        htmlFor="otp-input"
                        className="mb-1 block text-xs font-semibold text-zinc-800 dark:text-zinc-200"
                      >
                        Kode Verifikasi OTP (6 Digit){" "}
                        <span className="text-rose-500">*</span>
                      </label>
                      {/* Hint placed ABOVE the input so autofill popovers & mobile keyboards never obscure it */}
                      <p
                        id="otp-format-hint"
                        className="mb-2 text-xs text-zinc-500 dark:text-zinc-400"
                      >
                        Masukkan 6 digit angka kode OTP yang dikirim ke{" "}
                        <strong className="font-medium text-zinc-700 dark:text-zinc-200">
                          {signUpEmail}
                        </strong>
                        .
                      </p>

                      <input
                        ref={otpInputRef}
                        type="text"
                        id="otp-input"
                        name="otp"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        autoCorrect="off"
                        autoCapitalize="off"
                        spellCheck={false}
                        pattern="\d{6}"
                        maxLength={6}
                        required
                        enterKeyHint="done"
                        placeholder="000000"
                        value={otpCode}
                        onChange={(e) => {
                          const digitsOnly = e.target.value
                            .replace(/\D/g, "")
                            .slice(0, 6);
                          setOtpCode(digitsOnly);
                          if (feedback?.type === "error") setFeedback(null);
                        }}
                        aria-describedby="otp-format-hint otp-error"
                        className="min-h-[52px] w-full rounded-xl border border-zinc-300 bg-zinc-50/80 px-4 py-2.5 text-center font-mono text-2xl font-bold tracking-[0.35em] text-zinc-900 placeholder:tracking-[0.35em] placeholder:text-zinc-300 transition focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-700 dark:bg-zinc-950/80 dark:text-zinc-100 dark:placeholder:text-zinc-700 dark:focus:border-emerald-400"
                      />

                      <div
                        id="otp-error"
                        className="field-error-msg mt-1.5 items-center gap-1.5 text-xs font-medium text-rose-600 dark:text-rose-400"
                      >
                        <AlertCircle
                          className="h-3.5 w-3.5 shrink-0"
                          aria-hidden="true"
                        />
                        <span>Masukkan tepat 6 digit angka kode OTP.</span>
                      </div>
                    </div>

                    {/* Live ARIA Status Banner for Match / Mismatch Feedback */}
                    <div aria-live="polite" className="min-h-[4px]">
                      {feedback && (
                        <div
                          className={`flex items-start gap-2 rounded-xl border px-3.5 py-2.5 text-xs font-medium ${
                            feedback.type === "error"
                              ? "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/50 dark:text-rose-300"
                              : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/50 dark:text-emerald-300"
                          }`}
                        >
                          {feedback.type === "error" ? (
                            <AlertCircle
                              className="mt-0.5 h-4 w-4 shrink-0"
                              aria-hidden="true"
                            />
                          ) : (
                            <CheckCircle2
                              className="mt-0.5 h-4 w-4 shrink-0"
                              aria-hidden="true"
                            />
                          )}
                          <span>{feedback.message}</span>
                        </div>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={isPending || otpLockedOrExpired}
                      className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-emerald-600/20 transition hover:bg-emerald-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-emerald-500 dark:text-zinc-950 dark:hover:bg-emerald-400"
                    >
                      {isPending ? (
                        <>
                          <Loader2
                            className="h-4 w-4 animate-spin"
                            aria-hidden="true"
                          />
                          <span>Mencocokkan Kode OTP...</span>
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                          <span>Verifikasi Kode OTP & Buat Akun</span>
                        </>
                      )}
                    </button>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          stopWebOtpListener();
                          setSignUpStep("details");
                          setFeedback(null);
                        }}
                        className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                      >
                        <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Ubah Data / Email</span>
                      </button>

                      <button
                        type="button"
                        disabled={isPending}
                        onClick={handleResendOtp}
                        className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/50"
                      >
                        <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Kirim Ulang Kode OTP Baru</span>
                      </button>
                    </div>
                  </fieldset>
                </form>
              </div>
            )}

            {/* Secondary Option Below Form (Demo Account) */}
            <div className="mt-6 border-t border-zinc-200/80 pt-5 dark:border-zinc-800">
              <button
                type="button"
                disabled={isPending}
                onClick={handleDemoLogin}
                className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50/80 px-4 py-2 text-xs font-semibold text-zinc-700 transition hover:border-emerald-500/40 hover:bg-emerald-50/60 hover:text-emerald-700 disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-950/60 dark:text-zinc-300 dark:hover:border-emerald-500/40 dark:hover:bg-emerald-950/40 dark:hover:text-emerald-300"
              >
                <KeyRound
                  className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400"
                  aria-hidden="true"
                />
                <span>Masuk Instan dengan Akun Demo</span>
                <ArrowRight
                  className="h-3.5 w-3.5 opacity-70"
                  aria-hidden="true"
                />
              </button>
            </div>
          </div>
        </div>

        {/* Left Info Column */}
        <div className="order-2 space-y-6 lg:order-1 lg:col-span-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3.5 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Proteksi Keamanan Siber — Verifikasi OTP 2-Langkah</span>
          </div>

          <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-4xl">
            Pendaftaran akun aman dengan{" "}
            <span className="text-emerald-600 dark:text-emerald-400">
              verifikasi kode OTP Gmail.
            </span>
          </h2>

          <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400 sm:text-base">
            Untuk meminimalisir serangan siber seperti pendaftaran bot otomatis
            dan pencurian identitas, setiap pendaftaran akun baru wajib
            mencocokkan 6 digit kode One-Time Passcode (OTP) yang dikirim ke
            Gmail.
          </p>

          <dl className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            <div className="rounded-2xl border border-zinc-200/80 bg-white/80 p-4 dark:border-zinc-800/80 dark:bg-zinc-900/60">
              <dt className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                Anti Brute-Force (Maks 5x)
              </dt>
              <dd className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                Kode OTP disimpan terenkripsi (`scrypt` + `timingSafeEqual`)
                dan otomatis diblokir jika salah 5 kali berturut-turut.
              </dd>
            </div>
            <div className="rounded-2xl border border-zinc-200/80 bg-white/80 p-4 dark:border-zinc-800/80 dark:bg-zinc-900/60">
              <dt className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                Kedaluwarsa Otomatis 5 Menit
              </dt>
              <dd className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                Setiap kode OTP hanya berlaku selama 5 menit dan langsung hangus
                setelah berhasil digunakan.
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
}
