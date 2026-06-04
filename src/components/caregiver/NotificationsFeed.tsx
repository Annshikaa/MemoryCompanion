'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Tables } from '@/lib/supabase/database.types';

type Notif = Tables<'notifications'>;

const TYPE_ICON: Record<string, string> = {
  reminder_done:   '✅',
  reminder_missed: '⚠️',
  sos:             '🆘',
  left_zone:       '📍',
  inactivity:      '💤',
};

const TYPE_LABEL: Record<string, string> = {
  reminder_done:   'Reminder completed',
  reminder_missed: 'Reminder missed',
  sos:             'SOS — Help requested',
  left_zone:       'Left safe zone',
  inactivity:      'No activity detected',
};

interface Props {
  initialNotifs: Notif[];
  familyId: string;
  unseenCount: number;
}

export default function NotificationsFeed({ initialNotifs, familyId, unseenCount: initUnseen }: Props) {
  const supabase  = createClient();
  const [notifs, setNotifs]   = useState<Notif[]>(initialNotifs);
  const [unseen, setUnseen]   = useState(initUnseen);

  useEffect(() => {
    // Mark all as seen
    if (unseen > 0) {
      supabase
        .from('notifications')
        .update({ seen: true })
        .eq('family_id', familyId)
        .eq('seen', false)
        .then(() => setUnseen(0));
    }

    // Realtime: push new notifications to the top of the feed
    const channel = supabase
      .channel(`notifications-${familyId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `family_id=eq.${familyId}`,
        },
        (payload) => {
          setNotifs((prev) => [payload.new as Notif, ...prev]);
        },
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [familyId]);

  if (!notifs.length) {
    return (
      <div className="bg-white rounded-care-lg border border-care-border p-12 text-center shadow-care-sm">
        <p className="text-4xl mb-3" aria-hidden>🔔</p>
        <p className="font-display font-semibold text-care-text text-lg">No notifications yet</p>
        <p className="text-care-text-muted text-sm mt-1">
          Reminder confirmations, missed reminders, SOS alerts, and location alerts will appear here in real time.
        </p>
      </div>
    );
  }

  return (
    <ul className="space-y-3" role="list">
      {notifs.map((n) => {
        const detail = n.detail as Record<string, unknown> | null;
        return (
          <li
            key={n.id}
            className="bg-white rounded-care-lg border border-care-border p-4 flex items-start gap-4 shadow-care-sm"
            style={n.type === 'sos' ? { borderColor: '#fca5a5', background: '#fff5f5' } : undefined}
          >
            <span className="text-2xl shrink-0 mt-0.5" aria-hidden>
              {TYPE_ICON[n.type] ?? '🔔'}
            </span>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-care-text text-sm">
                {TYPE_LABEL[n.type] ?? n.type}
              </p>
              {detail?.title && (
                <p className="text-care-text-muted text-sm mt-0.5">
                  {String(detail.title)}
                </p>
              )}
              {detail?.distance_m && (
                <p className="text-care-text-muted text-sm mt-0.5">
                  {Number(detail.distance_m).toLocaleString()} m from home
                </p>
              )}
              <p className="text-care-text-subtle text-xs mt-1">
                {new Date(n.created_at).toLocaleString()}
              </p>
            </div>
            {!n.seen && (
              <span
                className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0 mt-1.5"
                aria-label="Unread"
              />
            )}
          </li>
        );
      })}
    </ul>
  );
}
