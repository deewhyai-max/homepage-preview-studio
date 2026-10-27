import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowRight, CheckCircle2, Link2 } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { lovable } from "@/integrations/lovable/index";
import { supabase } from "@/integrations/supabase/client";
import { sanitizeRedirect, useSessionUser } from "@/lib/session";

import "@lovable.dev/cloud-auth-js/styles.css";

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>): { redirect?: string } => ({
    redirect: typeof search["redirect"] === "string" ? search["redirect"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Sign in — Deewhy HQ Preview Studio" },
      {
        name: "description",
        content: "Sign in to Deewhy HQ Preview Studio to record homepages as scroll-through videos.",
      },
      { property: "og:title", content: "Sign in — Deewhy HQ Preview Studio" },
      {
        property: "og:description",
        content: "Sign in to record homepages as scroll-through videos.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

type Mode = "signin" | "signup" | "forgot";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1A6.6 6.6 0 0 1 5.49 12c0-.73.13-1.44.35-2.1V7.06H2.18A11 11 0 0 0 1 12c0 1.78.43 3.45 1.18 4.94l3.66-2.84z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15A11 11 0 0 0 12 1 11 11 0 0 0 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </svg>
  );
}

function AuthPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const user = useSessionUser();

  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmSent, setConfirmSent] = useState(false);

  const target = sanitizeRedirect(search.redirect);

  // Already signed in — send them on their way.
  useEffect(() => {
    if (user) navigate({ to: target, replace: true });
  }, [user, target, navigate]);

  const handleEmailSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          toast.error(error.message);
          return;
        }
        navigate({ to: target, replace: true });
        return;
      }

      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { display_name: displayName.trim() },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) {
          toast.error(error.message);
          return;
        }
        if (data.session) {
          navigate({ to: target, replace: true });
          return;
        }
        setConfirmSent(true);
        return;
      }

      // forgot
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success("Reset link sent — check your email.");
      setMode("signin");
    } finally {
      setBusy(false);
    }
  };

  const handleOAuth = async (provider: "google" | "lovable") => {
    setBusy(true);
    try {
      const result = await lovable.auth.signInWithOAuth(provider, {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        toast.error("Couldn't start sign-in. Please try again.");
        return;
      }
      if (result.redirected) return; // browser is navigating away
      // Popup flow: session already set.
      navigate({ to: target, replace: true });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-12">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-[-15%] h-[50vh] w-[80vw] -translate-x-1/2 rounded-full bg-primary/20 blur-[110px]" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto flex size-11 items-center justify-center rounded-xl bg-foreground">
            <span className="size-3 rounded-full bg-primary" />
          </div>
          <h1 className="mt-4 font-display text-3xl font-bold tracking-tight">
            {mode === "forgot" ? "Reset your password" : mode === "signup" ? "Create your account" : "Welcome back"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {mode === "forgot"
              ? "We'll email you a link to set a new password."
              : "Deewhy HQ Preview Studio — homepage recordings, made in the cloud."}
          </p>
        </div>

        <div className="rounded-2xl border bg-card p-6 shadow-glow/50 sm:p-8">
          {confirmSent ? (
            <div className="text-center">
              <CheckCircle2 className="mx-auto size-10 text-success" />
              <h2 className="mt-3 font-display text-lg font-semibold">Check your email</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                We sent a confirmation link to <span className="font-mono text-foreground">{email}</span>.
                Click it to activate your account, then sign in here.
              </p>
              <Button variant="ghost" className="mt-5" onClick={() => setMode("signin")}>
                Back to sign in
              </Button>
            </div>
          ) : (
            <>
              {mode !== "forgot" && (
                <div className="mb-6 grid grid-cols-2 gap-1 rounded-xl border p-1">
                  {(["signin", "signup"] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMode(m)}
                      aria-pressed={mode === m}
                      className={`rounded-lg px-3 py-2 font-mono text-[11px] uppercase tracking-wider transition-all duration-200 active:scale-[0.97] ${
                        mode === m
                          ? "bg-primary text-primary-foreground shadow-glow"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {m === "signin" ? "Sign in" : "Create account"}
                    </button>
                  ))}
                </div>
              )}

              <form onSubmit={handleEmailSubmit} className="grid gap-4">
                {mode === "signup" && (
                  <div className="grid gap-1.5">
                    <Label htmlFor="display-name">Display name</Label>
                    <Input
                      id="display-name"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Your name"
                      maxLength={40}
                      autoComplete="name"
                    />
                  </div>
                )}
                <div className="grid gap-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    autoComplete="email"
                  />
                </div>
                {mode !== "forgot" && (
                  <div className="grid gap-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password">Password</Label>
                      {mode === "signin" && (
                        <button
                          type="button"
                          onClick={() => setMode("forgot")}
                          className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
                        >
                          Forgot?
                        </button>
                      )}
                    </div>
                    <Input
                      id="password"
                      type="password"
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      autoComplete={mode === "signin" ? "current-password" : "new-password"}
                    />
                  </div>
                )}
                <Button type="submit" size="lg" className="h-11 shadow-glow" disabled={busy}>
                  {mode === "signin" ? "Sign in" : mode === "signup" ? "Create account" : "Send reset link"}
                  <ArrowRight className="size-4" />
                </Button>
              </form>

              {mode !== "forgot" && (
                <>
                  <div className="my-5 flex items-center gap-3">
                    <span className="h-px flex-1 bg-border" />
                    <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                      or
                    </span>
                    <span className="h-px flex-1 bg-border" />
                  </div>

                  <div className="grid gap-2.5">
                    <Button
                      type="button"
                      variant="outline"
                      className="h-11 bg-background"
                      onClick={() => void handleOAuth("google")}
                      disabled={busy}
                    >
                      <GoogleIcon /> Continue with Google
                    </Button>
                    <button
                      type="button"
                      className="lovable-auth-button"
                      onClick={() => void handleOAuth("lovable")}
                      disabled={busy}
                    >
                      Continue with Lovable
                    </button>
                  </div>

                  <p className="mt-5 flex items-center justify-center gap-1.5 text-center font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                    <Link2 className="size-3" /> Public sites only · homepage recordings
                  </p>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
