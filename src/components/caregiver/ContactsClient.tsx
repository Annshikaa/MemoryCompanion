'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import {
  Plus, Pencil, Trash2, UserCircle, Phone,
  ChevronUp, ChevronDown, Loader2, X, AlertCircle,
} from 'lucide-react';
import type { Tables } from '@/lib/supabase/database.types';

type Contact = Tables<'emergency_contacts'>;

interface Props {
  initialContacts: Contact[];
  familyId: string;
}

interface FormState {
  name: string;
  relationship: string;
  phone: string;
  photoFile: File | null;
  photoPreview: string | null;
}

const EMPTY_FORM: FormState = { name: '', relationship: '', phone: '', photoFile: null, photoPreview: null };

export default function ContactsClient({ initialContacts, familyId }: Props) {
  const supabase  = createClient();
  const router    = useRouter();
  const photoRef  = useRef<HTMLInputElement>(null);

  const [contacts, setContacts]     = useState(initialContacts);
  const [editing,  setEditing]      = useState<Contact | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [form,     setForm]         = useState<FormState>(EMPTY_FORM);
  const [saving,   setSaving]       = useState(false);
  const [deleting, setDeleting]     = useState<string | null>(null);
  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  const [error,    setError]        = useState('');

  function openAdd() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setError('');
    setDrawerOpen(true);
  }

  function openEdit(c: Contact) {
    setEditing(c);
    setForm({ name: c.name, relationship: c.relationship, phone: c.phone, photoFile: null, photoPreview: null });
    setError('');
    setDrawerOpen(true);
  }

  function closeDrawer() { setDrawerOpen(false); setEditing(null); }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith('image/')) { setError('Please upload an image file.'); return; }
    if (f.size > 5 * 1024 * 1024) { setError('Photo must be under 5 MB.'); return; }
    if (form.photoPreview) URL.revokeObjectURL(form.photoPreview);
    setError('');
    setForm((p) => ({ ...p, photoFile: f, photoPreview: URL.createObjectURL(f) }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!form.name.trim() || !form.relationship.trim() || !form.phone.trim()) {
      setError('Name, relationship, and phone are required.');
      return;
    }
    setSaving(true);

    let photoUrl = editing?.photo_url ?? null;
    if (form.photoFile) {
      const ext  = form.photoFile.name.split('.').pop() ?? 'jpg';
      const path = `${familyId}/contacts/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from('family-media').upload(path, form.photoFile);
      if (upErr) { setError(`Photo upload failed: ${upErr.message}`); setSaving(false); return; }
      photoUrl = supabase.storage.from('family-media').getPublicUrl(path).data.publicUrl;
    }

    const priority = editing?.priority ?? contacts.length;
    const payload = { name: form.name.trim(), relationship: form.relationship.trim(), phone: form.phone.trim(), photo_url: photoUrl, priority };

    if (editing) {
      const { error: dbErr } = await supabase.from('emergency_contacts').update(payload).eq('id', editing.id);
      if (dbErr) { setError(dbErr.message); setSaving(false); return; }
    } else {
      const { error: dbErr } = await supabase.from('emergency_contacts').insert({ family_id: familyId, ...payload });
      if (dbErr) { setError(dbErr.message); setSaving(false); return; }
    }

    setSaving(false);
    closeDrawer();
    router.refresh();
  }

  async function handleDelete(id: string) {
    setDeleting(id);
    await supabase.from('emergency_contacts').delete().eq('id', id);
    setConfirmDel(null);
    setDeleting(null);
    router.refresh();
  }

  async function moveUp(contact: Contact) {
    const idx = contacts.findIndex((c) => c.id === contact.id);
    if (idx === 0) return;
    const sibling = contacts[idx - 1];
    await Promise.all([
      supabase.from('emergency_contacts').update({ priority: sibling.priority }).eq('id', contact.id),
      supabase.from('emergency_contacts').update({ priority: contact.priority }).eq('id', sibling.id),
    ]);
    router.refresh();
  }

  async function moveDown(contact: Contact) {
    const idx = contacts.findIndex((c) => c.id === contact.id);
    if (idx === contacts.length - 1) return;
    const sibling = contacts[idx + 1];
    await Promise.all([
      supabase.from('emergency_contacts').update({ priority: sibling.priority }).eq('id', contact.id),
      supabase.from('emergency_contacts').update({ priority: contact.priority }).eq('id', sibling.id),
    ]);
    router.refresh();
  }

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <p className="text-care-text-muted text-sm">
          Shown to the patient on their &quot;Call for Help&quot; screen and SOS page.
        </p>
        <button
          type="button"
          onClick={openAdd}
          className="flex items-center gap-2 bg-care-primary text-white px-4 py-2.5 rounded-care text-sm font-semibold hover:bg-care-primary-hover transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-care-primary"
        >
          <Plus className="w-4 h-4" /> Add contact
        </button>
      </div>

      {contacts.length === 0 ? (
        <div className="bg-white rounded-care-lg border border-care-border p-12 text-center shadow-care-sm">
          <Phone className="w-10 h-10 text-care-text-subtle mx-auto mb-3" />
          <p className="font-display font-semibold text-care-text text-lg">No emergency contacts</p>
          <p className="text-care-text-muted text-sm mt-1">Add people the patient can call when they need help.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {contacts.map((c, idx) => (
            <li key={c.id} className="bg-white rounded-care-lg border border-care-border p-4 flex items-center gap-4 shadow-care-sm">
              {/* Avatar */}
              <div className="relative w-12 h-12 rounded-full overflow-hidden bg-care-primary-light shrink-0">
                {c.photo_url ? <Image src={c.photo_url} alt={c.name} fill className="object-cover" sizes="48px" /> : <UserCircle className="w-7 h-7 text-care-accent absolute inset-0 m-auto" />}
              </div>
              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="font-display font-semibold text-care-text text-base truncate">{c.name}</p>
                <p className="text-care-text-muted text-xs">{c.relationship} · {c.phone}</p>
              </div>
              {/* Actions */}
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => moveUp(c)} disabled={idx === 0} className="p-1.5 rounded hover:bg-care-highlight disabled:opacity-30" aria-label={`Move ${c.name} up`}><ChevronUp className="w-4 h-4" /></button>
                <button onClick={() => moveDown(c)} disabled={idx === contacts.length - 1} className="p-1.5 rounded hover:bg-care-highlight disabled:opacity-30" aria-label={`Move ${c.name} down`}><ChevronDown className="w-4 h-4" /></button>
                <button onClick={() => openEdit(c)} className="p-1.5 rounded hover:bg-care-highlight" aria-label={`Edit ${c.name}`}><Pencil className="w-4 h-4 text-care-text-muted" /></button>
                <button onClick={() => setConfirmDel(c.id)} className="p-1.5 rounded hover:bg-red-50" aria-label={`Delete ${c.name}`}><Trash2 className="w-4 h-4 text-red-500" /></button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Delete confirm */}
      {confirmDel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
          <div className="bg-white rounded-care-lg p-6 max-w-sm w-full shadow-care-lg">
            <p className="font-display font-semibold text-care-text text-lg mb-2">Remove this contact?</p>
            <p className="text-care-text-muted text-sm mb-5">This cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDel(null)} className="flex-1 py-2.5 rounded-care border border-care-border text-care-text-muted text-sm font-medium hover:bg-care-highlight">Cancel</button>
              <button onClick={() => handleDelete(confirmDel)} disabled={!!deleting} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-care bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-60">
                {deleting && <Loader2 className="w-4 h-4 animate-spin" />}
                {deleting ? 'Removing…' : 'Remove'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / edit drawer */}
      {drawerOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/20" onClick={closeDrawer} aria-hidden />
          <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white z-50 flex flex-col shadow-care-xl" role="dialog" aria-modal aria-label={editing ? `Edit ${editing.name}` : 'Add emergency contact'}>
            <div className="flex items-center justify-between px-6 py-5 border-b border-care-border-subtle">
              <h2 className="font-display font-semibold text-care-text text-lg">{editing ? 'Edit Contact' : 'Add Contact'}</h2>
              <button onClick={closeDrawer} className="w-9 h-9 rounded-care flex items-center justify-center hover:bg-care-highlight" aria-label="Close"><X className="w-5 h-5 text-care-text-muted" /></button>
            </div>

            <form onSubmit={handleSave} className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
              {/* Photo */}
              <div>
                <p className="text-sm font-medium text-care-text mb-2">Photo <span className="text-care-text-subtle font-normal">(optional)</span></p>
                <div className="flex items-center gap-4">
                  <button type="button" onClick={() => photoRef.current?.click()} className="relative group w-20 h-20 rounded-full overflow-hidden bg-care-highlight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-care-primary" aria-label="Change photo">
                    {form.photoPreview || editing?.photo_url ? (
                      <Image src={form.photoPreview ?? editing!.photo_url!} alt="Preview" fill className="object-cover" sizes="80px" />
                    ) : (
                      <UserCircle className="w-10 h-10 text-care-text-subtle absolute inset-0 m-auto" />
                    )}
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"><span className="text-white text-xs font-medium">Change</span></div>
                  </button>
                  <input ref={photoRef} type="file" accept="image/*" onChange={handlePhotoChange} className="sr-only" />
                  <p className="text-xs text-care-text-muted">JPEG, PNG · max 5 MB</p>
                </div>
              </div>

              {[
                { id: 'cn', label: 'Name *', val: form.name, key: 'name' as const, ph: 'e.g. Priya Sharma' },
                { id: 'cr', label: 'Relationship *', val: form.relationship, key: 'relationship' as const, ph: 'e.g. Daughter' },
                { id: 'cp', label: 'Phone number *', val: form.phone, key: 'phone' as const, ph: '+91 98765 43210', type: 'tel' },
              ].map(({ id, label, val, key, ph, type = 'text' }) => (
                <div key={id}>
                  <label htmlFor={id} className="block text-sm font-medium text-care-text mb-1.5">{label}</label>
                  <input id={id} type={type} value={val} required onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))} placeholder={ph}
                    className="w-full px-4 py-3 rounded-care border border-care-border bg-care-surface text-care-text focus:outline-none focus:ring-2 focus:ring-care-primary text-sm placeholder:text-care-text-subtle" />
                </div>
              ))}

              {error && (
                <div role="alert" className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-care text-sm">
                  <AlertCircle className="w-4 h-4 shrink-0" />{error}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={closeDrawer} className="flex-1 py-3 rounded-care border border-care-border text-care-text-muted text-sm font-medium hover:bg-care-highlight">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-care bg-care-primary text-white text-sm font-semibold hover:bg-care-primary-hover disabled:opacity-60">
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {saving ? 'Saving…' : editing ? 'Save changes' : 'Add contact'}
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </>
  );
}
