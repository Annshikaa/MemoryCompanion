'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import {
  X,
  Camera,
  UserCircle,
  Upload,
  Mic,
  Trash2,
  AlertCircle,
  Loader2,
  Star,
} from 'lucide-react';
import type { Tables } from '@/lib/supabase/database.types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  person: Tables<'people'> | null;
  familyId: string;
  onSaved: () => void;
}

type Mode = 'form' | 'confirm-delete';

function Field({
  id, label, required, hint, children,
}: {
  id?: string; label: string; required?: boolean; hint?: string; children: React.ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="block text-sm font-medium text-care-text mb-1.5"
      >
        {label}
        {required && <span className="text-red-500 ml-0.5" aria-hidden>*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-care-text-subtle mt-1.5">{hint}</p>}
    </div>
  );
}

export default function PersonDrawer({ isOpen, onClose, person, familyId, onSaved }: Props) {
  const supabase = createClient();
  const photoInputRef    = useRef<HTMLInputElement>(null);
  const voiceInputRef    = useRef<HTMLInputElement>(null);
  const firstFocusRef    = useRef<HTMLButtonElement>(null);

  // Form state
  const [name, setName]               = useState('');
  const [relationship, setRelationship] = useState('');
  const [notes, setNotes]             = useState('');
  const [pinned, setPinned]           = useState(false);

  // Photo state
  const [photoFile, setPhotoFile]         = useState<File | null>(null);
  const [photoPreview, setPhotoPreview]   = useState<string | null>(null);
  const [photoError, setPhotoError]       = useState('');

  // Voice note — upload path
  const [voiceFile, setVoiceFile]         = useState<File | null>(null);
  const [voiceName, setVoiceName]         = useState('');
  const [voiceError, setVoiceError]       = useState('');

  // Voice note — recording path
  type RecordState = 'idle' | 'recording' | 'done';
  const [recordState, setRecordState]     = useState<RecordState>('idle');
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [recordPreviewUrl, setRecordPreviewUrl] = useState<string | null>(null);
  const mediaRecorderRef  = useRef<MediaRecorder | null>(null);
  const recordChunksRef   = useRef<Blob[]>([]);
  const recordTimerRef    = useRef<ReturnType<typeof setInterval> | null>(null);

  // UI state
  const [mode, setMode]       = useState<Mode>('form');
  const [saving, setSaving]   = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const isEdit = person !== null;

  // Reset form when drawer opens/closes or person changes
  useEffect(() => {
    if (isOpen) {
      setName(person?.name ?? '');
      setRelationship(person?.relationship ?? '');
      setNotes(person?.notes ?? '');
      setPinned(person?.pinned ?? false);
      setPhotoFile(null);
      setPhotoPreview(null);
      setPhotoError('');
      setVoiceFile(null);
      setVoiceName(person?.voice_note_url ? 'Existing recording' : '');
      setVoiceError('');
      // Stop any in-progress recording and clean up
      if (mediaRecorderRef.current?.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
      if (recordPreviewUrl) URL.revokeObjectURL(recordPreviewUrl);
      setRecordState('idle');
      setRecordSeconds(0);
      setRecordPreviewUrl(null);
      setMode('form');
      setSaving(false);
      setDeleting(false);
      setErrorMsg('');
    }
  }, [isOpen, person]);

  // Focus management
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => firstFocusRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && isOpen && !saving && !deleting) onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, saving, deleting, onClose]);

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setPhotoError('Please upload an image (JPEG, PNG, or WebP).');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setPhotoError('Photo must be under 5 MB.');
      return;
    }
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoError('');
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  }

  function handleVoiceChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('audio/')) {
      setVoiceError('Please upload an audio file (MP3, M4A, WAV, etc.).');
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setVoiceError('Voice note must be under 20 MB.');
      return;
    }
    setVoiceError('');
    setVoiceFile(file);
    setVoiceName(file.name);
  }

  const startRecording = useCallback(async () => {
    setVoiceError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recordChunksRef.current = [];
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/ogg';
      const mr = new MediaRecorder(stream, { mimeType });
      mr.ondataavailable = (e) => { if (e.data.size > 0) recordChunksRef.current.push(e.data); };
      mr.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        if (recordTimerRef.current) clearInterval(recordTimerRef.current);
        const blob = new Blob(recordChunksRef.current, { type: mimeType });
        const ext  = mimeType === 'audio/webm' ? 'webm' : 'ogg';
        const file = new File([blob], `voice-recording-${Date.now()}.${ext}`, { type: mimeType });
        const url  = URL.createObjectURL(blob);
        setVoiceFile(file);
        setVoiceName('Voice recording');
        setRecordPreviewUrl(url);
        setRecordState('done');
      };
      mr.start();
      mediaRecorderRef.current = mr;
      setRecordState('recording');
      setRecordSeconds(0);
      recordTimerRef.current = setInterval(() => setRecordSeconds((s) => s + 1), 1000);
    } catch {
      setVoiceError('Microphone access denied. Please allow microphone access or upload a file instead.');
    }
  }, []);

  function stopRecording() {
    mediaRecorderRef.current?.stop();
    if (recordTimerRef.current) clearInterval(recordTimerRef.current);
  }

  function discardRecording() {
    if (recordPreviewUrl) URL.revokeObjectURL(recordPreviewUrl);
    setRecordState('idle');
    setRecordSeconds(0);
    setRecordPreviewUrl(null);
    setVoiceFile(null);
    setVoiceName('');
  }

  function fmtSeconds(s: number) {
    return `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;
  }

  async function uploadFile(file: File, folder: string): Promise<string | null> {
    const ext  = file.name.split('.').pop() ?? 'bin';
    const path = `${familyId}/${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage
      .from('family-media')
      .upload(path, file, { upsert: false });
    if (error) throw new Error(`Upload failed: ${error.message}`);
    return supabase.storage.from('family-media').getPublicUrl(path).data.publicUrl;
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg('');
    if (!name.trim())         { setErrorMsg('Name is required.'); return; }
    if (!relationship.trim()) { setErrorMsg('Relationship is required.'); return; }

    setSaving(true);

    try {
      let photoUrl   = person?.photo_url   ?? null;
      let voiceUrl   = person?.voice_note_url ?? null;

      if (photoFile) photoUrl = await uploadFile(photoFile, 'people');
      if (voiceFile) voiceUrl = await uploadFile(voiceFile, 'voices');

      const payload = {
        name:            name.trim(),
        relationship:    relationship.trim(),
        notes:           notes.trim() || null,
        pinned,
        photo_url:       photoUrl,
        voice_note_url:  voiceUrl,
      };

      if (isEdit) {
        const { error } = await supabase.from('people').update(payload).eq('id', person!.id);
        if (error) throw new Error(error.message);
      } else {
        const { error } = await supabase.from('people').insert({ family_id: familyId, ...payload });
        if (error) throw new Error(error.message);
      }

      onSaved();
      onClose();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!person) return;
    setDeleting(true);
    const { error } = await supabase.from('people').delete().eq('id', person.id);
    if (error) {
      setErrorMsg(error.message);
      setDeleting(false);
      setMode('form');
      return;
    }
    onSaved();
    onClose();
  }

  const currentPhoto = photoPreview ?? person?.photo_url ?? null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40"
            style={{ background: 'rgba(28,25,23,0.25)', backdropFilter: 'blur(2px)' }}
            onClick={() => { if (!saving && !deleting) onClose(); }}
            aria-hidden="true"
          />

          {/* Drawer panel */}
          <motion.div
            key="drawer"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 h-full w-full max-w-[480px] bg-white z-50 flex flex-col shadow-care-xl"
            role="dialog"
            aria-modal="true"
            aria-label={isEdit ? `Edit ${person?.name}` : 'Add a loved one'}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-care-border-subtle">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-care-text-subtle">
                  {isEdit ? 'Edit' : 'Add'}
                </p>
                <h2 className="font-display font-semibold text-care-text text-lg tracking-tight leading-tight">
                  {isEdit ? person!.name : 'Loved One'}
                </h2>
              </div>
              <button
                ref={firstFocusRef}
                type="button"
                onClick={onClose}
                disabled={saving || deleting}
                className="w-9 h-9 rounded-care flex items-center justify-center text-care-text-muted hover:bg-care-highlight hover:text-care-text transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-care-primary disabled:opacity-40"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {mode === 'confirm-delete' ? (
              /* ── Delete confirmation ── */
              <div className="flex-1 flex flex-col items-center justify-center px-8 text-center gap-5">
                <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center">
                  <Trash2 className="w-7 h-7 text-red-500" />
                </div>
                <div>
                  <p className="font-display font-semibold text-care-text text-lg">
                    Remove {person?.name}?
                  </p>
                  <p className="text-care-text-muted text-sm mt-2 leading-relaxed">
                    This will remove them from the patient&apos;s device.
                    This action cannot be undone.
                  </p>
                </div>
                {errorMsg && (
                  <p role="alert" className="text-xs text-red-600 flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {errorMsg}
                  </p>
                )}
                <div className="flex gap-3 w-full">
                  <button
                    type="button"
                    onClick={() => setMode('form')}
                    disabled={deleting}
                    className="flex-1 px-4 py-3 rounded-care border border-care-border text-care-text-muted hover:bg-care-highlight text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-care-primary"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={deleting}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-care bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-colors disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                  >
                    {deleting && <Loader2 className="w-4 h-4 animate-spin" />}
                    {deleting ? 'Removing…' : 'Yes, remove'}
                  </button>
                </div>
              </div>
            ) : (
              /* ── Form ── */
              <form
                onSubmit={handleSave}
                className="flex-1 overflow-y-auto flex flex-col"
                noValidate
              >
                <div className="flex-1 px-6 py-6 space-y-6">
                  {/* Photo upload */}
                  <div className="flex items-start gap-5">
                    {/* Square preview */}
                    <button
                      type="button"
                      onClick={() => photoInputRef.current?.click()}
                      className="relative group w-24 h-24 rounded-care-lg overflow-hidden shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-care-primary focus-visible:ring-offset-2"
                      aria-label={currentPhoto ? 'Change photo' : 'Add photo'}
                    >
                      {currentPhoto ? (
                        <Image
                          src={currentPhoto}
                          alt="Person photo preview"
                          fill
                          className="object-cover"
                          sizes="96px"
                        />
                      ) : (
                        <div className="w-full h-full bg-care-highlight flex items-center justify-center">
                          <UserCircle className="w-10 h-10 text-care-text-subtle" />
                        </div>
                      )}
                      <div
                        className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ background: 'rgba(28,25,23,0.45)' }}
                        aria-hidden="true"
                      >
                        <Camera className="w-5 h-5 text-white" />
                      </div>
                    </button>
                    <input
                      ref={photoInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoChange}
                      className="sr-only"
                      aria-label="Upload person photo"
                    />

                    <div className="pt-1">
                      <p className="text-sm font-medium text-care-text">Photo</p>
                      <p className="text-xs text-care-text-muted mt-1 leading-relaxed">
                        A clear face photo helps the patient recognise them.
                        <br />Max 5 MB.
                      </p>
                      {photoError && (
                        <p role="alert" className="flex items-center gap-1 text-xs text-red-600 mt-1.5">
                          <AlertCircle className="w-3 h-3 shrink-0" /> {photoError}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Name */}
                  <Field id="person-name" label="Full name" required>
                    <input
                      id="person-name"
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Priya Sharma"
                      className="w-full px-4 py-3 rounded-care border border-care-border bg-care-surface focus:outline-none focus:ring-2 focus:ring-care-primary focus:border-transparent text-care-text placeholder:text-care-text-subtle"
                    />
                  </Field>

                  {/* Relationship */}
                  <Field id="person-rel" label="Relationship" required>
                    <input
                      id="person-rel"
                      type="text"
                      required
                      value={relationship}
                      onChange={(e) => setRelationship(e.target.value)}
                      placeholder="e.g. Daughter, Son, Husband…"
                      className="w-full px-4 py-3 rounded-care border border-care-border bg-care-surface focus:outline-none focus:ring-2 focus:ring-care-primary focus:border-transparent text-care-text placeholder:text-care-text-subtle"
                    />
                  </Field>

                  {/* Notes */}
                  <Field
                    id="person-notes"
                    label="Notes"
                    hint="Shown below their name on the patient's device."
                  >
                    <textarea
                      id="person-notes"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={3}
                      placeholder="e.g. Visits on Sundays. Loves cricket."
                      className="w-full px-4 py-3 rounded-care border border-care-border bg-care-surface focus:outline-none focus:ring-2 focus:ring-care-primary focus:border-transparent text-care-text placeholder:text-care-text-subtle resize-none"
                    />
                  </Field>

                  {/* Voice note */}
                  <Field
                    label="Voice note"
                    hint="An audio clip that plays when the patient taps their photo. Record directly or upload a file."
                  >
                    <div className="space-y-3">

                      {/* ── Idle: two options ── */}
                      {recordState === 'idle' && (
                        <div className="flex items-center gap-2 flex-wrap">
                          <button
                            type="button"
                            onClick={() => voiceInputRef.current?.click()}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-care border border-care-border bg-care-surface hover:bg-care-highlight text-sm font-medium text-care-text-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-care-primary"
                          >
                            <Upload className="w-4 h-4" />
                            {voiceName ? 'Change file' : 'Upload audio'}
                          </button>

                          <button
                            type="button"
                            onClick={startRecording}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-care border border-care-border bg-care-surface hover:bg-care-highlight text-sm font-medium text-care-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-care-primary"
                          >
                            <Mic className="w-4 h-4" />
                            Record voice
                          </button>

                          {voiceName && (
                            <span className="text-xs text-care-text-muted truncate max-w-[140px]" title={voiceName}>
                              {voiceName}
                            </span>
                          )}
                        </div>
                      )}

                      {/* ── Recording in progress ── */}
                      {recordState === 'recording' && (
                        <div className="flex items-center gap-3 px-4 py-2.5 rounded-care bg-red-50 border border-red-200">
                          <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse shrink-0" aria-hidden />
                          <span className="text-sm font-semibold text-red-700 tabular-nums">
                            Recording {fmtSeconds(recordSeconds)}
                          </span>
                          <button
                            type="button"
                            onClick={stopRecording}
                            className="ml-auto text-xs font-semibold px-3 py-1.5 rounded-care bg-red-600 text-white hover:bg-red-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                          >
                            Stop
                          </button>
                        </div>
                      )}

                      {/* ── Recording done — preview + re-record ── */}
                      {recordState === 'done' && recordPreviewUrl && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 px-3 py-2.5 rounded-care bg-care-primary-light border border-care-primary/20">
                            <Mic className="w-4 h-4 text-care-primary shrink-0" />
                            <span className="text-xs text-care-primary font-medium flex-1">Voice recording ready</span>
                          </div>
                          <audio
                            src={recordPreviewUrl}
                            controls
                            className="w-full h-8"
                            aria-label="Preview recorded voice note"
                          />
                          <button
                            type="button"
                            onClick={discardRecording}
                            className="text-xs text-care-text-muted hover:text-care-text underline"
                          >
                            Discard and re-record
                          </button>
                        </div>
                      )}

                    </div>
                    <input
                      ref={voiceInputRef}
                      type="file"
                      accept="audio/*"
                      onChange={handleVoiceChange}
                      className="sr-only"
                      aria-label="Upload voice note"
                    />
                    {voiceError && (
                      <p role="alert" className="flex items-center gap-1 text-xs text-red-600 mt-1.5">
                        <AlertCircle className="w-3 h-3 shrink-0" /> {voiceError}
                      </p>
                    )}
                  </Field>

                  {/* Pinned toggle */}
                  <label className="flex items-start gap-3 cursor-pointer group">
                    <div className="relative mt-0.5">
                      <input
                        type="checkbox"
                        checked={pinned}
                        onChange={(e) => setPinned(e.target.checked)}
                        className="sr-only peer"
                      />
                      {/* Custom toggle */}
                      <div className="w-10 h-6 bg-care-border rounded-full peer-checked:bg-care-primary transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-care-primary peer-focus-visible:ring-offset-1" />
                      <div className="absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform peer-checked:translate-x-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 text-sm font-medium text-care-text">
                        <Star className="w-3.5 h-3.5 text-amber-400" fill={pinned ? 'currentColor' : 'none'} />
                        Pin to top
                      </div>
                      <p className="text-xs text-care-text-muted mt-0.5">
                        Shows this person first on the patient&apos;s device.
                      </p>
                    </div>
                  </label>

                  {/* Error */}
                  {errorMsg && (
                    <div role="alert" className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-care text-sm">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      {errorMsg}
                    </div>
                  )}
                </div>

                {/* Footer actions */}
                <div className="px-6 py-5 border-t border-care-border-subtle bg-care-surface space-y-3">
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={onClose}
                      disabled={saving}
                      className="flex-1 px-4 py-3 rounded-care border border-care-border text-care-text-muted hover:bg-care-highlight text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-care-primary"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-care bg-care-primary text-white text-sm font-semibold hover:bg-care-primary-hover transition-colors disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-care-primary"
                    >
                      {saving && <Loader2 className="w-4 h-4 animate-spin" aria-hidden />}
                      {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Add person'}
                    </button>
                  </div>

                  {isEdit && (
                    <button
                      type="button"
                      onClick={() => setMode('confirm-delete')}
                      disabled={saving}
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-care text-sm font-medium text-red-600 hover:bg-red-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                    >
                      <Trash2 className="w-4 h-4" />
                      Remove {person?.name}
                    </button>
                  )}
                </div>
              </form>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
