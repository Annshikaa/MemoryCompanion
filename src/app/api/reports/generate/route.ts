import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAllMetrics, metricsToPromptContext, buildTemplateSummary } from '@/lib/metrics';
import { generateText } from '@/lib/gemini';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles').select('family_id, role').eq('id', user.id).single();
  if (profile?.role !== 'caregiver' || !profile.family_id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body: { days?: number } = await request.json().catch(() => ({}));
  const days = body.days === 30 ? 30 : 7;

  const { data: patient } = await supabase
    .from('patients').select('name').eq('family_id', profile.family_id).maybeSingle();

  // Compute metrics
  const metrics = await getAllMetrics(supabase, profile.family_id, days);

  // Build LLM prompt (summarised metrics only — no PII dumps)
  const context = metricsToPromptContext(metrics);
  const prompt  = `You are a supportive care assistant helping a caregiver who looks after someone with Alzheimer's or dementia.

Here are observed patterns from the companion app over the past ${days} days:
${context}

Write a SHORT (4–6 sentences), KIND, PLAIN-LANGUAGE summary for the caregiver covering:
1. What went well or stayed stable
2. Anything that changed or is worth keeping an eye on
3. One gentle, practical suggestion
4. A clear statement that this is observational only and not medical advice

Rules:
- No clinical language or diagnoses
- Warm and encouraging tone
- Plain sentences only — no bullet points, no markdown
- End with the disclaimer about not being medical advice`;

  let summaryText: string;
  let aiGenerated = false;

  try {
    const raw = await Promise.race([
      generateText(prompt),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 8_000)),
    ]);
    summaryText  = raw.trim();
    aiGenerated  = true;
  } catch (err) {
    console.warn('[report/generate] AI unavailable, using template:', (err as Error).message);
    summaryText = buildTemplateSummary(metrics);
  }

  // Store report
  const { data: report, error } = await supabase
    .from('cognitive_reports')
    .insert({
      family_id:    profile.family_id,
      period_start: metrics.periodStart,
      period_end:   metrics.periodEnd,
      days,
      metrics_json: metrics as unknown as Record<string, unknown>,
      summary_text: summaryText,
      ai_generated: aiGenerated,
    })
    .select()
    .single();

  if (error) {
    console.error('[report/generate] insert error:', error.message);
    return NextResponse.json({ error: 'Could not save report' }, { status: 500 });
  }

  return NextResponse.json({ id: report.id, summary: summaryText, ai_generated: aiGenerated });
}
