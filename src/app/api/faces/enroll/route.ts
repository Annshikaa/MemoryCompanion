import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Server-side proxy for POST /enroll on the face service.
 *
 * Runs on the server so SERVICE_SECRET is never exposed to the browser.
 * Overrides family_id with the caregiver's actual family to prevent spoofing.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  // Auth: verify caregiver session
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('family_id, role')
    .eq('id', user.id)
    .single();

  if (!profile?.family_id || profile.role !== 'caregiver') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Config
  const faceServiceUrl  = process.env.FACE_SERVICE_URL;
  const serviceSecret   = process.env.FACE_SERVICE_SECRET;

  if (!faceServiceUrl || !serviceSecret) {
    return NextResponse.json(
      { error: 'Face service not configured. Set FACE_SERVICE_URL and FACE_SERVICE_SECRET.' },
      { status: 503 },
    );
  }

  // Read incoming form data
  const incoming = await request.formData();
  const personId = incoming.get('person_id');
  if (!personId || typeof personId !== 'string') {
    return NextResponse.json({ error: 'person_id is required' }, { status: 400 });
  }

  // Verify the person belongs to this caregiver's family
  const { data: person } = await supabase
    .from('people')
    .select('id')
    .eq('id', personId)
    .eq('family_id', profile.family_id)
    .maybeSingle();

  if (!person) {
    return NextResponse.json({ error: 'Person not found in your family' }, { status: 404 });
  }

  // Build forwarded form — override family_id with server-verified value
  const outgoing = new FormData();
  outgoing.set('person_id',  personId);
  outgoing.set('family_id',  profile.family_id);  // trusted server value

  const imageFile = incoming.get('image');
  if (!imageFile || !(imageFile instanceof Blob)) {
    return NextResponse.json({ error: 'image file is required' }, { status: 400 });
  }
  outgoing.set('image', imageFile);

  // Forward to face service
  try {
    const res = await fetch(`${faceServiceUrl}/enroll`, {
      method: 'POST',
      headers: { 'X-Service-Key': serviceSecret },
      body: outgoing,
    });

    const json = await res.json();
    return NextResponse.json(json, { status: res.status });
  } catch {
    return NextResponse.json(
      { error: 'Face service is unreachable. Is it running?' },
      { status: 503 },
    );
  }
}
