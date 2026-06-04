'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Copy, Check, LogOut, ChevronDown } from 'lucide-react';

interface TopbarProps {
  displayName: string;
  familyName: string;
  inviteCode: string;
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function CaregiverTopbar({ displayName, familyName, inviteCode }: TopbarProps) {
  const router = useRouter();
  const supabase = createClient();
  const [copied, setCopied] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [greeting, setGreeting] = useState('');

  useEffect(() => {
    setGreeting(getGreeting());
  }, []);

  async function handleCopy() {
    await navigator.clipboard.writeText(inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  const initials = displayName.charAt(0).toUpperCase();

  return (
    <header className="sticky top-0 z-10 bg-care-surface/95 backdrop-blur-sm border-b border-care-border px-6 py-3.5 flex items-center justify-between">
      {/* Left: greeting */}
      <div>
        {greeting && (
          <p className="text-[11px] font-medium text-care-text-subtle uppercase tracking-wider leading-none mb-1">
            {greeting}
          </p>
        )}
        <p className="font-display font-semibold text-[17px] tracking-tight text-care-text leading-none">
          {displayName}
        </p>
      </div>

      {/* Right: invite + user menu */}
      <div className="flex items-center gap-2.5">
        {/* Invite code chip */}
        <button
          onClick={handleCopy}
          className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-care bg-white border border-care-border hover:bg-care-highlight transition-colors text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-care-primary"
          aria-label={`Family invite code ${inviteCode}. Click to copy.`}
        >
          <span className="text-care-text-subtle font-medium">Invite</span>
          <span className="font-mono tracking-widest text-care-text font-semibold">{inviteCode}</span>
          {copied
            ? <Check className="w-3.5 h-3.5 text-care-primary" />
            : <Copy className="w-3.5 h-3.5 text-care-text-subtle" />
          }
        </button>

        {/* Family name pill — mobile only */}
        <span className="sm:hidden text-xs font-medium text-care-text-muted">{familyName}</span>

        {/* User menu */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center gap-2 px-2 py-1.5 rounded-care hover:bg-care-highlight transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-care-primary"
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            aria-label="User menu"
          >
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
              style={{ background: '#3d7a6e' }}
              aria-hidden="true"
            >
              {initials}
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-care-text-subtle" aria-hidden />
          </button>

          {menuOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setMenuOpen(false)}
                aria-hidden="true"
              />
              <div
                role="menu"
                className="absolute right-0 top-full mt-2 w-44 bg-white rounded-care-lg shadow-care border border-care-border py-1.5 z-20"
              >
                <div className="px-4 py-2 border-b border-care-border-subtle mb-1">
                  <p className="text-xs font-medium text-care-text">{displayName}</p>
                  <p className="text-[11px] text-care-text-subtle mt-0.5">{familyName}</p>
                </div>
                <button
                  role="menuitem"
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors font-medium"
                >
                  <LogOut className="w-4 h-4" aria-hidden />
                  Sign out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
