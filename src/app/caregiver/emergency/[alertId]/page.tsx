import { redirect, notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import EmergencyModeClient from '@/components/caregiver/EmergencyModeClient';
import type { EmergencyData } from '@/components/caregiver/EmergencyModeClient';

export const metadata = { title: '🆘 Emergency Mode — Memory Companion' };

export default async function EmergencyModePage({
  params,
}: {
  params: Promise<{ alertId: string }>;
}) {
  const { alertId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles').select('family_id, role').eq('id', user.id).single();
  if (!profile?.family_id || profile.role !== 'caregiver') redirect('/caregiver');

  const familyId = profile.family_id;

  // Verify alert belongs to this family
  const { data: alert } = await supabase
    .from('notifications')
    .select('id, type, severity, status, created_at, detail')
    .eq('id', alertId)
    .eq('family_id', familyId)
    .maybeSingle();

  if (!alert) notFound();

  // Fetch everything in parallel
  const [
    { data: patient },
    { data: latestPing },
    { data: locationSettings },
    { data: contacts },
    { data: medicalInfo },
  ] = await Promise.all([
    supabase.from('patients')
      .select('name, photo_url, home_location_text')
      .eq('family_id', familyId)
      .maybeSingle(),

    supabase.from('location_pings')
      .select('lat, lng, inside_zone, created_at')
      .eq('family_id', familyId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),

    supabase.from('location_settings')
      .select('sharing_enabled, home_lat, home_lng, radius_m')
      .eq('family_id', familyId)
      .maybeSingle(),

    supabase.from('emergency_contacts')
      .select('id, name, relationship, phone, photo_url, priority')
      .eq('family_id', familyId)
      .order('priority'),

    supabase.from('patient_medical_info')
      .select('allergies, medications, conditions, notes, updated_at')
      .eq('family_id', familyId)
      .maybeSingle(),
  ]);

  const data: EmergencyData = {
    alertId:         alert.id,
    alertType:       alert.type,
    alertStatus:     alert.status as 'new' | 'acknowledged' | 'resolved',
    alertCreatedAt:  alert.created_at,
    alertDetail:     alert.detail as Record<string, unknown> | null,
    familyId,
    patientName:     patient?.name ?? 'Patient',
    patientPhotoUrl: patient?.photo_url ?? null,
    latestPing:      latestPing ?? null,
    locationSettings: locationSettings ?? null,
    contacts:        (contacts ?? []).map((c) => ({
      id:           c.id,
      name:         c.name,
      relationship: c.relationship,
      phone:        c.phone,
      photo_url:    c.photo_url,
      priority:     c.priority,
    })),
    medicalInfo: medicalInfo ?? null,
  };

  return <EmergencyModeClient data={data} />;
}
