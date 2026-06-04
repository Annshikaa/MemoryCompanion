'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { ArrowLeft, Upload, X } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

export default function NewPersonPage() {
  const router = useRouter();
  const supabase = createClient();

  const [name, setName] = useState('');
  const [relationship, setRelationship] = useState('');
  const [notes, setNotes] = useState('');
  const [pinned, setPinned] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError('Photo must be under 5 MB.');
      return;
    }
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
    setError('');
  }

  function clearPhoto() {
    setPhotoFile(null);
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoPreview(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!name.trim() || !relationship.trim()) {
      setError('Name and relationship are required.');
      return;
    }

    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/login'); return; }

    const { data: profile } = await supabase
      .from('profiles')
      .select('family_id')
      .eq('id', user.id)
      .single();

    if (!profile?.family_id) { router.push('/onboarding'); return; }

    let photoUrl: string | null = null;

    if (photoFile) {
      const ext = photoFile.name.split('.').pop();
      const path = `${profile.family_id}/people/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('family-media')
        .upload(path, photoFile, { upsert: false });

      if (uploadError) {
        setError(`Photo upload failed: ${uploadError.message}`);
        setLoading(false);
        return;
      }

      const { data: urlData } = supabase.storage
        .from('family-media')
        .getPublicUrl(path);

      photoUrl = urlData.publicUrl;
    }

    const { error: insertError } = await supabase.from('people').insert({
      family_id: profile.family_id,
      name: name.trim(),
      relationship: relationship.trim(),
      notes: notes.trim() || null,
      photo_url: photoUrl,
      pinned,
    });

    if (insertError) {
      setError(insertError.message);
      setLoading(false);
      return;
    }

    router.push('/caregiver/people');
    router.refresh();
  }

  return (
    <div className="max-w-xl mx-auto">
      <div className="mb-6">
        <Link
          href="/caregiver/people"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Family Members
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Add a family member</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-caregiver-border p-6 space-y-5">
        {/* Photo upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Photo <span className="text-gray-400 font-normal">(optional, max 5 MB)</span>
          </label>
          {photoPreview ? (
            <div className="relative w-32 h-32 rounded-xl overflow-hidden group">
              <Image src={photoPreview} alt="Preview" fill className="object-cover" />
              <button
                type="button"
                onClick={clearPhoto}
                className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                aria-label="Remove photo"
              >
                <X className="w-6 h-6 text-white" />
              </button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center w-32 h-32 rounded-xl border-2 border-dashed border-gray-200 hover:border-blue-400 cursor-pointer transition-colors bg-gray-50 hover:bg-blue-50">
              <Upload className="w-6 h-6 text-gray-400 mb-1" />
              <span className="text-xs text-gray-400">Upload</span>
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                className="sr-only"
                aria-label="Upload photo"
              />
            </label>
          )}
        </div>

        {/* Name */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
            Full name *
          </label>
          <input
            id="name"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            placeholder="e.g. Priya Sharma"
          />
        </div>

        {/* Relationship */}
        <div>
          <label htmlFor="relationship" className="block text-sm font-medium text-gray-700 mb-1">
            Relationship *
          </label>
          <input
            id="relationship"
            type="text"
            required
            value={relationship}
            onChange={(e) => setRelationship(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            placeholder="e.g. Daughter, Son, Husband…"
          />
        </div>

        {/* Notes */}
        <div>
          <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
            Notes <span className="text-gray-400 font-normal">(shown to patient)</span>
          </label>
          <textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 resize-none"
            placeholder="e.g. Visits on Sundays. Loves cricket."
          />
        </div>

        {/* Pinned */}
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={pinned}
            onChange={(e) => setPinned(e.target.checked)}
            className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm text-gray-700">
            Pin to top of family list
          </span>
        </label>

        {error && (
          <div role="alert" className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
            {error}
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <Link
            href="/caregiver/people"
            className="px-5 py-3 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 font-medium text-sm transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold py-3 px-6 rounded-xl transition-colors text-sm"
          >
            {loading ? 'Saving…' : 'Save person'}
          </button>
        </div>
      </form>
    </div>
  );
}
