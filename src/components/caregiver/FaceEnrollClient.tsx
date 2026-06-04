'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  UserCircle,
  Plus,
  CheckCircle2,
  XCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface PersonRow {
  id: string;
  name: string;
  relationship: string;
  photo_url: string | null;
  enrollmentCount: number;
}

interface FileResult {
  fileName: string;
  status: 'uploading' | 'ok' | 'error';
  message: string;
}

interface Props {
  people: PersonRow[];
}

export default function FaceEnrollClient({ people }: Props) {
  const router                = useRouter();
  const fileInputRef          = useRef<HTMLInputElement>(null);

  const [openId, setOpenId]         = useState<string | null>(null);
  const [results, setResults]       = useState<Record<string, FileResult[]>>({});
  const [counts, setCounts]         = useState<Record<string, number>>(
    Object.fromEntries(people.map((p) => [p.id, p.enrollmentCount])),
  );

  function togglePerson(id: string) {
    setOpenId((prev) => (prev === id ? null : id));
  }

  function handleFileInput(personId: string) {
    // Reset input so same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = '';
    fileInputRef.current?.setAttribute('data-person-id', personId);
    fileInputRef.current?.click();
  }

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const personId = fileInputRef.current?.getAttribute('data-person-id');
    if (!personId || !e.target.files?.length) return;

    const files = Array.from(e.target.files);

    // Add pending entries
    const pending: FileResult[] = files.map((f) => ({
      fileName: f.name,
      status: 'uploading',
      message: 'Uploading…',
    }));
    setResults((prev) => ({
      ...prev,
      [personId]: [...(prev[personId] ?? []), ...pending],
    }));

    // Upload each file sequentially
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const resultIndex = (results[personId]?.length ?? 0) + i;

      const form = new FormData();
      form.set('person_id', personId);
      form.set('image', file);

      try {
        const res = await fetch('/api/faces/enroll', {
          method: 'POST',
          body: form,
        });

        const json: { ok?: boolean; quality_message?: string; error?: string; enrollment_count?: number } =
          await res.json();

        const fileResult: FileResult = res.ok && json.ok
          ? { fileName: file.name, status: 'ok',    message: json.quality_message ?? 'Enrolled.' }
          : { fileName: file.name, status: 'error', message: json.quality_message ?? json.error ?? 'Upload failed.' };

        // Update count if successful
        if (res.ok && json.ok && json.enrollment_count !== undefined) {
          setCounts((prev) => ({ ...prev, [personId]: json.enrollment_count! }));
        }

        setResults((prev) => {
          const arr = [...(prev[personId] ?? [])];
          arr[resultIndex] = fileResult;
          return { ...prev, [personId]: arr };
        });
      } catch {
        setResults((prev) => {
          const arr = [...(prev[personId] ?? [])];
          arr[resultIndex] = {
            fileName: file.name,
            status: 'error',
            message: 'Face service is unreachable. Is it running?',
          };
          return { ...prev, [personId]: arr };
        });
      }
    }

    router.refresh(); // sync server-side enrollment counts
  }

  if (!people.length) {
    return (
      <div className="bg-white rounded-care-lg border border-care-border p-10 text-center shadow-care-sm">
        <UserCircle className="w-12 h-12 text-care-text-subtle mx-auto mb-3" />
        <p className="font-display font-semibold text-care-text text-lg">No loved ones yet</p>
        <p className="text-care-text-muted text-sm mt-1">
          Add people in the Loved Ones page first, then come back to enroll their faces.
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Hidden file input — shared across all persons */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFiles}
        className="sr-only"
        aria-label="Upload face photos"
      />

      <div className="space-y-3">
        {people.map((person) => {
          const isOpen  = openId === person.id;
          const count   = counts[person.id] ?? 0;
          const fileRes = results[person.id] ?? [];

          return (
            <div
              key={person.id}
              className="bg-white rounded-care-lg border border-care-border shadow-care-sm overflow-hidden"
            >
              {/* Row header */}
              <button
                type="button"
                onClick={() => togglePerson(person.id)}
                className="w-full flex items-center gap-4 px-5 py-4 hover:bg-care-highlight transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-care-primary focus-visible:ring-inset"
                aria-expanded={isOpen}
              >
                {/* Avatar */}
                <div className="relative w-12 h-12 rounded-full overflow-hidden bg-care-primary-light shrink-0">
                  {person.photo_url ? (
                    <Image src={person.photo_url} alt={person.name} fill className="object-cover" sizes="48px" />
                  ) : (
                    <UserCircle className="w-7 h-7 text-care-accent absolute inset-0 m-auto" />
                  )}
                </div>

                {/* Name + status */}
                <div className="flex-1 min-w-0">
                  <p className="font-display font-semibold text-care-text text-base truncate">
                    {person.name}
                  </p>
                  <p className="text-xs text-care-text-muted mt-0.5">{person.relationship}</p>
                </div>

                {/* Enrollment badge */}
                <span
                  className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${
                    count > 0
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'bg-care-border-subtle text-care-text-subtle'
                  }`}
                >
                  {count > 0 ? `${count} photo${count !== 1 ? 's' : ''}` : 'Not enrolled'}
                </span>

                {isOpen ? (
                  <ChevronUp className="w-4 h-4 text-care-text-subtle shrink-0" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-care-text-subtle shrink-0" />
                )}
              </button>

              {/* Expanded upload panel */}
              {isOpen && (
                <div className="border-t border-care-border-subtle px-5 pb-5 pt-4 space-y-4">
                  <p className="text-sm text-care-text-muted">
                    Upload clear, well-lit photos of {person.name} — face visible, no other people in frame.
                    Adding 3–5 photos from different angles gives the best accuracy.
                  </p>

                  <button
                    type="button"
                    onClick={() => handleFileInput(person.id)}
                    className="flex items-center gap-2 bg-care-primary text-white px-4 py-2.5 rounded-care text-sm font-semibold hover:bg-care-primary-hover transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-care-primary"
                  >
                    <Plus className="w-4 h-4" />
                    Upload photos
                  </button>

                  {/* Per-file results */}
                  {fileRes.length > 0 && (
                    <ul className="space-y-2">
                      {fileRes.map((r, i) => (
                        <li
                          key={i}
                          className={`flex items-start gap-2.5 px-4 py-3 rounded-care text-sm ${
                            r.status === 'ok'
                              ? 'bg-emerald-50 border border-emerald-200'
                              : r.status === 'error'
                              ? 'bg-red-50 border border-red-200'
                              : 'bg-care-surface border border-care-border'
                          }`}
                        >
                          {r.status === 'uploading' && (
                            <Loader2 className="w-4 h-4 animate-spin shrink-0 text-care-text-muted mt-0.5" />
                          )}
                          {r.status === 'ok' && (
                            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
                          )}
                          {r.status === 'error' && (
                            <XCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
                          )}
                          <div>
                            <p
                              className={`font-medium ${
                                r.status === 'ok'
                                  ? 'text-emerald-700'
                                  : r.status === 'error'
                                  ? 'text-red-700'
                                  : 'text-care-text-muted'
                              }`}
                            >
                              {r.fileName}
                            </p>
                            <p
                              className={`mt-0.5 ${
                                r.status === 'ok'
                                  ? 'text-emerald-600'
                                  : r.status === 'error'
                                  ? 'text-red-600'
                                  : 'text-care-text-subtle'
                              }`}
                            >
                              {r.message}
                            </p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
