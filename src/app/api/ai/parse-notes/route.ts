import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateJSON } from '@/lib/gemini';

// ── Types shared with the caregiver ProfileBuilder client ──────────────────

export interface ParsedPerson {
  name: string;
  relationship: string;
  notes: string | null;
}

export interface ParsedMemory {
  kind: 'photo' | 'music' | 'memory';
  title: string;
  description: string | null;
  prompt: string | null;
  era_year: number | null;
}

export interface ParsedRoutine {
  title: string;
  time_of_day: string;       // "HH:MM"
  days_of_week: string[];
  instructions: string | null;
}

export interface ParsedPatientUpdate {
  name: string | null;
  home_location_text: string | null;
}

export interface ParseNotesResponse {
  people: ParsedPerson[];
  memories: ParsedMemory[];
  routines: ParsedRoutine[];
  patient: ParsedPatientUpdate;
}

// ── Prompt ─────────────────────────────────────────────────────────────────

const SYSTEM = `You are a careful data extraction assistant helping a caregiver organize notes about an Alzheimer's/dementia patient.
Extract ONLY information that is EXPLICITLY stated in the notes. Never infer, invent, or guess.
Return valid JSON only — no markdown, no extra text.`;

function buildPrompt(notes: string): string {
  return `Extract structured data from these caregiver notes about a patient.

Return a JSON object with exactly these keys:
{
  "people": [ { "name": string, "relationship": string, "notes": string|null } ],
  "memories": [ { "kind": "music"|"photo"|"memory", "title": string, "description": string|null, "prompt": string|null, "era_year": number|null } ],
  "routines": [ { "title": string, "time_of_day": "HH:MM", "days_of_week": string[], "instructions": string|null } ],
  "patient": { "name": string|null, "home_location_text": string|null }
}

Rules:
- people: extract family members, friends, or anyone mentioned by name with a relationship
- memories: extract hobbies, favourite music, favourite places, stories (use kind="music" for music, "photo" for places/visual things, "memory" for stories/events)
- routines: extract any time-based habits or activities; use "HH:MM" 24-hour format; days_of_week as full English day names like ["Monday"] or [] for every day
- patient: extract the patient's own name and/or home location if mentioned; null if not stated
- For "prompt" fields in memories: write a gentle conversation question the caregiver could ask, e.g. "What was your favourite song by them?"
- Return empty arrays [] for any section with no data; never null for arrays

Notes:
"""
${notes}
"""`;
}

// ── Handler ────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest): Promise<NextResponse> {
  // Auth: caregiver only
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles').select('role, family_id').eq('id', user.id).single();
  if (profile?.role !== 'caregiver') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const notes: string = body.notes ?? '';
  if (!notes.trim()) {
    return NextResponse.json({ error: 'notes is required' }, { status: 400 });
  }
  if (notes.length > 5000) {
    return NextResponse.json({ error: 'Notes too long (max 5000 characters)' }, { status: 400 });
  }

  try {
    const parsed = await generateJSON<ParseNotesResponse>(buildPrompt(notes), SYSTEM);
    return NextResponse.json(parsed);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'AI error';
    if (msg.includes('timed out')) {
      return NextResponse.json({ error: 'The AI took too long to respond. Please try again.' }, { status: 504 });
    }
    if (msg.includes('GEMINI_API_KEY')) {
      return NextResponse.json({ error: 'AI is not configured. Ask the developer to set GEMINI_API_KEY.' }, { status: 503 });
    }
    return NextResponse.json({ error: 'Failed to parse notes. Please try again.' }, { status: 500 });
  }
}
