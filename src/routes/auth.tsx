import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import {
  sendLoginOtp,
  sendSignupOtp,
  verifyLoginOtp,
  verifySignupOtp,
} from "@/lib/auth.functions";
import { safeRedirectPath, redirectNavigateTarget } from "@/lib/auth-redirect";

type AuthSearch = { redirect?: string; mode?: "signin" | "signup" };

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>): AuthSearch => ({
    redirect: typeof search["redirect"] === "string" ? search["redirect"] : undefined,
    mode:
      search["mode"] === "signup" || search["mode"] === "signin"
        ? (search["mode"] as "signin" | "signup")
        : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Sign In or Create Account — MakeMyThing.in" },
      {
        name: "description",
        content: "Sign in with your email and a one-time code. Secure, passwordless login.",
      },
      { property: "og:title", content: "Sign In — MakeMyThing.in" },
      { property: "og:description", content: "Access your MakeMyThing.in account." },
    ],
  }),
  component: AuthPage,
});

type Mode = "signin" | "signup";
type Step = "details" | "otp";

const OTP_TTL_SECONDS = 300;

function AuthPage() {
  const { user, setToken } = useAuth();
  const navigate = useNavigate();
  const { redirect, mode: initialMode } = Route.useSearch();
  const returnTarget = redirectNavigateTarget(redirect, "/orders");
  const returnPath = safeRedirectPath(redirect, "/orders");
  const [mode, setMode] = useState<Mode>(initialMode === "signup" ? "signup" : "signin");
  const [step, setStep] = useState<Step>("details");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [otp, setOtp] = useState("");
  const [busy, setBusy] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);

  useEffect(() => {
    if (initialMode === "signup") setMode("signup");
    else if (initialMode === "signin") setMode("signin");
  }, [initialMode]);

  useEffect(() => {
    if (user) navigate(returnTarget);
  }, [user, navigate, returnTarget]);

  useEffect(() => {
    if (step !== "otp" || secondsLeft <= 0) return;
    const timer = window.setInterval(() => {
      setSecondsLeft((s) => Math.max(0, s - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [step, secondsLeft]);

  function applySession(tokens: { access_token: string }) {
    setToken(tokens.access_token);
  }

  async function handleSendOtp() {
    setBusy(true);
    try {
      const email = form.email.trim();
      if (mode === "signin") {
        const result = await sendLoginOtp({ data: { email } });
        if (result.devOtp) toast.message(`Dev OTP: ${result.devOtp}`, { duration: 10000 });
        toast.success("Sign-in code sent to your email");
      } else {
        if (!form.name.trim() || form.password.length < 6) {
          toast.error("Enter your name and a password (min 6 characters)");
          return;
        }
        const result = await sendSignupOtp({ data: { email, name: form.name.trim() } });
        if (result.devOtp) toast.message(`Dev OTP: ${result.devOtp}`, { duration: 10000 });
        toast.success("Verification code sent to your email");
      }
      setOtp("");
      setSecondsLeft(OTP_TTL_SECONDS);
      setStep("otp");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not send code");
    } finally {
      setBusy(false);
    }
  }

  async function handleVerifyOtp(event: React.FormEvent) {
    event.preventDefault();
    if (otp.length !== 6) {
      toast.error("Enter the 6-digit code from your email");
      return;
    }
    if (secondsLeft <= 0) {
      toast.error("Code expired. Please request a new one.");
      return;
    }

    setBusy(true);
    try {
      const email = form.email.trim();
      if (mode === "signin") {
        const tokens = await verifyLoginOtp({ data: { email, otp } });
        applySession(tokens);
        toast.success("Welcome back!");
      } else {
        const tokens = await verifySignupOtp({
          data: {
            email,
            otp,
            name: form.name.trim(),
            password: form.password,
          },
        });
        applySession(tokens);
        toast.success("Account created — welcome to MakeMyThing!");
      }
      navigate(returnTarget);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Verification failed");
    } finally {
      setBusy(false);
    }
  }

  function switchMode(next: Mode) {
    setMode(next);
    setStep("details");
    setOtp("");
    setSecondsLeft(0);
  }

  const timerLabel = `${String(Math.floor(secondsLeft / 60)).padStart(2, "0")}:${String(secondsLeft % 60).padStart(2, "0")}`;

  return (
    <div className="mx-auto flex max-w-md flex-col px-4 py-16">
      <div className="rounded-3xl border border-border bg-gradient-surface p-7">
        <h1 className="font-display text-2xl font-extrabold">
          {mode === "signup"
            ? step === "otp"
              ? "Verify your email"
              : "Create your account"
            : step === "otp"
              ? "Enter your code"
              : "Sign in with email"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {step === "otp"
            ? `We sent a 6-digit code to ${form.email}. It expires in 5 minutes.`
            : redirect?.includes("/checkout")
              ? "Please log in or create an account to continue with your order. Your cart stays saved."
              : mode === "signup"
                ? "Enter your details, then verify your email with a one-time code."
                : "Enter your email and we'll send you a one-time sign-in code."}
        </p>

        {step === "details" ? (
          <form
            className="mt-6 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              handleSendOtp();
            }}
          >
            {mode === "signup" ? (
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Full name</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  maxLength={100}
                  required
                />
              </div>
            ) : null}

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Email</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                maxLength={160}
                required
                autoComplete="email"
              />
            </div>

            {mode === "signup" ? (
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Password</Label>
                <Input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  minLength={6}
                  required
                  autoComplete="new-password"
                />
                <p className="text-[11px] text-muted-foreground">
                  You'll verify your email with a code before your account is created.
                </p>
              </div>
            ) : null}

            <Button type="submit" className="w-full rounded-full" disabled={busy}>
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {mode === "signup" ? "Send verification code" : "Send sign-in code"}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="mt-6 space-y-5">
            <div className="flex justify-center">
              <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                <InputOTPGroup>
                  {Array.from({ length: 6 }).map((_, i) => (
                    <InputOTPSlot key={i} index={i} />
                  ))}
                </InputOTPGroup>
              </InputOTP>
            </div>

            <p className="text-center text-xs text-muted-foreground">
              {secondsLeft > 0 ? (
                <>
                  Code expires in <span className="font-semibold text-primary">{timerLabel}</span>
                </>
              ) : (
                <span className="text-destructive">Code expired — request a new one</span>
              )}
            </p>

            <Button
              type="submit"
              className="w-full rounded-full"
              disabled={busy || otp.length !== 6 || secondsLeft <= 0}
            >
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {mode === "signup" ? "Verify & create account" : "Verify & sign in"}
            </Button>

            <div className="flex flex-col gap-2">
              <Button
                type="button"
                variant="secondary"
                className="w-full rounded-full"
                disabled={busy}
                onClick={handleSendOtp}
              >
                Resend code
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full rounded-full"
                onClick={() => {
                  setStep("details");
                  setOtp("");
                }}
              >
                Change email
              </Button>
            </div>
          </form>
        )}

        <div className="mt-6 space-y-2 text-center text-xs text-muted-foreground">
          {mode === "signin" ? (
            <p>
              New here?{" "}
              <button type="button" className="text-primary" onClick={() => switchMode("signup")}>
                Create an account
              </button>
            </p>
          ) : (
            <p>
              Already have an account?{" "}
              <button type="button" className="text-primary" onClick={() => switchMode("signin")}>
                Sign in with email
              </button>
            </p>
          )}
          <p>
            <Link to="/shop" className="hover:text-primary">
              Continue shopping as a guest
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
