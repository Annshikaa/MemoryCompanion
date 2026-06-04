'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Settings, LogOut, X } from 'lucide-react';

export default function PatientSettingsMenu() {
  const router = useRouter();
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    await supabase.auth.signOut();
    router.push('/patient-login');
    router.refresh();
  }

  return (
    <>
      {/* Gear button — fixed top-right, deliberately small */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed top-4 right-4 z-40 w-11 h-11 rounded-full flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2"
        style={{
          background: 'rgba(91,141,239,0.10)',
          color: '#9ca3af',
          focusRingColor: '#5b8def',
        }}
        aria-label="Settings"
      >
        <Settings className="w-5 h-5" />
      </button>

      {/* Modal overlay */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center pb-10 px-6"
          style={{ background: 'rgba(43,43,58,0.4)' }}
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-3xl p-6"
            style={{ background: '#fbf7f0', border: '2px solid #e5e7eb' }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Settings"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <p
                className="font-bold"
                style={{ fontSize: '22px', color: '#2b2b3a' }}
              >
                Settings
              </p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ background: '#f3f4f6', color: '#6b7280' }}
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Sign out button */}
            <button
              type="button"
              onClick={handleSignOut}
              disabled={signingOut}
              className="w-full flex items-center justify-center gap-3 rounded-2xl transition-colors focus:outline-none focus:ring-4"
              style={{
                background: '#fee2e2',
                color: '#dc2626',
                minHeight: '64px',
                fontSize: '20px',
                fontWeight: 700,
                opacity: signingOut ? 0.6 : 1,
              }}
            >
              <LogOut className="w-6 h-6" aria-hidden />
              {signingOut ? 'Signing out…' : 'Sign out'}
            </button>

            <p
              className="text-center mt-4"
              style={{ fontSize: '14px', color: '#9ca3af' }}
            >
              This will log you out of Memory Companion.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
