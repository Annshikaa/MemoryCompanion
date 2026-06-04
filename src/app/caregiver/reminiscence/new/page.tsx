'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Upload, X } from 'lucide-react';

type Kind = 'photo' | 'music' | 'memory';

export default function NewMemoryPage() {
  const router = useRouter();
  const supabase = createClient();

  const [kind, setKind] = useState<Kind>('photo');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [prompt, setPrompt] = useState('');
  const [eraYear, setEraYear] = useState('');
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { setError('File must be under 10 MB.'); return; }
    setMediaFile(file);
    setMediaPreview(URL.createObjectURL(file));
    setError('');
  }

  function clearFile() {
    setMediaFile(null);
    if (mediaPreview) URL.revokeObjectURL(mediaPreview);
    setMediaPreview(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!title.trim()) { setError('Title is required.'); return; }
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/login'); return; }
    const { data: profile } = await supabase.from('profiles').select('family_id').eq('id', user.id).single();
    if (!profile?.family_id) { router.push('/onboarding'); return; }

    let mediaUrl: string | null = null;
    if (mediaFile) {
      const ext = mediaFile.name.split('.').pop();
      const path = `${profile.family_id}/reminiscence/${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from('family-media').upload(path, mediaFile);
      if (uploadErr) { setError(`Upload failed: ${uploadErr.message}`); setLoading(false); return; }
      const { data: urlData } = supabase.storage.from('family-media').getPublicUrl(path);
      mediaUrl = urlData.publicUrl;
    }

    const { error: err } = await supabase.from('reminiscence_items').insert({
      family_id: profile.family_id,
      kind,
      title: title.trim(),
      description: description.trim() || null,
      prompt: prompt.trim() || null,
      era_year: eraYear ? parseInt(eraYear) : null,
      media_url: mediaUrl,
    });

    if (err) { setError(err.message); setLoading(false); return; }
    router.push('/caregiver/reminiscence');
    router.refresh();
  }

  return (
    <div className="max-w-xl mx-auto">
      <Link href="/caregiver/reminiscence" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to Memories
      </Link>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Add a memory</h1>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-caregiver-border p-6 space-y-5">
        <div>
          <p className="block text-sm font-medium text-gray-700 mb-2">Type *</p>
          <div className="grid grid-cols-3 gap-3">
            {(['photo', 'music', 'memory'] as Kind[]).map((k) => (
              <button key={k} type="button" onClick={() => setKind(k)}
                className={`py-2.5 rounded-xl border-2 text-sm font-medium capitalize transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 ${kind === k ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-500 hover:border-blue-200'}`}
                aria-pressed={kind === k}>
                {k === 'photo' ? '📷 Photo' : k === 'music' ? '🎵 Music' : '💭 Memory'}
              </button>
            ))}
          </div>
        </div>

        {(kind === 'photo' || kind === 'music') && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {kind === 'photo' ? 'Photo' : 'Audio file'} <span className="text-gray-400 font-normal">(max 10 MB)</span>
            </label>
            {mediaPreview && kind === 'photo' ? (
              <div className="relative w-full aspect-video rounded-xl overflow-hidden group">
                <Image src={mediaPreview} alt="Preview" fill className="object-cover" />
                <button type="button" onClick={clearFile} className="absolute top-2 right-2 bg-black/50 rounded-full p-1 text-white hover:bg-black/70" aria-label="Remove file">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : mediaFile ? (
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <span className="text-sm text-gray-700 truncate">{mediaFile.name}</span>
                <button type="button" onClick={clearFile} className="text-gray-400 hover:text-red-500" aria-label="Remove file">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center w-full h-32 rounded-xl border-2 border-dashed border-gray-200 hover:border-blue-400 cursor-pointer transition-colors bg-gray-50 hover:bg-blue-50">
                <Upload className="w-6 h-6 text-gray-400 mb-1" />
                <span className="text-xs text-gray-400">Click to upload</span>
                <input type="file" accept={kind === 'photo' ? 'image/*' : 'audio/*'} onChange={handleFileChange} className="sr-only" aria-label="Upload file" />
              </label>
            )}
          </div>
        )}

        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
          <input id="title" type="text" required value={title} onChange={(e) => setTitle(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            placeholder={kind === 'photo' ? 'e.g. Family picnic in Shimla' : kind === 'music' ? 'e.g. Favourite old Hindi song' : 'e.g. Our first home'} />
        </div>

        <div>
          <label htmlFor="year" className="block text-sm font-medium text-gray-700 mb-1">Year <span className="text-gray-400 font-normal">(optional)</span></label>
          <input id="year" type="number" min="1900" max={new Date().getFullYear()} value={eraYear} onChange={(e) => setEraYear(e.target.value)}
            className="w-32 px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900" placeholder="e.g. 1975" />
        </div>

        <div>
          <label htmlFor="desc" className="block text-sm font-medium text-gray-700 mb-1">Description <span className="text-gray-400 font-normal">(optional)</span></label>
          <textarea id="desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={3}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 resize-none"
            placeholder="A few warm words about this memory…" />
        </div>

        <div>
          <label htmlFor="prompt" className="block text-sm font-medium text-gray-700 mb-1">
            Conversation prompt <span className="text-gray-400 font-normal">(shown to patient)</span>
          </label>
          <textarea id="prompt" value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={2}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 resize-none"
            placeholder="e.g. Do you remember this trip? Who came with you?" />
        </div>

        {error && <div role="alert" className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">{error}</div>}

        <div className="flex gap-3 pt-2">
          <Link href="/caregiver/reminiscence" className="px-5 py-3 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 font-medium text-sm">Cancel</Link>
          <button type="submit" disabled={loading} className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold py-3 px-6 rounded-xl text-sm">
            {loading ? 'Saving…' : 'Save memory'}
          </button>
        </div>
      </form>
    </div>
  );
}
