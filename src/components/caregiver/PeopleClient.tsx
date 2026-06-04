'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { UserCircle, Plus, Star, Pencil, Users } from 'lucide-react';
import PersonDrawer from './PersonDrawer';
import type { Tables } from '@/lib/supabase/database.types';

interface Props {
  initialPeople: Tables<'people'>[];
  familyId: string;
  patientName: string | null;
}

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

const cardVariant = {
  hidden: { opacity: 0, y: 12 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] } },
};

function PersonCard({
  person,
  onEdit,
}: {
  person: Tables<'people'>;
  onEdit: (p: Tables<'people'>) => void;
}) {
  return (
    <div className="group relative bg-white rounded-care-lg border border-care-border shadow-care-sm overflow-hidden hover:shadow-care hover:border-care-accent/40 transition-all duration-200">
      {/* Photo area */}
      <div className="aspect-square relative bg-care-highlight flex items-center justify-center">
        {person.photo_url ? (
          <Image
            src={person.photo_url}
            alt={person.name}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <UserCircle className="w-16 h-16 text-care-text-subtle" />
        )}

        {/* Gradient overlay */}
        <div
          className="absolute inset-x-0 bottom-0 h-20 pointer-events-none"
          style={{ background: 'linear-gradient(to top, rgba(28,25,23,0.65) 0%, transparent 100%)' }}
          aria-hidden="true"
        />

        {/* Name + relationship over photo */}
        {person.photo_url && (
          <div className="absolute inset-x-0 bottom-0 px-3 pb-3">
            <p className="font-display font-semibold text-white text-sm leading-tight truncate">
              {person.name}
            </p>
            <p className="text-white/80 text-xs truncate">{person.relationship}</p>
          </div>
        )}

        {/* Pinned badge */}
        {person.pinned && (
          <div
            className="absolute top-2.5 left-2.5 w-6 h-6 rounded-full bg-white/90 flex items-center justify-center shadow-care-sm"
            title="Pinned"
            aria-label="Pinned"
          >
            <Star className="w-3.5 h-3.5 text-amber-400" fill="currentColor" />
          </div>
        )}

        {/* Edit button — hover reveal */}
        <button
          type="button"
          onClick={() => onEdit(person)}
          className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full bg-white/90 flex items-center justify-center shadow-care-sm opacity-0 group-hover:opacity-100 transition-opacity focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-care-primary"
          aria-label={`Edit ${person.name}`}
        >
          <Pencil className="w-3.5 h-3.5 text-care-text-muted" />
        </button>
      </div>

      {/* Info row (when no photo) */}
      {!person.photo_url && (
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="font-display font-semibold text-care-text text-sm truncate">{person.name}</p>
              {person.pinned && <Star className="w-3.5 h-3.5 text-amber-400 shrink-0" fill="currentColor" />}
            </div>
            <p className="text-xs text-care-primary mt-0.5 truncate">{person.relationship}</p>
          </div>
          <button
            type="button"
            onClick={() => onEdit(person)}
            className="w-7 h-7 rounded-care flex items-center justify-center text-care-text-muted hover:bg-care-highlight hover:text-care-text transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-care-primary shrink-0 ml-2"
            aria-label={`Edit ${person.name}`}
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Notes preview (no-photo layout) */}
      {!person.photo_url && person.notes && (
        <div className="px-4 pb-3 -mt-1">
          <p className="text-xs text-care-text-muted line-clamp-2 leading-relaxed">{person.notes}</p>
        </div>
      )}
    </div>
  );
}

export default function PeopleClient({ initialPeople, familyId, patientName }: Props) {
  const router = useRouter();
  const [drawerOpen, setDrawerOpen]     = useState(false);
  const [editingPerson, setEditingPerson] = useState<Tables<'people'> | null>(null);

  function openAdd() {
    setEditingPerson(null);
    setDrawerOpen(true);
  }

  function openEdit(person: Tables<'people'>) {
    setEditingPerson(person);
    setDrawerOpen(true);
  }

  function handleClose() {
    setDrawerOpen(false);
    setEditingPerson(null);
  }

  function handleSaved() {
    router.refresh();
  }

  const hasPeople = initialPeople.length > 0;

  return (
    <>
      {/* Page header */}
      <div className="flex items-start justify-between mb-8 gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-care-text tracking-tight">
            Loved Ones
          </h1>
          <p className="text-care-text-muted text-sm mt-1">
            {patientName
              ? `People shown on ${patientName}'s device.`
              : 'People shown on the patient\'s device.'}
          </p>
        </div>
        <button
          type="button"
          onClick={openAdd}
          className="flex items-center gap-2 bg-care-primary text-white px-4 py-2.5 rounded-care text-sm font-semibold hover:bg-care-primary-hover transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-care-primary focus-visible:ring-offset-2"
        >
          <Plus className="w-4 h-4" aria-hidden />
          Add person
        </button>
      </div>

      {/* Grid or empty state */}
      <AnimatePresence mode="wait">
        {hasPeople ? (
          <motion.div
            key="grid"
            variants={container}
            initial="hidden"
            animate="show"
            className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4"
          >
            {initialPeople.map((person) => (
              <motion.div key={person.id} variants={cardVariant}>
                <PersonCard person={person} onEdit={openEdit} />
              </motion.div>
            ))}

            {/* Add-more card */}
            <motion.div variants={cardVariant}>
              <button
                type="button"
                onClick={openAdd}
                className="group w-full aspect-square rounded-care-lg border-2 border-dashed border-care-border hover:border-care-primary hover:bg-care-primary-light flex flex-col items-center justify-center gap-2 text-care-text-subtle hover:text-care-primary transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-care-primary"
                aria-label="Add another person"
              >
                <div className="w-10 h-10 rounded-full bg-care-border-subtle group-hover:bg-care-primary-light flex items-center justify-center transition-colors">
                  <Plus className="w-5 h-5" />
                </div>
                <span className="text-xs font-medium">Add more</span>
              </button>
            </motion.div>
          </motion.div>
        ) : (
          <motion.div
            key="empty"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col items-center justify-center py-24 text-center px-6"
          >
            {/* Illustration */}
            <div className="relative mb-6">
              <div className="w-24 h-24 rounded-full bg-care-primary-light flex items-center justify-center">
                <Users className="w-10 h-10 text-care-accent" />
              </div>
              <div
                className="absolute -top-1 -right-1 w-8 h-8 rounded-full bg-rose-50 border-2 border-white flex items-center justify-center"
              >
                <span className="text-base leading-none" aria-hidden>❤️</span>
              </div>
            </div>

            <h2 className="font-display font-semibold text-care-text text-xl tracking-tight mb-2">
              Add the people closest to them
            </h2>
            <p className="text-care-text-muted text-sm max-w-sm leading-relaxed mb-8">
              Loved ones with a photo and notes will appear on{' '}
              {patientName ? <strong>{patientName}</strong> : 'the patient'}
              &apos;s device — a familiar face brings real comfort.
            </p>

            <button
              type="button"
              onClick={openAdd}
              className="flex items-center gap-2 bg-care-primary text-white px-5 py-3 rounded-care text-sm font-semibold hover:bg-care-primary-hover transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-care-primary focus-visible:ring-offset-2"
            >
              <Plus className="w-4 h-4" />
              Add first person
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Drawer */}
      <PersonDrawer
        isOpen={drawerOpen}
        onClose={handleClose}
        person={editingPerson}
        familyId={familyId}
        onSaved={handleSaved}
      />
    </>
  );
}
