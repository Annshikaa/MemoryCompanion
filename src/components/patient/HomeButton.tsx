'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Home } from 'lucide-react';

export default function PatientHomeButton() {
  const pathname = usePathname();

  // Don't show the home button on the home screen itself
  if (pathname === '/patient') return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
      <Link
        href="/patient"
        className="flex items-center gap-3 px-8 py-4 rounded-full shadow-lg text-white font-bold text-xl focus:outline-none focus:ring-4 focus:ring-blue-300"
        style={{ backgroundColor: '#5b8def', minHeight: '72px', minWidth: '200px', justifyContent: 'center' }}
        aria-label="Go back home"
      >
        <Home className="w-7 h-7" aria-hidden="true" />
        Home
      </Link>
    </div>
  );
}
