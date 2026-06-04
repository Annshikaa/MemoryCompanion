import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { AlertStatus } from '@/lib/alert-severity';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles').select('family_id, role').eq('id', user.id).single();
  if (profile?.role !== 'caregiver' || !profile.family_id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body: { action?: 'acknowledge' | 'resolve' } = await request.json().catch(() => ({}));
  if (!body.action) return NextResponse.json({ error: 'action is required' }, { status: 400 });

  const newStatus: AlertStatus = body.action === 'resolve' ? 'resolved' : 'acknowledged';

  // Verify notification belongs to this family (cross-family isolation)
  const { data: existing } = await supabase
    .from('notifications').select('id, family_id').eq('id', id).maybeSingle();
  if (!existing || existing.family_id !== profile.family_id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const { data: updated, error } = await supabase
    .from('notifications')
    .update({
      status:          newStatus,
      acknowledged_at: new Date().toISOString(),
      acknowledged_by: user.id,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(updated);
}
