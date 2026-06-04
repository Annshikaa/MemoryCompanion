import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Bell, Plus } from 'lucide-react';

const typeLabel: Record<string, string> = {
  medication: '💊 Medication',
  activity: '🏃 Activity',
  appointment: '📅 Appointment',
};

export default async function CaregiverRemindersPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase.from('profiles').select('family_id').eq('id', user.id).single();
  if (!profile?.family_id) redirect('/onboarding');

  const { data: reminders } = await supabase
    .from('reminders').select('*').eq('family_id', profile.family_id).order('time');

  function formatTime(t: string) {
    const [h, m] = t.split(':').map(Number);
    return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reminders</h1>
          <p className="text-gray-500 text-sm mt-1">Medications, activities, and appointments.</p>
        </div>
        <Link href="/caregiver/reminders/new" className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors">
          <Plus className="w-4 h-4" /> Add reminder
        </Link>
      </div>

      {reminders && reminders.length > 0 ? (
        <div className="space-y-3">
          {reminders.map((r) => (
            <div key={r.id} className="bg-white rounded-xl border border-caregiver-border p-4 flex items-center gap-4">
              <div className="bg-amber-50 rounded-lg p-2.5">
                <Bell className="w-5 h-5 text-amber-600" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-900">{r.title}</p>
                <p className="text-sm text-gray-500">{typeLabel[r.type] ?? r.type} · {formatTime(r.time)}</p>
                {r.last_confirmed_at && (
                  <p className="text-xs text-green-600 mt-0.5">
                    Last confirmed: {new Date(r.last_confirmed_at).toLocaleString()}
                  </p>
                )}
              </div>
              {r.requires_confirmation && (
                <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full font-medium">
                  Needs confirmation
                </span>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-caregiver-border flex flex-col items-center justify-center py-20 text-center px-6">
          <Bell className="w-12 h-12 text-gray-200 mb-3" />
          <p className="font-semibold text-gray-700 text-lg">No reminders yet</p>
          <p className="text-gray-400 text-sm mt-1 mb-5">Add medication times, appointments, and activities.</p>
          <Link href="/caregiver/reminders/new" className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors">
            <Plus className="w-4 h-4" /> Add first reminder
          </Link>
        </div>
      )}
    </div>
  );
}
