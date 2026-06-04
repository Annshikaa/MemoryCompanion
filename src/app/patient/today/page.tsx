import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

const DAY_NAMES = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

function fmtTime(t: string) {
  const [h, m] = t.split(':').map(Number);
  const p = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${String(m).padStart(2,'0')} ${p}`;
}

const ROUTINE_ICONS: Record<string, string> = {
  morning: '🌅', breakfast: '🍳', lunch: '🥗', dinner: '🍽️', medication: '💊',
  walk: '🚶', exercise: '🤸', bath: '🛁', sleep: '😴', nap: '💤', tv: '📺',
  prayer: '🙏', music: '🎵', reading: '📖', default: '✨',
};
function routineIcon(title: string) {
  const t = title.toLowerCase();
  for (const [k, v] of Object.entries(ROUTINE_ICONS)) {
    if (t.includes(k)) return v;
  }
  return ROUTINE_ICONS.default;
}

const REMINDER_ICONS: Record<string, string> = {
  medication: '💊', activity: '🏃', appointment: '📅',
};

export default async function PatientTodayPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/patient-login');

  const { data: profile } = await supabase
    .from('profiles').select('family_id').eq('id', user.id).single();
  if (!profile?.family_id) redirect('/onboarding');

  const now      = new Date();
  const todayName = DAY_NAMES[now.getDay()];
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const [{ data: routines }, { data: reminders }] = await Promise.all([
    supabase.from('routines').select('*')
      .eq('family_id', profile.family_id)
      .contains('days_of_week', [todayName])
      .order('time_of_day'),
    supabase.from('reminders').select('*')
      .eq('family_id', profile.family_id)
      .order('time'),
  ]);

  // Merge routines + reminders into a single sorted timeline
  type TimelineItem = {
    id: string; kind: 'routine' | 'reminder';
    title: string; time: string; icon: string;
    subtitle?: string; minuteOfDay: number;
  };

  const items: TimelineItem[] = [
    ...(routines ?? []).map((r) => {
      const [h, m] = r.time_of_day.split(':').map(Number);
      return {
        id: r.id, kind: 'routine' as const,
        title: r.title, time: fmtTime(r.time_of_day),
        icon: routineIcon(r.title),
        subtitle: r.instructions ?? undefined,
        minuteOfDay: h * 60 + m,
      };
    }),
    ...(reminders ?? []).map((r) => {
      const [h, m] = r.time.split(':').map(Number);
      return {
        id: r.id, kind: 'reminder' as const,
        title: r.title, time: fmtTime(r.time),
        icon: REMINDER_ICONS[r.type] ?? '🔔',
        subtitle: r.type === 'medication' ? 'Time for your medicine' : undefined,
        minuteOfDay: h * 60 + m,
      };
    }),
  ].sort((a, b) => a.minuteOfDay - b.minuteOfDay);

  // Find "next" item — first one at or after now
  const nextIdx = items.findIndex((i) => i.minuteOfDay >= currentMinutes);

  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const dateStr = `${todayName}, ${now.getDate()} ${MONTHS[now.getMonth()]}`;

  return (
    <div className="flex flex-col min-h-screen pb-28" style={{ backgroundColor: '#fbf7f0' }}>

      {/* Header */}
      <div
        className="px-5 pt-8 pb-6"
        style={{ background: 'linear-gradient(180deg,#e8f4f0 0%,#fbf7f0 100%)' }}
      >
        <Link href="/patient"
          className="flex items-center gap-2 mb-5 self-start focus:outline-none focus:ring-4 focus:ring-teal-300 rounded-xl px-1 py-1"
          aria-label="Back to home"
        >
          <ArrowLeft style={{ width: '26px', height: '26px', color: '#3d7a6e' }} />
          <span style={{ fontSize: '18px', color: '#3d7a6e', fontWeight: 600 }}>Home</span>
        </Link>

        <h1 style={{ fontSize: '38px', fontWeight: 800, color: '#1a2e24', lineHeight: 1.2 }}>
          Today&apos;s Plan 📋
        </h1>
        <p style={{ fontSize: '20px', color: '#5cb89a', fontWeight: 500, marginTop: '4px' }}>
          {dateStr}
        </p>
      </div>

      <div className="px-5 max-w-lg mx-auto w-full">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <span style={{ fontSize: '64px', marginBottom: '16px' }} aria-hidden>🌿</span>
            <p style={{ fontSize: '26px', color: '#2b2b3a', fontWeight: 700 }}>Nothing planned today</p>
            <p style={{ fontSize: '20px', color: '#9ca3af', marginTop: '8px' }}>Enjoy your free day!</p>
          </div>
        ) : (
          <div className="relative mt-2">
            {/* Vertical timeline line */}
            <div
              className="absolute left-[28px] top-4 bottom-4 w-0.5"
              style={{ background: 'linear-gradient(180deg,#5cb89a33,#5cb89a22)' }}
              aria-hidden
            />

            <div className="space-y-4">
              {items.map((item, i) => {
                const isPast = item.minuteOfDay < currentMinutes;
                const isNext = i === nextIdx;

                return (
                  <div key={item.id} className="flex items-start gap-4 relative">
                    {/* Timeline dot */}
                    <div
                      className="shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center z-10"
                      style={{
                        background: isNext
                          ? 'linear-gradient(135deg,#2b5c4a,#3d7a6e)'
                          : isPast
                          ? '#f3f4f6'
                          : 'linear-gradient(135deg,#e5f5f0,#d8f0ea)',
                        boxShadow: isNext ? '0 4px 16px rgba(43,92,74,0.3)' : 'none',
                      }}
                    >
                      <span style={{ fontSize: '26px' }} aria-hidden>{item.icon}</span>
                    </div>

                    {/* Card */}
                    <div
                      className="flex-1 rounded-2xl px-4 py-3.5"
                      style={{
                        background: isNext
                          ? 'linear-gradient(135deg,#e8f4f0,#d8ede8)'
                          : isPast
                          ? '#f9fafb'
                          : '#fff',
                        border: isNext
                          ? '2px solid rgba(92,184,154,0.4)'
                          : `1px solid ${isPast ? '#f3f4f6' : '#f0f0f0'}`,
                        opacity: isPast ? 0.6 : 1,
                      }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p style={{ fontSize: '20px', fontWeight: 700, color: isPast ? '#9ca3af' : '#1a2e24', lineHeight: 1.25 }}>
                          {item.title}
                          {isPast && <span style={{ fontSize: '14px', color: '#9ca3af', marginLeft: '6px' }}>✓</span>}
                        </p>
                        {isNext && (
                          <span
                            className="shrink-0 text-xs font-bold px-2.5 py-1 rounded-full"
                            style={{ backgroundColor: '#2b5c4a', color: '#fff', fontSize: '11px' }}
                          >
                            NEXT
                          </span>
                        )}
                      </div>
                      <p style={{ fontSize: '16px', color: isNext ? '#3d7a6e' : '#9ca3af', fontWeight: 500, marginTop: '2px' }}>
                        {item.time}
                      </p>
                      {item.subtitle && (
                        <p style={{ fontSize: '15px', color: '#6b7280', marginTop: '4px', lineHeight: 1.4 }}>
                          {item.subtitle}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
