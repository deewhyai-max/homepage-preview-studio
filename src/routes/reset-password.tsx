import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowRight, KeyRound } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Set a new password — Deewhy HQ Preview Studio" },
      {
        name: "description",
        content: "Set a new password for your Deewhy HQ Preview Studio account.",
      },
      { property: "og:title", content: "Set a new password — Deewhy HQ Preview Studio" },
      { property: "og:description", content: "Securely reset your Deewhy HQ Preview Studio account password." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState<boolean | null>(null);

  // Supabase picks the recovery session up from the URL hash automatically.
  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => setReady(Boolean(data.user)));
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success("Password updated — you're signed in.");
      navigate({ to: "/studio", replace: true });
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
            <KeyRound className="size-5 text-primary" />
          </div>
          <h1 className="mt-4 font-display text-3xl font-bold tracking-tight">Set a new password</h1>
        </div>

        <div className="rounded-2xl border bg-card p-6 shadow-glow/50 sm:p-8">
          {ready === null ? (
            <p className="text-center font-mono text-xs uppercase tracking-wider text-muted-foreground">
              Checking link…
            </p>
          ) : !ready ? (
            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                This reset link isn't valid or has expired. Request a fresh one from the sign-in page.
              </p>
              <Button className="mt-5" onClick={() => navigate({ to: "/auth" })}>
                Back to sign in
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="grid gap-4">
              <div className="grid gap-1.5">
                <Label htmlFor="new-password">New password</Label>
                <Input
                  id="new-password"
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="new-password"
                />
              </div>
              <Button type="submit" size="lg" className="h-11 shadow-glow" disabled={busy}>
                Update password <ArrowRight className="size-4" />
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
