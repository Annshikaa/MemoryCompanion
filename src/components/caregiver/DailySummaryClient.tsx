'use client';

import { useState } from 'react';
import { Sparkles, Loader2, RefreshCw } from 'lucide-react';
import type { DailySummaryResponse } from '@/lib/ai-types';

export default function DailySummaryClient() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [result, setResult] = useState<DailySummaryResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function generate() {
    setStatus('loading');
    setErrorMsg(null);
    try {
      const res = await fetch('/api/ai/daily-summary', { method: 'POST' });
      const data: DailySummaryResponse & { error?: string } = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error ?? 'Failed to generate summary.');
        setStatus('error');
        return;
      }
      setResult(data);
      setStatus('done');
    } catch {
      setErrorMsg('Network error. Please try again.');
      setStatus('error');
    }
  }

  return (
    <div className="space-y-4">
      {/* Generate button */}
      <div className="bg-white rounded-care-lg border border-care-border p-5 shadow-care-sm">
        <p className="text-sm text-care-text-muted mb-4">
          The AI reads your family's recent activity log and writes a short, plain-language summary — like a handover note from the app to you.
        </p>
        <button
          onClick={generate}
          disabled={status === 'loading'}
          className="flex items-center gap-2 bg-care-primary hover:bg-care-primary-dark text-white px-4 py-2.5 rounded-care text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {status === 'loading'
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating…</>
            : result
              ? <><RefreshCw className="w-4 h-4" /> Refresh summary</>
              : <><Sparkles className="w-4 h-4" /> Generate summary</>
          }
        </button>
      </div>

      {/* Error */}
      {errorMsg && (
        <div className="bg-red-50 border border-red-200 rounded-care px-4 py-3 text-sm text-red-700">
          {errorMsg}
        </div>
      )}

      {/* Summary */}
      {result && (
        <div className="bg-white rounded-care-lg border border-care-border p-5 shadow-care-sm">
          <p className="text-xs font-semibold text-care-text-subtle uppercase tracking-wide mb-3">
            {result.periodLabel}
          </p>
          <p className="text-care-text leading-relaxed">{result.summary}</p>
        </div>
      )}
    </div>
  );
}
