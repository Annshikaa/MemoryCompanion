'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Heart, AlertCircle, Loader2 } from 'lucide-react';

export default function CaregiverLoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }

    router.push('/');
    router.refresh();
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: '#f3ece2' }}
    >
      <div className="w-full max-w-md">
        {/* Brand */}
        <div className="flex flex-col items-center mb-8">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
            style={{ background: '#e8f2f0' }}
          >
            <Heart className="w-7 h-7" style={{ color: '#3d7a6e' }} strokeWidth={2.5} fill="currentColor" />
          </div>
          <h1
            className="font-display text-2xl font-semibold tracking-tight"
            style={{ color: '#1c1917' }}
          >
            Memory Companion
          </h1>
          <p className="text-sm mt-1" style={{ color: '#6b6561' }}>
            Caregiver portal
          </p>
        </div>

        {/* Card */}
        <div
          className="bg-white rounded-[20px] p-8"
          style={{ boxShadow: '0 4px 16px rgba(28,25,23,0.07), 0 16px 40px rgba(28,25,23,0.08)', border: '1px solid #e8dfd4' }}
        >
          <h2
            className="font-display text-xl font-semibold tracking-tight mb-6"
            style={{ color: '#1c1917' }}
          >
            Welcome back
          </h2>

          <form onSubmit={handleLogin} className="space-y-5" noValidate>
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium mb-1.5"
                style={{ color: '#1c1917' }}
              >
                Email address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-4 py-3 rounded-[14px] text-sm transition-shadow"
                style={{
                  border: '1px solid #e8dfd4',
                  background: '#fdfaf6',
                  color: '#1c1917',
                  outline: 'none',
                }}
                onFocus={(e) => (e.target.style.boxShadow = '0 0 0 2.5px #3d7a6e')}
                onBlur={(e)  => (e.target.style.boxShadow = '')}
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium mb-1.5"
                style={{ color: '#1c1917' }}
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-[14px] text-sm transition-shadow"
                style={{
                  border: '1px solid #e8dfd4',
                  background: '#fdfaf6',
                  color: '#1c1917',
                  outline: 'none',
                }}
                onFocus={(e) => (e.target.style.boxShadow = '0 0 0 2.5px #3d7a6e')}
                onBlur={(e)  => (e.target.style.boxShadow = '')}
              />
            </div>

            {error && (
              <div
                role="alert"
                className="flex items-center gap-2 px-4 py-3 rounded-[14px] text-sm"
                style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626' }}
              >
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-[14px] text-sm font-semibold text-white transition-colors"
              style={{
                background: loading ? '#7a9e94' : '#3d7a6e',
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <div className="mt-6 pt-5" style={{ borderTop: '1px solid #f0e8df' }}>
            <p className="text-center text-sm" style={{ color: '#a8a099' }}>
              New caregiver?{' '}
              <Link
                href="/signup"
                className="font-medium"
                style={{ color: '#3d7a6e' }}
              >
                Create an account
              </Link>
            </p>
          </div>
        </div>

        {/* Patient portal link */}
        <div className="mt-5 text-center">
          <p className="text-xs" style={{ color: '#a8a099' }}>
            Are you a patient?{' '}
            <Link
              href="/patient-login"
              className="font-medium"
              style={{ color: '#6b6561' }}
            >
              Open patient portal →
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
