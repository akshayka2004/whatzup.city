import Link from 'next/link';

export function LegalFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="w-full border-t border-border bg-card/40 mt-auto">
      <div className="w-full px-6 py-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">

          {/* Brand */}
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="Whtzup.city" className="h-7 w-auto object-contain" />
            <span className="text-sm font-semibold text-foreground">whtzup.city</span>
          </div>

          {/* Links — min-h-11 keeps each tap target at the 44px minimum on
              touch devices; the negative margin keeps the visual spacing tight. */}
          <nav className="-my-2 flex flex-wrap items-center justify-center gap-x-5 text-xs text-muted-foreground">
            <Link
              href="/terms-of-service"
              className="inline-flex min-h-11 items-center hover:text-foreground transition-colors"
            >
              Terms of Service
            </Link>
            <Link
              href="/privacy-policy"
              className="inline-flex min-h-11 items-center hover:text-foreground transition-colors"
            >
              Privacy Policy
            </Link>
            <Link
              href="/report"
              className="inline-flex min-h-11 items-center hover:text-foreground transition-colors"
            >
              Report Issue
            </Link>
            <a
              href="mailto:support@lifeartgroup.in"
              className="inline-flex min-h-11 max-w-full items-center truncate hover:text-foreground transition-colors"
            >
              support@lifeartgroup.in
            </a>
          </nav>

          {/* Copyright */}
          <p className="text-xs text-muted-foreground text-center sm:text-right">
            © {year} Lifeart Business Services Pvt. Ltd.
          </p>

        </div>
      </div>
    </footer>
  );
}
