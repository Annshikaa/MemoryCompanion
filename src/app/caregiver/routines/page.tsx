import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Clock, Plus } from 'lucide-react';

export default async function CaregiverRoutinesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('family_id')
    .eq('id', user.id)
    .single();

  if (!profile?.family_id) redirect('/onboarding');

  const { data: routines } = await supabase
    .from('routines')
    .select('*')
    .eq('family_id', profile.family_id)
    .order('time_of_day');

  function formatTime(t: string) {
    const [h, m] = t.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${period}`;
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Routines</h1>
          <p className="text-gray-500 text-sm mt-1">Daily routines shown to the patient by time of day.</p>
        </div>
        <Link
          href="/caregiver/routines/new"
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors"
        >
          <Plus className="w-4 h-4" /> Add routine
        </Link>
      </div>

      {routines && routines.length > 0 ? (
        <div className="space-y-3">
          {routines.map((r) => (
            <div
              key={r.id}
              className="bg-white rounded-xl border border-caregiver-border p-4 flex items-center gap-4"
            >
              <div className="bg-purple-50 rounded-lg p-2.5">
                <Clock className="w-5 h-5 text-purple-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900">{r.title}</p>
                <p className="text-sm text-gray-500">
                  {formatTime(r.time_of_day)} · {r.days_of_week.join(', ') || 'Every day'}
                </p>
                {r.instructions && (
                  <p className="text-sm text-gray-400 truncate">{r.instructions}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-caregiver-border flex flex-col items-center justify-center py-20 text-center px-6">
          <Clock className="w-12 h-12 text-gray-200 mb-3" />
          <p className="font-semibold text-gray-700 text-lg">No routines yet</p>
          <p className="text-gray-400 text-sm mt-1 mb-5">Add daily routines like morning walks or meal times.</p>
          <Link href="/caregiver/routines/new" className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors">
            <Plus className="w-4 h-4" /> Add first routine
          </Link>
        </div>
      )}
    </div>
  );
}
