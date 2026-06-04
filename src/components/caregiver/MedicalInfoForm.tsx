'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface MedInfo {
  allergies:   string;
  medications: string;
  conditions:  string;
  notes:       string;
}

interface Props {
  familyId:     string;
  patientName:  string;
  initialData:  MedInfo | null;
}

export default function MedicalInfoForm({ familyId, patientName, initialData }: Props) {
  const supabase = createClient();

  const [form, setForm] = useState<MedInfo>({
    allergies:   initialData?.allergies   ?? '',
    medications: initialData?.medications ?? '',
    conditions:  initialData?.conditions  ?? '',
    notes:       initialData?.notes       ?? '',
  });
  const [saving,   setSaving]   = useState(false);
  const [saved,    setSaved]    = useState(false);
  const [errMsg,   setErrMsg]   = useState<string | null>(null);

  function handleChange(key: keyof MedInfo) {
    return (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setForm((f) => ({ ...f, [key]: e.target.value }));
      setSaved(false);
    };
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErrMsg(null);

    const payload = {
      family_id:   familyId,
      allergies:   form.allergies.trim()   || null,
      medications: form.medications.trim() || null,
      conditions:  form.conditions.trim()  || null,
      notes:       form.notes.trim()       || null,
      updated_at:  new Date().toISOString(),
    };

    // Upsert — one row per family (UNIQUE constraint on family_id)
    const { error } = await supabase
      .from('patient_medical_info')
      .upsert(payload, { onConflict: 'family_id' });

    if (error) {
      setErrMsg(error.message);
    } else {
      setSaved(true);
    }
    setSaving(false);
  }

  const fields: Array<{ key: keyof MedInfo; label: string; placeholder: string; rows: number }> = [
    {
      key: 'allergies',
      label: 'Allergies',
      placeholder: 'e.g. Penicillin, latex, bee stings',
      rows: 2,
    },
    {
      key: 'medications',
      label: 'Current Medications',
      placeholder: 'e.g. Metformin 500mg twice daily, Aricept 10mg at night',
      rows: 3,
    },
    {
      key: 'conditions',
      label: 'Known Conditions',
      placeholder: 'e.g. Alzheimer\'s disease (moderate stage), Type 2 Diabetes',
      rows: 2,
    },
    {
      key: 'notes',
      label: 'Emergency Notes',
      placeholder: 'e.g. May be confused or disoriented. Responds well to calm voices. Do not leave alone.',
      rows: 3,
    },
  ];

  return (
    <form onSubmit={handleSave} className="space-y-5 max-w-xl">
      <div className="bg-amber-50 border border-amber-200 rounded-care px-4 py-3">
        <p className="text-sm text-amber-800 font-medium">Stored reference, not medical advice</p>
        <p className="text-xs text-amber-700 mt-0.5">
          This information is stored for first-responder context during an emergency.
          It does not replace professional medical records.
        </p>
      </div>

      {fields.map(({ key, label, placeholder, rows }) => (
        <div key={key}>
          <label
            htmlFor={key}
            className="block text-sm font-semibold text-care-text mb-1.5"
          >
            {label}
            <span className="text-care-text-subtle font-normal ml-1">(optional)</span>
          </label>
          <textarea
            id={key}
            value={form[key]}
            onChange={handleChange(key)}
            placeholder={placeholder}
            rows={rows}
            className="w-full px-4 py-3 rounded-care border border-care-border bg-white text-care-text text-sm focus:outline-none focus:ring-2 focus:ring-care-primary resize-none placeholder:text-care-text-subtle"
          />
        </div>
      ))}

      {errMsg && (
        <p className="text-sm text-red-600" role="alert">{errMsg}</p>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="bg-care-primary hover:bg-care-primary-hover text-white font-semibold px-6 py-3 rounded-care text-sm transition-colors disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-care-primary focus:ring-offset-2"
        >
          {saving ? 'Saving…' : 'Save medical info'}
        </button>
        {saved && (
          <p className="text-sm text-green-600 font-medium">✓ Saved</p>
        )}
      </div>
    </form>
  );
}
