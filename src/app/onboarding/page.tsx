'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Heart, Users, UserCircle, ChevronRight, Home } from 'lucide-react';

type Step = 'role' | 'family';
type Role = 'caregiver' | 'patient';
type FamilyAction = 'create' | 'join';

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createClient();

  const [step, setStep] = useState<Step>('role');
  const [role, setRole] = useState<Role>('caregiver');
  const [displayName, setDisplayName] = useState('');
  const [familyAction, setFamilyAction] = useState<FamilyAction>('create');
  const [familyName, setFamilyName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleComplete(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!displayName.trim()) {
      setError('Please enter your name.');
      return;
    }

    setLoading(true);

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      setError('Session expired. Please log in again.');
      setLoading(false);
      router.push('/login');
      return;
    }

    if (familyAction === 'create') {
      if (!familyName.trim()) {
        setError('Please enter a family name.');
        setLoading(false);
        return;
      }

      const { error: rpcError } = await supabase.rpc('create_family_and_profile', {
        p_family_name: familyName.trim(),
        p_role: role,
        p_display_name: displayName.trim(),
      });

      if (rpcError) {
        setError(rpcError.message);
        setLoading(false);
        return;
      }
    } else {
      const code = inviteCode.trim().toLowerCase();
      if (!code) {
        setError('Please enter the invite code.');
        setLoading(false);
        return;
      }

      const { error: rpcError } = await supabase.rpc('join_family_by_code', {
        p_invite_code: code,
        p_role: role,
        p_display_name: displayName.trim(),
      });

      if (rpcError) {
        setError(rpcError.message === 'Family not found' ? 'Invite code not found. Please check and try again.' : rpcError.message);
        setLoading(false);
        return;
      }
    }

    router.push(role === 'caregiver' ? '/caregiver' : '/patient');
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg w-full max-w-lg p-8">
        {/* Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="bg-blue-100 rounded-full p-3 mb-3">
            <Heart className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Memory Companion</h1>
          <p className="text-gray-500 text-sm mt-1">Let&apos;s set up your account</p>
        </div>

        {/* Steps indicator */}
        <div className="flex items-center mb-8">
          <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold ${step === 'role' ? 'bg-blue-600 text-white' : 'bg-green-500 text-white'}`}>
            {step === 'role' ? '1' : '✓'}
          </div>
          <div className={`flex-1 h-1 mx-2 rounded ${step === 'family' ? 'bg-blue-600' : 'bg-gray-200'}`} />
          <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold ${step === 'family' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-400'}`}>
            2
          </div>
        </div>

        {step === 'role' && (
          <div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Who are you?</h2>
            <p className="text-gray-500 text-sm mb-6">
              This determines which interface you&apos;ll use.
            </p>

            <div>
              <label htmlFor="displayName" className="block text-sm font-medium text-gray-700 mb-1">
                Your name
              </label>
              <input
                id="displayName"
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-400 mb-6"
                placeholder="Enter your full name"
              />
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <button
                type="button"
                onClick={() => setRole('caregiver')}
                className={`flex flex-col items-center p-5 rounded-xl border-2 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  role === 'caregiver'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-blue-200 hover:bg-gray-50'
                }`}
                aria-pressed={role === 'caregiver'}
              >
                <Users className={`w-8 h-8 mb-2 ${role === 'caregiver' ? 'text-blue-600' : 'text-gray-400'}`} />
                <span className={`font-semibold text-sm ${role === 'caregiver' ? 'text-blue-700' : 'text-gray-600'}`}>
                  Caregiver
                </span>
                <span className="text-xs text-gray-400 text-center mt-1">
                  Manage routines, reminders &amp; memories
                </span>
              </button>

              <button
                type="button"
                onClick={() => setRole('patient')}
                className={`flex flex-col items-center p-5 rounded-xl border-2 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  role === 'patient'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-blue-200 hover:bg-gray-50'
                }`}
                aria-pressed={role === 'patient'}
              >
                <UserCircle className={`w-8 h-8 mb-2 ${role === 'patient' ? 'text-blue-600' : 'text-gray-400'}`} />
                <span className={`font-semibold text-sm ${role === 'patient' ? 'text-blue-700' : 'text-gray-600'}`}>
                  Patient
                </span>
                <span className="text-xs text-gray-400 text-center mt-1">
                  Simple, calm companion view
                </span>
              </button>
            </div>

            <button
              type="button"
              disabled={!displayName.trim()}
              onClick={() => {
                if (!displayName.trim()) {
                  setError('Please enter your name first.');
                  return;
                }
                setError('');
                setStep('family');
              }}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              Continue <ChevronRight className="w-4 h-4" />
            </button>
            {error && (
              <p role="alert" className="text-red-600 text-sm mt-3 text-center">{error}</p>
            )}
          </div>
        )}

        {step === 'family' && (
          <form onSubmit={handleComplete}>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">
              Set up your family space
            </h2>
            <p className="text-gray-500 text-sm mb-6">
              All your data is private to your family group.
            </p>

            {/* Create or Join toggle */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <button
                type="button"
                onClick={() => setFamilyAction('create')}
                className={`py-3 rounded-xl border-2 text-sm font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  familyAction === 'create'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 text-gray-500 hover:border-blue-200'
                }`}
              >
                Create new family
              </button>
              <button
                type="button"
                onClick={() => setFamilyAction('join')}
                className={`py-3 rounded-xl border-2 text-sm font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  familyAction === 'join'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 text-gray-500 hover:border-blue-200'
                }`}
              >
                Join existing family
              </button>
            </div>

            {familyAction === 'create' ? (
              <div className="mb-6">
                <label htmlFor="familyName" className="block text-sm font-medium text-gray-700 mb-1">
                  Family name
                </label>
                <div className="relative">
                  <Home className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    id="familyName"
                    type="text"
                    required={familyAction === 'create'}
                    value={familyName}
                    onChange={(e) => setFamilyName(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-400"
                    placeholder="e.g. The Sharma Family"
                  />
                </div>
              </div>
            ) : (
              <div className="mb-6">
                <label htmlFor="inviteCode" className="block text-sm font-medium text-gray-700 mb-1">
                  Invite code
                </label>
                <input
                  id="inviteCode"
                  type="text"
                  required={familyAction === 'join'}
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-400 font-mono tracking-widest"
                  placeholder="8-character code"
                  maxLength={8}
                />
                <p className="text-xs text-gray-400 mt-1">
                  Ask your caregiver for the code found in their dashboard settings.
                </p>
              </div>
            )}

            {error && (
              <div role="alert" className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm mb-4">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => { setStep('role'); setError(''); }}
                className="px-5 py-3 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 font-medium transition-colors"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-xl transition-colors"
              >
                {loading ? 'Setting up…' : 'Get started'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
