import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { ArrowLeft } from 'lucide-react';
import type { AllMetrics } from '@/lib/metrics';

export const metadata = { title: 'Report — Memory Companion' };

export default async function ReportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles').select('family_id').eq('id', user.id).single();
  if (!profile?.family_id) redirect('/onboarding');

  const { data: report } = await supabase
    .from('cognitive_reports')
    .select('*')
    .eq('id', id)
    .eq('family_id', profile.family_id)  // RLS + explicit family check
    .single();

  if (!report) notFound();

  const metrics = report.metrics_json as unknown as AllMetrics;
  const start   = new Date(report.period_start).toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
  const end     = new Date(report.period_end).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/caregiver/monitoring/reports"
          className="text-care-text-muted hover:text-care-text transition-colors"
          aria-label="Back to reports"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="font-display text-2xl font-semibold text-care-text tracking-tight">
            {report.days}-Day Report
          </h1>
          <p className="text-care-text-muted text-sm mt-0.5">
            {start} – {end}
          </p>
        </div>
        <span className={`ml-auto text-xs font-semibold px-2.5 py-1 rounded-full ${report.ai_generated ? 'bg-care-primary-light text-care-primary' : 'bg-care-bg text-care-text-muted'}`}>
          {report.ai_generated ? 'AI-generated' : 'Template summary'}
        </span>
      </div>

      {/* Summary */}
      <div className="bg-white rounded-care-lg border border-care-border shadow-care-sm p-6 mb-5">
        <p className="text-xs font-semibold uppercase tracking-widest text-care-text-subtle mb-3">
          Summary
        </p>
        <p className="text-care-text leading-relaxed text-base whitespace-pre-line">
          {report.summary_text}
        </p>
      </div>

      {/* Snapshot from stored metrics */}
      {metrics && (
        <div className="bg-white rounded-care-lg border border-care-border shadow-care-sm p-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-care-text-subtle mb-4">
            Metrics snapshot (at time of generation)
          </p>
          <dl className="space-y-3">
            {metrics.adherence?.hasData && (
              <div className="flex justify-between text-sm">
                <dt className="text-care-text-muted">Reminder adherence</dt>
                <dd className="font-semibold text-care-text">
                  {metrics.adherence.overallRate ?? 0}% ({metrics.adherence.totalDone}/{metrics.adherence.totalDue})
                </dd>
              </div>
            )}
            {metrics.mood?.hasData && (
              <div className="flex justify-between text-sm">
                <dt className="text-care-text-muted">Mood check-ins</dt>
                <dd className="font-semibold text-care-text">
                  {metrics.mood.total} recorded · trend: {metrics.mood.direction}
                </dd>
              </div>
            )}
            {metrics.cognitive?.hasData && (
              <div className="flex justify-between text-sm">
                <dt className="text-care-text-muted">Game sessions</dt>
                <dd className="font-semibold text-care-text">
                  {metrics.cognitive.sessionsTotal}
                  {metrics.cognitive.avgScore !== null ? `, avg ${metrics.cognitive.avgScore}%` : ''}
                </dd>
              </div>
            )}
            {metrics.confusion?.hasData && (
              <div className="flex justify-between text-sm">
                <dt className="text-care-text-muted">Companion questions</dt>
                <dd className="font-semibold text-care-text">
                  {metrics.confusion.totalQuestions} total · {metrics.confusion.deferredCount} deferred
                </dd>
              </div>
            )}
            {metrics.activity?.hasData && (
              <div className="flex justify-between text-sm">
                <dt className="text-care-text-muted">App activity</dt>
                <dd className="font-semibold text-care-text">
                  ~{metrics.activity.avgPerDay ?? 0} interactions/day
                </dd>
              </div>
            )}
          </dl>
        </div>
      )}

      <p className="text-xs text-care-text-subtle text-center mt-5">
        This report is an observational summary from app usage data only.
        It is not a medical assessment or diagnostic tool.
        Consult a healthcare professional for any medical concerns.
      </p>
    </div>
  );
}
