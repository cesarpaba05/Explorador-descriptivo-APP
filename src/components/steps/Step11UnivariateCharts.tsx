import { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { AlertCircle, BarChart2, Box, LineChart as LineIcon } from 'lucide-react';
import type { DataRow, NumberUnit, VariableConfig } from '../../types/data';
import {
  formatCO,
  formatCOInt,
  formatCOPercent,
  formatWithUnit,
} from '../../utils/formatters';
import {
  computeBoxplotSummary,
  computeHistogram,
  computeQQPlot,
  extractNumericValues,
} from '../../utils/statistics';
import { MultiVariableBoxPlotSvg, SingleBoxPlotSvg } from '../BoxPlotSvg';
import { HelpTooltip } from '../HelpTooltip';

interface Step11UnivariateChartsProps {
  rows: DataRow[];
  configs: VariableConfig[];
  selectedVar: string;
  onSelectVar: (col: string) => void;
  unit: NumberUnit;
}

export function Step11UnivariateCharts({
  rows,
  configs,
  selectedVar,
  onSelectVar,
  unit,
}: Step11UnivariateChartsProps) {
  const [binsCount, setBinsCount] = useState(10);
  const numericCols = configs.filter((c) => c.role === 'numeric');
  const activeCfg = numericCols.find((c) => c.name === selectedVar) || numericCols[0];

  const { values, histogram, boxplot, qqPlot, multiBoxSummaries } = useMemo(() => {
    if (!activeCfg) {
      return {
        values: [],
        histogram: [],
        boxplot: null,
        qqPlot: null,
        multiBoxSummaries: [],
      };
    }
    const vals = extractNumericValues(rows, activeCfg.name);
    const hist = computeHistogram(vals, binsCount);
    const box = computeBoxplotSummary(rows, activeCfg.name);
    const qq = computeQQPlot(vals);
    const multi = numericCols
      .filter((c) => !c.isBinary01 && !c.isProportion01)
      .slice(0, 6)
      .map((c) => ({
        summary: computeBoxplotSummary(rows, c.name),
        isProportion01: c.isProportion01,
      }));
    return {
      values: vals,
      histogram: hist,
      boxplot: box,
      qqPlot: qq,
      multiBoxSummaries: multi,
    };
  }, [rows, activeCfg, binsCount, numericCols]);

  if (!activeCfg || !boxplot || !qqPlot) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
        No hay variables numéricas disponibles para construir gráficos univariados.
      </div>
    );
  }

  const fmt = (v: number) =>
    formatWithUnit(v, unit, { isProportion01: activeCfg.isProportion01 });

  // Custom SVG Q-Q Normal plot with qqline
  const qqW = 660;
  const qqH = 260;
  const padL = 72;
  const padR = 24;
  const padT = 22;
  const padB = 40;
  const innerW = qqW - padL - padR;
  const innerH = qqH - padT - padB;

  const zVals = qqPlot.points.map((p) => p.theoretical);
  const sVals = qqPlot.points.map((p) => p.sample);
  const minZ = zVals.length ? Math.min(...zVals) : -3;
  const maxZ = zVals.length ? Math.max(...zVals) : 3;
  const lineY1 = qqPlot.slope * minZ + qqPlot.intercept;
  const lineY2 = qqPlot.slope * maxZ + qqPlot.intercept;
  const minY = sVals.length ? Math.min(...sVals, lineY1, lineY2) : 0;
  const maxY = sVals.length ? Math.max(...sVals, lineY1, lineY2) : 1;
  const spanZ = maxZ - minZ || 1;
  const spanY = maxY - minY || 1;
  const sx = (z: number) => padL + ((z - minZ) / spanZ) * innerW;
  const sy = (y: number) => padT + innerH - ((y - minY) / spanY) * innerH;

  return (
    <div className="space-y-6">
      {/* Variable & bins selector */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Gráficos de una variable: Histograma, Boxplot ($out) y Q-Q Normal
            </h2>
            <p className="text-xs text-slate-500">
              Visualiza la forma real de «{activeCfg.name}», detecta puntos atípicos en rojo y evalúa si sigue una campana normal.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <select
              value={activeCfg.name}
              onChange={(e) => onSelectVar(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-900 focus:border-blue-600 focus:outline-none"
            >
              {numericCols.map((c) => (
                <option key={c.name} value={c.name}>
                  Variable: {c.name}
                </option>
              ))}
            </select>

            <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
              <span>Barras (hist):</span>
              <input
                type="range"
                min={5}
                max={16}
                value={binsCount}
                onChange={(e) => setBinsCount(Number(e.target.value))}
                className="w-24 accent-blue-700"
              />
              <span className="font-mono font-semibold text-slate-900">{binsCount}</span>
            </label>
          </div>
        </div>
      </div>

      {/* 1. Histogram */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="flex items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2">
            <BarChart2 className="h-4.5 w-4.5 text-blue-700" />
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                1. Histograma (<code className="font-mono">hist</code>) — {activeCfg.name}
              </h3>
              <p className="text-xs text-slate-500">
                Cantidad de registros ({formatCOInt(values.length)} válidos) en cada intervalo.
              </p>
            </div>
          </div>
          <HelpTooltip metricKey="histograma" align="right" />
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={histogram} margin={{ top: 10, right: 16, left: 0, bottom: 28 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: '#475569' }}
                angle={-22}
                textAnchor="end"
                height={52}
              />
              <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
              <Tooltip
                formatter={(val) => [`${formatCOInt(Number(val ?? 0))} registros`, 'Frecuencia']}
              />
              <Bar dataKey="count" fill="#1d4ed8" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 2. Boxplot & $out outliers */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2">
            <Box className="h-4.5 w-4.5 text-red-700" />
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                2. Diagrama de caja (<code className="font-mono">boxplot</code>) y valores atípicos (<code className="font-mono">$out</code>)
              </h3>
              <p className="text-xs text-slate-500">
                Límites de Tukey: [{fmt(boxplot.lowerFence)} ; {fmt(boxplot.upperFence)}]. Puntos rojos fuera de los bigotes = atípicos.
              </p>
            </div>
          </div>
          <HelpTooltip metricKey="boxplot" align="right" />
        </div>

        <SingleBoxPlotSvg
          summary={boxplot}
          unit={unit}
          isProportion01={activeCfg.isProportion01}
        />

        {boxplot.outliers.length > 0 ? (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50/40 p-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-red-900 mb-2">
              <AlertCircle className="h-4 w-4 text-red-700" />
              <span>
                {formatCOInt(boxplot.outliers.length)} atípico(s) en <code className="font-mono">$out</code> · Rango de atípicos:{' '}
                {fmt(Math.min(...boxplot.outliers.map((o) => o.value)))} a{' '}
                {fmt(Math.max(...boxplot.outliers.map((o) => o.value)))}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {boxplot.outliers.slice(0, 12).map((o, idx) => (
                <span
                  key={`${o.rowIndex}-${idx}`}
                  className="rounded-md border border-red-200 bg-white px-2.5 py-1 font-mono text-[11px] text-red-800"
                >
                  Fila {formatCOInt(o.rowIndex)}: {fmt(o.value)}
                </span>
              ))}
              {boxplot.outliers.length > 12 && (
                <span className="text-xs text-red-700 self-center">
                  (+{formatCOInt(boxplot.outliers.length - 12)} más)
                </span>
              )}
            </div>
          </div>
        ) : (
          <p className="mt-3 text-xs text-emerald-700 font-medium">
            No se encontraron puntos atípicos fuera de los bigotes de Tukey en «{activeCfg.name}».
          </p>
        )}

        {multiBoxSummaries.length >= 2 && (
          <div className="mt-6 pt-5 border-t border-slate-100">
            <h4 className="text-xs font-semibold text-slate-800 mb-2">
              Comparación de cajas entre variables numéricas de la base
            </h4>
            <MultiVariableBoxPlotSvg summaries={multiBoxSummaries} unit={unit} />
          </div>
        )}
      </div>

      {/* 3. Q-Q Normal plot */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2">
            <LineIcon className="h-4.5 w-4.5 text-indigo-700" />
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                3. Gráfico Q-Q Normal (<code className="font-mono">qqnorm</code> + <code className="font-mono">qqline</code>)
              </h3>
              <p className="text-xs text-slate-500">
                Evaluación visual de normalidad: <strong className="text-slate-900">{qqPlot.normalityLabel}</strong> (ajuste lineal R² = {formatCOPercent(qqPlot.rSquaredFit * 100, 1)})
              </p>
            </div>
          </div>
          <HelpTooltip metricKey="qq_normal" align="right" />
        </div>

        <div className="w-full overflow-x-auto">
          <svg
            viewBox={`0 0 ${qqW} ${qqH}`}
            className="w-full min-w-[480px] max-w-full"
            role="img"
            aria-label={`Gráfico Q-Q Normal de ${activeCfg.name}`}
          >
            <line x1={padL} y1={padT + innerH} x2={qqW - padR} y2={padT + innerH} stroke="#cbd5e1" />
            <line x1={padL} y1={padT} x2={padL} y2={padT + innerH} stroke="#cbd5e1" />

            {[0, 0.5, 1].map((t, i) => {
              const yVal = minY + t * spanY;
              const yPos = sy(yVal);
              return (
                <g key={i}>
                  <line x1={padL} y1={yPos} x2={qqW - padR} y2={yPos} stroke="#f1f5f9" />
                  <text
                    x={padL - 8}
                    y={yPos + 3}
                    textAnchor="end"
                    fontSize="10"
                    fill="#64748b"
                    className="font-mono"
                  >
                    {formatWithUnit(yVal, unit, { isProportion01: activeCfg.isProportion01, compact: true })}
                  </text>
                </g>
              );
            })}

            {[-2, -1, 0, 1, 2]
              .filter((z) => z >= minZ - 0.3 && z <= maxZ + 0.3)
              .map((z) => (
                <text
                  key={z}
                  x={sx(z)}
                  y={qqH - 12}
                  textAnchor="middle"
                  fontSize="10"
                  fill="#64748b"
                  className="font-mono"
                >
                  {formatCO(z, 0)}
                </text>
              ))}

            {/* qqline */}
            <line
              x1={sx(minZ)}
              y1={sy(lineY1)}
              x2={sx(maxZ)}
              y2={sy(lineY2)}
              stroke="#dc2626"
              strokeWidth="2"
              strokeDasharray="5 3"
            />

            {/* Sample points */}
            {qqPlot.points.slice(0, 300).map((pt, idx) => (
              <circle
                key={idx}
                cx={sx(pt.theoretical)}
                cy={sy(pt.sample)}
                r={3}
                fill="#1d4ed8"
                fillOpacity={0.7}
              >
                <title>{`Z teórico: ${formatCO(pt.theoretical, 2)} · Valor: ${fmt(pt.sample)}`}</title>
              </circle>
            ))}

            <text
              x={padL + innerW / 2}
              y={qqH - 1}
              textAnchor="middle"
              fontSize="10"
              fill="#475569"
            >
              Cuantiles teóricos de la distribución Normal (Z)
            </text>
          </svg>
        </div>

        <p className="mt-3 text-xs leading-relaxed text-slate-700 bg-slate-50 rounded-lg border border-slate-200 p-3">
          {qqPlot.interpretation}
        </p>
      </div>
    </div>
  );
}
