import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign In or Create Account — MakeMyThings.in" },
      {
        name: "description",
        content: "Sign in to track orders, save addresses and manage your custom print requests.",
      },
      { property: "og:title", content: "Sign In — MakeMyThings.in" },
      { property: "og:description", content: "Access your MakeMyThings.in account." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup" | "reset">("signin");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user) navigate({ to: "/orders" });
  }, [user, navigate]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email: form.email.trim(),
          password: form.password,
          options: {
            emailRedirectTo: `${window.location.origin}/orders`,
            data: { full_name: form.name.trim() },
          },
        });
        if (error) throw error;
        toast.success("Account created — check your email to confirm.");
      } else if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({
          email: form.email.trim(),
          password: form.password,
        });
        if (error) throw error;
        toast.success("Welcome back!");
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(form.email.trim(), {
          redirectTo: `${window.location.origin}/auth`,
        });
        if (error) throw error;
        toast.success("Password reset link sent.");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function googleSignIn() {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error("Google sign-in failed. Please try again.");
      return;
    }
  }

  return (
    <div className="mx-auto flex max-w-md flex-col px-4 py-16">
      <div className="rounded-3xl border border-border bg-gradient-surface p-7">
        <h1 className="font-display text-2xl font-extrabold">
          {mode === "signup"
            ? "Create your account"
            : mode === "reset"
              ? "Reset your password"
              : "Welcome back"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {mode === "signup"
            ? "Save addresses, track orders and reorder in one tap."
            : mode === "reset"
              ? "We'll email you a secure reset link."
              : "Sign in to see your orders and custom requests."}
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
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
            />
          </div>
          {mode !== "reset" ? (
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Password</Label>
              <Input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                minLength={6}
                required
              />
            </div>
          ) : null}

          <Button type="submit" className="w-full rounded-full" disabled={busy}>
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {mode === "signup" ? "Create account" : mode === "reset" ? "Send reset link" : "Sign in"}
          </Button>
        </form>

        <div className="my-5 flex items-center gap-3 text-[11px] text-muted-foreground">
          <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
        </div>

        <Button variant="secondary" className="w-full rounded-full" onClick={googleSignIn}>
          Continue with Google
        </Button>

        <div className="mt-6 space-y-2 text-center text-xs text-muted-foreground">
          {mode === "signin" ? (
            <>
              <p>
                New here?{" "}
                <button className="text-primary" onClick={() => setMode("signup")}>
                  Create an account
                </button>
              </p>
              <p>
                <button className="text-primary" onClick={() => setMode("reset")}>
                  Forgot your password?
                </button>
              </p>
            </>
          ) : (
            <p>
              <button className="text-primary" onClick={() => setMode("signin")}>
                Back to sign in
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
