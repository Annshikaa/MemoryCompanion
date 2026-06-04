import Link from 'next/link';
import { UserCircle } from 'lucide-react';

export default function PersonNotFound() {
  return (
    <div
      className="flex flex-col items-center justify-center min-h-screen px-6 text-center pb-28"
      style={{ backgroundColor: '#fbf7f0' }}
    >
      <div
        className="rounded-full p-8 mb-6"
        style={{ backgroundColor: '#e8f0fd' }}
      >
        <UserCircle className="w-16 h-16" style={{ color: '#93c5fd' }} />
      </div>

      <p style={{ fontSize: '28px', fontWeight: 700, color: '#2b2b3a', marginBottom: 8 }}>
        Person not found
      </p>
      <p style={{ fontSize: '20px', color: '#9ca3af', marginBottom: 32 }}>
        This person may have been removed.
      </p>

      <Link
        href="/patient/family"
        className="rounded-2xl flex items-center justify-center focus:outline-none focus:ring-4 focus:ring-blue-300"
        style={{
          backgroundColor: '#5b8def',
          color: '#ffffff',
          minHeight: '64px',
          minWidth: '220px',
          fontSize: '22px',
          fontWeight: 700,
          padding: '0 32px',
        }}
      >
        Back to Family
      </Link>
    </div>
  );
}
