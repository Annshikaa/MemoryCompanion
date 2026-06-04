/**
 * Minimal SVG chart primitives — no external charting library required.
 *
 * Components:
 *   LineChart   — daily rate line (e.g. adherence %)
 *   BarChart    — daily count bars (e.g. sessions, activity)
 *   MoodBars    — stacked mood proportions per day
 *
 * All are pure functions (no hooks), server-renderable, and responsive
 * via viewBox + width="100%".
 */

// ── Shared geometry ───────────────────────────────────────────────────────

const W = 480;   // internal SVG coordinate width
const H = 140;   // chart area height
const PAD_L = 32; // left padding (y-axis labels)
const PAD_B = 24; // bottom padding (x-axis labels)
const PLOT_W = W - PAD_L - 8;
const PLOT_H = H - PAD_B;

/** Map a value in [0, max] to a y SVG coordinate (0 = top, H = bottom). */
function yCoord(val: number, max: number): number {
  if (max === 0) return PLOT_H;
  return PLOT_H - Math.round((val / max) * (PLOT_H - 4));
}

/** Spread n items evenly across PLOT_W, returning x center of each. */
function xCoords(n: number): number[] {
  if (n === 0) return [];
  if (n === 1) return [PAD_L + PLOT_W / 2];
  return Array.from({ length: n }, (_, i) => PAD_L + Math.round((i / (n - 1)) * PLOT_W));
}

// ── Axis label formatter ─────────────────────────────────────────────────

function shortDate(iso: string): string {
  // "2024-01-15" → "1/15"
  const parts = iso.split('-');
  return `${parseInt(parts[1] ?? '1')}/${parseInt(parts[2] ?? '1')}`;
}

/** Choose which dates to show as labels so they don't collide. */
function labelIndices(n: number, maxLabels = 5): number[] {
  if (n <= maxLabels) return Array.from({ length: n }, (_, i) => i);
  const step = Math.ceil(n / maxLabels);
  const out: number[] = [];
  for (let i = 0; i < n; i += step) out.push(i);
  if (out[out.length - 1] !== n - 1) out.push(n - 1);
  return out;
}

// ── LineChart ─────────────────────────────────────────────────────────────

interface LinePoint {
  date:  string;
  value: number | null;  // null = no data for that day
}

export function LineChart({
  data,
  color     = '#3d7a6e',
  yMax      = 100,
  yUnit     = '%',
  emptyText = 'No data yet',
}: {
  data:       LinePoint[];
  color?:     string;
  yMax?:      number;
  yUnit?:     string;
  emptyText?: string;
}) {
  const real = data.filter((d) => d.value !== null);
  if (real.length === 0) {
    return <ChartEmpty label={emptyText} />;
  }

  const xs  = xCoords(data.length);
  const lblIdx = labelIndices(data.length);

  // Build polyline points (skip nulls)
  const segments: string[][] = [];
  let cur: string[] = [];
  for (let i = 0; i < data.length; i++) {
    if (data[i].value !== null) {
      cur.push(`${xs[i]},${yCoord(data[i].value!, yMax)}`);
    } else {
      if (cur.length > 1) segments.push(cur);
      cur = [];
    }
  }
  if (cur.length > 1) segments.push(cur);

  // Y-axis guide lines
  const yLines = [0, 25, 50, 75, 100].filter((v) => v <= yMax);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      aria-hidden="true"
      style={{ display: 'block', overflow: 'visible' }}
    >
      {/* Y grid lines */}
      {yLines.map((v) => {
        const y = yCoord(v, yMax);
        return (
          <g key={v}>
            <line x1={PAD_L} y1={y} x2={W - 8} y2={y} stroke="#e8dfd4" strokeWidth={1} />
            <text x={PAD_L - 4} y={y + 4} textAnchor="end" fontSize={10} fill="#a8a099">
              {v}{yUnit}
            </text>
          </g>
        );
      })}

      {/* Line segments */}
      {segments.map((pts, i) => (
        <polyline
          key={i}
          points={pts.join(' ')}
          fill="none"
          stroke={color}
          strokeWidth={2.5}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      ))}

      {/* Dots on real data points */}
      {data.map((d, i) => d.value === null ? null : (
        <circle key={i} cx={xs[i]} cy={yCoord(d.value, yMax)} r={3} fill={color} />
      ))}

      {/* X labels */}
      {lblIdx.map((i) => (
        <text key={i} x={xs[i]} y={H - 4} textAnchor="middle" fontSize={10} fill="#a8a099">
          {shortDate(data[i].date)}
        </text>
      ))}
    </svg>
  );
}

// ── BarChart ──────────────────────────────────────────────────────────────

interface BarPoint {
  date:  string;
  value: number;
}

export function BarChart({
  data,
  color     = '#3d7a6e',
  emptyText = 'No data yet',
}: {
  data:       BarPoint[];
  color?:     string;
  emptyText?: string;
}) {
  const hasAny = data.some((d) => d.value > 0);
  if (!hasAny) return <ChartEmpty label={emptyText} />;

  const max    = Math.max(...data.map((d) => d.value), 1);
  const n      = data.length;
  const barW   = Math.max(4, Math.floor(PLOT_W / n) - 2);
  const lblIdx = labelIndices(n);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      aria-hidden="true"
      style={{ display: 'block', overflow: 'visible' }}
    >
      {/* Y guide lines */}
      {[0, Math.round(max / 2), max].map((v, i) => {
        const y = yCoord(v, max);
        return (
          <g key={i}>
            <line x1={PAD_L} y1={y} x2={W - 8} y2={y} stroke="#e8dfd4" strokeWidth={1} />
            <text x={PAD_L - 4} y={y + 4} textAnchor="end" fontSize={10} fill="#a8a099">{v}</text>
          </g>
        );
      })}

      {/* Bars */}
      {data.map((d, i) => {
        const x  = PAD_L + Math.round((i / n) * PLOT_W) + 1;
        const y  = yCoord(d.value, max);
        const bh = PLOT_H - y;
        return (
          <rect
            key={i}
            x={x}
            y={y}
            width={barW}
            height={Math.max(0, bh)}
            fill={d.value > 0 ? color : '#f0e8df'}
            rx={2}
          />
        );
      })}

      {/* X labels */}
      {lblIdx.map((i) => (
        <text
          key={i}
          x={PAD_L + Math.round((i / n) * PLOT_W) + barW / 2}
          y={H - 4}
          textAnchor="middle"
          fontSize={10}
          fill="#a8a099"
        >
          {shortDate(data[i].date)}
        </text>
      ))}
    </svg>
  );
}

// ── MoodBars — stacked proportions per day ────────────────────────────────

const MOOD_COLORS: Record<string, string> = {
  happy:   '#4ade80',
  okay:    '#fbbf24',
  sad:     '#60a5fa',
  anxious: '#f472b6',
};

interface MoodDay {
  date:    string;
  happy:   number;
  okay:    number;
  sad:     number;
  anxious: number;
  total:   number;
}

export function MoodBars({
  data,
  emptyText = 'No mood check-ins yet',
}: {
  data:       MoodDay[];
  emptyText?: string;
}) {
  const hasAny = data.some((d) => d.total > 0);
  if (!hasAny) return <ChartEmpty label={emptyText} />;

  const n      = data.length;
  const barW   = Math.max(4, Math.floor(PLOT_W / n) - 2);
  const lblIdx = labelIndices(n);
  const moods  = ['happy', 'okay', 'sad', 'anxious'] as const;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      aria-hidden="true"
      style={{ display: 'block', overflow: 'visible' }}
    >
      {data.map((d, i) => {
        if (d.total === 0) return null;
        const x    = PAD_L + Math.round((i / n) * PLOT_W) + 1;
        let   yTop = PLOT_H;
        return (
          <g key={i}>
            {moods.map((m) => {
              const count = d[m];
              if (count === 0) return null;
              const segH = Math.round((count / d.total) * (PLOT_H - 4));
              yTop -= segH;
              return (
                <rect
                  key={m}
                  x={x} y={yTop}
                  width={barW} height={segH}
                  fill={MOOD_COLORS[m]}
                  rx={1}
                />
              );
            })}
          </g>
        );
      })}

      {/* X labels */}
      {lblIdx.map((i) => (
        <text
          key={i}
          x={PAD_L + Math.round((i / n) * PLOT_W) + barW / 2}
          y={H - 4}
          textAnchor="middle"
          fontSize={10}
          fill="#a8a099"
        >
          {shortDate(data[i].date)}
        </text>
      ))}

      {/* Legend */}
      {moods.map((m, i) => (
        <g key={m} transform={`translate(${PAD_L + i * 80}, ${H + 4})`}>
          <rect width={10} height={10} fill={MOOD_COLORS[m]} rx={2} />
          <text x={14} y={9} fontSize={10} fill="#6b6561" textTransform="capitalize">{m}</text>
        </g>
      ))}
    </svg>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────

function ChartEmpty({ label }: { label: string }) {
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      aria-label={label}
      style={{ display: 'block' }}
    >
      <rect x={0} y={0} width={W} height={H} fill="#fdfaf6" rx={8} />
      <text
        x={W / 2} y={H / 2}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={14}
        fill="#a8a099"
      >
        {label}
      </text>
    </svg>
  );
}
