import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateText } from '@/lib/gemini';
import type { DailySummaryResponse } from '@/lib/ai-types';

const SYSTEM = `You are a compassionate assistant helping a caregiver understand how their loved one's day has been going.
Summarize the events in a short, kind, plain-language paragraph — 3-5 sentences maximum.
Use "your loved one" or the patient's name (if provided). Be warm and factual.
Do not invent events not listed. If there are no events, say so gently.`;

export async function POST(): Promise<NextResponse> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles').select('role, family_id').eq('id', user.id).single();
  if (profile?.role !== 'caregiver' || !profile.family_id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const familyId = profile.family_id;

  // Fetch last 24 h of notifications + events_log
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const [{ data: notifications }, { data: events }, { data: patient }] = await Promise.all([
    supabase
      .from('notifications')
      .select('type, detail, created_at')
      .eq('family_id', familyId)
      .gte('created_at', since)
      .order('created_at', { ascending: true }),
    supabase
      .from('events_log')
      .select('type, detail, created_at')
      .eq('family_id', familyId)
      .gte('created_at', since)
      .order('created_at', { ascending: true }),
    supabase
      .from('patients')
      .select('name')
      .eq('family_id', familyId)
      .maybeSingle(),
  ]);

  const patientName = patient?.name ?? 'your loved one';
  const allEvents = [
    ...(notifications ?? []).map((n) => ({
      time: new Date(n.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      type: n.type,
      detail: n.detail as Record<string, unknown> | null,
    })),
    ...(events ?? []).map((e) => ({
      time: new Date(e.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      type: e.type,
      detail: e.detail as Record<string, unknown> | null,
    })),
  ];

  const now = new Date();
  const periodLabel = `${now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} — last 24 hours`;

  if (allEvents.length === 0) {
    return NextResponse.json({
      summary: `No activity has been recorded for ${patientName} in the last 24 hours. This could mean a quiet day, or that the app hasn't been active on their device.`,
      periodLabel,
    } satisfies DailySummaryResponse);
  }

  const eventLines = allEvents
    .map((e) => {
      const title = typeof e.detail?.title === 'string' ? e.detail.title : '';
      return `[${e.time}] ${e.type}${title ? ': ' + title : ''}`;
    })
    .join('\n');

  const prompt = `Patient name: ${patientName}
Period: ${periodLabel}

Events:
${eventLines}

Write a short, kind summary of ${patientName}'s day based on these events.`;

  try {
    const summary = await generateText(prompt, SYSTEM);
    return NextResponse.json({ summary, periodLabel } satisfies DailySummaryResponse);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'AI error';
    if (msg.includes('timed out')) {
      return NextResponse.json({ error: 'The AI took too long. Please try again.' }, { status: 504 });
    }
    if (msg.includes('GEMINI_API_KEY')) {
      return NextResponse.json({ error: 'AI is not configured. Set GEMINI_API_KEY in .env.local.' }, { status: 503 });
    }
    return NextResponse.json({ error: 'Failed to generate summary. Please try again.' }, { status: 500 });
  }
}
