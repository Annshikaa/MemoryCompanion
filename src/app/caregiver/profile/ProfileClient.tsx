'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { Camera, UserCircle, Check, Loader2, AlertCircle, MapPin } from 'lucide-react';
import type { Tables } from '@/lib/supabase/database.types';

interface Props {
  patient: Tables<'patients'> | null;
  familyId: string;
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

export default function ProfileClient({ patient, familyId }: Props) {
  const supabase = createClient();
  const router = useRouter();
  const photoInputRef = useRef<HTMLInputElement>(null);

  const [name, setName]               = useState(patient?.name ?? '');
  const [location, setLocation]       = useState(patient?.home_location_text ?? 'You are at home');
  const [photoFile, setPhotoFile]     = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoError, setPhotoError]   = useState('');
  const [saveState, setSaveState]     = useState<SaveState>('idle');
  const [errorMsg, setErrorMsg]       = useState('');

  const currentPhoto = photoPreview ?? patient?.photo_url ?? null;

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setPhotoError('Please upload an image file (JPEG, PNG, WebP, etc.).');
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

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg('');
    if (!name.trim()) { setErrorMsg('Patient name is required.'); return; }

    setSaveState('saving');

    let photoUrl = patient?.photo_url ?? null;

    if (photoFile) {
      const ext  = photoFile.name.split('.').pop() ?? 'jpg';
      const path = `${familyId}/patient/${Date.now()}.${ext}`;

      const { error: uploadErr } = await supabase.storage
        .from('family-media')
        .upload(path, photoFile, { upsert: false });

      if (uploadErr) {
        setErrorMsg(`Photo upload failed: ${uploadErr.message}`);
        setSaveState('error');
        return;
      }

      const { data: urlData } = supabase.storage.from('family-media').getPublicUrl(path);
      photoUrl = urlData.publicUrl;
    }

    const payload = {
      name:               name.trim(),
      home_location_text: location.trim() || 'You are at home',
      photo_url:          photoUrl,
    };

    let dbErr: { message: string } | null = null;

    if (patient) {
      const { error } = await supabase.from('patients').update(payload).eq('id', patient.id);
      dbErr = error;
    } else {
      const { error } = await supabase.from('patients').insert({ family_id: familyId, ...payload });
      dbErr = error;
    }

    if (dbErr) {
      setErrorMsg(dbErr.message);
      setSaveState('error');
      return;
    }

    setSaveState('saved');
    setPhotoFile(null);
    router.refresh();
    setTimeout(() => setSaveState('idle'), 3500);
  }

  return (
    <form onSubmit={handleSave} noValidate>
      {/* Photo card */}
      <div className="bg-white rounded-care-lg border border-care-border shadow-care-sm p-6 mb-4">
        <h2 className="font-display font-semibold text-care-text text-base mb-5">
          Profile photo
        </h2>

        <div className="flex items-center gap-6">
          {/* Circular avatar button */}
          <button
            type="button"
            onClick={() => photoInputRef.current?.click()}
            className="relative group w-28 h-28 rounded-full overflow-hidden shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-care-primary focus-visible:ring-offset-2"
            aria-label={`${currentPhoto ? 'Change' : 'Add'} patient photo`}
          >
            {currentPhoto ? (
              <Image src={currentPhoto} alt="Patient" fill className="object-cover" sizes="112px" />
            ) : (
              <div className="w-full h-full bg-care-primary-light flex items-center justify-center">
                <UserCircle className="w-12 h-12 text-care-accent" />
              </div>
            )}
            {/* Hover overlay */}
            <div
              className="absolute inset-0 flex flex-col items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ background: 'rgba(28,25,23,0.45)' }}
              aria-hidden="true"
            >
              <Camera className="w-5 h-5 text-white" />
              <span className="text-white text-[10px] font-medium">Change</span>
            </div>
          </button>

          <input
            ref={photoInputRef}
            type="file"
            accept="image/*"
            onChange={handlePhotoChange}
            className="sr-only"
            aria-label="Upload patient photo"
          />

          {/* Info */}
          <div>
            <p className="text-sm text-care-text font-medium mb-1">
              {currentPhoto ? 'Looking good.' : 'No photo yet.'}
            </p>
            <p className="text-xs text-care-text-muted leading-relaxed">
              Click the circle to {currentPhoto ? 'change the photo' : 'upload a photo'}.
              <br />JPEG, PNG or WebP · max 5 MB.
            </p>
            {photoError && (
              <p role="alert" className="flex items-center gap-1.5 text-xs text-red-600 mt-2">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                {photoError}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Details card */}
      <div className="bg-white rounded-care-lg border border-care-border shadow-care-sm p-6 mb-4">
        <h2 className="font-display font-semibold text-care-text text-base mb-5">
          Details
        </h2>

        <div className="space-y-5">
          {/* Name */}
          <div>
            <label htmlFor="patientName" className="block text-sm font-medium text-care-text mb-1.5">
              Patient&apos;s name <span className="text-red-500" aria-hidden>*</span>
            </label>
            <input
              id="patientName"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Grandma Kamla"
              className="w-full px-4 py-3 rounded-care border border-care-border bg-care-surface focus:outline-none focus:ring-2 focus:ring-care-primary focus:border-transparent text-care-text placeholder:text-care-text-subtle transition-shadow"
            />
          </div>

          {/* Location */}
          <div>
            <label htmlFor="location" className="block text-sm font-medium text-care-text mb-1.5">
              <span className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-care-accent" />
                Location reminder
              </span>
            </label>
            <input
              id="location"
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. You are at home in Indore"
              className="w-full px-4 py-3 rounded-care border border-care-border bg-care-surface focus:outline-none focus:ring-2 focus:ring-care-primary focus:border-transparent text-care-text placeholder:text-care-text-subtle transition-shadow"
            />
            <p className="text-xs text-care-text-subtle mt-1.5">
              Shown prominently on the patient&apos;s home screen to help orient them.
            </p>
          </div>
        </div>
      </div>

      {/* Error */}
      {errorMsg && (
        <div role="alert" className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-care text-sm mb-4">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {errorMsg}
        </div>
      )}

      {/* Save button */}
      <button
        type="submit"
        disabled={saveState === 'saving'}
        className={[
          'flex items-center gap-2 px-6 py-3 rounded-care font-semibold text-sm transition-all',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-care-primary focus-visible:ring-offset-2',
          saveState === 'saved'
            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
            : 'bg-care-primary text-white hover:bg-care-primary-hover disabled:opacity-60',
        ].join(' ')}
      >
        {saveState === 'saving' && <Loader2 className="w-4 h-4 animate-spin" aria-hidden />}
        {saveState === 'saved'  && <Check className="w-4 h-4" aria-hidden />}
        {saveState === 'saving' ? 'Saving…'
          : saveState === 'saved' ? 'Changes saved'
          : patient ? 'Save changes'
          : 'Create patient profile'}
      </button>
    </form>
  );
}
