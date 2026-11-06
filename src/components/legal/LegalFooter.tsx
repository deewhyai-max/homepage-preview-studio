import { Link } from "@tanstack/react-router";

export function LegalFooter() {
  return (
    <footer className="border-t py-6">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 text-xs text-muted-foreground sm:px-6">
        <p>Deewhy HQ · Preview Studio</p>
        <nav aria-label="Legal" className="flex flex-wrap gap-5">
          <Link to="/terms" className="underline-offset-4 hover:text-foreground hover:underline">Terms of Service</Link>
          <Link to="/privacy" className="underline-offset-4 hover:text-foreground hover:underline">Privacy Policy</Link>
        </nav>
      </div>
    </footer>
  );
}