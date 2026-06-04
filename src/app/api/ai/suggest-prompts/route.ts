import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateJSON } from '@/lib/gemini';
import type { SuggestPromptsRequest, SuggestPromptsResponse, ParsedMemory } from '@/lib/ai-types';

const SYSTEM = `You are a reminiscence therapy assistant helping caregivers of Alzheimer's/dementia patients.
Generate gentle, warm conversation prompts and memory suggestions based on the background provided.
Return valid JSON only — no markdown, no extra text.`;

function buildPrompt(req: SuggestPromptsRequest): string {
  const parts: string[] = [];
  if (req.person) parts.push(`Person: ${req.person}`);
  if (req.era) parts.push(`Era/Decade: ${req.era}`);
  if (req.background) parts.push(`Background: ${req.background}`);

  return `Generate 6-8 reminiscence items for a dementia patient based on this background:

${parts.join('\n') || '(no specific background provided — generate general gentle prompts)'}

Return a JSON object:
{
  "items": [
    {
      "kind": "music"|"photo"|"memory",
      "title": string,
      "description": string|null,
      "prompt": string,
      "era_year": number|null
    }
  ]
}

Rules:
- "prompt" must be a gentle, open-ended question a caregiver could ask, e.g. "Do you remember what you loved about that song?"
- Use kind="music" for songs/musicians, "photo" for places/visual memories, "memory" for stories/events
- Keep titles short (3-6 words)
- Keep prompts warm, simple, non-stressful — avoid questions with right/wrong answers
- era_year: best estimate of the year, or null
- Return 6-8 items
- All strings must be non-null except description and era_year`;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'caregiver') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body: SuggestPromptsRequest = await request.json().catch(() => ({}));

  try {
    const result = await generateJSON<{ items: ParsedMemory[] }>(buildPrompt(body), SYSTEM);
    const items = (result.items ?? []).map((item) => ({
      ...item,
      prompt: item.prompt ?? '',
    }));
    return NextResponse.json({ items } satisfies SuggestPromptsResponse);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'AI error';
    if (msg.includes('timed out')) {
      return NextResponse.json({ error: 'The AI took too long. Please try again.' }, { status: 504 });
    }
    if (msg.includes('GEMINI_API_KEY')) {
      return NextResponse.json({ error: 'AI is not configured. Set GEMINI_API_KEY in .env.local.' }, { status: 503 });
    }
    return NextResponse.json({ error: 'Failed to generate prompts. Please try again.' }, { status: 500 });
  }
}
