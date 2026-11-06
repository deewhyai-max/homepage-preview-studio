import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { LegalFooter } from "./LegalFooter";

export function LegalPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-4 px-5 py-5 sm:px-8">
          <Link to="/" className="font-display text-lg font-bold">Deewhy HQ Preview Studio</Link>
          <Button asChild variant="ghost" size="sm"><Link to="/"><ArrowLeft className="size-4" /> Home</Link></Button>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-5 py-12 sm:px-8 sm:py-16">
        <p className="font-mono text-xs text-muted-foreground">Effective November 6, 2026</p>
        <h1 className="mt-3 font-display text-4xl font-bold sm:text-5xl">{title}</h1>
        <div className="mt-10 space-y-8 text-base leading-7 text-muted-foreground [&_h2]:mb-3 [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-foreground [&_p+p]:mt-3 [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-4">{children}</div>
      </main>
      <LegalFooter />
    </div>
  );
}