import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import type { Tables } from '@/lib/supabase/database.types';

export const metadata = { title: 'Mood History — Memory Companion' };

type Checkin = Tables<'mood_checkins'>;

const MOOD_EMOJI: Record<string, string> = {
  happy:   '😊',
  okay:    '😐',
  sad:     '😢',
  anxious: '😰',
};
const MOOD_LABEL: Record<string, string> = {
  happy:   'Happy',
  okay:    'Okay',
  sad:     'Sad',
  anxious: 'Worried',
};
const MOOD_BG: Record<string, string> = {
  happy:   'bg-green-50  border-green-200',
  okay:    'bg-yellow-50 border-yellow-200',
  sad:     'bg-blue-50   border-blue-200',
  anxious: 'bg-pink-50   border-pink-200',
};

function groupByDate(checkins: Checkin[]): Array<{ date: string; items: Checkin[] }> {
  const map = new Map<string, Checkin[]>();
  for (const c of checkins) {
    const d = new Date(c.created_at).toLocaleDateString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric',
    });
    const arr = map.get(d) ?? [];
    arr.push(c);
    map.set(d, arr);
  }
  return Array.from(map.entries()).map(([date, items]) => ({ date, items }));
}

export default async function CaregiverMoodsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles').select('family_id').eq('id', user.id).single();
  if (!profile?.family_id) redirect('/onboarding');

  const { data: checkins } = await supabase
    .from('mood_checkins')
    .select('*')
    .eq('family_id', profile.family_id)
    .order('created_at', { ascending: false })
    .limit(90);

  const { data: patient } = await supabase
    .from('patients').select('name').eq('family_id', profile.family_id).maybeSingle();

  const groups = groupByDate(checkins ?? []);

  // Rolling 7-day mood tally
  const since7d = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const recent  = (checkins ?? []).filter((c) => c.created_at >= since7d);
  const tally   = recent.reduce<Record<string, number>>((acc, c) => {
    acc[c.mood] = (acc[c.mood] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="font-display text-2xl font-semibold text-care-text tracking-tight">
          Mood History
        </h1>
        <p className="text-care-text-muted text-sm mt-1">
          {patient?.name ? `${patient.name}'s` : 'Patient'} check-ins from the app.
        </p>
      </div>

      {/* 7-day summary */}
      {recent.length > 0 && (
        <div className="bg-white rounded-care-lg border border-care-border shadow-care-sm p-5 mb-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-care-text-subtle mb-3">
            Last 7 days — {recent.length} check-in{recent.length !== 1 ? 's' : ''}
          </p>
          <div className="flex gap-3 flex-wrap">
            {(Object.entries(tally) as Array<[string, number]>)
              .sort((a, b) => b[1] - a[1])
              .map(([mood, count]) => (
                <div
                  key={mood}
                  className={`flex items-center gap-2 rounded-full px-4 py-2 border text-sm font-semibold ${MOOD_BG[mood] ?? 'bg-gray-50 border-gray-200'}`}
                >
                  <span className="text-xl" aria-hidden>{MOOD_EMOJI[mood]}</span>
                  {MOOD_LABEL[mood]} × {count}
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Feed */}
      {groups.length === 0 ? (
        <div className="bg-white rounded-care-lg border border-care-border p-12 text-center shadow-care-sm">
          <p className="text-4xl mb-3" aria-hidden>😊</p>
          <p className="font-display font-semibold text-care-text text-lg">No check-ins yet</p>
          <p className="text-care-text-muted text-sm mt-1">
            Mood check-ins will appear here once the patient uses the app.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map(({ date, items }) => (
            <div key={date}>
              <p className="text-xs font-semibold uppercase tracking-widest text-care-text-subtle mb-2">
                {date}
              </p>
              <ul className="space-y-2">
                {items.map((c) => (
                  <li
                    key={c.id}
                    className={`flex items-center gap-4 rounded-care-lg border px-4 py-3 bg-white shadow-care-sm ${MOOD_BG[c.mood] ?? 'border-care-border'}`}
                  >
                    <span className="text-3xl shrink-0" aria-hidden>{MOOD_EMOJI[c.mood]}</span>
                    <div className="flex-1">
                      <p className="font-semibold text-care-text text-sm">
                        {MOOD_LABEL[c.mood] ?? c.mood}
                      </p>
                      {c.note && (
                        <p className="text-xs text-care-text-muted mt-0.5 italic">{c.note}</p>
                      )}
                    </div>
                    <p className="text-xs text-care-text-subtle shrink-0">
                      {new Date(c.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
