import { forwardRef, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { cn } from "@/utils/cn";

const fieldBase =
  "w-full rounded-lg border border-primary-200 bg-white px-3.5 py-2.5 text-[15px] text-primary-900 " +
  "placeholder:text-primary-400 transition-colors duration-150 " +
  "focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-500/30 " +
  "disabled:cursor-not-allowed disabled:bg-primary-50";

interface FieldWrapperProps {
  label: string;
  htmlFor: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: ReactNode;
}

export function FieldWrapper({ label, htmlFor, required, error, hint, children }: FieldWrapperProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-sm font-semibold text-primary-800">
        {label}
        {required && <span className="ml-0.5 text-danger-600">*</span>}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-primary-500">{hint}</p>}
      {error && (
        <p role="alert" className="text-xs font-medium text-danger-600">
          {error}
        </p>
      )}
    </div>
  );
}

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, id, className, required, ...props }, ref) => (
    <FieldWrapper label={label} htmlFor={id ?? props.name ?? label} required={required} error={error} hint={hint}>
      <input
        ref={ref}
        id={id ?? props.name ?? label}
        className={cn(fieldBase, error && "border-danger-500 focus:border-danger-500 focus:ring-danger-500/30", className)}
        aria-invalid={Boolean(error)}
        {...props}
      />
    </FieldWrapper>
  )
);
Input.displayName = "Input";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
  hint?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, hint, id, className, required, rows = 3, ...props }, ref) => (
    <FieldWrapper label={label} htmlFor={id ?? props.name ?? label} required={required} error={error} hint={hint}>
      <textarea
        ref={ref}
        id={id ?? props.name ?? label}
        rows={rows}
        className={cn(fieldBase, "resize-y", error && "border-danger-500 focus:border-danger-500 focus:ring-danger-500/30", className)}
        aria-invalid={Boolean(error)}
        {...props}
      />
    </FieldWrapper>
  )
);
Textarea.displayName = "Textarea";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  error?: string;
  hint?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, hint, id, className, required, children, ...props }, ref) => (
    <FieldWrapper label={label} htmlFor={id ?? props.name ?? label} required={required} error={error} hint={hint}>
      <select
        ref={ref}
        id={id ?? props.name ?? label}
        className={cn(fieldBase, "cursor-pointer", error && "border-danger-500 focus:border-danger-500 focus:ring-danger-500/30", className)}
        aria-invalid={Boolean(error)}
        {...props}
      >
        {children}
      </select>
    </FieldWrapper>
  )
);
Select.displayName = "Select";
