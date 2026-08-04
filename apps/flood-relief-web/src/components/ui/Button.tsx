import { forwardRef, type ButtonHTMLAttributes } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/utils/cn";

type Variant = "primary" | "secondary" | "outline" | "outlineInverse" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  isLoading?: boolean;
}

const variantClasses: Record<Variant, string> = {
  primary: "bg-primary-900 text-white hover:bg-primary-800 focus-visible:outline-primary-900",
  secondary: "bg-accent-600 text-white hover:bg-accent-700 focus-visible:outline-accent-600",
  outline:
    "border border-primary-200 bg-white text-primary-900 hover:bg-primary-50 focus-visible:outline-primary-900",
  outlineInverse:
    "border border-white/30 bg-transparent text-white hover:bg-white/10 focus-visible:outline-white",
  ghost: "text-primary-700 hover:bg-primary-100",
  danger: "bg-danger-600 text-white hover:bg-danger-700 focus-visible:outline-danger-600",
};

const sizeClasses: Record<Size, string> = {
  sm: "h-9 px-3 text-sm gap-1.5",
  md: "h-11 px-4 text-sm gap-2",
  lg: "h-12 px-6 text-base gap-2",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", isLoading, disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          "inline-flex cursor-pointer items-center justify-center rounded-lg font-semibold",
          "transition-[transform,background-color,box-shadow] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)]",
          "active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100",
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        {...props}
      >
        {isLoading && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
