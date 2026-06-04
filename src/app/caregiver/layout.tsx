import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import CaregiverSidebar from '@/components/caregiver/Sidebar';
import CaregiverTopbar from '@/components/caregiver/Topbar';
import CriticalAlertBanner from '@/components/caregiver/CriticalAlertBanner';
import { getSeverity } from '@/lib/alert-severity';

export default async function CaregiverLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, display_name, family_id')
    .eq('id', user.id)
    .single();

  if (!profile?.family_id) redirect('/onboarding');
  if (profile.role !== 'caregiver') redirect('/patient');

  const [{ data: family }, { data: criticalRaw }] = await Promise.all([
    supabase.from('families').select('name, invite_code').eq('id', profile.family_id).single(),
    supabase
      .from('notifications')
      .select('*')
      .eq('family_id', profile.family_id)
      .eq('severity', 'critical')
      .neq('status', 'resolved')
      .order('created_at', { ascending: false })
      .limit(10),
  ]);

  // Ensure severity field exists for rows that predate migration 006
  const criticalAlerts = (criticalRaw ?? []).map((n) => ({
    ...n,
    severity: n.severity ?? getSeverity(n.type),
    status:   n.status   ?? 'new',
    acknowledged_at: n.acknowledged_at ?? null,
    acknowledged_by: n.acknowledged_by ?? null,
  }));

  return (
    <div className="min-h-screen bg-care-bg flex">
      <CaregiverSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <CaregiverTopbar
          displayName={profile.display_name}
          familyName={family?.name ?? ''}
          inviteCode={family?.invite_code ?? ''}
        />
        {/* Critical banner — persists until acknowledged */}
        <CriticalAlertBanner
          initialCritical={criticalAlerts}
          familyId={profile.family_id}
        />
        <main className="flex-1 p-6 lg:p-8 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
