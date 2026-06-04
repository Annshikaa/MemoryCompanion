'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  UserCircle,
  Heart,
  CalendarDays,
  Bell,
  ImagePlay,
  ScanFace,
  Settings,
  BellRing,
  Phone,
  MapPin,
  Sparkles,
  FileText,
  Lightbulb,
  Smile,
  Activity,
  ClipboardList,
  BrainCircuit,
  HeartPulse,
  QrCode,
} from 'lucide-react';

type NavItem = {
  href: string;
  label: string;
  icon: React.ElementType;
  exact?: boolean;
  soon?: boolean;
};

const careNav: NavItem[] = [
  { href: '/caregiver',                  label: 'Home',            icon: LayoutDashboard, exact: true },
  { href: '/caregiver/digital-twin',     label: 'Digital Twin',    icon: BrainCircuit },
  { href: '/caregiver/profile',          label: 'Patient Profile', icon: UserCircle },
  { href: '/caregiver/people',           label: 'Loved Ones',      icon: Heart },
  { href: '/caregiver/medical-info',     label: 'Medical Info',    icon: HeartPulse },
  { href: '/caregiver/emergency-card',   label: 'Emergency Card',  icon: QrCode },
];

const contentNav: NavItem[] = [
  { href: '/caregiver/routines',      label: 'Routines',     icon: CalendarDays },
  { href: '/caregiver/reminders',     label: 'Reminders',    icon: Bell },
  { href: '/caregiver/reminiscence',  label: 'Memories',     icon: ImagePlay },
  { href: '/caregiver/settings',      label: 'Settings',     icon: Settings },
];

const monitoringNav: NavItem[] = [
  { href: '/caregiver/monitoring',         label: 'Monitoring',     icon: Activity },
  { href: '/caregiver/monitoring/reports', label: 'Weekly Reports', icon: ClipboardList },
  { href: '/caregiver/moods',              label: 'Mood History',   icon: Smile },
];

const safetyNav: NavItem[] = [
  { href: '/caregiver/notifications', label: 'Notifications',    icon: BellRing },
  { href: '/caregiver/contacts',      label: 'Emergency Contacts', icon: Phone },
  { href: '/caregiver/location',      label: 'Location Safety',  icon: MapPin },
  { href: '/caregiver/faces',         label: 'Face Enroll',      icon: ScanFace },
];

const aiNav: NavItem[] = [
  { href: '/caregiver/ai-builder',              label: 'Memory Builder',     icon: Sparkles },
  { href: '/caregiver/ai-summary',              label: 'Daily Summary',      icon: FileText },
  { href: '/caregiver/reminiscence/suggest',    label: 'Suggest Prompts',    icon: Lightbulb },
];

const comingSoonNav: NavItem[] = [];

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  const { href, label, icon: Icon } = item;
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={[
        'group flex items-center gap-3 px-3 py-2.5 rounded-care text-sm font-medium',
        'transition-colors duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-care-primary focus-visible:ring-offset-1',
        active
          ? 'bg-care-primary-light text-care-primary'
          : 'text-care-text-muted hover:bg-care-highlight hover:text-care-text',
      ].join(' ')}
    >
      <Icon
        className={[
          'w-[17px] h-[17px] shrink-0 transition-colors',
          active
            ? 'text-care-primary'
            : 'text-care-text-subtle group-hover:text-care-text-muted',
        ].join(' ')}
      />
      {label}
      {active && (
        <span className="ml-auto w-1.5 h-1.5 rounded-full bg-care-primary" aria-hidden="true" />
      )}
    </Link>
  );
}

export default function CaregiverSidebar() {
  const pathname = usePathname();

  function isActive(href: string, exact?: boolean): boolean {
    return exact ? pathname === href : pathname.startsWith(href);
  }

  return (
    <aside
      className="w-64 shrink-0 h-screen sticky top-0 flex flex-col bg-care-surface border-r border-care-border"
      aria-label="Caregiver navigation"
    >
      {/* Brand */}
      <div className="px-6 py-6 flex items-center gap-3 border-b border-care-border-subtle">
        <div className="w-9 h-9 rounded-[10px] bg-care-primary-light flex items-center justify-center shrink-0">
          <Heart className="w-4 h-4 text-care-primary" strokeWidth={2.5} fill="currentColor" />
        </div>
        <div className="leading-none">
          <span className="block font-display font-semibold text-[15px] tracking-tight text-care-text">
            Memory
          </span>
          <span className="block font-display font-semibold text-[15px] tracking-tight text-care-primary">
            Companion
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6" aria-label="Main">
        {/* Care section */}
        <div>
          <p className="px-3 mb-1.5 text-[11px] font-semibold uppercase tracking-widest text-care-text-subtle">
            Care
          </p>
          <ul className="space-y-0.5" role="list">
            {careNav.map((item) => (
              <li key={item.href}>
                <NavLink item={item} active={isActive(item.href, item.exact)} />
              </li>
            ))}
          </ul>
        </div>

        {/* Content section */}
        <div>
          <p className="px-3 mb-1.5 text-[11px] font-semibold uppercase tracking-widest text-care-text-subtle">
            Content
          </p>
          <ul className="space-y-0.5" role="list">
            {contentNav.map((item) => (
              <li key={item.href}>
                <NavLink item={item} active={isActive(item.href, item.exact)} />
              </li>
            ))}
          </ul>
        </div>

        {/* Monitoring section */}
        <div>
          <p className="px-3 mb-1.5 text-[11px] font-semibold uppercase tracking-widest text-care-text-subtle">
            Monitoring
          </p>
          <ul className="space-y-0.5" role="list">
            {monitoringNav.map((item) => (
              <li key={item.href}>
                <NavLink item={item} active={isActive(item.href, item.exact)} />
              </li>
            ))}
          </ul>
        </div>

        {/* AI Tools section */}
        <div>
          <p className="px-3 mb-1.5 text-[11px] font-semibold uppercase tracking-widest text-care-text-subtle">
            AI Tools
          </p>
          <ul className="space-y-0.5" role="list">
            {aiNav.map((item) => (
              <li key={item.href}>
                <NavLink item={item} active={isActive(item.href, item.exact)} />
              </li>
            ))}
          </ul>
        </div>

        {/* Safety section */}
        <div>
          <p className="px-3 mb-1.5 text-[11px] font-semibold uppercase tracking-widest text-care-text-subtle">
            Safety
          </p>
          <ul className="space-y-0.5" role="list">
            {safetyNav.map((item) => (
              <li key={item.href}>
                <NavLink item={item} active={isActive(item.href, item.exact)} />
              </li>
            ))}
          </ul>
        </div>

        {/* Coming soon */}
        {comingSoonNav.length > 0 && (
        <div>
          <p className="px-3 mb-1.5 text-[11px] font-semibold uppercase tracking-widest text-care-text-subtle">
            Coming soon
          </p>
          <ul className="space-y-0.5" role="list">
            {comingSoonNav.map(({ label, icon: Icon }) => (
              <li key={label}>
                <span
                  className="flex items-center gap-3 px-3 py-2.5 rounded-care text-sm text-care-text-subtle cursor-not-allowed select-none"
                  aria-disabled="true"
                  title={`${label} — coming soon`}
                >
                  <Icon className="w-[17px] h-[17px] shrink-0 text-care-border" />
                  {label}
                  <span className="ml-auto text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-care-border-subtle text-care-text-subtle tracking-wide">
                    Soon
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
        )}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-care-border-subtle">
        <p className="text-[11px] text-care-text-subtle leading-relaxed">
          A supportive aid — not a medical device.
        </p>
      </div>
    </aside>
  );
}
