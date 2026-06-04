'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import {
  UserCircle,
  Heart,
  ArrowRight,
  CalendarDays,
  Bell,
  ImagePlay,
  MapPin,
} from 'lucide-react';
import AlertSummaryWidget from '@/components/caregiver/AlertSummaryWidget';

interface Props {
  displayName: string;
  patient: {
    name: string;
    photo_url: string | null;
    home_location_text: string;
  } | null;
  counts: {
    people: number;
    routines: number;
    reminders: number;
    memories: number;
  };
  alertCounts: {
    critical: number;
    high:     number;
    medium:   number;
    low:      number;
  };
}

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};

const item = {
  hidden:  { opacity: 0, y: 14 },
  show:    { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] } },
};

const manageCards = [
  {
    href:        '/caregiver/profile',
    label:       'Patient Profile',
    description: 'Name, photo, and home location',
    icon:        UserCircle,
    iconBg:      'bg-care-primary-light',
    iconColor:   'text-care-primary',
    countKey:    null as null,
    countLabel:  null as null,
  },
  {
    href:        '/caregiver/people',
    label:       'Loved Ones',
    description: 'People shown on their device',
    icon:        Heart,
    iconBg:      'bg-rose-50',
    iconColor:   'text-rose-500',
    countKey:    'people' as const,
    countLabel:  'added',
  },
  {
    href:        '/caregiver/routines',
    label:       'Routines',
    description: 'Daily schedules and activities',
    icon:        CalendarDays,
    iconBg:      'bg-amber-50',
    iconColor:   'text-amber-600',
    countKey:    'routines' as const,
    countLabel:  'created',
  },
  {
    href:        '/caregiver/reminders',
    label:       'Reminders',
    description: 'Medications and appointments',
    icon:        Bell,
    iconBg:      'bg-blue-50',
    iconColor:   'text-blue-500',
    countKey:    'reminders' as const,
    countLabel:  'active',
  },
  {
    href:        '/caregiver/reminiscence',
    label:       'Memories',
    description: 'Photos and reminiscence content',
    icon:        ImagePlay,
    iconBg:      'bg-purple-50',
    iconColor:   'text-purple-500',
    countKey:    'memories' as const,
    countLabel:  'uploaded',
  },
];

export default function DashboardClient({ displayName, patient, counts, alertCounts }: Props) {
  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="max-w-5xl mx-auto space-y-8"
    >
      {/* ── Greeting ── */}
      <motion.div variants={item}>
        <h1 className="font-display text-3xl font-semibold text-care-text tracking-tight leading-tight">
          {patient
            ? <>Taking care of<br /><span className="text-care-primary">{patient.name}</span>.</>
            : <>Welcome,<br /><span className="text-care-primary">{displayName}</span>.</>
          }
        </h1>
        <p className="mt-2 text-care-text-muted text-sm">
          Everything you need to keep them comfortable and oriented.
        </p>
      </motion.div>

      {/* ── Alert summary widget (hidden when no urgent alerts) ── */}
      {(alertCounts.critical + alertCounts.high + alertCounts.medium) > 0 && (
        <motion.div variants={item}>
          <AlertSummaryWidget counts={alertCounts} />
        </motion.div>
      )}

      {/* ── Patient status card ── */}
      {patient ? (
        <motion.div variants={item}>
          <div className="bg-white rounded-care-lg border border-care-border shadow-care-sm p-5 flex items-center gap-5">
            {/* Avatar */}
            <div className="relative w-16 h-16 rounded-full overflow-hidden bg-care-primary-light shrink-0 flex items-center justify-center">
              {patient.photo_url ? (
                <Image
                  src={patient.photo_url}
                  alt={patient.name}
                  fill
                  className="object-cover"
                  sizes="64px"
                />
              ) : (
                <UserCircle className="w-8 h-8 text-care-accent" />
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-care-text-subtle mb-0.5">
                Patient
              </p>
              <p className="font-display text-xl font-semibold text-care-text tracking-tight truncate">
                {patient.name}
              </p>
              <div className="flex items-center gap-1.5 mt-1">
                <MapPin className="w-3.5 h-3.5 text-care-accent shrink-0" />
                <p className="text-sm text-care-text-muted truncate">{patient.home_location_text}</p>
              </div>
            </div>

            {/* Edit link */}
            <Link
              href="/caregiver/profile"
              className="flex items-center gap-1.5 text-sm font-medium text-care-primary hover:text-care-primary-hover transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-care-primary rounded"
            >
              Edit <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </motion.div>
      ) : (
        <motion.div variants={item}>
          <div className="bg-care-primary-light rounded-care-lg border border-care-primary/20 p-6 flex items-center justify-between gap-4">
            <div>
              <p className="font-display text-base font-semibold text-care-text">
                Set up the patient profile
              </p>
              <p className="text-sm text-care-text-muted mt-1">
                Add a name and photo so the companion is ready.
              </p>
            </div>
            <Link
              href="/caregiver/profile"
              className="flex items-center gap-2 bg-care-primary text-white px-4 py-2.5 rounded-care text-sm font-semibold hover:bg-care-primary-hover transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-care-primary focus-visible:ring-offset-2"
            >
              Get started <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </motion.div>
      )}

      {/* ── Care space grid ── */}
      <motion.div variants={item}>
        <p className="text-[11px] font-semibold uppercase tracking-widest text-care-text-subtle mb-3">
          Your care space
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {manageCards.map(({ href, label, description, icon: Icon, iconBg, iconColor, countKey, countLabel }) => {
            const count = countKey ? counts[countKey] : null;
            return (
              <motion.div key={href} variants={item}>
                <Link
                  href={href}
                  className="group flex flex-col bg-white rounded-care-lg border border-care-border p-5 hover:shadow-care hover:border-care-accent/30 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-care-primary"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className={`w-10 h-10 rounded-care flex items-center justify-center ${iconBg}`}>
                      <Icon className={`w-5 h-5 ${iconColor}`} />
                    </div>
                    {count !== null && (
                      <span className="text-xs font-semibold text-care-text-muted bg-care-bg px-2 py-0.5 rounded-full">
                        {count} {countLabel}
                      </span>
                    )}
                  </div>
                  <p className="font-display font-semibold text-care-text text-base tracking-tight">
                    {label}
                  </p>
                  <p className="text-xs text-care-text-muted mt-1 leading-relaxed flex-1">
                    {description}
                  </p>
                  <div className="flex items-center gap-1 mt-4 text-xs font-semibold text-care-primary group-hover:gap-2 transition-all">
                    Manage <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    </motion.div>
  );
}
