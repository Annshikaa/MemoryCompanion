import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateText } from '@/lib/gemini';
import type { CompanionRequest, CompanionResponse } from '@/lib/ai-types';

// ── System prompt ──────────────────────────────────────────────────────────

function buildSystemPrompt(caregiverName: string): string {
  return `You are a gentle, warm companion for someone living with Alzheimer's or dementia.
Your job is to answer their questions warmly and simply, drawing on the Family Data provided.

RULES — follow every one:
1. Answer ONLY from the "Family Data" section in this message. Use the facts listed there.
2. Keep answers SHORT: 1 to 3 simple sentences. Plain words only.
3. Speak directly and warmly to the person ("your brother", "your daughter").
4. NEVER add any person, place, event, or fact that is not present in the Family Data.
5. If the Family Data does not contain enough information to answer the question, say exactly:
   "I'm not sure about that. Let's ask ${caregiverName} — they'll know."
6. NEVER give medical advice. NEVER contradict any fact in the Family Data.
7. Keep tone calm and reassuring at all times.

Examples of correct behaviour:
- Family Data lists "Lovesh — your Brother" → question "Who is Lovesh?" → answer "Lovesh is your brother."
- Family Data does NOT list someone → question "Who is Rajesh?" → say "I'm not sure about that. Let's ask ${caregiverName} — they'll know."`;
}

// ── Context builder ────────────────────────────────────────────────────────

interface ContextData {
  patient: { name: string; home_location_text: string } | null;
  people: Array<{ name: string; relationship: string; notes: string | null }>;
  routines: Array<{ title: string; time_of_day: string }>;
  reminders: Array<{ title: string; time: string; type: string }>;
  memories: Array<{ title: string; description: string | null }>;
  contacts: Array<{ name: string; relationship: string; phone: string }>;
  caregiverName: string;
}

function buildContext(d: ContextData): string {
  const lines: string[] = ['=== Family Data ==='];

  if (d.patient) {
    lines.push(`\nPatient's name: ${d.patient.name}`);
    lines.push(`Where you are: ${d.patient.home_location_text}`);
  }

  if (d.people.length) {
    lines.push('\nFamily members and people you know:');
    for (const p of d.people) {
      const notePart = p.notes ? ` (${p.notes})` : '';
      lines.push(`  • ${p.name} — your ${p.relationship}${notePart}`);
    }
  }

  if (d.routines.length) {
    lines.push("\nToday's routines:");
    for (const r of d.routines) lines.push(`  • ${r.title} at ${r.time_of_day}`);
  }

  if (d.reminders.length) {
    lines.push("\nToday's reminders:");
    for (const r of d.reminders) lines.push(`  • ${r.title} at ${r.time} (${r.type})`);
  }

  if (d.memories.length) {
    lines.push('\nFavourite topics and memories:');
    for (const m of d.memories) {
      const desc = m.description ? `: ${m.description}` : '';
      lines.push(`  • ${m.title}${desc}`);
    }
  }

  if (d.contacts.length) {
    lines.push('\nEmergency contacts:');
    for (const c of d.contacts) lines.push(`  • ${c.name} — your ${c.relationship} (${c.phone})`);
  }

  lines.push(`\nCaregiver name: ${d.caregiverName}`);
  lines.push('=== End of Family Data ===');

  return lines.join('\n');
}

// ── Handler ────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest): Promise<NextResponse> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles').select('role, family_id, display_name').eq('id', user.id).single();
  if (profile?.role !== 'patient' || !profile.family_id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const familyId = profile.family_id;

  const body: CompanionRequest = await request.json().catch(() => ({ question: '' }));
  const question = (body.question ?? '').trim().slice(0, 500);
  if (!question) {
    return NextResponse.json({ error: 'question is required' }, { status: 400 });
  }

  // ── Retrieve family context — log every result individually ──────────────
  console.log('\n[companion] ─────────────────────────────────');
  console.log('[companion] user.id   :', user.id);
  console.log('[companion] familyId  :', familyId);
  console.log('[companion] question  :', question);

  const today = new Date();
  const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][today.getDay()];

  // Run queries individually so we can log each error
  const [
    { data: patient,         error: patientErr         },
    { data: people,          error: peopleErr          },
    { data: allRoutines,     error: routinesErr        },
    { data: allReminders,    error: remindersErr       },
    { data: memories,        error: memoriesErr        },
    { data: contacts,        error: contactsErr        },
    { data: caregiverProfile,error: caregiverErr       },
  ] = await Promise.all([
    supabase.from('patients').select('name, home_location_text').eq('family_id', familyId).maybeSingle(),
    supabase.from('people').select('name, relationship, notes').eq('family_id', familyId).limit(30),
    supabase.from('routines').select('title, time_of_day, days_of_week').eq('family_id', familyId),
    supabase.from('reminders').select('title, time, type').eq('family_id', familyId),
    supabase.from('reminiscence_items').select('title, description').eq('family_id', familyId).limit(15),
    supabase.from('emergency_contacts').select('name, relationship, phone').eq('family_id', familyId).limit(10),
    supabase.from('profiles').select('display_name').eq('family_id', familyId).eq('role', 'caregiver').limit(1).maybeSingle(),
  ]);

  // Log every query result + error so we can see exactly what's happening
  console.log('[companion] patient         :', patient?.name ?? 'null', patientErr ? '| ERR: ' + patientErr.message : '');
  console.log('[companion] people count    :', people?.length ?? 0,     peopleErr  ? '| ERR: ' + peopleErr.message  : '');
  console.log('[companion] people names    :', people?.map(p => p.name) ?? []);
  console.log('[companion] routines count  :', allRoutines?.length ?? 0, routinesErr  ? '| ERR: ' + routinesErr.message  : '');
  console.log('[companion] reminders count :', allReminders?.length ?? 0, remindersErr ? '| ERR: ' + remindersErr.message : '');
  console.log('[companion] memories count  :', memories?.length ?? 0,   memoriesErr  ? '| ERR: ' + memoriesErr.message  : '');
  console.log('[companion] contacts count  :', contacts?.length ?? 0,   contactsErr  ? '| ERR: ' + contactsErr.message  : '');
  console.log('[companion] caregiverName   :', caregiverProfile?.display_name ?? 'null', caregiverErr ? '| ERR: ' + caregiverErr.message : '');

  const todayRoutines = (allRoutines ?? []).filter(
    (r) => r.days_of_week.length === 0 || r.days_of_week.includes(dayName),
  );

  const caregiverName = caregiverProfile?.display_name ?? 'your family';

  const context = buildContext({
    patient: patient ?? null,
    people: people ?? [],
    routines: todayRoutines,
    reminders: allReminders ?? [],
    memories: memories ?? [],
    contacts: contacts ?? [],
    caregiverName,
  });

  console.log('[companion] context:\n' + context);

  const prompt = `${context}

Question from the patient: "${question}"

Using the Family Data above, answer the patient's question.`;

  // ── Call Gemini ────────────────────────────────────────────────────────────
  let answer: string;
  let deferred = false;

  try {
    console.log('[companion] calling Gemini...');
    answer = await generateText(prompt, buildSystemPrompt(caregiverName));
    console.log('[companion] Gemini answered:', answer);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[companion] Gemini FAILED:', msg);
    if (msg.includes('timed out')) {
      answer = `I'm having a little trouble right now. Let's ask ${caregiverName} — they'll know.`;
    } else if (msg.includes('GEMINI_API_KEY')) {
      answer = `I'm not set up yet. Please ask ${caregiverName} to help.`;
    } else {
      answer = `I'm not sure about that. Let's ask ${caregiverName} — they'll know.`;
    }
    deferred = true;
  }

  if (answer.toLowerCase().includes("let's ask") || answer.toLowerCase().includes("i'm not sure")) {
    deferred = true;
  }

  await supabase.from('events_log').insert({
    family_id: familyId,
    type: 'companion_question',
    detail: { question: question.slice(0, 200), deferred },
  });

  return NextResponse.json({ answer, deferred } satisfies CompanionResponse);
}
