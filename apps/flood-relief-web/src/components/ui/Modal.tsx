import { useEffect, useRef, useState, type ReactNode } from "react";
import { X } from "lucide-react";
import { createPortal } from "react-dom";
import { cn } from "@/utils/cn";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  size?: "md" | "lg" | "xl";
}

const sizeClasses = { md: "max-w-md", lg: "max-w-2xl", xl: "max-w-4xl" };

export function Modal({ open, onClose, title, description, children, size = "md" }: ModalProps) {
  const [visible, setVisible] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setVisible(false);
      const raf = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(raf);
    }
    setVisible(false);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className={cn(
          "absolute inset-0 bg-primary-950/60 transition-opacity duration-200 ease-[cubic-bezier(0.23,1,0.32,1)]",
          visible ? "opacity-100" : "opacity-0"
        )}
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className={cn(
          "relative flex max-h-[90vh] w-full flex-col rounded-2xl bg-white shadow-2xl",
          "origin-center transition-[transform,opacity] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)]",
          visible ? "scale-100 opacity-100" : "scale-95 opacity-0",
          sizeClasses[size]
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-border-subtle px-6 py-4">
          <div>
            <h2 id="modal-title" className="font-heading text-lg font-semibold text-primary-900">
              {title}
            </h2>
            {description && <p className="mt-0.5 text-sm text-primary-500">{description}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="cursor-pointer rounded-lg p-1.5 text-primary-400 transition-colors hover:bg-primary-100 hover:text-primary-700"
          >
            <X className="size-5" />
          </button>
        </div>
        <div className="overflow-y-auto px-6 py-5">{children}</div>
      </div>
    </div>,
    document.body
  );
}
