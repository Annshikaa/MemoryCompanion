'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { ArrowLeft, Heart } from 'lucide-react';

interface GratitudeEntry {
  id: string;
  text: string;
  created_at: string;
}

const PROMPTS = [
  'Something that made me smile today…',
  'A person I am grateful for…',
  'Something beautiful I noticed today…',
  'A small joy from today…',
  'Something I am thankful for right now…',
  'A memory that warms my heart…',
  'Someone who was kind to me…',
  'Something I love about my life…',
];

export default function GratitudePage() {
  const supabase = createClient();

  const [text,      setText]      = useState('');
  const [saving,    setSaving]    = useState(false);
  const [saved,     setSaved]     = useState(false);
  const [entries,   setEntries]   = useState<GratitudeEntry[]>([]);
  const [familyId,  setFamilyId]  = useState<string | null>(null);
  const [prompt]                  = useState(() => PROMPTS[new Date().getDate() % PROMPTS.length]);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase.from('profiles')
        .select('family_id').eq('id', user.id).single();
      if (!profile?.family_id) return;
      setFamilyId(profile.family_id);

      // Load recent gratitude entries from events_log
      const { data } = await supabase.from('events_log')
        .select('id, detail, created_at')
        .eq('family_id', profile.family_id)
        .eq('type', 'gratitude')
        .order('created_at', { ascending: false })
        .limit(10);

      setEntries(
        (data ?? []).map((row) => ({
          id: row.id,
          text: (row.detail as Record<string, string>)?.text ?? '',
          created_at: row.created_at,
        })).filter((e) => e.text),
      );
    }
    load();
  }, [supabase]);

  async function handleSave() {
    if (!text.trim() || !familyId || saving) return;
    setSaving(true);
    const { error } = await supabase.from('events_log').insert({
      family_id: familyId,
      type: 'gratitude',
      detail: { text: text.trim() },
    });
    if (!error) {
      const newEntry: GratitudeEntry = {
        id: Date.now().toString(),
        text: text.trim(),
        created_at: new Date().toISOString(),
      };
      setEntries((prev) => [newEntry, ...prev]);
      setText('');
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
    setSaving(false);
  }

  function fmtDate(iso: string) {
    const d = new Date(iso);
    return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
  }

  return (
    <div className="flex flex-col min-h-screen pb-28" style={{ backgroundColor: '#fbf7f0' }}>

      {/* Header */}
      <div
        className="px-5 pt-8 pb-6"
        style={{ background: 'linear-gradient(180deg,#fce7f3 0%,#fbf7f0 100%)' }}
      >
        <Link href="/patient"
          className="flex items-center gap-2 mb-5 self-start focus:outline-none focus:ring-4 focus:ring-pink-300 rounded-xl px-1 py-1"
          aria-label="Back to home"
        >
          <ArrowLeft style={{ width: '26px', height: '26px', color: '#db2777' }} />
          <span style={{ fontSize: '18px', color: '#db2777', fontWeight: 600 }}>Home</span>
        </Link>

        <h1 style={{ fontSize: '38px', fontWeight: 800, color: '#1a2e24', lineHeight: 1.2 }}>
          Gratitude Jar 🙏
        </h1>
        <p style={{ fontSize: '18px', color: '#9ca3af', marginTop: '4px' }}>
          One good thing every day
        </p>
      </div>

      <div className="px-5 max-w-lg mx-auto w-full space-y-5 mt-2">

        {/* Thank-you flash */}
        {saved && (
          <div
            className="rounded-2xl px-5 py-4 text-center"
            style={{ background: 'linear-gradient(135deg,#dcfce7,#bbf7d0)', border: '1.5px solid rgba(22,163,74,0.3)' }}
            role="status"
          >
            <p style={{ fontSize: '20px', fontWeight: 700, color: '#15803d' }}>
              Beautiful! Your gratitude is saved 💚
            </p>
          </div>
        )}

        {/* Input card */}
        <div
          className="rounded-2xl p-5"
          style={{ background: '#fff', border: '1.5px solid rgba(219,39,119,0.12)', boxShadow: '0 3px 16px rgba(219,39,119,0.08)' }}
        >
          <p style={{ fontSize: '17px', color: '#9ca3af', fontWeight: 500, marginBottom: '12px', lineHeight: 1.4 }}>
            {prompt}
          </p>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Write anything, even one word is enough…"
            rows={3}
            className="w-full rounded-xl px-4 py-3 resize-none focus:outline-none focus:ring-2 focus:ring-pink-300"
            style={{ fontSize: '20px', color: '#1a2e24', backgroundColor: '#fdf4f9', border: '1.5px solid rgba(219,39,119,0.15)', lineHeight: 1.5 }}
            aria-label="Write your gratitude"
          />
          <button
            type="button"
            onClick={handleSave}
            disabled={!text.trim() || saving}
            className="w-full mt-3 rounded-2xl flex items-center justify-center gap-3 font-bold transition-transform active:scale-95 focus:outline-none focus:ring-4 focus:ring-pink-300 disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg,#db2777,#be185d)', color: '#fff', fontSize: '22px', minHeight: '68px', border: 'none', cursor: text.trim() ? 'pointer' : 'not-allowed' }}
          >
            <Heart className="w-6 h-6" aria-hidden />
            {saving ? 'Saving…' : 'Save this moment'}
          </button>
        </div>

        {/* Past entries */}
        {entries.length > 0 && (
          <div className="space-y-3">
            <p style={{ fontSize: '13px', fontWeight: 700, color: '#9ca3af', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Your gratitude jar
            </p>
            {entries.map((e) => (
              <div
                key={e.id}
                className="rounded-2xl px-4 py-4 flex items-start gap-3"
                style={{ background: '#fff', border: '1px solid rgba(219,39,119,0.1)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
              >
                <span style={{ fontSize: '22px', lineHeight: 1, marginTop: '2px' }} aria-hidden>🌸</span>
                <div className="flex-1 min-w-0">
                  <p style={{ fontSize: '18px', color: '#1a2e24', lineHeight: 1.4 }}>{e.text}</p>
                  <p style={{ fontSize: '13px', color: '#9ca3af', marginTop: '4px' }}>{fmtDate(e.created_at)}</p>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
