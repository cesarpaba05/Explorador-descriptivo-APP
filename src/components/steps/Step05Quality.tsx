import { useState } from 'react';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Info,
  Pencil,
  RotateCcw,
  ShieldAlert,
} from 'lucide-react';
import type {
  CleaningConfig,
  NumberUnit,
  QualityReport,
  TotalCheckResult,
  VariableConfig,
} from '../../types/data';
import {
  formatCOAuto,
  formatCOInt,
  formatCOPercent,
  formatWithUnit,
  parseNumberSmart,
} from '../../utils/formatters';
import { HelpTooltip } from '../HelpTooltip';

interface Step05QualityProps {
  qualityBefore: QualityReport;
  qualityAfter: QualityReport;
  cleaning: CleaningConfig;
  onChangeCleaning: (next: CleaningConfig) => void;
  onResetCleaning: () => void;
  onFixCellValue: (rowIndex1Based: number, column: string, newValue: number) => void;
  timeCol: string | null;
  configs: VariableConfig[];
  totalCol: string | null;
  componentCols: string[];
  onChangeTotalCheckConfig: (totalCol: string | null, components: string[]) => void;
  totalCheck: TotalCheckResult | null;
  unit: NumberUnit;
}

export function Step05Quality({
  qualityBefore,
  qualityAfter,
  cleaning,
  onChangeCleaning,
  onResetCleaning,
  onFixCellValue,
  timeCol,
  configs,
  totalCol,
  componentCols,
  onChangeTotalCheckConfig,
  totalCheck,
  unit,
}: Step05QualityProps) {
  const [cellDrafts, setCellDrafts] = useState<Record<string, string>>({});

  const hasAnyIssue =
    qualityBefore.totalMissingCells > 0 ||
    qualityBefore.totalImpossibleCells > 0 ||
    qualityBefore.duplicateRows > 0;

  const numericCols = configs.filter(
    (c) => c.role === 'numeric' && !c.isBinary01 && !c.isProportion01
  );

  const toggleComponent = (name: string) => {
    if (componentCols.includes(name)) {
      onChangeTotalCheckConfig(
        totalCol,
        componentCols.filter((c) => c !== name)
      );
    } else {
      onChangeTotalCheckConfig(totalCol, [...componentCols, name]);
    }
  };

  const handleApplyCellEdit = (rowIndex: number, column: string, currentVal: number) => {
    const key = `${rowIndex}::${column}`;
    const rawDraft = cellDrafts[key];
    const parsed =
      rawDraft !== undefined
        ? parseNumberSmart(rawDraft, rawDraft.includes(',') ? 'comma' : 'dot')
        : Math.abs(currentVal);
    if (parsed === null) return;
    onFixCellValue(rowIndex, column, parsed);
    setCellDrafts((prev) => {
      const copy = { ...prev };
      delete copy[key];
      return copy;
    });
  };

  return (
    <div className="space-y-6">
      {/* Time-series na.rm = TRUE explanation */}
      <div className="rounded-xl border border-teal-200 bg-teal-50/60 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 shrink-0 text-teal-700 mt-0.5" />
            <div className="text-xs leading-relaxed text-slate-800">
              <div className="font-semibold text-teal-950">
                Tratamiento inteligente de datos faltantes (equivalente a <code className="font-mono">na.rm = TRUE</code> en R)
              </div>
              <p className="mt-1">
                {timeCol
                  ? `Detectamos una serie de tiempo ("${timeCol}"). En series históricas, una celda vacía suele significar «no se medía ese año» y NO debe rellenarse con promedios ni ceros inventados. Por defecto ignoramos los faltantes automáticamente y mostramos cuántos datos válidos (n válidos) tiene cada variable.`
                  : 'Por defecto, los cálculos estadísticos ignoran las celdas vacías (na.rm = TRUE) y muestran el número exacto de datos válidos (n válidos) por columna. Si prefieres eliminar o imputar filas, o corregir un dato puntual abajo, puedes hacerlo ahora.'}
              </p>
            </div>
          </div>
          <HelpTooltip metricKey="na_rm" align="right" />
        </div>
      </div>

      {/* KPI summary */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="text-xs font-medium text-slate-500">Datos faltantes (celdas vacías)</div>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="font-mono text-2xl font-bold text-slate-900 tabular-nums">
              {formatCOInt(qualityAfter.totalMissingCells)}
            </span>
            <span className="text-xs text-slate-500">
              (inicial: {formatCOInt(qualityBefore.totalMissingCells)})
            </span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="text-xs font-medium text-slate-500">Valores imposibles (negativos)</div>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="font-mono text-2xl font-bold text-slate-900 tabular-nums">
              {formatCOInt(qualityAfter.totalImpossibleCells)}
            </span>
            <span className="text-xs text-slate-500">
              (actual en base: {formatCOInt(qualityBefore.totalImpossibleCells)})
            </span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="text-xs font-medium text-slate-500">Filas exactamente duplicadas</div>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="font-mono text-2xl font-bold text-slate-900 tabular-nums">
              {formatCOInt(qualityAfter.duplicateRows)}
            </span>
            <span className="text-xs text-slate-500">
              (inicial: {formatCOInt(qualityBefore.duplicateRows)})
            </span>
          </div>
        </div>
      </div>

      {/* Exact row list for impossible values + inline value correction */}
      {qualityBefore.impossibleCells.length > 0 && (
        <div className="rounded-xl border border-red-200 bg-white p-5 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <Pencil className="h-4.5 w-4.5 text-red-700" />
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  Valores imposibles encontrados por fila (edición puntual disponible)
                </h3>
                <p className="text-xs text-slate-600">
                  Mostramos exactamente en qué fila y columna está cada valor negativo. Puedes corregirlo directamente sobre la copia en memoria o elegir una regla global abajo.
                </p>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                  <th className="px-3 py-2 font-semibold">Fila (#)</th>
                  <th className="px-3 py-2 font-semibold">Variable</th>
                  <th className="px-3 py-2 font-semibold text-right">Valor actual</th>
                  <th className="px-3 py-2 font-semibold">Corregir valor puntual</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {qualityBefore.impossibleCells.slice(0, 25).map((issue) => {
                  const key = `${issue.rowIndex}::${issue.column}`;
                  const draft = cellDrafts[key] ?? String(Math.abs(issue.value));
                  return (
                    <tr key={key} className="hover:bg-red-50/30">
                      <td className="px-3 py-2 font-mono font-semibold text-slate-800 tabular-nums">
                        Fila {formatCOInt(issue.rowIndex)}
                      </td>
                      <td className="px-3 py-2 font-medium text-slate-900">{issue.column}</td>
                      <td className="px-3 py-2 text-right font-mono font-semibold text-red-700 tabular-nums">
                        {formatCOAuto(issue.value, 2)}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={draft}
                            onChange={(e) =>
                              setCellDrafts((prev) => ({ ...prev, [key]: e.target.value }))
                            }
                            aria-label={`Nuevo valor para fila ${issue.rowIndex} columna ${issue.column}`}
                            className="w-28 rounded-md border border-slate-300 bg-white px-2.5 py-1 font-mono text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              handleApplyCellEdit(issue.rowIndex, issue.column, issue.value)
                            }
                            className="inline-flex items-center gap-1 rounded-md border border-blue-600 bg-blue-700 px-2.5 py-1 text-xs font-semibold text-white hover:bg-blue-800"
                          >
                            <Check className="h-3 w-3" />
                            <span>Corregir</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {qualityBefore.impossibleCells.length > 25 && (
              <p className="mt-2 text-xs text-slate-500">
                Mostrando los primeros 25 casos de {formatCOInt(qualityBefore.impossibleCells.length)}. Puedes usar la regla global abajo para imputar o eliminar todos a la vez.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Cleaning decisions */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-2.5">
            {hasAnyIssue ? (
              <ShieldAlert className="h-5 w-5 text-amber-600" />
            ) : (
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            )}
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Reglas de limpieza globales
              </h2>
              <p className="text-xs text-slate-500">
                Filas activas: {formatCOInt(qualityAfter.totalRows)} de {formatCOInt(qualityBefore.totalRows)}.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onResetCleaning}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Restaurar na.rm = TRUE
          </button>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {/* Missing values */}
          <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4">
            <div className="text-xs font-semibold text-slate-900 mb-1">
              1. Datos faltantes ({formatCOInt(qualityBefore.rowsWithMissing)} filas)
            </div>
            <p className="text-xs text-slate-500 mb-3">
              {timeCol
                ? 'En series de tiempo conviene mantenerlos (na.rm = TRUE).'
                : '¿Qué hacer con las filas que tienen celdas vacías?'}
            </p>
            <div className="space-y-2 text-xs">
              {(
                [
                  { id: 'keep', label: 'Dejar igual e ignorar en cálculos (na.rm = TRUE)' },
                  { id: 'impute_median', label: 'Imputar con la mediana válida' },
                  { id: 'drop', label: 'Eliminar filas con datos faltantes' },
                ] as const
              ).map((opt) => (
                <label key={opt.id} className="flex cursor-pointer items-center gap-2 text-slate-800">
                  <input
                    type="radio"
                    name="missingAction"
                    checked={cleaning.missingAction === opt.id}
                    onChange={() =>
                      onChangeCleaning({ ...cleaning, missingAction: opt.id })
                    }
                    className="h-4 w-4 text-blue-700 focus:ring-blue-600"
                  />
                  <span>{opt.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Impossible values */}
          <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4">
            <div className="text-xs font-semibold text-slate-900 mb-1">
              2. Valores imposibles ({formatCOInt(qualityBefore.rowsWithImpossible)} filas)
            </div>
            <p className="text-xs text-slate-500 mb-3">
              Negativos en variables marcadas como «solo ≥ 0» en el Paso 4.
            </p>
            <div className="space-y-2 text-xs">
              {(
                [
                  { id: 'keep', label: 'Dejar igual' },
                  { id: 'impute_median', label: 'Reemplazar con la mediana válida' },
                  { id: 'drop', label: 'Eliminar filas con valores imposibles' },
                ] as const
              ).map((opt) => (
                <label key={opt.id} className="flex cursor-pointer items-center gap-2 text-slate-800">
                  <input
                    type="radio"
                    name="impossibleAction"
                    checked={cleaning.impossibleAction === opt.id}
                    onChange={() =>
                      onChangeCleaning({ ...cleaning, impossibleAction: opt.id })
                    }
                    className="h-4 w-4 text-blue-700 focus:ring-blue-600"
                  />
                  <span>{opt.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Duplicates */}
          <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4">
            <div className="text-xs font-semibold text-slate-900 mb-1">
              3. Registros duplicados ({formatCOInt(qualityBefore.duplicateRows)} filas)
            </div>
            <p className="text-xs text-slate-500 mb-3">
              Filas completamente idénticas en todas las columnas.
            </p>
            <div className="space-y-2 text-xs">
              {(
                [
                  { id: 'keep', label: 'Dejar igual' },
                  { id: 'drop', label: 'Eliminar filas duplicadas (conservar 1)' },
                ] as const
              ).map((opt) => (
                <label key={opt.id} className="flex cursor-pointer items-center gap-2 text-slate-800">
                  <input
                    type="radio"
                    name="duplicateAction"
                    checked={cleaning.duplicateAction === opt.id}
                    onChange={() =>
                      onChangeCleaning({ ...cleaning, duplicateAction: opt.id })
                    }
                    className="h-4 w-4 text-blue-700 focus:ring-blue-600"
                  />
                  <span>{opt.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Total Column Verification */}
      {numericCols.length >= 2 && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  Verificación de columna Total (¿cuadra con la suma de sus partes?)
                </h3>
                <p className="text-xs text-slate-500">
                  Si la base tiene una columna de total, confirma aquí si coincide con la suma de sus componentes.
                </p>
              </div>
              <HelpTooltip metricKey="total_check" />
            </div>

            <select
              value={totalCol || ''}
              onChange={(e) => {
                const nextTotal = e.target.value || null;
                const nextComps = nextTotal
                  ? numericCols.filter((c) => c.name !== nextTotal).map((c) => c.name)
                  : [];
                onChangeTotalCheckConfig(nextTotal, nextComps);
              }}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-900"
            >
              <option value="">No tengo columna Total</option>
              {numericCols.map((c) => (
                <option key={c.name} value={c.name}>
                  Columna total: {c.name}
                </option>
              ))}
            </select>
          </div>

          {totalCol && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {numericCols
                  .filter((c) => c.name !== totalCol)
                  .map((c) => {
                    const checked = componentCols.includes(c.name);
                    return (
                      <label
                        key={c.name}
                        className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs ${
                          checked
                            ? 'border-blue-300 bg-blue-50 text-blue-900 font-medium'
                            : 'border-slate-200 bg-slate-50 text-slate-600'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleComponent(c.name)}
                          className="h-3.5 w-3.5 rounded border-slate-300 text-blue-700"
                        />
                        <span>{c.name}</span>
                      </label>
                    );
                  })}
              </div>

              {totalCheck && (
                <div
                  className={`flex items-start gap-3 rounded-lg border p-3.5 text-xs ${
                    totalCheck.isExactMatch
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-950'
                      : 'border-amber-200 bg-amber-50 text-amber-950'
                  }`}
                >
                  {totalCheck.isExactMatch ? (
                    <CheckCircle2 className="h-4.5 w-4.5 shrink-0 text-emerald-700 mt-0.5" />
                  ) : (
                    <AlertTriangle className="h-4.5 w-4.5 shrink-0 text-amber-700 mt-0.5" />
                  )}
                  <div>
                    {totalCheck.isExactMatch ? (
                      <span>
                        <strong>Cuadre verificado:</strong> «{totalCheck.totalColumn}» coincide con la suma de las {formatCOInt(totalCheck.componentColumns.length)} columnas en las {formatCOInt(totalCheck.checkedRows)} filas evaluadas.
                      </span>
                    ) : (
                      <span>
                        <strong>Diferencia detectada:</strong> «{totalCheck.totalColumn}» coincide en {formatCOInt(totalCheck.matchingRows)} filas y difiere en {formatCOInt(totalCheck.mismatchRows)} filas (diferencia máxima: {formatWithUnit(totalCheck.maxAbsDiff, unit)}).
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Column-by-column audit table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-xs">
        <div className="border-b border-slate-200 px-5 py-4">
          <h3 className="text-sm font-semibold text-slate-900">
            Datos válidos y faltantes por variable (estado actual)
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                <th className="px-4 py-2.5 font-semibold">Variable</th>
                <th className="px-4 py-2.5 font-semibold">Rol</th>
                <th className="px-4 py-2.5 font-semibold text-right">n válidos</th>
                <th className="px-4 py-2.5 font-semibold text-right">Faltantes</th>
                <th className="px-4 py-2.5 font-semibold text-right">% Faltantes</th>
                <th className="px-4 py-2.5 font-semibold text-right">Negativos imposibles</th>
                <th className="px-4 py-2.5 font-semibold">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {qualityAfter.columns.map((col) => {
                const clean = col.missingCount === 0 && col.impossibleCount === 0;
                return (
                  <tr key={col.column} className="hover:bg-slate-50/70">
                    <td className="px-4 py-2.5 font-medium text-slate-900">{col.column}</td>
                    <td className="px-4 py-2.5 text-slate-600">
                      {col.role === 'time' ? 'Tiempo' : col.role === 'numeric' ? 'Numérica' : 'Categórica'}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono font-semibold text-blue-800 tabular-nums">
                      {formatCOInt(col.validCount)}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono tabular-nums text-slate-800">
                      {formatCOInt(col.missingCount)}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono tabular-nums text-slate-700">
                      {formatCOPercent(col.missingPct, 1)}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono tabular-nums text-slate-800">
                      {col.role === 'numeric' ? formatCOInt(col.impossibleCount) : '—'}
                    </td>
                    <td className="px-4 py-2.5">
                      {clean ? (
                        <span className="font-medium text-emerald-700">Completa</span>
                      ) : (
                        <span className="font-medium text-amber-700">
                          {timeCol ? 'Con años sin dato (na.rm)' : 'Con observaciones'}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
