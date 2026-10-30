'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';

// The scanner needs the camera and browser storage, so it is never rendered on the server.
const CrewScanner = dynamic(
  () => import('@/components/events/crew-scanner').then((m) => m.CrewScanner),
  {
    ssr: false,
    loading: () => <div className="min-h-dvh bg-background" />,
  },
);

/** /scan, or /scan?c=ABCDEFGH from the QR on a crew pass sheet (fills the code in). */
export default function ScanPage() {
  const [code, setCode] = useState<string | null>(null);
  useEffect(() => {
    setCode(new URLSearchParams(window.location.search).get('c') ?? '');
  }, []);
  if (code === null) return <div className="min-h-dvh bg-background" />;
  return <CrewScanner initialCode={code} />;
}
