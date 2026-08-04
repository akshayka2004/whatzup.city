import { Link } from "react-router-dom";
import { Compass } from "lucide-react";

export function NotFoundPage() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4 px-6 text-center">
      <Compass className="size-14 text-primary-300" aria-hidden="true" />
      <h1 className="font-heading text-3xl font-bold text-primary-900">Page not found</h1>
      <p className="max-w-sm text-primary-500">The page you're looking for doesn't exist or may have been moved.</p>
      <Link
        to="/"
        className="rounded-lg bg-primary-900 px-5 py-2.5 text-sm font-semibold text-white transition-[transform] duration-150 active:scale-[0.97]"
      >
        Back to home
      </Link>
    </div>
  );
}
