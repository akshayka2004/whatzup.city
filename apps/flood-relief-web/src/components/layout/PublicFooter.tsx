import { ShieldAlert } from "lucide-react";

export function PublicFooter() {
  return (
    <footer className="border-t border-border-subtle bg-primary-950 text-primary-300">
      <div className="container-page flex flex-col gap-4 py-10 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5 font-heading font-semibold text-white">
          <ShieldAlert className="size-5 text-accent-400" aria-hidden="true" />
          Kerala Flood Relief Portal
        </div>
        <p className="text-sm">
          Official information portal for flood relief coordination across Kerala. In a life-threatening emergency,
          call <a href="tel:112" className="font-semibold text-accent-300 underline-offset-2 hover:underline">112</a>.
        </p>
      </div>
    </footer>
  );
}
