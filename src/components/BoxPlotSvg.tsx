import type {
  BoxplotSummary,
  GroupedBoxplotItem,
  NumberUnit,
} from '../types/data';
import { formatCOInt, formatWithUnit } from '../utils/formatters';

interface SingleBoxPlotProps {
  summary: BoxplotSummary;
  unit?: NumberUnit;
  isProportion01?: boolean;
}

export function SingleBoxPlotSvg({
  summary,
  unit = 'unidades',
  isProportion01 = false,
}: SingleBoxPlotProps) {
  const width = 680;
  const height = 215;
  const padL = 54;
  const padR = 54;
  const innerW = width - padL - padR;
  const yCenter = 98;

  const minVal = summary.min;
  const maxVal = summary.max;
  const span = maxVal - minVal || 1;
  const scaleX = (val: number) => padL + ((val - minVal) / span) * innerW;

  const xWhiskerMin = scaleX(summary.whiskerMin);
  const xQ1 = scaleX(summary.q1);
  const xMedian = scaleX(summary.median);
  const xQ3 = scaleX(summary.q3);
  const xWhiskerMax = scaleX(summary.whiskerMax);
  const xMean = scaleX(summary.mean);

  const fmt = (v: number) => formatWithUnit(v, unit, { isProportion01, compact: true });

  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => ({
    val: minVal + t * span,
    x: padL + t * innerW,
  }));

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full min-w-[480px] max-w-full"
        role="img"
        aria-label={`Diagrama de caja de ${summary.column}`}
      >
        <line x1={padL} y1={155} x2={width - padR} y2={155} stroke="#cbd5e1" strokeWidth="1" />
        {ticks.map((tk, i) => (
          <g key={i}>
            <line x1={tk.x} y1={35} x2={tk.x} y2={155} stroke="#f1f5f9" strokeWidth="1" />
            <line x1={tk.x} y1={155} x2={tk.x} y2={160} stroke="#94a3b8" strokeWidth="1" />
            <text
              x={tk.x}
              y={175}
              textAnchor="middle"
              fontSize="10"
              fill="#64748b"
              className="font-mono"
            >
              {fmt(tk.val)}
            </text>
          </g>
        ))}

        {/* Whiskers */}
        <line x1={xWhiskerMin} y1={yCenter} x2={xQ1} y2={yCenter} stroke="#475569" strokeWidth="2" />
        <line x1={xQ3} y1={yCenter} x2={xWhiskerMax} y2={yCenter} stroke="#475569" strokeWidth="2" />
        <line x1={xWhiskerMin} y1={yCenter - 16} x2={xWhiskerMin} y2={yCenter + 16} stroke="#475569" strokeWidth="2" />
        <line x1={xWhiskerMax} y1={yCenter - 16} x2={xWhiskerMax} y2={yCenter + 16} stroke="#475569" strokeWidth="2" />

        {/* Box Q1-Q3 */}
        <rect
          x={xQ1}
          y={yCenter - 28}
          width={Math.max(4, xQ3 - xQ1)}
          height={56}
          rx={4}
          fill="#dbeafe"
          stroke="#1d4ed8"
          strokeWidth="2"
        />

        {/* Median */}
        <line x1={xMedian} y1={yCenter - 28} x2={xMedian} y2={yCenter + 28} stroke="#0f172a" strokeWidth="2.5" />

        {/* Mean diamond */}
        <polygon
          points={`${xMean},${yCenter - 7} ${xMean + 7},${yCenter} ${xMean},${yCenter + 7} ${xMean - 7},${yCenter}`}
          fill="#d97706"
          stroke="#ffffff"
          strokeWidth="1"
        />

        {/* Red Outliers */}
        {summary.outliers.slice(0, 80).map((out, idx) => {
          const ox = scaleX(out.value);
          const jitter = ((idx % 5) - 2) * 5;
          return (
            <circle
              key={`${out.rowIndex}-${idx}`}
              cx={ox}
              cy={yCenter + jitter}
              r={4.5}
              fill="#dc2626"
              fillOpacity={0.85}
              stroke="#ffffff"
              strokeWidth="1"
            >
              <title>{`Fila ${out.rowIndex}: ${fmt(out.value)}`}</title>
            </circle>
          );
        })}

        {/* Labels */}
        <text x={xQ1} y={56} textAnchor="middle" fontSize="10" fill="#1e40af" className="font-mono">
          Q1: {fmt(summary.q1)}
        </text>
        <text x={xMedian} y={32} textAnchor="middle" fontSize="11" fontWeight="700" fill="#0f172a" className="font-mono">
          Mediana: {fmt(summary.median)}
        </text>
        <text x={xQ3} y={56} textAnchor="middle" fontSize="10" fill="#1e40af" className="font-mono">
          Q3: {fmt(summary.q3)}
        </text>

        {/* Legend */}
        <g transform={`translate(${padL}, 199)`}>
          <line x1={0} y1={-4} x2={14} y2={-4} stroke="#0f172a" strokeWidth="2.5" />
          <text x={19} y={0} fontSize="11" fill="#475569">Mediana</text>
          <polygon points="82,-10 88,-4 82,2 76,-4" fill="#d97706" />
          <text x={94} y={0} fontSize="11" fill="#475569">Media ({fmt(summary.mean)})</text>
          <circle cx={255} cy={-4} r={4.5} fill="#dc2626" />
          <text x={265} y={0} fontSize="11" fill="#dc2626" fontWeight="600">
            Atípicos ({formatCOInt(summary.outliers.length)})
          </text>
        </g>
      </svg>
    </div>
  );
}

interface MultiBoxPlotProps {
  summaries: Array<{
    summary: BoxplotSummary;
    isProportion01?: boolean;
  }>;
  unit?: NumberUnit;
}

const BOX_COLORS = [
  { fill: '#dbeafe', stroke: '#1d4ed8' },
  { fill: '#ccfbf1', stroke: '#0f766e' },
  { fill: '#e0e7ff', stroke: '#4338ca' },
  { fill: '#fef3c7', stroke: '#b45309' },
  { fill: '#e0f2fe', stroke: '#0369a1' },
  { fill: '#dcfce7', stroke: '#15803d' },
];

export function MultiVariableBoxPlotSvg({
  summaries,
  unit = 'unidades',
}: MultiBoxPlotProps) {
  if (summaries.length === 0) return null;

  const globalMin = Math.min(...summaries.map((s) => s.summary.min));
  const globalMax = Math.max(...summaries.map((s) => s.summary.max));
  const span = globalMax - globalMin || 1;

  const width = 700;
  const rowH = 48;
  const padL = 152;
  const padR = 40;
  const padT = 24;
  const padB = 38;
  const height = padT + summaries.length * rowH + padB;
  const innerW = width - padL - padR;

  const scaleX = (v: number) => padL + ((v - globalMin) / span) * innerW;
  const fmt = (v: number, isProp?: boolean) =>
    formatWithUnit(v, unit, { isProportion01: isProp, compact: true });

  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => ({
    val: globalMin + t * span,
    x: padL + t * innerW,
  }));

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full min-w-[520px]"
        role="img"
        aria-label="Comparación de diagramas de caja entre variables"
      >
        {ticks.map((tk, i) => (
          <g key={i}>
            <line x1={tk.x} y1={padT} x2={tk.x} y2={height - padB} stroke="#f1f5f9" strokeWidth="1" />
            <text
              x={tk.x}
              y={height - 12}
              textAnchor="middle"
              fontSize="10"
              fill="#64748b"
              className="font-mono"
            >
              {fmt(tk.val)}
            </text>
          </g>
        ))}

        <line x1={padL} y1={height - padB} x2={width - padR} y2={height - padB} stroke="#cbd5e1" />

        {summaries.map((item, idx) => {
          const g = item.summary;
          const color = BOX_COLORS[idx % BOX_COLORS.length];
          const cy = padT + idx * rowH + rowH / 2;
          const xWMin = scaleX(g.whiskerMin);
          const xQ1 = scaleX(g.q1);
          const xMed = scaleX(g.median);
          const xQ3 = scaleX(g.q3);
          const xWMax = scaleX(g.whiskerMax);
          const xMean = scaleX(g.mean);
          const label = g.column.length > 18 ? g.column.slice(0, 17) + '…' : g.column;

          return (
            <g key={g.column}>
              <text
                x={padL - 10}
                y={cy + 4}
                textAnchor="end"
                fontSize="11"
                fontWeight="600"
                fill="#1e293b"
              >
                {label}
              </text>
              <line x1={xWMin} y1={cy} x2={xQ1} y2={cy} stroke="#64748b" strokeWidth="1.5" />
              <line x1={xQ3} y1={cy} x2={xWMax} y2={cy} stroke="#64748b" strokeWidth="1.5" />
              <line x1={xWMin} y1={cy - 9} x2={xWMin} y2={cy + 9} stroke="#64748b" strokeWidth="1.5" />
              <line x1={xWMax} y1={cy - 9} x2={xWMax} y2={cy + 9} stroke="#64748b" strokeWidth="1.5" />
              <rect
                x={xQ1}
                y={cy - 13}
                width={Math.max(4, xQ3 - xQ1)}
                height={26}
                rx={3}
                fill={color.fill}
                stroke={color.stroke}
                strokeWidth="1.75"
              />
              <line x1={xMed} y1={cy - 13} x2={xMed} y2={cy + 13} stroke="#0f172a" strokeWidth="2.5" />
              <circle cx={xMean} cy={cy} r={3} fill="#d97706" />
              {g.outliers.slice(0, 30).map((o, oi) => (
                <circle
                  key={oi}
                  cx={scaleX(o.value)}
                  cy={cy}
                  r={3.5}
                  fill="#dc2626"
                  fillOpacity={0.85}
                  stroke="#ffffff"
                  strokeWidth="0.7"
                >
                  <title>{`${g.column} · Fila ${o.rowIndex}: ${fmt(o.value, item.isProportion01)}`}</title>
                </circle>
              ))}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

interface GroupedBoxPlotProps {
  groups: GroupedBoxplotItem[];
  numCol: string;
  unit?: NumberUnit;
  isProportion01?: boolean;
}

export function GroupedBoxPlotSvg({
  groups,
  numCol,
  unit = 'unidades',
  isProportion01 = false,
}: GroupedBoxPlotProps) {
  if (groups.length === 0) return null;

  const globalMin = Math.min(...groups.map((g) => g.stats.min));
  const globalMax = Math.max(...groups.map((g) => g.stats.max));
  const span = globalMax - globalMin || 1;

  const width = 700;
  const rowH = 46;
  const padL = 160;
  const padR = 40;
  const padT = 26;
  const padB = 38;
  const height = padT + groups.length * rowH + padB;
  const innerW = width - padL - padR;

  const scaleX = (v: number) => padL + ((v - globalMin) / span) * innerW;
  const fmt = (v: number) => formatWithUnit(v, unit, { isProportion01, compact: true });

  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => ({
    val: globalMin + t * span,
    x: padL + t * innerW,
  }));

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full min-w-[520px]"
        role="img"
        aria-label={`Diagramas de caja de ${numCol} agrupados`}
      >
        {ticks.map((tk, i) => (
          <g key={i}>
            <line x1={tk.x} y1={padT} x2={tk.x} y2={height - padB} stroke="#f1f5f9" strokeWidth="1" />
            <text
              x={tk.x}
              y={height - 12}
              textAnchor="middle"
              fontSize="10"
              fill="#64748b"
              className="font-mono"
            >
              {fmt(tk.val)}
            </text>
          </g>
        ))}

        <line x1={padL} y1={height - padB} x2={width - padR} y2={height - padB} stroke="#cbd5e1" />

        {groups.map((item, idx) => {
          const g = item.stats;
          const color = BOX_COLORS[idx % BOX_COLORS.length];
          const cy = padT + idx * rowH + rowH / 2;
          const xWMin = scaleX(g.whiskerMin);
          const xQ1 = scaleX(g.q1);
          const xMed = scaleX(g.median);
          const xQ3 = scaleX(g.q3);
          const xWMax = scaleX(g.whiskerMax);
          const label = item.group.length > 18 ? item.group.slice(0, 17) + '…' : item.group;

          return (
            <g key={item.group}>
              <text
                x={padL - 10}
                y={cy + 4}
                textAnchor="end"
                fontSize="11"
                fontWeight="600"
                fill="#1e293b"
              >
                {label} ({formatCOInt(item.n)})
              </text>
              <line x1={xWMin} y1={cy} x2={xQ1} y2={cy} stroke="#64748b" strokeWidth="1.5" />
              <line x1={xQ3} y1={cy} x2={xWMax} y2={cy} stroke="#64748b" strokeWidth="1.5" />
              <line x1={xWMin} y1={cy - 9} x2={xWMin} y2={cy + 9} stroke="#64748b" strokeWidth="1.5" />
              <line x1={xWMax} y1={cy - 9} x2={xWMax} y2={cy + 9} stroke="#64748b" strokeWidth="1.5" />
              <rect
                x={xQ1}
                y={cy - 12}
                width={Math.max(4, xQ3 - xQ1)}
                height={24}
                rx={3}
                fill={color.fill}
                stroke={color.stroke}
                strokeWidth="1.75"
              />
              <line x1={xMed} y1={cy - 12} x2={xMed} y2={cy + 12} stroke="#0f172a" strokeWidth="2.5" />
              {g.outliers.slice(0, 25).map((o, oi) => (
                <circle
                  key={oi}
                  cx={scaleX(o.value)}
                  cy={cy}
                  r={3.5}
                  fill="#dc2626"
                  fillOpacity={0.85}
                  stroke="#ffffff"
                  strokeWidth="0.7"
                >
                  <title>{`${item.group} · Fila ${o.rowIndex}: ${fmt(o.value)}`}</title>
                </circle>
              ))}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
