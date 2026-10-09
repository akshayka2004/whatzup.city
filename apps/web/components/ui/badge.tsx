import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center justify-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold leading-5 w-fit whitespace-nowrap shrink-0 [&>svg]:size-3.5 [&>svg]:pointer-events-none focus-visible:ring-ring/50 focus-visible:ring-[3px] transition-[color,box-shadow] overflow-hidden',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground [a&]:hover:bg-primary/90',
        brand: 'border-transparent bg-brand-soft text-brand-soft-foreground',
        secondary: 'border-transparent bg-secondary text-secondary-foreground',
        neutral: 'border-transparent bg-surface-sunken text-muted-foreground',
        success: 'border-transparent bg-success-soft text-success-soft-foreground',
        warning: 'border-transparent bg-warning-soft text-warning-soft-foreground',
        danger: 'border-transparent bg-danger-soft text-danger-soft-foreground',
        info: 'border-transparent bg-info-soft text-info-soft-foreground',
        destructive: 'border-transparent bg-destructive text-white',
        outline: 'border-border-strong/70 text-foreground [a&]:hover:bg-secondary',
      },
      size: {
        default: '',
        sm: 'px-2 py-0 leading-[18px]',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

function Badge({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<'span'> & VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : 'span';

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant, size }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
