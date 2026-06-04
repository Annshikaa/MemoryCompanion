import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Bell } from 'lucide-react';

export default async function PatientRemindersPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('family_id')
    .eq('id', user.id)
    .single();

  if (!profile?.family_id) redirect('/onboarding');

  const { data: reminders } = await supabase
    .from('reminders')
    .select('*')
    .eq('family_id', profile.family_id)
    .order('time');

  function formatTime(t: string) {
    const [h, m] = t.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const hour = h % 12 || 12;
    return `${hour}:${String(m).padStart(2, '0')} ${period}`;
  }

  const typeEmoji: Record<string, string> = {
    medication: '💊',
    activity: '🏃',
    appointment: '📅',
  };

  return (
    <div className="flex flex-col min-h-screen px-6 pt-8 pb-28 max-w-2xl mx-auto w-full">
      <h1
        className="font-bold text-center mb-8"
        style={{ fontSize: '40px', color: '#2b2b3a' }}
      >
        Reminders
      </h1>

      {reminders && reminders.length > 0 ? (
        <div className="space-y-4">
          {reminders.map((reminder) => (
            <div
              key={reminder.id}
              className="rounded-3xl px-6 py-5 flex items-center gap-5"
              style={{ backgroundColor: '#fdf0e3' }}
            >
              <div
                className="rounded-2xl p-3 shrink-0 text-3xl leading-none"
                style={{ backgroundColor: '#f0a05a', minWidth: '60px', minHeight: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                {typeEmoji[reminder.type] ?? '🔔'}
              </div>
              <div>
                <p
                  className="font-bold"
                  style={{ fontSize: '26px', color: '#2b2b3a' }}
                >
                  {reminder.title}
                </p>
                <p style={{ fontSize: '20px', color: '#f0a05a' }}>
                  {formatTime(reminder.time)}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center flex-1 text-center py-20">
          <div
            className="rounded-full p-8 mb-6"
            style={{ backgroundColor: '#fdf0e3' }}
          >
            <Bell className="w-16 h-16" style={{ color: '#f0a05a' }} />
          </div>
          <p style={{ fontSize: '26px', color: '#2b2b3a', fontWeight: 600 }}>
            No reminders yet
          </p>
          <p className="mt-2" style={{ fontSize: '20px', color: '#9ca3af' }}>
            Your caregiver will add them here.
          </p>
        </div>
      )}
    </div>
  );
}
