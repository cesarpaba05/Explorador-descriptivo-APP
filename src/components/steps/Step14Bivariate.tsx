import { useMemo, useState } from 'react';
import {
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Scatter,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { AlertTriangle, Boxes, Grid, ScatterChart as ScatterIcon } from 'lucide-react';
import type { DataRow, NumberUnit, VariableConfig } from '../../types/data';
import {
  formatCO,
  formatCOInt,
  formatCOPercent,
  formatCOPValue,
  formatWithUnit,
} from '../../utils/formatters';
import {
  computeChiSquare,
  computeCorrelationPair,
  computeGroupedBoxplots,
} from '../../utils/statistics';
import { GroupedBoxPlotSvg } from '../BoxPlotSvg';
import { HelpTooltip } from '../HelpTooltip';

interface Step14BivariateProps {
  rows: DataRow[];
  configs: VariableConfig[];
  timeCol: string | null;
  unit: NumberUnit;
  scatterX: string;
  scatterY: string;
  onChangeScatterPair: (x: string, y: string) => void;
  groupNumVar: string;
  groupCatVar: string;
  onChangeGroupPair: (numCol: string, catCol: string) => void;
  chiRowVar: string;
  chiColVar: string;
  chiInterestColCategory: string;
  onChangeChiVars: (rowVar: string, colVar: string, interestCat: string) => void;
  groupMinorThreshold: number;
  onChangeGroupMinorThreshold: (threshold: number) => void;
}

type BivariateTab = 'num_num' | 'num_cat' | 'cat_cat';

export function Step14Bivariate({
  rows,
  configs,
  timeCol,
  unit,
  scatterX,
  scatterY,
  onChangeScatterPair,
  groupNumVar,
  groupCatVar,
  onChangeGroupPair,
  chiRowVar,
  chiColVar,
  chiInterestColCategory,
  onChangeChiVars,
  groupMinorThreshold,
  onChangeGroupMinorThreshold,
}: Step14BivariateProps) {
  const numericCols = configs.filter((c) => c.role === 'numeric');
  const catLikeCols = configs.filter((c) => c.role === 'categorical' || c.isBinary01);

  const [tab, setTab] = useState<BivariateTab>(
    numericCols.length >= 2 ? 'num_num' : catLikeCols.length >= 2 ? 'cat_cat' : 'num_num'
  );
  const [useSimulatedP, setUseSimulatedP] = useState(true);
  const [showCrossDetails, setShowCrossDetails] = useState({
    rowPct: true,
    colPct: false,
    totalPct: false,
    chiContrib: true,
  });

  // a) Num vs Num
  const activeX = numericCols.find((c) => c.name === scatterX)?.name || numericCols[0]?.name || '';
  const activeY =
    numericCols.find((c) => c.name === scatterY)?.name ||
    numericCols[1]?.name ||
    numericCols[0]?.name ||
    '';

  const pairMetrics = useMemo(
    () => (activeX && activeY ? computeCorrelationPair(rows, activeX, activeY) : null),
    [rows, activeX, activeY]
  );

  const scatterData = useMemo(() => {
    if (!activeX || !activeY) return { points: [], trendLine: [] };
    const pts: Array<{ x: number; y: number }> = [];
    for (const r of rows) {
      const vx = r[activeX];
      const vy = r[activeY];
      if (
        typeof vx === 'number' &&
        Number.isFinite(vx) &&
        typeof vy === 'number' &&
        Number.isFinite(vy)
      ) {
        pts.push({ x: vx, y: vy });
      }
    }
    if (pts.length < 2 || !pairMetrics) return { points: pts.slice(0, 400), trendLine: [] };
    const xs = pts.map((p) => p.x);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const trendLine = [
      { x: minX, trend: pairMetrics.slope * minX + pairMetrics.intercept },
      { x: maxX, trend: pairMetrics.slope * maxX + pairMetrics.intercept },
    ];
    return { points: pts.slice(0, 400), trendLine };
  }, [rows, activeX, activeY, pairMetrics]);

  const corrMatrix = useMemo(() => {
    const cols = numericCols.slice(0, 7).map((c) => c.name);
    const mat: Record<string, Record<string, number>> = {};
    for (const r of cols) {
      mat[r] = {};
      for (const c of cols) {
        mat[r][c] = r === c ? 1 : computeCorrelationPair(rows, r, c).pearsonR;
      }
    }
    return { cols, mat };
  }, [rows, numericCols]);

  // b) Num vs Cat
  const activeGroupNum =
    numericCols.find((c) => c.name === groupNumVar)?.name || numericCols[0]?.name || '';
  const activeGroupCat =
    catLikeCols.find((c) => c.name === groupCatVar)?.name || catLikeCols[0]?.name || '';

  const groupedBoxes = useMemo(
    () =>
      activeGroupNum && activeGroupCat
        ? computeGroupedBoxplots(rows, activeGroupNum, activeGroupCat, 10)
        : [],
    [rows, activeGroupNum, activeGroupCat]
  );

  // c) Cat vs Cat
  const activeRowVar =
    catLikeCols.find((c) => c.name === chiRowVar)?.name || catLikeCols[0]?.name || '';
  const activeColVar =
    catLikeCols.find((c) => c.name === chiColVar)?.name ||
    catLikeCols[1]?.name ||
    catLikeCols[0]?.name ||
    '';

  const chiResult = useMemo(
    () =>
      activeRowVar && activeColVar
        ? computeChiSquare(
            rows,
            activeRowVar,
            activeColVar,
            groupMinorThreshold,
            useSimulatedP
          )
        : null,
    [rows, activeRowVar, activeColVar, groupMinorThreshold, useSimulatedP]
  );

  const activeInterestCat =
    chiResult && chiResult.cols.includes(chiInterestColCategory)
      ? chiInterestColCategory
      : chiResult?.cols[0] || '';
  const interestColIdx = chiResult ? chiResult.cols.indexOf(activeInterestCat) : -1;

  const activeGroupNumCfg = numericCols.find((c) => c.name === activeGroupNum);

  return (
    <div className="space-y-6">
      {/* Sub-tab bar */}
      <div className="rounded-xl border border-slate-200 bg-white p-2 shadow-xs">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <button
            type="button"
            onClick={() => setTab('num_num')}
            className={`flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-xs font-semibold transition-colors ${
              tab === 'num_num'
                ? 'bg-blue-700 text-white shadow-xs'
                : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
            }`}
          >
            <ScatterIcon className="h-4 w-4" />
            <span>a) Numérica vs. Numérica</span>
          </button>

          <button
            type="button"
            onClick={() => setTab('num_cat')}
            className={`flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-xs font-semibold transition-colors ${
              tab === 'num_cat'
                ? 'bg-blue-700 text-white shadow-xs'
                : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
            }`}
          >
            <Boxes className="h-4 w-4" />
            <span>b) Numérica vs. Categórica</span>
          </button>

          <button
            type="button"
            onClick={() => setTab('cat_cat')}
            className={`flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-xs font-semibold transition-colors ${
              tab === 'cat_cat'
                ? 'bg-blue-700 text-white shadow-xs'
                : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
            }`}
          >
            <Grid className="h-4 w-4" />
            <span>c) Categórica vs. Categórica</span>
          </button>
        </div>
      </div>

      {/* TAB A: Numeric vs Numeric */}
      {tab === 'num_num' && (
        <div className="space-y-6">
          {numericCols.length < 2 || !pairMetrics ? (
            <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
              Se necesitan al menos 2 variables numéricas para calcular dispersión y correlación.
            </div>
          ) : (
            <>
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                  <div className="flex items-center gap-2">
                    <div>
                      <h2 className="text-base font-semibold text-slate-900">
                        Dispersión (<code className="font-mono">plot(x, y)</code>) y Correlación
                      </h2>
                      <p className="text-xs text-slate-500">
                        Pearson r = {formatCO(pairMetrics.pearsonR, 2)} · Spearman ρ = {formatCO(pairMetrics.spearmanRho, 2)} · R² = {formatCOPercent(pairMetrics.rSquared * 100, 1)} · p = {formatCOPValue(pairMetrics.pearsonP)}
                      </p>
                    </div>
                    <HelpTooltip metricKey="pearson_spearman" />
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={activeX}
                      onChange={(e) => onChangeScatterPair(e.target.value, activeY)}
                      className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-900"
                    >
                      {numericCols.map((c) => (
                        <option key={c.name} value={c.name}>
                          Eje X: {c.name}
                        </option>
                      ))}
                    </select>
                    <select
                      value={activeY}
                      onChange={(e) => onChangeScatterPair(activeX, e.target.value)}
                      className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-900"
                    >
                      {numericCols.map((c) => (
                        <option key={c.name} value={c.name}>
                          Eje Y: {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Causality + Time-series warning */}
                <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50/70 px-4 py-2.5 text-xs text-amber-950">
                  <strong>Importante:</strong> correlación no implica causalidad.{' '}
                  {timeCol
                    ? 'En series de tiempo, dos variables que suben o bajan con el paso de los años pueden mostrar r alto simplemente porque comparten una tendencia común.'
                    : 'Una relación alta indica que ambas variables se mueven juntas, pero antes de intervenir hay que validar causa y efecto.'}
                </div>

                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart margin={{ top: 10, right: 20, left: 12, bottom: 14 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis
                        type="number"
                        dataKey="x"
                        name={activeX}
                        tick={{ fontSize: 11, fill: '#64748b' }}
                        tickFormatter={(v: number) => formatWithUnit(v, unit, { compact: true })}
                      />
                      <YAxis
                        type="number"
                        dataKey="y"
                        name={activeY}
                        tick={{ fontSize: 11, fill: '#64748b' }}
                        tickFormatter={(v: number) => formatWithUnit(v, unit, { compact: true })}
                      />
                      <Tooltip
                        formatter={(v) => formatWithUnit(Number(v ?? 0), unit)}
                      />
                      <Scatter name="Registros" data={scatterData.points} fill="#1d4ed8" fillOpacity={0.7} />
                      <Line
                        data={scatterData.trendLine}
                        type="linear"
                        dataKey="trend"
                        name="Tendencia lineal"
                        stroke="#dc2626"
                        strokeWidth={2}
                        dot={false}
                        isAnimationActive={false}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Correlation Matrix Heatmap */}
              {corrMatrix.cols.length >= 2 && (
                <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
                  <h3 className="text-sm font-semibold text-slate-900 mb-3">
                    Matriz de correlaciones (Pearson r)
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50 text-slate-700">
                          <th className="px-3 py-2 text-left font-semibold">Variable</th>
                          {corrMatrix.cols.map((c) => (
                            <th key={c} className="px-3 py-2 text-center font-semibold">
                              {c}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {corrMatrix.cols.map((r) => (
                          <tr key={r}>
                            <th className="px-3 py-2 text-left font-semibold text-slate-900 bg-slate-50/70">
                              {r}
                            </th>
                            {corrMatrix.cols.map((c) => {
                              const val = corrMatrix.mat[r][c];
                              const abs = Math.abs(val);
                              const bg =
                                r === c
                                  ? 'bg-blue-100 font-bold text-blue-950'
                                  : val > 0.45
                                    ? 'bg-blue-50 text-blue-900 font-semibold'
                                    : val < -0.45
                                      ? 'bg-red-50 text-red-900 font-semibold'
                                      : 'bg-white text-slate-700';
                              return (
                                <td
                                  key={c}
                                  onClick={() => r !== c && onChangeScatterPair(r, c)}
                                  title={r !== c ? `Clic para graficar ${r} vs ${c}` : undefined}
                                  className={`px-3 py-2 text-center font-mono tabular-nums cursor-pointer border border-slate-100 ${bg}`}
                                  style={
                                    r !== c && abs > 0.2
                                      ? {
                                          backgroundColor:
                                            val > 0
                                              ? `rgba(29, 78, 216, ${(abs * 0.22).toFixed(2)})`
                                              : `rgba(220, 38, 38, ${(abs * 0.2).toFixed(2)})`,
                                        }
                                      : undefined
                                  }
                                >
                                  {formatCO(val, 2)}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* TAB B: Numeric vs Categorical */}
      {tab === 'num_cat' && (
        <div className="space-y-6">
          {catLikeCols.length === 0 || numericCols.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
              Se necesita al menos 1 variable numérica y 1 categórica (o binaria 0/1) para construir diagramas de caja por grupo.
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div>
                    <h2 className="text-base font-semibold text-slate-900">
                      Boxplot agrupado (<code className="font-mono">boxplot({activeGroupNum} ~ {activeGroupCat})</code>)
                    </h2>
                    <p className="text-xs text-slate-500">
                      Compara la mediana, el 50% central y los atípicos de cada segmento o categoría.
                    </p>
                  </div>
                  <HelpTooltip metricKey="boxplot" />
                </div>

                <div className="flex flex-wrap gap-2">
                  <select
                    value={activeGroupNum}
                    onChange={(e) => onChangeGroupPair(e.target.value, activeGroupCat)}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-900"
                  >
                    {numericCols.map((c) => (
                      <option key={c.name} value={c.name}>
                        Numérica: {c.name}
                      </option>
                    ))}
                  </select>
                  <select
                    value={activeGroupCat}
                    onChange={(e) => onChangeGroupPair(activeGroupNum, e.target.value)}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-900"
                  >
                    {catLikeCols.map((c) => (
                      <option key={c.name} value={c.name}>
                        Agrupar por: {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <GroupedBoxPlotSvg
                groups={groupedBoxes}
                numCol={activeGroupNum}
                unit={unit}
                isProportion01={activeGroupNumCfg?.isProportion01}
              />

              {groupedBoxes.length > 0 && (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                          <th className="px-4 py-2.5 font-semibold">Grupo ({activeGroupCat})</th>
                          <th className="px-3 py-2.5 font-semibold text-right">n</th>
                          <th className="px-3 py-2.5 font-semibold text-right">Mín.</th>
                          <th className="px-3 py-2.5 font-semibold text-right">Q1</th>
                          <th className="px-3 py-2.5 font-semibold text-right">Mediana</th>
                          <th className="px-3 py-2.5 font-semibold text-right">Media</th>
                          <th className="px-3 py-2.5 font-semibold text-right">Q3</th>
                          <th className="px-3 py-2.5 font-semibold text-right">Máx.</th>
                          <th className="px-3 py-2.5 font-semibold text-right">Atípicos</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {groupedBoxes.map((g) => {
                          const f = (v: number) =>
                            formatWithUnit(v, unit, {
                              isProportion01: activeGroupNumCfg?.isProportion01,
                              compact: true,
                            });
                          return (
                            <tr key={g.group} className="hover:bg-slate-50">
                              <td className="px-4 py-2 font-semibold text-slate-900">{g.group}</td>
                              <td className="px-3 py-2 text-right font-mono tabular-nums text-slate-700">
                                {formatCOInt(g.n)}
                              </td>
                              <td className="px-3 py-2 text-right font-mono tabular-nums text-slate-600">
                                {f(g.stats.min)}
                              </td>
                              <td className="px-3 py-2 text-right font-mono tabular-nums text-slate-700">
                                {f(g.stats.q1)}
                              </td>
                              <td className="px-3 py-2 text-right font-mono font-bold text-teal-800 tabular-nums">
                                {f(g.stats.median)}
                              </td>
                              <td className="px-3 py-2 text-right font-mono tabular-nums text-blue-800">
                                {f(g.mean)}
                              </td>
                              <td className="px-3 py-2 text-right font-mono tabular-nums text-slate-700">
                                {f(g.stats.q3)}
                              </td>
                              <td className="px-3 py-2 text-right font-mono tabular-nums text-slate-600">
                                {f(g.stats.max)}
                              </td>
                              <td className="px-3 py-2 text-right font-mono font-semibold text-red-700 tabular-nums">
                                {formatCOInt(g.stats.outliers.length)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {groupedBoxes.length >= 2 && (() => {
                    const byMed = [...groupedBoxes].sort(
                      (a, b) => b.stats.median - a.stats.median
                    );
                    const high = byMed[0];
                    const low = byMed[byMed.length - 1];
                    const f = (v: number) =>
                      formatWithUnit(v, unit, { isProportion01: activeGroupNumCfg?.isProportion01 });
                    return (
                      <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-3.5 text-xs text-slate-800">
                        <strong>Comparación entre grupos:</strong> el grupo «{high.group}» registra la mediana más alta en «{activeGroupNum}» ({f(high.stats.median)}), frente a «{low.group}» ({f(low.stats.median)}).
                      </div>
                    );
                  })()}
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB C: Categorical vs Categorical (CrossTable + Chi-square + Simulated p / Grouping + Mosaic) */}
      {tab === 'cat_cat' && (
        <div className="space-y-6">
          {catLikeCols.length < 2 || !chiResult ? (
            <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
              Se necesitan al menos 2 variables categóricas (o binarias 0/1) para construir una tabla cruzada (CrossTable) y el gráfico de mosaico.
            </div>
          ) : (
            <>
              {/* Selectors */}
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div>
                      <h2 className="text-base font-semibold text-slate-900">
                        Tabla cruzada (<code className="font-mono">CrossTable</code>), Chi-cuadrado y Mosaico
                      </h2>
                      <p className="text-xs text-slate-500">
                        Compara cómo cambia la proporción de una categoría según el grupo y evalúa independencia estadística.
                      </p>
                    </div>
                    <HelpTooltip metricKey="crosstable" />
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <select
                      value={activeRowVar}
                      onChange={(e) =>
                        onChangeChiVars(e.target.value, activeColVar, activeInterestCat)
                      }
                      className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-900"
                    >
                      {catLikeCols.map((c) => (
                        <option key={c.name} value={c.name}>
                          Filas (Grupo): {c.name}
                        </option>
                      ))}
                    </select>
                    <select
                      value={activeColVar}
                      onChange={(e) =>
                        onChangeChiVars(activeRowVar, e.target.value, '')
                      }
                      className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-900"
                    >
                      {catLikeCols.map((c) => (
                        <option key={c.name} value={c.name}>
                          Columnas: {c.name}
                        </option>
                      ))}
                    </select>
                    <select
                      value={activeInterestCat}
                      onChange={(e) =>
                        onChangeChiVars(activeRowVar, activeColVar, e.target.value)
                      }
                      className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-teal-900"
                    >
                      {chiResult.cols.map((colCat) => (
                        <option key={colCat} value={colCat}>
                          Foco (%): {colCat}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Chi-square KPIs */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3">
                    <div className="text-[11px] text-slate-500">Estadístico χ² (gl = {chiResult.df})</div>
                    <div className="mt-1 font-mono text-lg font-bold text-slate-900 tabular-nums">
                      {formatCO(chiResult.chi2, 2)}
                    </div>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-slate-500">p-value clásico</span>
                      <HelpTooltip metricKey="chi_cuadrado" align="right" />
                    </div>
                    <div
                      className={`mt-1 font-mono text-lg font-bold tabular-nums ${
                        chiResult.pValue < 0.05 ? 'text-emerald-700' : 'text-slate-700'
                      }`}
                    >
                      {formatCOPValue(chiResult.pValue)}
                    </div>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3">
                    <div className="text-[11px] text-slate-500">p-value simulado (Monte Carlo)</div>
                    <div className="mt-1 font-mono text-lg font-bold text-indigo-800 tabular-nums">
                      {chiResult.simulatedPValue !== null
                        ? formatCOPValue(chiResult.simulatedPValue)
                        : 'Desactivado'}
                    </div>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3">
                    <div className="text-[11px] text-slate-500">Fuerza (V de Cramér)</div>
                    <div className="mt-1 font-mono text-lg font-bold text-blue-800 tabular-nums">
                      {formatCO(chiResult.cramersV, 2)}
                    </div>
                  </div>
                </div>

                {/* Expected < 5 warning offering BOTH simulated p-value AND group minor categories */}
                {chiResult.hasSmallExpectedWarning && (
                  <div className="rounded-xl border border-amber-300 bg-amber-50/80 p-4 space-y-3">
                    <div className="flex items-start gap-2.5 text-xs text-amber-950">
                      <AlertTriangle className="h-4.5 w-4.5 shrink-0 text-amber-700 mt-0.5" />
                      <div>
                        <strong>Advertencia de frecuencias esperadas &lt; 5:</strong> hay{' '}
                        <strong>{formatCOInt(chiResult.cellsBelow5)}</strong> de{' '}
                        {formatCOInt(chiResult.totalCells)} celdas con frecuencia esperada menor a 5. En R, esto activa un aviso en <code className="font-mono">chisq.test()</code> porque el p-value clásico pierde precisión. Puedes aplicar una o ambas soluciones aquí mismo:
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800">
                        <input
                          type="checkbox"
                          checked={useSimulatedP}
                          onChange={(e) => setUseSimulatedP(e.target.checked)}
                          className="h-4 w-4 rounded border-slate-300 text-indigo-700"
                        />
                        <span>1. Calcular p-value simulado (simulate.p.value = TRUE)</span>
                      </label>

                      <div className="inline-flex items-center gap-2 rounded-lg border border-amber-300 bg-white px-3 py-1 text-xs">
                        <span className="font-semibold text-slate-800">
                          2. Agrupar categorías con &lt; N casos en «Otros»:
                        </span>
                        {[0, 5, 10, 15].map((thr) => (
                          <button
                            key={thr}
                            type="button"
                            onClick={() => onChangeGroupMinorThreshold(thr)}
                            className={`rounded px-2 py-0.5 font-mono font-semibold ${
                              groupMinorThreshold === thr
                                ? 'bg-blue-700 text-white'
                                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                            }`}
                          >
                            {thr === 0 ? 'Sin agrupar' : `< ${thr}`}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* % of category of interest per group */}
                {interestColIdx >= 0 && (
                  <div className="rounded-lg border border-teal-200 bg-teal-50/50 p-4">
                    <div className="text-xs font-semibold text-teal-950 mb-2">
                      Comparación de «{activeColVar} = {activeInterestCat}» dentro de cada grupo de «{activeRowVar}»
                    </div>
                    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                      {chiResult.rows.map((rName, ri) => (
                        <div key={rName} className="rounded-lg border border-teal-200 bg-white p-2.5">
                          <div className="text-[11px] font-medium text-slate-600 truncate">
                            {rName} (n={formatCOInt(chiResult.rowTotals[ri])})
                          </div>
                          <div className="mt-0.5 font-mono text-base font-bold text-teal-800 tabular-nums">
                            {formatCOPercent(chiResult.rowPcts[ri][interestColIdx], 1)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Full CrossTable */}
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">
                      Tabla cruzada completa (<code className="font-mono">gmodels::CrossTable</code>)
                    </h3>
                    <p className="text-xs text-slate-500">
                      Cada celda muestra el conteo observado y las proporciones o aportes que actives.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs">
                    {(
                      [
                        { key: 'rowPct', label: '% Fila' },
                        { key: 'colPct', label: '% Columna' },
                        { key: 'totalPct', label: '% Total' },
                        { key: 'chiContrib', label: 'Aporte χ²' },
                      ] as const
                    ).map((opt) => (
                      <label
                        key={opt.key}
                        className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-slate-700"
                      >
                        <input
                          type="checkbox"
                          checked={showCrossDetails[opt.key]}
                          onChange={(e) =>
                            setShowCrossDetails((prev) => ({
                              ...prev,
                              [opt.key]: e.target.checked,
                            }))
                          }
                          className="h-3.5 w-3.5 rounded border-slate-300 text-blue-700"
                        />
                        <span>{opt.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-slate-700">
                        <th className="px-3 py-2.5 text-left font-semibold border border-slate-200">
                          {chiResult.rowVar} \ {chiResult.colVar}
                        </th>
                        {chiResult.cols.map((c) => (
                          <th key={c} className="px-3 py-2.5 text-right font-semibold border border-slate-200">
                            {c}
                          </th>
                        ))}
                        <th className="px-3 py-2.5 text-right font-semibold border border-slate-200 bg-slate-100">
                          Total fila
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {chiResult.rows.map((r, ri) => (
                        <tr key={r} className="hover:bg-slate-50/60">
                          <th className="px-3 py-2.5 text-left font-semibold text-slate-900 border border-slate-200 bg-slate-50/70">
                            {r}
                          </th>
                          {chiResult.cols.map((c, ci) => (
                            <td
                              key={c}
                              className="px-3 py-2 text-right font-mono tabular-nums border border-slate-200 align-top"
                            >
                              <div className="font-bold text-slate-900">
                                {formatCOInt(chiResult.observed[ri][ci])}
                              </div>
                              {showCrossDetails.rowPct && (
                                <div className="text-[10px] text-teal-700">
                                  F: {formatCOPercent(chiResult.rowPcts[ri][ci], 1)}
                                </div>
                              )}
                              {showCrossDetails.colPct && (
                                <div className="text-[10px] text-blue-700">
                                  C: {formatCOPercent(chiResult.colPcts[ri][ci], 1)}
                                </div>
                              )}
                              {showCrossDetails.totalPct && (
                                <div className="text-[10px] text-slate-500">
                                  T: {formatCOPercent(chiResult.totalPcts[ri][ci], 1)}
                                </div>
                              )}
                              {showCrossDetails.chiContrib && (
                                <div className="text-[10px] text-indigo-700">
                                  χ²: {formatCO(chiResult.chiContributions[ri][ci], 2)}
                                </div>
                              )}
                            </td>
                          ))}
                          <td className="px-3 py-2 text-right font-mono font-semibold text-slate-900 border border-slate-200 bg-slate-50/60 tabular-nums">
                            {formatCOInt(chiResult.rowTotals[ri])}
                            <div className="text-[10px] font-normal text-slate-500">
                              {formatCOPercent(
                                chiResult.grandTotal > 0
                                  ? (chiResult.rowTotals[ri] / chiResult.grandTotal) * 100
                                  : 0,
                                1
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-slate-100 font-semibold">
                        <th className="px-3 py-2.5 text-left border border-slate-200">Total columna</th>
                        {chiResult.colTotals.map((ct, ci) => (
                          <td key={ci} className="px-3 py-2.5 text-right font-mono tabular-nums border border-slate-200">
                            {formatCOInt(ct)}
                          </td>
                        ))}
                        <td className="px-3 py-2.5 text-right font-mono tabular-nums border border-slate-200">
                          {formatCOInt(chiResult.grandTotal)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Mosaic Plot colored by Pearson residuals */}
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                  <div className="flex items-center gap-2">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900">
                        Gráfico de mosaico por residuos de Pearson (<code className="font-mono">mosaicplot(..., shade = TRUE)</code>)
                      </h3>
                      <p className="text-xs text-slate-500">
                        Azul = más casos de los esperados por azar; Rojo = menos casos de los esperados; Gris = acorde con independencia.
                      </p>
                    </div>
                  </div>
                  <HelpTooltip metricKey="mosaico" align="right" />
                </div>

                {(() => {
                  const W = 720;
                  const H = 280;
                  const padL = 24;
                  const padR = 24;
                  const padT = 32;
                  const padB = 46;
                  const innerW = W - padL - padR;
                  const innerH = H - padT - padB;
                  const rowGap = 4;
                  const colGap = 2;
                  const usableW = Math.max(100, innerW - rowGap * Math.max(0, chiResult.rows.length - 1));

                  const residualFill = (res: number) => {
                    if (res >= 2) return '#1d4ed8';
                    if (res >= 1.2) return '#60a5fa';
                    if (res <= -2) return '#dc2626';
                    if (res <= -1.2) return '#f87171';
                    return '#cbd5e1';
                  };
                  const residualText = (res: number) =>
                    Math.abs(res) >= 2 ? '#ffffff' : '#0f172a';

                  let curX = padL;

                  return (
                    <div className="w-full overflow-x-auto">
                      <svg
                        viewBox={`0 0 ${W} ${H}`}
                        className="w-full min-w-[520px]"
                        role="img"
                        aria-label={`Gráfico de mosaico de ${chiResult.rowVar} vs ${chiResult.colVar}`}
                      >
                        {chiResult.rows.map((rLabel, ri) => {
                          const rTot = chiResult.rowTotals[ri];
                          const rW =
                            chiResult.grandTotal > 0 ? (rTot / chiResult.grandTotal) * usableW : 0;
                          const x0 = curX;
                          curX += rW + rowGap;
                          const usableH = Math.max(
                            40,
                            innerH - colGap * Math.max(0, chiResult.cols.length - 1)
                          );
                          let curY = padT;

                          return (
                            <g key={rLabel}>
                              {chiResult.cols.map((cLabel, ci) => {
                                const obs = chiResult.observed[ri][ci];
                                const exp = chiResult.expected[ri][ci];
                                const res = chiResult.pearsonResiduals[ri][ci];
                                const h = rTot > 0 ? (obs / rTot) * usableH : 0;
                                const y0 = curY;
                                curY += h + colGap;

                                return (
                                  <g key={cLabel}>
                                    <rect
                                      x={x0}
                                      y={y0}
                                      width={Math.max(2, rW)}
                                      height={Math.max(2, h)}
                                      rx={2}
                                      fill={residualFill(res)}
                                      stroke="#ffffff"
                                      strokeWidth="1"
                                    >
                                      <title>{`${rLabel} × ${cLabel} | Obs: ${formatCOInt(obs)} | Esp: ${formatCO(exp, 1)} | Residuo Pearson: ${formatCO(res, 2)}`}</title>
                                    </rect>
                                    {rW > 52 && h > 22 && (
                                      <text
                                        x={x0 + rW / 2}
                                        y={y0 + h / 2 + 3}
                                        textAnchor="middle"
                                        fontSize="10"
                                        fontWeight="600"
                                        fill={residualText(res)}
                                      >
                                        {cLabel.length > 10 ? cLabel.slice(0, 9) + '…' : cLabel} ({formatCOInt(obs)})
                                      </text>
                                    )}
                                  </g>
                                );
                              })}
                              <text
                                x={x0 + rW / 2}
                                y={padT + innerH + 16}
                                textAnchor="middle"
                                fontSize="10"
                                fontWeight="600"
                                fill="#1e293b"
                              >
                                {rLabel.length > 12 ? rLabel.slice(0, 11) + '…' : rLabel}
                              </text>
                            </g>
                          );
                        })}

                        {/* Legend */}
                        <g transform={`translate(${padL}, ${H - 12})`}>
                          <rect x={0} y={-9} width={12} height={10} fill="#1d4ed8" rx={2} />
                          <text x={16} y={0} fontSize="10" fill="#334155">Exceso fuerte (residuo ≥ +2)</text>
                          <rect x={165} y={-9} width={12} height={10} fill="#60a5fa" rx={2} />
                          <text x={181} y={0} fontSize="10" fill="#334155">Sobre esperado</text>
                          <rect x={275} y={-9} width={12} height={10} fill="#cbd5e1" rx={2} />
                          <text x={291} y={0} fontSize="10" fill="#334155">Neutral</text>
                          <rect x={345} y={-9} width={12} height={10} fill="#f87171" rx={2} />
                          <text x={361} y={0} fontSize="10" fill="#334155">Bajo esperado</text>
                          <rect x={450} y={-9} width={12} height={10} fill="#dc2626" rx={2} />
                          <text x={466} y={0} fontSize="10" fill="#334155">Déficit fuerte (≤ −2)</text>
                        </g>
                      </svg>
                    </div>
                  );
                })()}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
