'use client';

import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';

interface AlertCounts {
  critical: number;
  high:     number;
  medium:   number;
  low:      number;
}

interface Props {
  counts: AlertCounts;
}

export default function AlertSummaryWidget({ counts }: Props) {
  const urgent = counts.critical + counts.high;
  const total  = urgent + counts.medium;

  // Don't render if nothing needs attention
  if (total === 0) return null;

  const parts: string[] = [];
  if (counts.critical > 0) parts.push(`${counts.critical} critical`);
  if (counts.high     > 0) parts.push(`${counts.high} high`);
  if (counts.medium   > 0) parts.push(`${counts.medium} medium`);

  const bgColor = counts.critical > 0 ? 'bg-red-50 border-red-200'
    : counts.high > 0    ? 'bg-orange-50 border-orange-200'
    : 'bg-amber-50 border-amber-200';

  const textColor = counts.critical > 0 ? 'text-red-700'
    : counts.high > 0    ? 'text-orange-700'
    : 'text-amber-700';

  const iconColor = counts.critical > 0 ? 'text-red-500'
    : counts.high > 0    ? 'text-orange-500'
    : 'text-amber-500';

  return (
    <Link
      href="/caregiver/notifications"
      className={`flex items-center gap-3 rounded-care-lg border px-4 py-3 hover:shadow-care-sm transition-shadow ${bgColor}`}
    >
      <AlertTriangle className={`w-5 h-5 shrink-0 ${iconColor}`} />
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold ${textColor}`}>
          {parts.join(', ')} {total === 1 ? 'alert needs' : 'alerts need'} attention
        </p>
        <p className={`text-xs mt-0.5 ${textColor} opacity-80`}>
          Tap to view triage dashboard →
        </p>
      </div>
    </Link>
  );
}
