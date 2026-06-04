import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { ArrowLeft } from 'lucide-react';

export const metadata = { title: 'Weekly Reports — Memory Companion' };

export default async function ReportsListPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles').select('family_id', ).eq('id', user.id).single();
  if (!profile?.family_id) redirect('/onboarding');

  const { data: reports } = await supabase
    .from('cognitive_reports')
    .select('id, days, period_start, period_end, summary_text, ai_generated, created_at')
    .eq('family_id', profile.family_id)
    .order('created_at', { ascending: false })
    .limit(20);

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/caregiver/monitoring"
          className="text-care-text-muted hover:text-care-text transition-colors"
          aria-label="Back to monitoring"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="font-display text-2xl font-semibold text-care-text tracking-tight">
            Weekly Reports
          </h1>
          <p className="text-care-text-muted text-sm mt-0.5">
            AI-generated summaries from your monitoring data.
          </p>
        </div>
      </div>

      {!reports || reports.length === 0 ? (
        <div className="bg-white rounded-care-lg border border-care-border p-12 text-center shadow-care-sm">
          <p className="text-3xl mb-3" aria-hidden>📋</p>
          <p className="font-display font-semibold text-care-text text-lg">No reports yet</p>
          <p className="text-care-text-muted text-sm mt-1">
            Generate your first report from the{' '}
            <Link href="/caregiver/monitoring" className="text-care-primary hover:underline">
              Monitoring dashboard
            </Link>.
          </p>
        </div>
      ) : (
        <ul className="space-y-4">
          {reports.map((r) => {
            const start = new Date(r.period_start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            const end   = new Date(r.period_end).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
            const preview = r.summary_text.length > 200
              ? r.summary_text.slice(0, 200) + '…'
              : r.summary_text;

            return (
              <li key={r.id}>
                <Link
                  href={`/caregiver/monitoring/reports/${r.id}`}
                  className="block bg-white rounded-care-lg border border-care-border shadow-care-sm p-5 hover:shadow-care transition-shadow"
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <p className="font-semibold text-care-text text-sm">
                        {r.days}-day summary · {start} – {end}
                      </p>
                      <p className="text-xs text-care-text-subtle mt-0.5">
                        Generated {new Date(r.created_at).toLocaleString()}
                      </p>
                    </div>
                    <span className={`shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full ${r.ai_generated ? 'bg-care-primary-light text-care-primary' : 'bg-care-bg text-care-text-muted'}`}>
                      {r.ai_generated ? 'AI' : 'Template'}
                    </span>
                  </div>
                  <p className="text-sm text-care-text-muted leading-relaxed">{preview}</p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
