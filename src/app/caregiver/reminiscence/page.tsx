import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { BookOpen, Plus } from 'lucide-react';

const kindLabel: Record<string, string> = { photo: '📷 Photo', music: '🎵 Music', memory: '💭 Memory' };

export default async function CaregiverReminiscencePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase.from('profiles').select('family_id').eq('id', user.id).single();
  if (!profile?.family_id) redirect('/onboarding');

  const { data: items } = await supabase
    .from('reminiscence_items').select('*').eq('family_id', profile.family_id).order('era_year', { ascending: false });

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Memories</h1>
          <p className="text-gray-500 text-sm mt-1">Photos, music, and stories for reminiscence therapy.</p>
        </div>
        <Link href="/caregiver/reminiscence/new" className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors">
          <Plus className="w-4 h-4" /> Add memory
        </Link>
      </div>

      {items && items.length > 0 ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => (
            <div key={item.id} className="bg-white rounded-xl border border-caregiver-border overflow-hidden hover:shadow-md transition-shadow">
              {item.media_url && item.kind === 'photo' && (
                <div className="aspect-video relative bg-gray-100">
                  <Image src={item.media_url} alt={item.title} fill className="object-cover" sizes="33vw" />
                </div>
              )}
              <div className="p-4">
                <p className="text-xs text-purple-600 font-medium mb-1">{kindLabel[item.kind] ?? item.kind}{item.era_year ? ` · ${item.era_year}` : ''}</p>
                <p className="font-semibold text-gray-900">{item.title}</p>
                {item.description && <p className="text-sm text-gray-500 mt-1 line-clamp-2">{item.description}</p>}
                {item.prompt && <p className="text-xs text-purple-500 mt-2 italic line-clamp-2">"{item.prompt}"</p>}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-caregiver-border flex flex-col items-center justify-center py-20 text-center px-6">
          <BookOpen className="w-12 h-12 text-gray-200 mb-3" />
          <p className="font-semibold text-gray-700 text-lg">No memories yet</p>
          <p className="text-gray-400 text-sm mt-1 mb-5">Upload old photos, music, or written memories.</p>
          <Link href="/caregiver/reminiscence/new" className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors">
            <Plus className="w-4 h-4" /> Add first memory
          </Link>
        </div>
      )}
    </div>
  );
}
