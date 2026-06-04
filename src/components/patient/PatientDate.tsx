'use client';

import { useEffect, useState } from 'react';

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export default function PatientDate() {
  const [line, setLine] = useState('');

  useEffect(() => {
    const d    = new Date();
    const day  = d.toLocaleDateString(undefined, { weekday: 'long' });
    const ord  = ordinal(d.getDate());
    const mon  = d.toLocaleDateString(undefined, { month: 'long' });
    setLine(`Today is ${day}, ${ord} ${mon}`);
  }, []);

  return (
    <p
      aria-live="polite"
      style={{
        fontSize: '24px',
        fontWeight: 600,
        color: '#5b8def',
        textAlign: 'center',
        minHeight: '32px',
      }}
    >
      {line}
    </p>
  );
}
