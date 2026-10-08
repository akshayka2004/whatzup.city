import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { StyleGuide } from './style-guide';

export const metadata: Metadata = { title: 'Design system', robots: { index: false } };

// Living style guide for the design system. Dev / preview only.
export default function DesignPage() {
  if (process.env.NODE_ENV === 'production' && process.env.NEXT_PUBLIC_SHOW_DESIGN !== '1') notFound();
  return <StyleGuide />;
}
