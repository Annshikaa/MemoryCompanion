'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Heart, Loader2 } from 'lucide-react';

export default function PatientLoginPage() {
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
      setError('That email or password is incorrect. Please try again.');
      setLoading(false);
      return;
    }

    router.push('/');
    router.refresh();
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-6"
      style={{ background: '#fbf7f0' }}
    >
      <div className="w-full max-w-sm">
        {/* Brand mark */}
        <div className="flex flex-col items-center mb-10">
          <div
            className="w-20 h-20 rounded-3xl flex items-center justify-center mb-5"
            style={{ background: '#e8f0fd' }}
          >
            <Heart
              className="w-10 h-10"
              style={{ color: '#5b8def' }}
              strokeWidth={2.5}
              fill="currentColor"
            />
          </div>
          <h1
            className="font-display text-center leading-tight"
            style={{ fontSize: '28px', fontWeight: 600, color: '#2b2b3a', letterSpacing: '-0.02em' }}
          >
            Memory Companion
          </h1>
          <p
            className="text-center mt-2"
            style={{ fontSize: '18px', color: '#6b7280' }}
          >
            Welcome. Please sign in.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-5" noValidate>
          {/* Email */}
          <div>
            <label
              htmlFor="p-email"
              className="block font-medium mb-2"
              style={{ fontSize: '20px', color: '#2b2b3a' }}
            >
              Email
            </label>
            <input
              id="p-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              style={{
                width: '100%',
                padding: '18px 20px',
                borderRadius: '16px',
                border: '2px solid #d1d5db',
                background: 'white',
                fontSize: '20px',
                color: '#2b2b3a',
                outline: 'none',
                minHeight: '64px',
              }}
              onFocus={(e) => (e.target.style.borderColor = '#5b8def')}
              onBlur={(e)  => (e.target.style.borderColor = '#d1d5db')}
            />
          </div>

          {/* Password */}
          <div>
            <label
              htmlFor="p-password"
              className="block font-medium mb-2"
              style={{ fontSize: '20px', color: '#2b2b3a' }}
            >
              Password
            </label>
            <input
              id="p-password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              style={{
                width: '100%',
                padding: '18px 20px',
                borderRadius: '16px',
                border: '2px solid #d1d5db',
                background: 'white',
                fontSize: '20px',
                color: '#2b2b3a',
                outline: 'none',
                minHeight: '64px',
              }}
              onFocus={(e) => (e.target.style.borderColor = '#5b8def')}
              onBlur={(e)  => (e.target.style.borderColor = '#d1d5db')}
            />
          </div>

          {/* Error */}
          {error && (
            <div
              role="alert"
              style={{
                padding: '16px 20px',
                borderRadius: '16px',
                background: '#fef2f2',
                border: '2px solid #fca5a5',
                color: '#dc2626',
                fontSize: '18px',
                lineHeight: '1.5',
              }}
            >
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              minHeight: '64px',
              borderRadius: '20px',
              background: loading ? '#93c5fd' : '#5b8def',
              color: 'white',
              fontSize: '20px',
              fontWeight: 600,
              border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              transition: 'background 0.15s',
            }}
          >
            {loading && <Loader2 className="w-5 h-5 animate-spin" />}
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        {/* First-time setup */}
        <p
          className="text-center mt-6"
          style={{ fontSize: '17px', color: '#6b7280' }}
        >
          First time?{' '}
          <Link
            href="/signup"
            style={{ color: '#5b8def', fontWeight: 600 }}
          >
            Set up this device
          </Link>
        </p>

        {/* Caregiver link */}
        <p
          className="text-center mt-4"
          style={{ fontSize: '14px', color: '#9ca3af' }}
        >
          Are you a caregiver?{' '}
          <Link
            href="/login"
            style={{ color: '#6b7280', fontWeight: 500 }}
          >
            Caregiver portal →
          </Link>
        </p>
      </div>
    </div>
  );
}
