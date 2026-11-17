import { useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { CalendarClock, TrendingDown, TrendingUp } from 'lucide-react';
import type { DataRow, NumberUnit, VariableConfig } from '../../types/data';
import {
  formatCO,
  formatCOInt,
  formatCOPercent,
  formatWithUnit,
} from '../../utils/formatters';
import {
  computeParticipationDeltas,
  computeSmoothTrendLine,
  computeTimeSeriesSummary,
  sortRowsByTime,
} from '../../utils/statistics';
import { HelpTooltip } from '../HelpTooltip';

interface Step12TimeTrendsProps {
  rows: DataRow[];
  configs: VariableConfig[];
  timeCol: string | null;
  selectedVar: string;
  onSelectVar: (col: string) => void;
  participationComponents: string[];
  onChangeParticipationComponents: (cols: string[]) => void;
  totalCol: string | null;
  unit: NumberUnit;
  onGoToStep4: () => void;
}

const SERIES_COLORS = [
  '#1d4ed8',
  '#0d9488',
  '#d97706',
  '#e11d48',
  '#4338ca',
  '#0284c7',
  '#059669',
  '#7c3aed',
];

export function Step12TimeTrends({
  rows,
  configs,
  timeCol,
  selectedVar,
  onSelectVar,
  participationComponents,
  onChangeParticipationComponents,
  totalCol,
  unit,
  onGoToStep4,
}: Step12TimeTrendsProps) {
  const [compareCols, setCompareCols] = useState<string[] | null>(null);

  const numericCols = configs.filter(
    (c) => c.role === 'numeric' && !c.isBinary01 && !c.isProportion01
  );

  const activeCol =
    numericCols.find((c) => c.name === selectedVar)?.name || numericCols[0]?.name || '';

  const orderedRows = useMemo(
    () => (timeCol ? sortRowsByTime(rows, timeCol) : []),
    [rows, timeCol]
  );

  const activeCompare = useMemo(() => {
    if (compareCols) return compareCols;
    const withoutTotal = numericCols.filter((c) => c.name !== totalCol).map((c) => c.name);
    return (withoutTotal.length > 0 ? withoutTotal : numericCols.map((c) => c.name)).slice(0, 6);
  }, [compareCols, numericCols, totalCol]);

  const singleChartData = useMemo(() => {
    if (!timeCol || !activeCol) return [];
    const rawSeries = orderedRows.map((r) => {
      const v = r[activeCol];
      return typeof v === 'number' && Number.isFinite(v) ? v : null;
    });
    const smooth = computeSmoothTrendLine(rawSeries);
    return orderedRows.map((r, i) => ({
      periodo: String(r[timeCol]).trim(),
      valor: rawSeries[i],
      tendencia: smooth[i],
    }));
  }, [orderedRows, timeCol, activeCol]);

  const multiChartData = useMemo(() => {
    if (!timeCol) return [];
    return orderedRows.map((r) => {
      const obj: Record<string, string | number | null> = {
        periodo: String(r[timeCol]).trim(),
      };
      for (const col of activeCompare) {
        const v = r[col];
        obj[col] = typeof v === 'number' && Number.isFinite(v) ? v : null;
      }
      return obj;
    });
  }, [orderedRows, timeCol, activeCompare]);

  const tsSummaries = useMemo(() => {
    if (!timeCol) return [];
    return numericCols
      .map((c) => computeTimeSeriesSummary(rows, timeCol, c.name))
      .filter((x): x is NonNullable<typeof x> => x !== null);
  }, [rows, timeCol, numericCols]);

  const effectivePartCols =
    participationComponents.length >= 2
      ? participationComponents
      : numericCols
          .filter((c) => c.name !== totalCol)
          .slice(0, 7)
          .map((c) => c.name);

  const { periods: sharePeriods, deltas: shareDeltas } = useMemo(
    () => computeParticipationDeltas(rows, timeCol, effectivePartCols),
    [rows, timeCol, effectivePartCols]
  );

  const stackedData = useMemo(
    () =>
      sharePeriods.map((p) => ({
        periodo: p.label,
        ...p.shares,
      })),
    [sharePeriods]
  );

  if (!timeCol) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-xs">
        <CalendarClock className="mx-auto h-10 w-10 text-slate-400 mb-3" />
        <h2 className="text-base font-semibold text-slate-900">
          Esta base no tiene una variable de tiempo asignada
        </h2>
        <p className="mx-auto mt-1.5 max-w-lg text-xs leading-relaxed text-slate-600">
          Las tendencias históricas, el crecimiento acumulado (CAGR) y la participación al 100% en el tiempo aplican para series cronológicas (un dato por año o mes). Si tu base incluye una columna de fecha o año, puedes marcarla como «Tiempo» en el Paso 4.
        </p>
        <button
          type="button"
          onClick={onGoToStep4}
          className="mt-4 rounded-lg border border-blue-600 bg-blue-50 px-4 py-2 text-xs font-semibold text-blue-800 hover:bg-blue-100"
        >
          Ir al Paso 4 para revisar tipos
        </button>
      </div>
    );
  }

  const toggleCompare = (name: string) => {
    if (activeCompare.includes(name)) {
      if (activeCompare.length > 1) {
        setCompareCols(activeCompare.filter((c) => c !== name));
      }
    } else {
      setCompareCols([...activeCompare, name]);
    }
  };

  const togglePartComp = (name: string) => {
    if (effectivePartCols.includes(name)) {
      if (effectivePartCols.length > 2) {
        onChangeParticipationComponents(effectivePartCols.filter((c) => c !== name));
      }
    } else {
      onChangeParticipationComponents([...effectivePartCols, name]);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Single variable smoothed trend */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4.5 w-4.5 text-blue-700" />
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Evolución individual y tendencia suavizada — {activeCol}
              </h2>
              <p className="text-xs text-slate-500">
                Línea sólida = dato real por periodo ({timeCol}); línea punteada = tendencia suavizada.
              </p>
            </div>
          </div>

          <select
            value={activeCol}
            onChange={(e) => onSelectVar(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-900"
          >
            {numericCols.map((c) => (
              <option key={c.name} value={c.name}>
                Variable: {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={singleChartData} margin={{ top: 12, right: 20, left: 12, bottom: 12 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="periodo" tick={{ fontSize: 11, fill: '#475569' }} />
              <YAxis
                tick={{ fontSize: 11, fill: '#64748b' }}
                tickFormatter={(v: number) => formatWithUnit(v, unit, { compact: true })}
              />
              <Tooltip
                formatter={(v, name) => [
                  formatWithUnit(Number(v ?? 0), unit),
                  name === 'valor' ? activeCol : 'Tendencia suavizada',
                ]}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="valor"
                name="Dato observado"
                stroke="#1d4ed8"
                strokeWidth={2.5}
                dot={{ r: 4, fill: '#1d4ed8' }}
                connectNulls={false}
              />
              <Line
                type="monotone"
                dataKey="tendencia"
                name="Tendencia suavizada"
                stroke="#d97706"
                strokeWidth={2}
                strokeDasharray="5 4"
                dot={false}
                connectNulls={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 2. Multi-variable time comparison */}
      {numericCols.length >= 2 && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Comparación simultánea de variables en el tiempo
              </h3>
              <p className="text-xs text-slate-500">
                Activa o desactiva series para comparar trayectorias lado a lado.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mb-4">
            {numericCols.map((c) => {
              const checked = activeCompare.includes(c.name);
              return (
                <button
                  key={c.name}
                  type="button"
                  onClick={() => toggleCompare(c.name)}
                  className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors ${
                    checked
                      ? 'border-blue-600 bg-blue-50 text-blue-900 font-semibold'
                      : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {c.name}
                </button>
              );
            })}
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={multiChartData} margin={{ top: 10, right: 20, left: 12, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="periodo" tick={{ fontSize: 11, fill: '#475569' }} />
                <YAxis
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  tickFormatter={(v: number) => formatWithUnit(v, unit, { compact: true })}
                />
                <Tooltip formatter={(v) => formatWithUnit(Number(v ?? 0), unit)} />
                <Legend />
                {activeCompare.map((col, idx) => (
                  <Line
                    key={col}
                    type="monotone"
                    dataKey={col}
                    stroke={SERIES_COLORS[idx % SERIES_COLORS.length]}
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    connectNulls={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* 3. Summary table: primer año, máximo, actual, vs máx, crec total, CAGR, mayor caída */}
      {tsSummaries.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-xs">
          <div className="flex items-center justify-between gap-2 border-b border-slate-200 px-5 py-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Tabla de desempeño histórico (primer dato, pico, CAGR y mayor caída)
              </h3>
              <p className="text-xs text-slate-500">
                Cada fila usa los periodos válidos de la variable (na.rm = TRUE).
              </p>
            </div>
            <HelpTooltip metricKey="cagr" align="right" />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                  <th className="px-4 py-3 font-semibold">Variable</th>
                  <th className="px-3 py-3 font-semibold">Primer dato</th>
                  <th className="px-3 py-3 font-semibold">Máximo histórico</th>
                  <th className="px-3 py-3 font-semibold text-right">Valor actual</th>
                  <th className="px-3 py-3 font-semibold text-right">Vs. máximo</th>
                  <th className="px-3 py-3 font-semibold text-right">Crec. total</th>
                  <th className="px-3 py-3 font-semibold text-right">CAGR anual</th>
                  <th className="px-3 py-3 font-semibold">Mayor caída anual</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tsSummaries.map((t) => (
                  <tr key={t.column} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5 font-semibold text-slate-900 whitespace-nowrap">
                      {t.column}
                    </td>
                    <td className="px-3 py-2.5 text-slate-700 whitespace-nowrap font-mono">
                      {t.firstPeriodLabel} ({formatWithUnit(t.firstValue, unit, { compact: true })})
                    </td>
                    <td className="px-3 py-2.5 text-slate-700 whitespace-nowrap font-mono">
                      {t.peakPeriodLabel} ({formatWithUnit(t.peakValue, unit, { compact: true })})
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono font-semibold text-slate-900 tabular-nums whitespace-nowrap">
                      {formatWithUnit(t.lastValue, unit, { compact: true })}
                    </td>
                    <td
                      className={`px-3 py-2.5 text-right font-mono tabular-nums ${
                        t.changeFromPeakPct < -5 ? 'text-red-700 font-semibold' : 'text-slate-700'
                      }`}
                    >
                      {formatCOPercent(t.changeFromPeakPct, 1)}
                    </td>
                    <td
                      className={`px-3 py-2.5 text-right font-mono font-semibold tabular-nums ${
                        t.totalGrowthPct >= 0 ? 'text-emerald-700' : 'text-red-700'
                      }`}
                    >
                      {t.totalGrowthPct >= 0 ? '+' : ''}
                      {formatCOPercent(t.totalGrowthPct, 1)}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-slate-800 tabular-nums">
                      {t.cagrPct !== null
                        ? `${t.cagrPct >= 0 ? '+' : ''}${formatCOPercent(t.cagrPct, 1)}`
                        : 'N/A'}
                    </td>
                    <td className="px-3 py-2.5 text-slate-700 whitespace-nowrap">
                      {t.worstDropPct !== null && t.worstDropPct < 0 ? (
                        <span className="inline-flex items-center gap-1 text-red-700 font-mono">
                          <TrendingDown className="h-3.5 w-3.5" />
                          {formatCOPercent(t.worstDropPct, 1)} ({t.worstDropFromLabel}→{t.worstDropToLabel})
                        </span>
                      ) : (
                        'Sin caídas'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. 100% Stacked Area Participation + Winners/Losers */}
      {effectivePartCols.length >= 2 && stackedData.length >= 2 && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Participación porcentual al 100% — ¿Quién ganó y quién perdió cuota?
              </h3>
              <p className="text-xs text-slate-500">
                Selecciona los componentes que conforman el pastel (excluyendo la columna de total).
              </p>
            </div>
            <HelpTooltip metricKey="participacion_100" align="right" />
          </div>

          <div className="flex flex-wrap gap-2 mb-4">
            {numericCols
              .filter((c) => c.name !== totalCol)
              .map((c) => {
                const active = effectivePartCols.includes(c.name);
                return (
                  <button
                    key={c.name}
                    type="button"
                    onClick={() => togglePartComp(c.name)}
                    className={`rounded-lg border px-2.5 py-1 text-xs font-medium ${
                      active
                        ? 'border-teal-600 bg-teal-50 text-teal-900 font-semibold'
                        : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {c.name}
                  </button>
                );
              })}
          </div>

          <div className="h-72 w-full mb-5">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stackedData} margin={{ top: 10, right: 20, left: 6, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="periodo" tick={{ fontSize: 11, fill: '#475569' }} />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  tickFormatter={(v: number) => `${v}%`}
                />
                <Tooltip formatter={(v) => formatCOPercent(Number(v ?? 0), 1)} />
                <Legend />
                {effectivePartCols.map((col, idx) => (
                  <Area
                    key={col}
                    type="monotone"
                    dataKey={col}
                    stackId="1"
                    stroke={SERIES_COLORS[idx % SERIES_COLORS.length]}
                    fill={SERIES_COLORS[idx % SERIES_COLORS.length]}
                    fillOpacity={0.78}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {shareDeltas.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                    <th className="px-4 py-2.5 font-semibold">Componente</th>
                    <th className="px-3 py-2.5 font-semibold text-right">
                      % Inicial ({shareDeltas[0].startPeriod})
                    </th>
                    <th className="px-3 py-2.5 font-semibold text-right">
                      % Final ({shareDeltas[0].endPeriod})
                    </th>
                    <th className="px-3 py-2.5 font-semibold text-right">Cambio (pp)</th>
                    <th className="px-3 py-2.5 font-semibold">Lectura</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {shareDeltas.map((d) => (
                    <tr key={d.column} className="hover:bg-slate-50">
                      <td className="px-4 py-2 font-semibold text-slate-900">{d.column}</td>
                      <td className="px-3 py-2 text-right font-mono tabular-nums text-slate-700">
                        {formatCOPercent(d.startSharePct, 1)}
                      </td>
                      <td className="px-3 py-2 text-right font-mono tabular-nums text-slate-900 font-semibold">
                        {formatCOPercent(d.endSharePct, 1)}
                      </td>
                      <td
                        className={`px-3 py-2 text-right font-mono font-bold tabular-nums ${
                          d.deltaPP >= 0 ? 'text-emerald-700' : 'text-red-700'
                        }`}
                      >
                        {d.deltaPP >= 0 ? '+' : ''}
                        {formatCO(d.deltaPP, 1)} pp
                      </td>
                      <td className="px-3 py-2 text-slate-600">
                        {d.deltaPP > 1
                          ? 'Ganador de participación'
                          : d.deltaPP < -1
                            ? 'Cedió cuota de mercado'
                            : 'Participación estable'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
