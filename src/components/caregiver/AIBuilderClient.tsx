'use client';

import { useState } from 'react';
import { Sparkles, Check, X, ChevronDown, ChevronUp, Loader2, Save } from 'lucide-react';
import type {
  ParseNotesResponse,
  ParsedPerson,
  ParsedMemory,
  ParsedRoutine,
  ParsedPatientUpdate,
  SaveSuggestionsRequest,
} from '@/lib/ai-types';

// ── Per-item state ─────────────────────────────────────────────────────────

type AcceptedItem<T> = T & { _accepted: boolean; _idx: number };

interface ParsedState {
  people: AcceptedItem<ParsedPerson>[];
  memories: AcceptedItem<ParsedMemory>[];
  routines: AcceptedItem<ParsedRoutine>[];
  patient: (ParsedPatientUpdate & { _accepted: boolean }) | null;
}

function toAccepted<T>(arr: T[]): AcceptedItem<T>[] {
  return arr.map((item, i) => ({ ...item, _accepted: true, _idx: i }));
}

// ── Helpers ────────────────────────────────────────────────────────────────

const kindEmoji: Record<string, string> = { photo: '📷', music: '🎵', memory: '💭' };

// ── Component ──────────────────────────────────────────────────────────────

export default function AIBuilderClient() {
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<'idle' | 'parsing' | 'saving' | 'done' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [parsed, setParsed] = useState<ParsedState | null>(null);
  const [saveResult, setSaveResult] = useState<string | null>(null);

  // ── Parse notes ────────────────────────────────────────────────────────

  async function handleParse() {
    if (!notes.trim()) return;
    setStatus('parsing');
    setErrorMsg(null);
    setParsed(null);
    setSaveResult(null);

    try {
      const res = await fetch('/api/ai/parse-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes }),
      });
      const data: ParseNotesResponse & { error?: string } = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error ?? 'Failed to parse notes.');
        setStatus('error');
        return;
      }
      setParsed({
        people:   toAccepted(data.people ?? []),
        memories: toAccepted(data.memories ?? []),
        routines: toAccepted(data.routines ?? []),
        patient:  data.patient?.name || data.patient?.home_location_text
          ? { ...data.patient, _accepted: true }
          : null,
      });
      setStatus('idle');
    } catch {
      setErrorMsg('Network error. Please try again.');
      setStatus('error');
    }
  }

  // ── Toggle accept/reject ───────────────────────────────────────────────

  function togglePerson(idx: number) {
    setParsed((p) => p ? { ...p, people: p.people.map((x) => x._idx === idx ? { ...x, _accepted: !x._accepted } : x) } : p);
  }
  function toggleMemory(idx: number) {
    setParsed((p) => p ? { ...p, memories: p.memories.map((x) => x._idx === idx ? { ...x, _accepted: !x._accepted } : x) } : p);
  }
  function toggleRoutine(idx: number) {
    setParsed((p) => p ? { ...p, routines: p.routines.map((x) => x._idx === idx ? { ...x, _accepted: !x._accepted } : x) } : p);
  }
  function togglePatient() {
    setParsed((p) => p && p.patient ? { ...p, patient: { ...p.patient, _accepted: !p.patient._accepted } } : p);
  }

  // ── Save accepted ──────────────────────────────────────────────────────

  async function handleSave() {
    if (!parsed) return;
    setStatus('saving');
    setErrorMsg(null);

    const body: SaveSuggestionsRequest = {
      people:   parsed.people.filter((x) => x._accepted).map(({ _accepted: _, _idx: __, ...rest }) => rest),
      memories: parsed.memories.filter((x) => x._accepted).map(({ _accepted: _, _idx: __, ...rest }) => rest),
      routines: parsed.routines.filter((x) => x._accepted).map(({ _accepted: _, _idx: __, ...rest }) => rest),
      patient:  parsed.patient?._accepted ? { name: parsed.patient.name, home_location_text: parsed.patient.home_location_text } : null,
    };

    try {
      const res = await fetch('/api/ai/save-suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data: { saved?: { people: number; memories: number; routines: number; patientUpdated: boolean }; error?: string } = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error ?? 'Failed to save.');
        setStatus('error');
        return;
      }
      const s = data.saved!;
      const parts: string[] = [];
      if (s.people)          parts.push(`${s.people} ${s.people === 1 ? 'person' : 'people'}`);
      if (s.memories)        parts.push(`${s.memories} ${s.memories === 1 ? 'memory' : 'memories'}`);
      if (s.routines)        parts.push(`${s.routines} ${s.routines === 1 ? 'routine' : 'routines'}`);
      if (s.patientUpdated)  parts.push('patient profile');
      setSaveResult(parts.length ? `Saved: ${parts.join(', ')}.` : 'Nothing new to save.');
      setStatus('done');
    } catch {
      setErrorMsg('Network error. Please try again.');
      setStatus('error');
    }
  }

  // ── Accepted count ─────────────────────────────────────────────────────

  const acceptedCount = parsed
    ? parsed.people.filter((x) => x._accepted).length
    + parsed.memories.filter((x) => x._accepted).length
    + parsed.routines.filter((x) => x._accepted).length
    + (parsed.patient?._accepted ? 1 : 0)
    : 0;

  const totalCount = parsed
    ? parsed.people.length + parsed.memories.length + parsed.routines.length + (parsed.patient ? 1 : 0)
    : 0;

  return (
    <div className="space-y-6">
      {/* Notes textarea */}
      <div className="bg-white rounded-care-lg border border-care-border p-5 shadow-care-sm">
        <label className="block text-sm font-semibold text-care-text mb-2" htmlFor="notes-input">
          Paste your notes
        </label>
        <p className="text-xs text-care-text-muted mb-3">
          E.g. "Mum was a teacher in Pune, loves old Kishore Kumar songs, has two kids Priya and Arjun, gets anxious in evenings, morning tea at 7am."
        </p>
        <textarea
          id="notes-input"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Write anything — no structure needed. The AI will organise it."
          rows={6}
          maxLength={5000}
          className="w-full rounded-care border border-care-border px-3 py-2.5 text-sm text-care-text placeholder-care-text-subtle focus:outline-none focus:ring-2 focus:ring-care-primary resize-none"
        />
        <div className="flex items-center justify-between mt-3">
          <span className="text-xs text-care-text-subtle">{notes.length}/5000</span>
          <button
            onClick={handleParse}
            disabled={!notes.trim() || status === 'parsing'}
            className="flex items-center gap-2 bg-care-primary hover:bg-care-primary-dark text-white px-4 py-2 rounded-care text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {status === 'parsing'
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Analysing…</>
              : <><Sparkles className="w-4 h-4" /> Parse with AI</>
            }
          </button>
        </div>
      </div>

      {/* Error */}
      {errorMsg && (
        <div className="bg-red-50 border border-red-200 rounded-care px-4 py-3 text-sm text-red-700">
          {errorMsg}
        </div>
      )}

      {/* Results */}
      {parsed && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-care-text">
              AI found {totalCount} item{totalCount !== 1 ? 's' : ''} — {acceptedCount} accepted
            </p>
            <p className="text-xs text-care-text-muted">Toggle items to accept or reject before saving.</p>
          </div>

          {/* People */}
          {parsed.people.length > 0 && (
            <Section title="People" emoji="👥" count={parsed.people.filter((x) => x._accepted).length} total={parsed.people.length}>
              {parsed.people.map((p) => (
                <ItemCard
                  key={p._idx}
                  accepted={p._accepted}
                  onToggle={() => togglePerson(p._idx)}
                  primary={p.name}
                  secondary={p.relationship}
                  tertiary={p.notes ?? undefined}
                />
              ))}
            </Section>
          )}

          {/* Memories */}
          {parsed.memories.length > 0 && (
            <Section title="Memories & Topics" emoji="💭" count={parsed.memories.filter((x) => x._accepted).length} total={parsed.memories.length}>
              {parsed.memories.map((m) => (
                <ItemCard
                  key={m._idx}
                  accepted={m._accepted}
                  onToggle={() => toggleMemory(m._idx)}
                  primary={`${kindEmoji[m.kind] ?? '💭'} ${m.title}`}
                  secondary={m.description ?? undefined}
                  tertiary={m.prompt ? `Prompt: "${m.prompt}"` : undefined}
                />
              ))}
            </Section>
          )}

          {/* Routines */}
          {parsed.routines.length > 0 && (
            <Section title="Routines" emoji="⏰" count={parsed.routines.filter((x) => x._accepted).length} total={parsed.routines.length}>
              {parsed.routines.map((r) => (
                <ItemCard
                  key={r._idx}
                  accepted={r._accepted}
                  onToggle={() => toggleRoutine(r._idx)}
                  primary={r.title}
                  secondary={`${r.time_of_day}${r.days_of_week.length ? ' · ' + r.days_of_week.join(', ') : ' · every day'}`}
                  tertiary={r.instructions ?? undefined}
                />
              ))}
            </Section>
          )}

          {/* Patient info */}
          {parsed.patient && (
            <Section title="Patient Profile" emoji="🧑" count={parsed.patient._accepted ? 1 : 0} total={1}>
              <ItemCard
                accepted={parsed.patient._accepted}
                onToggle={togglePatient}
                primary={parsed.patient.name ? `Name: ${parsed.patient.name}` : 'Patient info'}
                secondary={parsed.patient.home_location_text ? `Location: ${parsed.patient.home_location_text}` : undefined}
              />
            </Section>
          )}

          {/* Nothing found */}
          {totalCount === 0 && (
            <div className="bg-care-highlight rounded-care-lg p-6 text-center">
              <p className="text-care-text-muted text-sm">
                No structured data was found in your notes. Try adding names, relationships, times, or activities.
              </p>
            </div>
          )}

          {/* Save button */}
          {totalCount > 0 && status !== 'done' && (
            <div className="flex justify-end pt-2">
              <button
                onClick={handleSave}
                disabled={acceptedCount === 0 || status === 'saving'}
                className="flex items-center gap-2 bg-care-primary hover:bg-care-primary-dark text-white px-5 py-2.5 rounded-care text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {status === 'saving'
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
                  : <><Save className="w-4 h-4" /> Save {acceptedCount} accepted item{acceptedCount !== 1 ? 's' : ''}</>
                }
              </button>
            </div>
          )}

          {/* Save result */}
          {saveResult && (
            <div className="bg-green-50 border border-green-200 rounded-care px-4 py-3 text-sm text-green-700 flex items-center gap-2">
              <Check className="w-4 h-4 shrink-0" />
              {saveResult}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

function Section({
  title, emoji, count, total, children,
}: {
  title: string; emoji: string; count: number; total: number; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div className="bg-white rounded-care-lg border border-care-border shadow-care-sm overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-care-highlight transition-colors"
      >
        <div className="flex items-center gap-2">
          <span aria-hidden>{emoji}</span>
          <span className="font-semibold text-sm text-care-text">{title}</span>
          <span className="text-xs text-care-text-muted">({count}/{total} accepted)</span>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-care-text-muted" /> : <ChevronDown className="w-4 h-4 text-care-text-muted" />}
      </button>
      {open && <div className="divide-y divide-care-border-subtle">{children}</div>}
    </div>
  );
}

function ItemCard({
  accepted, onToggle, primary, secondary, tertiary,
}: {
  accepted: boolean;
  onToggle: () => void;
  primary: string;
  secondary?: string;
  tertiary?: string;
}) {
  return (
    <div className={`flex items-start gap-3 px-4 py-3 transition-colors ${accepted ? '' : 'opacity-40'}`}>
      <button
        onClick={onToggle}
        aria-label={accepted ? 'Reject this item' : 'Accept this item'}
        className={`mt-0.5 shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
          accepted
            ? 'bg-care-primary border-care-primary text-white'
            : 'border-care-border bg-white'
        }`}
      >
        {accepted ? <Check className="w-3.5 h-3.5" /> : <X className="w-3 h-3 text-care-text-subtle" />}
      </button>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-care-text">{primary}</p>
        {secondary && <p className="text-xs text-care-text-muted mt-0.5">{secondary}</p>}
        {tertiary && <p className="text-xs text-care-text-subtle mt-0.5 italic">{tertiary}</p>}
      </div>
    </div>
  );
}
