/**
 * Sparkline — tiny inline SVG trend line, no axes, no labels.
 * Use in summary cards where just the shape matters.
 */
export function Sparkline({
  data,
  color    = '#3d7a6e',
  width    = 80,
  height   = 32,
}: {
  data:    number[];
  color?:  string;
  width?:  number;
  height?: number;
}) {
  if (data.length < 2) {
    return (
      <span style={{ display: 'inline-block', width, height, verticalAlign: 'middle' }}>
        <svg width={width} height={height}>
          <line x1={4} y1={height / 2} x2={width - 4} y2={height / 2}
            stroke="#e8dfd4" strokeWidth={2} strokeDasharray="3 3" />
        </svg>
      </span>
    );
  }

  const min   = Math.min(...data);
  const max   = Math.max(...data);
  const range = max - min || 1;
  const PAD   = 3;
  const pw    = width  - PAD * 2;
  const ph    = height - PAD * 2;

  const points = data.map((v, i) => {
    const x = PAD + (i / (data.length - 1)) * pw;
    const y = PAD + ph - ((v - min) / range) * ph;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{ display: 'inline-block', verticalAlign: 'middle' }}
      aria-hidden="true"
    >
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
