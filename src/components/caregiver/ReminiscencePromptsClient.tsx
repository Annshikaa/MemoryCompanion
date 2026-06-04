'use client';

import { useState } from 'react';
import { Sparkles, Loader2, Check, X, Save } from 'lucide-react';
import type { ParsedMemory, SuggestPromptsResponse, SaveSuggestionsRequest } from '@/lib/ai-types';

type AcceptedMemory = ParsedMemory & { _accepted: boolean; _idx: number };

const kindEmoji: Record<string, string> = { photo: '📷', music: '🎵', memory: '💭' };

export default function ReminiscencePromptsClient() {
  const [person, setPerson]       = useState('');
  const [era, setEra]             = useState('');
  const [background, setBackground] = useState('');
  const [status, setStatus]       = useState<'idle' | 'loading' | 'saving' | 'done' | 'error'>('idle');
  const [errorMsg, setErrorMsg]   = useState<string | null>(null);
  const [items, setItems]         = useState<AcceptedMemory[]>([]);
  const [saveMsg, setSaveMsg]     = useState<string | null>(null);

  async function generate() {
    setStatus('loading');
    setErrorMsg(null);
    setItems([]);
    setSaveMsg(null);
    try {
      const res = await fetch('/api/ai/suggest-prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ person: person.trim() || undefined, era: era.trim() || undefined, background: background.trim() || undefined }),
      });
      const data: SuggestPromptsResponse & { error?: string } = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error ?? 'Failed to generate prompts.');
        setStatus('error');
        return;
      }
      setItems((data.items ?? []).map((item, i) => ({ ...item, _accepted: true, _idx: i })));
      setStatus('idle');
    } catch {
      setErrorMsg('Network error. Please try again.');
      setStatus('error');
    }
  }

  function toggle(idx: number) {
    setItems((prev) => prev.map((x) => x._idx === idx ? { ...x, _accepted: !x._accepted } : x));
  }

  async function save() {
    const accepted = items.filter((x) => x._accepted);
    if (!accepted.length) return;
    setStatus('saving');
    setErrorMsg(null);

    const body: SaveSuggestionsRequest = {
      people: [],
      memories: accepted.map(({ _accepted: _, _idx: __, ...rest }) => rest),
      routines: [],
      patient: null,
    };

    try {
      const res = await fetch('/api/ai/save-suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data: { saved?: { memories: number }; error?: string } = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error ?? 'Failed to save.');
        setStatus('error');
        return;
      }
      setSaveMsg(`Saved ${data.saved?.memories ?? accepted.length} memory item${(data.saved?.memories ?? accepted.length) !== 1 ? 's' : ''} to Memories.`);
      setStatus('done');
    } catch {
      setErrorMsg('Network error. Please try again.');
      setStatus('error');
    }
  }

  const acceptedCount = items.filter((x) => x._accepted).length;

  return (
    <div className="space-y-5">
      {/* Form */}
      <div className="bg-white rounded-care-lg border border-care-border p-5 shadow-care-sm space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-care-text-muted mb-1.5" htmlFor="rp-person">
              Person or context (optional)
            </label>
            <input
              id="rp-person"
              value={person}
              onChange={(e) => setPerson(e.target.value)}
              placeholder="e.g. Mum, a retired teacher"
              className="w-full rounded-care border border-care-border px-3 py-2 text-sm text-care-text placeholder-care-text-subtle focus:outline-none focus:ring-2 focus:ring-care-primary"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-care-text-muted mb-1.5" htmlFor="rp-era">
              Era or decade (optional)
            </label>
            <input
              id="rp-era"
              value={era}
              onChange={(e) => setEra(e.target.value)}
              placeholder="e.g. 1970s, 1960s Bollywood"
              className="w-full rounded-care border border-care-border px-3 py-2 text-sm text-care-text placeholder-care-text-subtle focus:outline-none focus:ring-2 focus:ring-care-primary"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-care-text-muted mb-1.5" htmlFor="rp-background">
            Background notes (optional)
          </label>
          <textarea
            id="rp-background"
            value={background}
            onChange={(e) => setBackground(e.target.value)}
            placeholder="e.g. Loved Kishore Kumar, grew up in Pune, was a maths teacher for 30 years"
            rows={3}
            className="w-full rounded-care border border-care-border px-3 py-2 text-sm text-care-text placeholder-care-text-subtle focus:outline-none focus:ring-2 focus:ring-care-primary resize-none"
          />
        </div>
        <div className="flex justify-end">
          <button
            onClick={generate}
            disabled={status === 'loading'}
            className="flex items-center gap-2 bg-care-primary hover:bg-care-primary-dark text-white px-4 py-2.5 rounded-care text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {status === 'loading'
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating…</>
              : <><Sparkles className="w-4 h-4" /> Generate prompts</>
            }
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="bg-red-50 border border-red-200 rounded-care px-4 py-3 text-sm text-red-700">
          {errorMsg}
        </div>
      )}

      {/* Results */}
      {items.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-care-text">
              {items.length} suggestions — {acceptedCount} selected
            </p>
            <p className="text-xs text-care-text-muted">Click to accept or reject each one.</p>
          </div>

          <div className="bg-white rounded-care-lg border border-care-border shadow-care-sm divide-y divide-care-border-subtle">
            {items.map((item) => (
              <button
                key={item._idx}
                onClick={() => toggle(item._idx)}
                className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-care-highlight ${item._accepted ? '' : 'opacity-40'}`}
              >
                <div className={`mt-0.5 shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${item._accepted ? 'bg-care-primary border-care-primary text-white' : 'border-care-border bg-white'}`}>
                  {item._accepted ? <Check className="w-3.5 h-3.5" /> : <X className="w-3 h-3 text-care-text-subtle" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-care-text">
                    {kindEmoji[item.kind] ?? '💭'} {item.title}
                    {item.era_year ? <span className="text-care-text-muted font-normal"> · {item.era_year}</span> : null}
                  </p>
                  {item.description && <p className="text-xs text-care-text-muted mt-0.5">{item.description}</p>}
                  {item.prompt && <p className="text-xs text-care-text-subtle mt-0.5 italic">"{item.prompt}"</p>}
                </div>
              </button>
            ))}
          </div>

          {status !== 'done' && (
            <div className="flex justify-end">
              <button
                onClick={save}
                disabled={acceptedCount === 0 || status === 'saving'}
                className="flex items-center gap-2 bg-care-primary hover:bg-care-primary-dark text-white px-5 py-2.5 rounded-care text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {status === 'saving'
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
                  : <><Save className="w-4 h-4" /> Save {acceptedCount} to Memories</>
                }
              </button>
            </div>
          )}

          {saveMsg && (
            <div className="bg-green-50 border border-green-200 rounded-care px-4 py-3 text-sm text-green-700 flex items-center gap-2">
              <Check className="w-4 h-4 shrink-0" />
              {saveMsg}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
