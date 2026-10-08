import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';

import { cn } from '@/lib/utils';

const buttonVariants = cva(
  "relative inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-control text-sm font-semibold select-none transition-[background-color,color,border-color,box-shadow,transform,border-radius] duration-150 ease-out-quint active:scale-[0.97] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-ring/45 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive motion-reduce:transition-none motion-reduce:active:scale-100",
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground shadow-e1 hover:bg-primary/90 hover:shadow-brand active:rounded-[calc(var(--radius)-4px)]',
        primary:
          'bg-primary text-primary-foreground shadow-e1 hover:bg-primary/90 hover:shadow-brand active:rounded-[calc(var(--radius)-4px)]',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-surface-sunken',
        tonal: 'bg-brand-soft text-brand-soft-foreground hover:bg-primary/15',
        outline:
          'border border-border-strong/70 bg-card text-foreground hover:bg-secondary hover:border-border-strong',
        ghost: 'text-foreground hover:bg-secondary',
        destructive:
          'bg-destructive text-white shadow-e1 hover:bg-destructive/90 focus-visible:ring-destructive/25',
        danger:
          'bg-danger-soft text-danger-soft-foreground hover:bg-destructive hover:text-white focus-visible:ring-destructive/25',
        link: 'text-primary underline-offset-4 hover:underline active:scale-100 px-0 h-auto',
      },
      size: {
        default: 'h-10 px-4 has-[>svg]:px-3.5',
        sm: 'h-9 rounded-sm gap-1.5 px-3 text-[13px] has-[>svg]:px-2.5',
        lg: 'h-12 px-6 text-[15px] has-[>svg]:px-5',
        xl: 'h-14 px-7 text-base rounded-xl has-[>svg]:px-6',
        icon: 'size-10',
        'icon-sm': 'size-9 rounded-sm',
        'icon-lg': 'size-12',
      },
      shape: {
        default: '',
        pill: 'rounded-full active:rounded-full',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
      shape: 'default',
    },
  },
);

type ButtonProps = React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
    /** Shows a spinner, keeps width, disables the button and sets aria-busy. */
    loading?: boolean;
  };

function Button({
  className,
  variant,
  size,
  shape,
  asChild = false,
  loading = false,
  disabled,
  children,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : 'button';
  const classes = cn(buttonVariants({ variant, size, shape, className }));

  if (asChild) {
    return (
      <Comp data-slot="button" className={classes} {...props}>
        {children}
      </Comp>
    );
  }

  return (
    <Comp
      data-slot="button"
      className={classes}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? (
        <>
          <span className="invisible inline-flex items-center gap-2">{children}</span>
          <Loader2 className="absolute animate-spin" aria-hidden />
        </>
      ) : (
        children
      )}
    </Comp>
  );
}

export { Button, buttonVariants };
export type { ButtonProps };
