'use client';

import { useTheme } from 'next-themes';
import { Toaster as Sonner, ToasterProps } from 'sonner';

const Toaster = ({ ...props }: ToasterProps) => {
  const { resolvedTheme = 'light' } = useTheme();

  return (
    <Sonner
      theme={resolvedTheme as ToasterProps['theme']}
      className="toaster group"
      style={
        {
          '--normal-bg': 'var(--popover)',
          '--normal-text': 'var(--popover-foreground)',
          '--normal-border': 'var(--border)',
          '--border-radius': 'var(--radius-card-v)',
          zIndex: 'var(--z-toast)',
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: 'shadow-e3 font-sans',
          description: 'text-muted-foreground',
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
export { toast } from 'sonner';
