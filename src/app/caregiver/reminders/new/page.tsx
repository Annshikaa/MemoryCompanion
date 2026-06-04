'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

type ReminderType = 'medication' | 'activity' | 'appointment';

export default function NewReminderPage() {
  const router = useRouter();
  const supabase = createClient();

  const [title, setTitle] = useState('');
  const [type, setType] = useState<ReminderType>('medication');
  const [time, setTime] = useState('09:00');
  const [repeatRule, setRepeatRule] = useState('daily');
  const [requiresConfirmation, setRequiresConfirmation] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!title.trim()) { setError('Title is required.'); return; }
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/login'); return; }
    const { data: profile } = await supabase.from('profiles').select('family_id').eq('id', user.id).single();
    if (!profile?.family_id) { router.push('/onboarding'); return; }

    const { error: err } = await supabase.from('reminders').insert({
      family_id: profile.family_id,
      title: title.trim(),
      type,
      time,
      repeat_rule: repeatRule || null,
      requires_confirmation: requiresConfirmation,
    });

    if (err) { setError(err.message); setLoading(false); return; }
    router.push('/caregiver/reminders');
    router.refresh();
  }

  return (
    <div className="max-w-xl mx-auto">
      <Link href="/caregiver/reminders" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to Reminders
      </Link>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Add a reminder</h1>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-caregiver-border p-6 space-y-5">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
          <input id="title" type="text" required value={title} onChange={(e) => setTitle(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            placeholder="e.g. Take blood pressure pill" />
        </div>

        <div>
          <p className="block text-sm font-medium text-gray-700 mb-2">Type *</p>
          <div className="grid grid-cols-3 gap-3">
            {(['medication', 'activity', 'appointment'] as ReminderType[]).map((t) => (
              <button key={t} type="button" onClick={() => setType(t)}
                className={`py-2.5 rounded-xl border-2 text-sm font-medium capitalize transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 ${type === t ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-500 hover:border-blue-200'}`}
                aria-pressed={type === t}>
                {t}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label htmlFor="time" className="block text-sm font-medium text-gray-700 mb-1">Time *</label>
          <input id="time" type="time" required value={time} onChange={(e) => setTime(e.target.value)}
            className="px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900" />
        </div>

        <div>
          <label htmlFor="repeat" className="block text-sm font-medium text-gray-700 mb-1">Repeat</label>
          <select id="repeat" value={repeatRule} onChange={(e) => setRepeatRule(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white">
            <option value="daily">Every day</option>
            <option value="weekdays">Weekdays only</option>
            <option value="weekly">Once a week</option>
            <option value="">No repeat (one-time)</option>
          </select>
        </div>

        <label className="flex items-center gap-3 cursor-pointer">
          <input type="checkbox" checked={requiresConfirmation} onChange={(e) => setRequiresConfirmation(e.target.checked)}
            className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500" />
          <span className="text-sm text-gray-700">Patient must confirm when done</span>
        </label>

        {error && <div role="alert" className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">{error}</div>}

        <div className="flex gap-3 pt-2">
          <Link href="/caregiver/reminders" className="px-5 py-3 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 font-medium text-sm">Cancel</Link>
          <button type="submit" disabled={loading} className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold py-3 px-6 rounded-xl text-sm">
            {loading ? 'Saving…' : 'Save reminder'}
          </button>
        </div>
      </form>
    </div>
  );
}
