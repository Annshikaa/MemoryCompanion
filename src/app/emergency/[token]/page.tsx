/**
 * Public Emergency Medical Card — /emergency/[token]
 *
 * SECURITY DESIGN:
 *  • No authentication required — anyone scanning the QR code can view it.
 *  • Uses the service-role client (server-side only, never sent to browser).
 *  • Returns ONLY the fields where the caregiver explicitly set show_* = TRUE.
 *  • The resulting `publicCard` object sent to React contains NO family_id,
 *    NO internal IDs, and NO data beyond the approved whitelist.
 *  • Token is a random UUID (2^122 entropy) — brute-forcing is infeasible.
 *  • is_public must be TRUE — deactivated cards return 404.
 *
 * What this page CANNOT leak even if someone manipulates the URL:
 *  • Other patients' data (token uniquely identifies one row)
 *  • Non-approved fields (whitelisted by show_* flags in code, not in query)
 *  • App navigation or auth UI (standalone page, no layouts)
 */

import { notFound } from 'next/navigation';
import Image from 'next/image';
import { createServiceClient } from '@/lib/supabase/service';
import { Phone, AlertTriangle, Pill, Heart, UserCircle } from 'lucide-react';
import { PrintButton } from '@/components/PrintButton';

export const dynamic = 'force-dynamic'; // never cache — token may be revoked

// ── Public-safe card shape (only approved fields, no internal IDs) ────────
interface PublicCard {
  name:        string | null;
  photo_url:   string | null;
  allergies:   string | null;
  medications: string | null;
  conditions:  string | null;
  contacts:    Array<{ name: string; relationship: string; phone: string }> | null;
}

export default async function PublicEmergencyCardPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  // Validate token format (prevent injection / obviously bad inputs)
  if (!token || token.length > 64 || !/^[a-zA-Z0-9_-]+$/.test(token)) {
    notFound();
  }

  // ── Service-role query: ONLY the fields we need to enforce the whitelist ──
  // If SUPABASE_SERVICE_ROLE_KEY is not configured, show a safe fallback
  // rather than an unhandled 500 — first responders must not see a blank error.
  let service: ReturnType<typeof createServiceClient> | null = null;
  try { service = createServiceClient(); } catch { /* key not configured */ }

  if (!service) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#fbf7f0', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ maxWidth: '400px', textAlign: 'center' }}>
          <p style={{ fontSize: '18px', fontWeight: 700, color: '#b91c1c' }}>Card temporarily unavailable</p>
          <p style={{ fontSize: '15px', color: '#6b7280', marginTop: '8px' }}>Please call emergency services (112 / 911) or contact this person&apos;s family directly.</p>
        </div>
      </div>
    );
  }

  const { data: card } = await service
    .from('patient_medical_info')
    .select([
      'family_id',
      'allergies', 'medications', 'conditions',
      'show_name', 'show_photo',
      'show_allergies', 'show_medications', 'show_conditions', 'show_contacts',
    ].join(', '))
    .eq('public_token', token)
    .eq('is_public', true)
    .maybeSingle();

  if (!card) notFound();

  // ── Conditionally fetch patient info (only if flags enabled) ─────────────
  let name:      string | null = null;
  let photo_url: string | null = null;

  if (card.show_name || card.show_photo) {
    const { data: patient } = await service
      .from('patients')
      .select('name, photo_url')
      .eq('family_id', card.family_id)
      .maybeSingle();

    if (card.show_name)  name      = patient?.name      ?? null;
    if (card.show_photo) photo_url = patient?.photo_url ?? null;
  }

  // ── Conditionally fetch contacts ─────────────────────────────────────────
  let contacts: PublicCard['contacts'] = null;

  if (card.show_contacts) {
    const { data: contactRows } = await service
      .from('emergency_contacts')
      .select('name, relationship, phone')
      .eq('family_id', card.family_id)
      .order('priority')
      .limit(5); // hard cap — no unbounded exposure
    contacts = (contactRows ?? []).map((c) => ({
      name: c.name, relationship: c.relationship, phone: c.phone,
    }));
  }

  // ── Build the whitelisted public card — nothing else reaches the renderer ─
  const publicCard: PublicCard = {
    name,
    photo_url,
    allergies:   card.show_allergies   ? (card.allergies   ?? null) : null,
    medications: card.show_medications ? (card.medications ?? null) : null,
    conditions:  card.show_conditions  ? (card.conditions  ?? null) : null,
    contacts,
  };

  const hasAnyInfo = publicCard.name || publicCard.allergies ||
    publicCard.medications || publicCard.conditions ||
    (publicCard.contacts?.length ?? 0) > 0;

  return (
    // Standalone page — NO app layout, NO nav, NO edit controls
    <div
      className="min-h-screen py-8 px-4"
      style={{ backgroundColor: '#fbf7f0', fontFamily: 'system-ui, sans-serif' }}
    >
      <div className="max-w-md mx-auto space-y-5">

        {/* Header */}
        <div
          className="rounded-2xl px-5 py-4 text-center"
          style={{ backgroundColor: '#fef2f2', border: '2px solid #fca5a5' }}
        >
          <p style={{ fontSize: '13px', fontWeight: 700, color: '#b91c1c', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '4px' }}>
            🆘 Emergency Medical Information
          </p>
          <p style={{ fontSize: '13px', color: '#9ca3af' }}>
            Shared by this patient&apos;s caregiver · Read only
          </p>
        </div>

        {!hasAnyInfo ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center">
            <p style={{ fontSize: '18px', color: '#6b7280' }}>
              No information has been approved for this card yet.
            </p>
          </div>
        ) : (
          <>
            {/* Patient identity */}
            {(publicCard.name || publicCard.photo_url) && (
              <div className="rounded-2xl bg-white border border-gray-200 p-5 flex items-center gap-4">
                <div
                  className="rounded-full overflow-hidden shrink-0 flex items-center justify-center"
                  style={{ width: '72px', height: '72px', backgroundColor: '#e8f0fd' }}
                >
                  {publicCard.photo_url ? (
                    <Image
                      src={publicCard.photo_url}
                      alt={publicCard.name ?? 'Patient'}
                      width={72} height={72}
                      className="object-cover rounded-full"
                    />
                  ) : (
                    <UserCircle style={{ width: '44px', height: '44px', color: '#5b8def' }} />
                  )}
                </div>
                <div>
                  <p style={{ fontSize: '11px', color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Patient
                  </p>
                  {publicCard.name && (
                    <p style={{ fontSize: '24px', fontWeight: 700, color: '#2b2b3a', lineHeight: 1.2 }}>
                      {publicCard.name}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Medical info */}
            {(publicCard.allergies || publicCard.medications || publicCard.conditions) && (
              <div className="rounded-2xl bg-white border border-gray-200 p-5 space-y-4">
                <p style={{ fontSize: '11px', color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Medical Reference
                </p>

                {publicCard.allergies && (
                  <div className="flex items-start gap-3">
                    <AlertTriangle style={{ width: '18px', height: '18px', color: '#dc2626', flexShrink: 0, marginTop: '2px' }} />
                    <div>
                      <p style={{ fontSize: '12px', color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Allergies</p>
                      <p style={{ fontSize: '18px', color: '#2b2b3a', marginTop: '2px', lineHeight: 1.4 }}>{publicCard.allergies}</p>
                    </div>
                  </div>
                )}

                {publicCard.medications && (
                  <div className="flex items-start gap-3">
                    <Pill style={{ width: '18px', height: '18px', color: '#2563eb', flexShrink: 0, marginTop: '2px' }} />
                    <div>
                      <p style={{ fontSize: '12px', color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Medications</p>
                      <p style={{ fontSize: '18px', color: '#2b2b3a', marginTop: '2px', lineHeight: 1.4 }}>{publicCard.medications}</p>
                    </div>
                  </div>
                )}

                {publicCard.conditions && (
                  <div className="flex items-start gap-3">
                    <Heart style={{ width: '18px', height: '18px', color: '#9333ea', flexShrink: 0, marginTop: '2px' }} />
                    <div>
                      <p style={{ fontSize: '12px', color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Conditions</p>
                      <p style={{ fontSize: '18px', color: '#2b2b3a', marginTop: '2px', lineHeight: 1.4 }}>{publicCard.conditions}</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Emergency contacts */}
            {publicCard.contacts && publicCard.contacts.length > 0 && (
              <div className="rounded-2xl bg-white border border-gray-200 p-5 space-y-3">
                <p style={{ fontSize: '11px', color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Who to Call
                </p>
                {publicCard.contacts.map((c, i) => (
                  <a
                    key={i}
                    href={`tel:${c.phone.replace(/\s/g, '')}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '14px',
                      padding: '14px 16px',
                      backgroundColor: i === 0 ? '#dcfce7' : '#f0fdf4',
                      borderRadius: '14px',
                      textDecoration: 'none',
                      minHeight: '72px',
                      border: i === 0 ? '2px solid #86efac' : '1px solid #bbf7d0',
                    }}
                    aria-label={`Call ${c.name}, ${c.relationship}: ${c.phone}`}
                  >
                    <div
                      style={{
                        width: '48px', height: '48px',
                        borderRadius: '50%',
                        backgroundColor: '#16a34a',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <Phone style={{ width: '22px', height: '22px', color: '#fff' }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: '20px', fontWeight: 700, color: '#14532d' }}>{c.name}</p>
                      <p style={{ fontSize: '15px', color: '#16a34a' }}>{c.relationship} · {c.phone}</p>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </>
        )}

        {/* Disclaimer */}
        <div style={{ padding: '16px', textAlign: 'center' }}>
          <p style={{ fontSize: '12px', color: '#9ca3af', lineHeight: 1.5 }}>
            Emergency information shared by this patient&apos;s caregiver.
            This is a reference aid, not a medical record, and does not replace
            professional medical assessment.
          </p>
        </div>

        {/* Print button — hidden when printing */}
        <div className="text-center print:hidden">
          <PrintButton />
        </div>

      </div>
    </div>
  );
}
