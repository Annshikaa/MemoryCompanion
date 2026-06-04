import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Server-side proxy for POST /identify on the face service.
 *
 * Accessible to both patients and caregivers (anyone in the family).
 * family_id is injected server-side from the verified session — never
 * trusted from the client — so identification can never cross families.
 * The image frame is forwarded and immediately discarded; nothing is stored.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('family_id, role')
    .eq('id', user.id)
    .single();

  if (!profile?.family_id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const faceServiceUrl = process.env.FACE_SERVICE_URL;
  const serviceSecret  = process.env.FACE_SERVICE_SECRET;

  if (!faceServiceUrl || !serviceSecret) {
    return NextResponse.json(
      { error: 'Face service not configured. Set FACE_SERVICE_URL and FACE_SERVICE_SECRET.' },
      { status: 503 },
    );
  }

  const incoming = await request.formData();
  const imageFile = incoming.get('image');
  if (!imageFile || !(imageFile instanceof Blob)) {
    return NextResponse.json({ error: 'image file is required' }, { status: 400 });
  }

  // Build forwarded form — inject server-verified family_id (never trust client)
  const outgoing = new FormData();
  outgoing.set('family_id', profile.family_id);
  outgoing.set('image', imageFile);

  try {
    const res = await fetch(`${faceServiceUrl}/identify`, {
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
