'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

const ALL_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function NewRoutinePage() {
  const router = useRouter();
  const supabase = createClient();

  const [title, setTitle] = useState('');
  const [timeOfDay, setTimeOfDay] = useState('08:00');
  const [days, setDays] = useState<string[]>(ALL_DAYS);
  const [instructions, setInstructions] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function toggleDay(day: string) {
    setDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!title.trim()) { setError('Title is required.'); return; }
    if (days.length === 0) { setError('Select at least one day.'); return; }

    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/login'); return; }
    const { data: profile } = await supabase.from('profiles').select('family_id').eq('id', user.id).single();
    if (!profile?.family_id) { router.push('/onboarding'); return; }

    const { error: err } = await supabase.from('routines').insert({
      family_id: profile.family_id,
      title: title.trim(),
      time_of_day: timeOfDay,
      days_of_week: days,
      instructions: instructions.trim() || null,
    });

    if (err) { setError(err.message); setLoading(false); return; }
    router.push('/caregiver/routines');
    router.refresh();
  }

  return (
    <div className="max-w-xl mx-auto">
      <Link href="/caregiver/routines" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to Routines
      </Link>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Add a routine</h1>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-caregiver-border p-6 space-y-5">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
          <input id="title" type="text" required value={title} onChange={(e) => setTitle(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            placeholder="e.g. Morning walk" />
        </div>

        <div>
          <label htmlFor="time" className="block text-sm font-medium text-gray-700 mb-1">Time *</label>
          <input id="time" type="time" required value={timeOfDay} onChange={(e) => setTimeOfDay(e.target.value)}
            className="px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900" />
        </div>

        <div>
          <p className="block text-sm font-medium text-gray-700 mb-2">Days *</p>
          <div className="flex flex-wrap gap-2">
            {ALL_DAYS.map((day) => (
              <button
                key={day}
                type="button"
                onClick={() => toggleDay(day)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  days.includes(day) ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                aria-pressed={days.includes(day)}
              >
                {day.slice(0, 3)}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label htmlFor="instructions" className="block text-sm font-medium text-gray-700 mb-1">Instructions <span className="text-gray-400 font-normal">(optional)</span></label>
          <textarea id="instructions" value={instructions} onChange={(e) => setInstructions(e.target.value)} rows={3}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 resize-none"
            placeholder="Simple step-by-step instructions…" />
        </div>

        {error && <div role="alert" className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">{error}</div>}

        <div className="flex gap-3 pt-2">
          <Link href="/caregiver/routines" className="px-5 py-3 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 font-medium text-sm">Cancel</Link>
          <button type="submit" disabled={loading} className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold py-3 px-6 rounded-xl text-sm">
            {loading ? 'Saving…' : 'Save routine'}
          </button>
        </div>
      </form>
    </div>
  );
}
