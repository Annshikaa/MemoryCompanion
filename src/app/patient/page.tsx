import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import PatientDate from '@/components/patient/PatientDate';
import PatientReminderWidget from '@/components/patient/PatientReminderWidget';

const AFFIRMATIONS = [
  'You are loved by so many people 💖',
  'Today is a new day full of small joys 🌸',
  'You are safe and you are cared for 🌿',
  'Every moment with you is precious ✨',
  'You bring joy to everyone around you ☀️',
  'You are brave even when things feel uncertain 🌟',
  'Your memories and your story matter 💛',
  'You are never alone — your family is close 🤍',
  'Breathe slowly. Small things are beautiful 🌺',
  'You are doing so well. We are proud of you 💙',
  'Today you are enough exactly as you are 🌼',
  'You have so many people who love you 💜',
  'Every day with you is a gift 🎁',
  'You are stronger than you know 🌈',
];

export default async function PatientHome() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/patient-login');

  const { data: profile } = await supabase
    .from('profiles').select('family_id, display_name').eq('id', user.id).single();
  if (!profile?.family_id) redirect('/onboarding');

  const { data: patient } = await supabase
    .from('patients').select('name, home_location_text')
    .eq('family_id', profile.family_id).maybeSingle();

  const patientName  = patient?.name ?? profile.display_name;
  const locationText = patient?.home_location_text ?? 'You are at home';

  const hour = new Date().getHours();
  const timeGreeting = hour < 5 ? 'Good night' : hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : hour < 21 ? 'Good evening' : 'Good night';
  const timeEmoji    = hour < 5 ? '🌙' : hour < 12 ? '🌅' : hour < 17 ? '☀️' : hour < 21 ? '🌆' : '🌙';

  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86_400_000);
  const affirmation = AFFIRMATIONS[dayOfYear % AFFIRMATIONS.length];

  return (
    <div className="flex flex-col min-h-screen pb-32" style={{ backgroundColor: '#fbf7f0' }}>

      {/* ── Hero header ── */}
      <div
        className="px-5 pt-10 pb-8 text-center"
        style={{ background: 'linear-gradient(180deg, #e8f4f0 0%, #fbf7f0 100%)' }}
      >
        <p style={{ fontSize: '18px', color: '#5cb89a', fontWeight: 600, marginBottom: '2px' }}>
          {timeEmoji} {timeGreeting}
        </p>
        <h1 style={{ fontSize: '42px', fontWeight: 800, color: '#1a2e24', lineHeight: 1.15, letterSpacing: '-0.5px' }}>
          {patientName}
        </h1>

        {/* Affirmation pill */}
        <div
          className="mx-auto mt-4 px-5 py-3 rounded-full inline-block"
          style={{ background: 'rgba(255,255,255,0.7)', border: '1.5px solid rgba(92,184,154,0.25)', backdropFilter: 'blur(8px)' }}
        >
          <p style={{ fontSize: '16px', color: '#2b5c4a', fontWeight: 500, lineHeight: 1.4 }}>
            {affirmation}
          </p>
        </div>
      </div>

      <div className="px-5 max-w-lg mx-auto w-full space-y-4">

        {/* ── Date ── */}
        <PatientDate />

        {/* ── Location ── */}
        <div
          className="rounded-2xl px-5 py-4 flex items-center gap-3"
          style={{ background: 'linear-gradient(135deg,#e5f5f0,#d8f0ea)', border: '1px solid rgba(92,184,154,0.2)' }}
        >
          <span style={{ fontSize: '24px' }} aria-hidden>📍</span>
          <p style={{ fontSize: '21px', fontWeight: 600, color: '#1e4d3a' }}>{locationText}</p>
        </div>

        {/* ── Reminder widget ── */}
        <PatientReminderWidget familyId={profile.family_id} />

        {/* ── TODAY'S PLAN — featured card ── */}
        <Link
          href="/patient/today"
          className="flex items-center gap-4 rounded-2xl px-5 py-4 transition-transform active:scale-95 focus:outline-none focus:ring-4 focus:ring-teal-300"
          style={{ background: 'linear-gradient(135deg,#2b5c4a,#3d7a6e)', boxShadow: '0 4px 20px rgba(43,92,74,0.25)' }}
          aria-label="Today's plan — see what's scheduled today"
        >
          <div className="rounded-xl p-2.5 shrink-0" style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}>
            <span style={{ fontSize: '28px' }} aria-hidden>📋</span>
          </div>
          <div className="flex-1">
            <p style={{ fontSize: '22px', fontWeight: 700, color: '#fff', lineHeight: 1.2 }}>Today&apos;s Plan</p>
            <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)', marginTop: '2px' }}>Your schedule for today</p>
          </div>
          <span style={{ fontSize: '22px', color: 'rgba(255,255,255,0.6)' }} aria-hidden>›</span>
        </Link>

        {/* ── CONNECT ── */}
        <SectionLabel label="Connect" />
        <div className="grid grid-cols-2 gap-3">
          <FeatureCard href="/patient/family"   emoji="👨‍👩‍👧" label="My Family"     sub="See your loved ones"  bg="linear-gradient(145deg,#e8f0fd,#dce8fc)" shadow="rgba(91,141,239,0.15)" ring="focus:ring-blue-300" />
          <FeatureCard href="/patient/contacts" emoji="📞" label="Call for Help" sub="Your contacts"          bg="linear-gradient(145deg,#dcfce7,#d0f7e1)" shadow="rgba(22,163,74,0.15)"  ring="focus:ring-green-300" />
        </div>

        {/* ── FEEL GOOD ── */}
        <SectionLabel label="Feel Good" />
        <div className="grid grid-cols-2 gap-3">
          <FeatureCard href="/patient/memories"   emoji="📸" label="Remember When"  sub="Photos & stories"    bg="linear-gradient(145deg,#f0ecfb,#ede6f9)" shadow="rgba(155,127,212,0.15)" ring="focus:ring-purple-300" />
          <FeatureCard href="/patient/mood"        emoji="😊" label="How I Feel"     sub="Share your mood"     bg="linear-gradient(145deg,#fef9c3,#fdf4b0)" shadow="rgba(202,138,4,0.15)"   ring="focus:ring-yellow-300" />
          <FeatureCard href="/patient/gratitude"   emoji="🙏" label="Gratitude Jar"  sub="One good thing today" bg="linear-gradient(145deg,#fce7f3,#fadadf)" shadow="rgba(219,39,119,0.15)"  ring="focus:ring-pink-300" />
          <FeatureCard href="/patient/breathe"     emoji="🌬️" label="Take a Breath" sub="A calm moment"        bg="linear-gradient(145deg,#ecfeff,#d8f8fc)" shadow="rgba(8,145,178,0.15)"   ring="focus:ring-cyan-300" />
        </div>

        {/* ── ACTIVITIES ── */}
        <SectionLabel label="Activities" />
        <div className="grid grid-cols-2 gap-3">
          <FeatureCard href="/patient/game"         emoji="🎯" label="My Game"           sub="Who is this?"       bg="linear-gradient(145deg,#fce7f3,#fad6e8)" shadow="rgba(219,39,119,0.15)" ring="focus:ring-pink-300" />
          <FeatureCard href="/patient/guess-memory" emoji="🖼️" label="Guess the Memory"  sub="Do you remember?"   bg="linear-gradient(145deg,#fdf4ff,#f3e0ff)" shadow="rgba(168,85,247,0.15)" ring="focus:ring-purple-300" />
          <FeatureCard href="/patient/sounds"        emoji="🎵" label="Soothing Sounds"   sub="Calm your mind"     bg="linear-gradient(145deg,#fff7ed,#feecd0)" shadow="rgba(234,88,12,0.12)"  ring="focus:ring-orange-300" />
          <FeatureCard href="/patient/companion"    emoji="💬" label="Talk to Me"         sub="Ask me anything"    bg="linear-gradient(145deg,#f3e8ff,#ecdaf9)" shadow="rgba(147,51,234,0.15)" ring="focus:ring-purple-300" />
        </div>

        {/* ── Face ID — full width ── */}
        <Link
          href="/patient/identify"
          className="flex items-center gap-4 rounded-2xl px-5 py-4 transition-transform active:scale-95 focus:outline-none focus:ring-4 focus:ring-orange-300"
          style={{ background: 'linear-gradient(135deg,#fff3e0,#ffe8c2)', border: '1px solid rgba(249,115,22,0.15)', boxShadow: '0 2px 12px rgba(249,115,22,0.08)' }}
          aria-label="Who is this: identify a person with your camera"
        >
          <span style={{ fontSize: '32px' }} aria-hidden>📷</span>
          <div>
            <p style={{ fontSize: '22px', fontWeight: 700, color: '#2b2b3a' }}>Who is this?</p>
            <p style={{ fontSize: '14px', color: '#9ca3af' }}>Point your camera to identify someone</p>
          </div>
          <span className="ml-auto" style={{ fontSize: '22px', color: '#f97316' }} aria-hidden>›</span>
        </Link>

      </div>
    </div>
  );
}

function SectionLabel({ label }: { label: string }) {
  return (
    <p style={{ fontSize: '11px', fontWeight: 700, color: '#9ca3af', letterSpacing: '0.1em', textTransform: 'uppercase', paddingTop: '4px' }}>
      {label}
    </p>
  );
}

function FeatureCard({ href, emoji, label, sub, bg, shadow, ring }: {
  href: string; emoji: string; label: string; sub: string;
  bg: string; shadow: string; ring: string;
}) {
  return (
    <Link
      href={href}
      className={`flex flex-col items-center justify-center rounded-2xl px-3 py-5 transition-transform active:scale-95 focus:outline-none focus:ring-4 ${ring}`}
      style={{ background: bg, minHeight: '140px', boxShadow: `0 3px 14px ${shadow}`, border: '1px solid rgba(255,255,255,0.6)' }}
    >
      <span style={{ fontSize: '38px', lineHeight: 1, marginBottom: '8px' }} aria-hidden>{emoji}</span>
      <p style={{ fontSize: '17px', fontWeight: 700, color: '#1a2e24', textAlign: 'center', lineHeight: 1.25 }}>{label}</p>
      <p style={{ fontSize: '12px', color: '#6b7280', textAlign: 'center', marginTop: '3px' }}>{sub}</p>
    </Link>
  );
}
