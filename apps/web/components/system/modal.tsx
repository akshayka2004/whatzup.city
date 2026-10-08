'use client';

import type { ReactNode } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';

const SIZES = {
  sm: 'sm:max-w-sm',
  md: 'sm:max-w-lg',
  lg: 'sm:max-w-2xl',
  xl: 'sm:max-w-4xl',
} as const;

/**
 * The app's single modal. Centered dialog on tablet/desktop, swipe-to-dismiss bottom
 * sheet on phones. Focus trap, Escape, aria-labelledby come from Radix/vaul — never
 * hand-roll a `fixed inset-0` overlay again.
 */
export function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  size = 'md',
  className,
  hideTitle = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  /** Action row. Buttons stack full-width on phones. */
  footer?: ReactNode;
  size?: keyof typeof SIZES;
  className?: string;
  /** Keep the title for screen readers only. */
  hideTitle?: boolean;
}) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className={className}>
          <DrawerHeader className="text-left">
            <DrawerTitle className={cn('text-heading', hideTitle && 'sr-only')}>{title}</DrawerTitle>
            {description ? (
              <DrawerDescription>{description}</DrawerDescription>
            ) : (
              <DrawerDescription className="sr-only">{typeof title === 'string' ? title : ''}</DrawerDescription>
            )}
          </DrawerHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-2">{children}</div>
          {footer && <DrawerFooter className="flex-col-reverse gap-2 [&>*]:w-full">{footer}</DrawerFooter>}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn('max-h-[88dvh] grid-rows-[auto_1fr_auto]', SIZES[size], className)}>
        <DialogHeader>
          <DialogTitle className={cn('text-heading', hideTitle && 'sr-only')}>{title}</DialogTitle>
          {description ? (
            <DialogDescription>{description}</DialogDescription>
          ) : (
            <DialogDescription className="sr-only">{typeof title === 'string' ? title : ''}</DialogDescription>
          )}
        </DialogHeader>
        <div className="-mx-6 min-h-0 overflow-y-auto px-6">{children}</div>
        {footer && <DialogFooter className="gap-2">{footer}</DialogFooter>}
      </DialogContent>
    </Dialog>
  );
}
