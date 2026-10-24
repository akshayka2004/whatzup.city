import Link from 'next/link';
import { Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';

/** Shown in place of a page the signed-in account was not given access to. */
export function NoAccess({ home = '/' }: { home?: string }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-3 py-16 text-center">
      <span className="flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
        <Lock className="size-5" />
      </span>
      <h1 className="text-lg font-bold text-foreground">You don&apos;t have access to this page</h1>
      <p className="text-sm text-muted-foreground">
        Your account was not given access to this area. Ask a super admin if you need it.
      </p>
      <Button asChild className="rounded-xl">
        <Link href={home}>Back to my pages</Link>
      </Button>
    </div>
  );
}
