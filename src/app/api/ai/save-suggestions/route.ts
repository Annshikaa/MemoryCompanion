import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type {
  SaveSuggestionsRequest,
  SaveSuggestionsResponse,
} from '@/lib/ai-types';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles').select('role, family_id').eq('id', user.id).single();
  if (profile?.role !== 'caregiver' || !profile.family_id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const familyId = profile.family_id;

  const body: SaveSuggestionsRequest = await request.json().catch(() => ({}));

  const saved: SaveSuggestionsResponse['saved'] = {
    people: 0,
    memories: 0,
    routines: 0,
    patientUpdated: false,
  };

  // Insert people
  if (body.people?.length) {
    const rows = body.people.map((p) => ({
      family_id: familyId,
      name: p.name,
      relationship: p.relationship,
      notes: p.notes ?? null,
    }));
    const { error } = await supabase.from('people').insert(rows);
    if (!error) saved.people = rows.length;
  }

  // Insert reminiscence items
  if (body.memories?.length) {
    const rows = body.memories.map((m) => ({
      family_id: familyId,
      kind: m.kind,
      title: m.title,
      description: m.description ?? null,
      prompt: m.prompt ?? null,
      era_year: m.era_year ?? null,
    }));
    const { error } = await supabase.from('reminiscence_items').insert(rows);
    if (!error) saved.memories = rows.length;
  }

  // Insert routines
  if (body.routines?.length) {
    const rows = body.routines.map((r) => ({
      family_id: familyId,
      title: r.title,
      time_of_day: r.time_of_day,
      days_of_week: r.days_of_week,
      instructions: r.instructions ?? null,
    }));
    const { error } = await supabase.from('routines').insert(rows);
    if (!error) saved.routines = rows.length;
  }

  // Update or insert patient info
  if (body.patient && (body.patient.name || body.patient.home_location_text)) {
    const { data: existing } = await supabase
      .from('patients').select('id').eq('family_id', familyId).maybeSingle();

    if (existing) {
      const update: Record<string, string> = {};
      if (body.patient.name) update.name = body.patient.name;
      if (body.patient.home_location_text) update.home_location_text = body.patient.home_location_text;
      const { error } = await supabase.from('patients').update(update).eq('id', existing.id);
      if (!error) saved.patientUpdated = true;
    } else if (body.patient.name) {
      const { error } = await supabase.from('patients').insert({
        family_id: familyId,
        name: body.patient.name,
        home_location_text: body.patient.home_location_text ?? 'You are at home',
      });
      if (!error) saved.patientUpdated = true;
    }
  }

  return NextResponse.json({ saved } satisfies SaveSuggestionsResponse);
}
