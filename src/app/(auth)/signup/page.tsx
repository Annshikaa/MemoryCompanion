'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Heart, AlertCircle, Loader2, Mail } from 'lucide-react';

export default function SignupPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail]                   = useState('');
  const [password, setPassword]             = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError]                   = useState('');
  const [loading, setLoading]               = useState(false);
  const [emailSent, setEmailSent]           = useState(false);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setLoading(true);

    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${location.origin}/auth/callback?next=/onboarding`,
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    setEmailSent(true);
    setLoading(false);
  }

  if (emailSent) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-4"
        style={{ background: '#f3ece2' }}
      >
        <div
          className="w-full max-w-md bg-white rounded-[20px] p-10 text-center"
          style={{ boxShadow: '0 4px 16px rgba(28,25,23,0.07), 0 16px 40px rgba(28,25,23,0.08)', border: '1px solid #e8dfd4' }}
        >
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5"
            style={{ background: '#e8f2f0' }}
          >
            <Mail className="w-8 h-8" style={{ color: '#3d7a6e' }} />
          </div>
          <h2 className="font-display text-2xl font-semibold tracking-tight mb-3" style={{ color: '#1c1917' }}>
            Check your email
          </h2>
          <p className="text-sm leading-relaxed" style={{ color: '#6b6561' }}>
            We sent a confirmation link to{' '}
            <strong style={{ color: '#1c1917' }}>{email}</strong>.
            Click the link to finish setting up your account.
          </p>
          <p className="text-xs mt-4" style={{ color: '#a8a099' }}>
            Didn&apos;t get it? Check your spam folder or{' '}
            <button
              onClick={() => setEmailSent(false)}
              className="font-medium underline"
              style={{ color: '#3d7a6e' }}
            >
              try again
            </button>
            .
          </p>
        </div>
      </div>
    );
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
          <p className="text-sm mt-1" style={{ color: '#6b6561' }}>Caregiver portal</p>
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
            Create an account
          </h2>

          <form onSubmit={handleSignup} className="space-y-5" noValidate>
            {[
              { id: 'email',   label: 'Email address', type: 'email',    ac: 'email',        val: email,           set: setEmail,           ph: 'you@example.com' },
              { id: 'pw',      label: 'Password',      type: 'password', ac: 'new-password', val: password,        set: setPassword,        ph: 'Minimum 8 characters' },
              { id: 'confirm', label: 'Confirm password', type: 'password', ac: 'new-password', val: confirmPassword, set: setConfirmPassword, ph: 'Re-enter your password' },
            ].map(({ id, label, type, ac, val, set, ph }) => (
              <div key={id}>
                <label htmlFor={id} className="block text-sm font-medium mb-1.5" style={{ color: '#1c1917' }}>
                  {label}
                </label>
                <input
                  id={id}
                  type={type}
                  autoComplete={ac}
                  required
                  value={val}
                  onChange={(e) => set(e.target.value)}
                  placeholder={ph}
                  className="w-full px-4 py-3 rounded-[14px] text-sm transition-shadow"
                  style={{ border: '1px solid #e8dfd4', background: '#fdfaf6', color: '#1c1917', outline: 'none' }}
                  onFocus={(e) => (e.target.style.boxShadow = '0 0 0 2.5px #3d7a6e')}
                  onBlur={(e)  => (e.target.style.boxShadow = '')}
                />
              </div>
            ))}

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
              style={{ background: loading ? '#7a9e94' : '#3d7a6e', cursor: loading ? 'not-allowed' : 'pointer' }}
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? 'Creating account…' : 'Create account'}
            </button>
          </form>

          <div className="mt-6 pt-5" style={{ borderTop: '1px solid #f0e8df' }}>
            <p className="text-center text-sm" style={{ color: '#a8a099' }}>
              Already have an account?{' '}
              <Link href="/login" className="font-medium" style={{ color: '#3d7a6e' }}>
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
