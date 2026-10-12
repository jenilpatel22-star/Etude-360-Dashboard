import { useChartTheme } from '@/lib/chartTheme';
import { formatNps } from '@/lib/format';

/**
 * Semicircular NPS gauge (-100..+100). Diverging encoding: red for negative,
 * blue for positive, from a neutral zero at the top.
 */
export function NpsGauge({ value, size = 220 }: { value: number; size?: number }) {
  const t = useChartTheme();
  const v = Number.isFinite(value) ? Math.max(-100, Math.min(100, value)) : 0;
  const r = size / 2 - 30;
  const cx = size / 2;
  const cy = size / 2 + 4;
  const angle = (val: number) => Math.PI - ((val + 100) / 200) * Math.PI; // -100 → π (left), 100 → 0 (right)
  const point = (val: number, rad = r) => [cx + rad * Math.cos(angle(val)), cy - rad * Math.sin(angle(val))];
  const arc = (from: number, to: number) => {
    const [x1, y1] = point(from);
    const [x2, y2] = point(to);
    const large = Math.abs(angle(from) - angle(to)) > Math.PI ? 1 : 0;
    const sweep = to > from ? 1 : 0;
    return `M ${x1} ${y1} A ${r} ${r} 0 ${large} ${sweep} ${x2} ${y2}`;
  };
  const color = v >= 0 ? t.series[0] : t.series[7];
  const [nx, ny] = point(v, r - 22);
  const label = v >= 50 ? 'Excellent' : v >= 30 ? 'Great' : v >= 0 ? 'Good' : 'Needs improvement';

  return (
    <svg viewBox={`0 0 ${size} ${size / 2 + 40}`} width="100%" style={{ maxWidth: size }} role="img" aria-label={`Net Promoter Score ${formatNps(value)} (${label})`}>
      <path d={arc(-100, 100)} stroke={t.neutral} strokeWidth={16} fill="none" strokeLinecap="round" />
      {Number.isFinite(value) && v !== 0 && <path d={arc(0, v)} stroke={color} strokeWidth={16} fill="none" strokeLinecap="butt" />}
      <line x1={cx} y1={cy} x2={nx} y2={ny} stroke={t.text} strokeWidth={2.5} strokeLinecap="round" />
      <circle cx={cx} cy={cy} r={5} fill={t.text} />
      {[-100, 0, 100].map((tick) => {
        const [x, y] = tick === 0 ? point(tick, r + 14) : [point(tick)[0], point(tick)[1] + 4];
        return (
          <text key={tick} x={x} y={tick === 0 ? y : y + 14} textAnchor="middle" fontSize={10} fill={t.muted}>
            {tick > 0 ? `+${tick}` : tick}
          </text>
        );
      })}
      <text x={cx} y={cy + 28} textAnchor="middle" fontSize={22} fontWeight={600} fill={t.text}>
        {formatNps(value)}
      </text>
    </svg>
  );
}
