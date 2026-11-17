import * as jstatNamespace from 'jstat';
import type {
  BoxplotSummary,
  CategoricalFrequency,
  CategoricalStats,
  ChiSquareResult,
  CleaningConfig,
  CorrelationMetrics,
  DataRow,
  DescriptiveStats,
  GroupedBoxplotItem,
  HistogramBin,
  ImpossibleCellIssue,
  OutlierPoint,
  ParticipationDelta,
  QQPlotPoint,
  QQPlotResult,
  QualityColumnSummary,
  QualityReport,
  RawCell,
  TimeSeriesMetricSummary,
  TotalCheckResult,
  TrafficLightStatus,
  VariableConfig,
} from '../types/data';
import { formatCOAuto, isCellEmpty, parseNumberSmart } from './formatters';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const jstatAny = jstatNamespace as any;
const jStatLib = jstatAny.jStat || jstatAny.default?.jStat || jstatAny.default || jstatAny;

const NEGATIVE_ALLOWED_KEYWORDS = [
  'temp',
  'temperatura',
  'balance',
  'utilidad',
  'margen',
  'variacion',
  'cambio',
  'crecimiento',
  'delta',
  'diferencia',
  'latitud',
  'longitud',
  'retorno',
  'ganancia',
  'perdida',
  'score',
  'z_',
];

const NON_NEGATIVE_KEYWORDS = [
  'edad',
  'age',
  'precio',
  'price',
  'monto',
  'venta',
  'ventas',
  'factura',
  'saldo',
  'cupo',
  'ingreso',
  'salario',
  'costo',
  'gasto',
  'descuento',
  'cantidad',
  'productos',
  'unidades',
  'dias',
  'meses',
  'antiguedad',
  'tiempo',
  'duracion',
  'consumo',
  'gb',
  'llamadas',
  'mora',
  'peso',
  'altura',
  'distancia',
  'cop',
  'inversion',
  'radio',
  'television',
  'tv',
  'digital',
  'prensa',
  'revistas',
  'exterior',
  'cine',
  'total',
];

const CODE_OR_ID_KEYWORDS = [
  'id',
  'codigo',
  'cod_',
  '_cod',
  'code',
  'nit',
  'cedula',
  'documento',
  'zip',
  'postal',
  'sucursal',
  'estrato',
  'zona',
  'tipo',
  'nivel',
  'categoria_num',
  'region_codigo',
  'ciudad_codigo',
];

const TIME_KEYWORDS = [
  'anio',
  'año',
  'ano',
  'year',
  'fecha',
  'date',
  'mes',
  'month',
  'periodo',
  'period',
  'trimestre',
  'quarter',
  'semestre',
];

const PROPORTION_KEYWORDS = [
  'pct',
  'porc',
  'participacion',
  'proporcion',
  'share',
  'tasa',
  'ratio',
  'rate',
];

export function parseTimeSortKey(raw: RawCell): number {
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  const s = String(raw ?? '').trim();
  if (/^\d{4}$/.test(s)) return Number(s);
  const ym = s.match(/^(\d{4})[-/](\d{1,2})/);
  if (ym) return Number(ym[1]) * 100 + Number(ym[2]);
  const dmy = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (dmy) return Number(dmy[3]) * 10000 + Number(dmy[2]) * 100 + Number(dmy[1]);
  const parsedDate = Date.parse(s);
  if (Number.isFinite(parsedDate)) return parsedDate;
  return 0;
}

export function detectVariables(
  rows: DataRow[],
  columns: string[],
  decimalSep: 'dot' | 'comma' = 'dot'
): { configs: VariableConfig[]; normalizedRows: DataRow[] } {
  const normalizedRows: DataRow[] = rows.map((row) => ({ ...row }));
  const configs: VariableConfig[] = [];

  for (const col of columns) {
    const nonEmpty: RawCell[] = [];
    let missingCount = 0;

    for (const row of rows) {
      const val = row[col];
      if (isCellEmpty(val)) {
        missingCount++;
      } else {
        nonEmpty.push(val);
      }
    }

    let numericCount = 0;
    const parsedNumbers: number[] = [];
    const stringSet = new Set<string>();

    for (const val of nonEmpty) {
      stringSet.add(String(val).trim());
      const num = parseNumberSmart(val, decimalSep);
      if (num !== null) {
        numericCount++;
        parsedNumbers.push(num);
      }
    }

    const numericRatio = nonEmpty.length > 0 ? numericCount / nonEmpty.length : 0;
    const isPrimarilyNumeric = nonEmpty.length > 0 && numericRatio >= 0.85;
    const lowerName = col.toLowerCase();

    const matchesTimeName = TIME_KEYWORDS.some(
      (kw) =>
        lowerName === kw ||
        lowerName.startsWith(kw + '_') ||
        lowerName.endsWith('_' + kw)
    );
    const looksLikeYearSeries =
      isPrimarilyNumeric &&
      parsedNumbers.length >= 3 &&
      parsedNumbers.every((n) => Number.isInteger(n) && n >= 1950 && n <= 2100) &&
      stringSet.size === parsedNumbers.length;

    const looksLikeDateText =
      !isPrimarilyNumeric &&
      nonEmpty.length >= 3 &&
      nonEmpty.every(
        (v) =>
          /^\d{4}[-/]\d{1,2}([-/]\d{1,2})?$/.test(String(v).trim()) ||
          /^\d{1,2}[-/]\d{1,2}[-/]\d{4}$/.test(String(v).trim())
      );

    const isTimeVar =
      (matchesTimeName && (looksLikeYearSeries || looksLikeDateText || nonEmpty.length >= 3)) ||
      looksLikeYearSeries ||
      looksLikeDateText;

    if (isPrimarilyNumeric && !looksLikeDateText) {
      for (let i = 0; i < normalizedRows.length; i++) {
        const val = normalizedRows[i][col];
        if (!isCellEmpty(val)) {
          const parsed = parseNumberSmart(val, decimalSep);
          if (parsed !== null) {
            normalizedRows[i][col] = parsed;
          }
        } else {
          normalizedRows[i][col] = null;
        }
      }
    } else {
      for (let i = 0; i < normalizedRows.length; i++) {
        const val = normalizedRows[i][col];
        if (isCellEmpty(val)) {
          normalizedRows[i][col] = null;
        } else {
          normalizedRows[i][col] = String(val).trim();
        }
      }
    }

    const uniqueNumSet = new Set(parsedNumbers);
    const isBinary01 =
      isPrimarilyNumeric &&
      !isTimeVar &&
      uniqueNumSet.size > 0 &&
      uniqueNumSet.size <= 2 &&
      Array.from(uniqueNumSet).every((v) => v === 0 || v === 1);

    const hasFractionalBetween0And1 =
      isPrimarilyNumeric &&
      !isTimeVar &&
      !isBinary01 &&
      parsedNumbers.length > 0 &&
      parsedNumbers.every((v) => v >= 0 && v <= 1) &&
      parsedNumbers.some((v) => v > 0 && v < 1);

    const matchesPropKeyword = PROPORTION_KEYWORDS.some((kw) => lowerName.includes(kw));
    const isProportion01 =
      hasFractionalBetween0And1 ||
      (isPrimarilyNumeric &&
        !isTimeVar &&
        !isBinary01 &&
        matchesPropKeyword &&
        parsedNumbers.length > 0 &&
        parsedNumbers.every((v) => v >= 0 && v <= 1));

    const looksLikeCodeOrId = CODE_OR_ID_KEYWORDS.some((kw) =>
      kw.startsWith('_') || kw.endsWith('_')
        ? lowerName.includes(kw)
        : lowerName === kw ||
          lowerName.startsWith(kw + '_') ||
          lowerName.endsWith('_' + kw) ||
          lowerName.includes('codigo')
    );

    const allIntegers =
      parsedNumbers.length > 0 && parsedNumbers.every((n) => Number.isInteger(n));
    const smallIntegerScale =
      isPrimarilyNumeric &&
      !isTimeVar &&
      !isBinary01 &&
      allIntegers &&
      uniqueNumSet.size >= 2 &&
      uniqueNumSet.size <= 6 &&
      Math.min(...parsedNumbers) >= 1 &&
      Math.max(...parsedNumbers) <= 10 &&
      (looksLikeCodeOrId || lowerName.includes('tipo') || lowerName.includes('estrato'));

    const lowCardinalityCode =
      isPrimarilyNumeric &&
      !isTimeVar &&
      !isBinary01 &&
      (looksLikeCodeOrId || smallIntegerScale) &&
      allIntegers;

    const numericSubType: VariableConfig['numericSubType'] = isPrimarilyNumeric
      ? allIntegers
        ? 'integer'
        : 'decimal'
      : null;

    let detectedRole: VariableConfig['detectedRole'] = isPrimarilyNumeric ? 'numeric' : 'categorical';
    let semanticHint: VariableConfig['semanticHint'] = 'text';

    if (isTimeVar) {
      detectedRole = 'time';
      semanticHint = 'time';
    } else if (isBinary01) {
      semanticHint = 'binary01';
      detectedRole = 'numeric';
    } else if (isProportion01) {
      semanticHint = 'proportion01';
      detectedRole = 'numeric';
    } else if (lowCardinalityCode) {
      semanticHint = 'code';
      detectedRole = 'categorical';
    } else if (isPrimarilyNumeric) {
      semanticHint = allIntegers ? 'integer' : 'continuous';
    } else {
      semanticHint = 'text';
    }

    const suggestFactor = isBinary01 || lowCardinalityCode || smallIntegerScale;

    const matchesNegAllowed = NEGATIVE_ALLOWED_KEYWORDS.some((k) => lowerName.includes(k));
    const matchesNonNeg = NON_NEGATIVE_KEYWORDS.some((k) => lowerName.includes(k));
    const allowNegative = matchesNegAllowed && !matchesNonNeg ? true : false;

    const sampleValues = nonEmpty.slice(0, 4).map((v) => String(v));

    configs.push({
      name: col,
      role: detectedRole,
      detectedRole,
      numericSubType,
      semanticHint,
      suggestFactor,
      allowNegative,
      isBinary01,
      isProportion01,
      uniqueCount: stringSet.size,
      missingCount,
      sampleValues,
    });
  }

  return { configs, normalizedRows };
}

export function extractNumericValues(rows: DataRow[], col: string): number[] {
  const vals: number[] = [];
  for (const row of rows) {
    const v = row[col];
    if (typeof v === 'number' && Number.isFinite(v)) {
      vals.push(v);
    } else if (!isCellEmpty(v)) {
      const parsed = parseNumberSmart(v, 'dot');
      if (parsed !== null) vals.push(parsed);
    }
  }
  return vals;
}

export function detectTotalColumnAndComponents(
  configs: VariableConfig[]
): { totalCol: string | null; components: string[] } {
  const numericCols = configs.filter(
    (c) => c.role === 'numeric' && !c.isBinary01 && !c.isProportion01
  );
  const totalCandidate = numericCols.find((c) => {
    const low = c.name.toLowerCase();
    return low === 'total' || low.startsWith('total_') || low.endsWith('_total');
  });
  if (!totalCandidate) {
    return {
      totalCol: null,
      components: numericCols.slice(0, 8).map((c) => c.name),
    };
  }
  const others = numericCols
    .filter((c) => c.name !== totalCandidate.name)
    .map((c) => c.name);
  return { totalCol: totalCandidate.name, components: others };
}

export function verifyTotalColumn(
  rows: DataRow[],
  totalCol: string,
  componentCols: string[]
): TotalCheckResult {
  let checkedRows = 0;
  let matchingRows = 0;
  let mismatchRows = 0;
  let maxAbsDiff = 0;

  for (const row of rows) {
    const totalVal = row[totalCol];
    if (typeof totalVal !== 'number' || !Number.isFinite(totalVal)) continue;

    let compSum = 0;
    let hasAtLeastOneComp = false;
    for (const c of componentCols) {
      const v = row[c];
      if (typeof v === 'number' && Number.isFinite(v)) {
        compSum += v;
        hasAtLeastOneComp = true;
      }
    }
    if (!hasAtLeastOneComp) continue;

    checkedRows++;
    const diff = Math.abs(totalVal - compSum);
    if (diff > maxAbsDiff) maxAbsDiff = diff;
    const tol = Math.max(0.05, Math.abs(totalVal) * 0.002);
    if (diff <= tol) {
      matchingRows++;
    } else {
      mismatchRows++;
    }
  }

  return {
    totalColumn: totalCol,
    componentColumns: componentCols,
    checkedRows,
    matchingRows,
    mismatchRows,
    maxAbsDiff,
    isExactMatch: checkedRows > 0 && mismatchRows === 0,
  };
}

export function computeQualityReport(
  rows: DataRow[],
  configs: VariableConfig[]
): QualityReport {
  const totalRows = rows.length;
  const totalCols = configs.length;
  let totalMissingCells = 0;
  let totalImpossibleCells = 0;

  const missingRowSet = new Set<number>();
  const impossibleRowSet = new Set<number>();
  const impossibleCells: ImpossibleCellIssue[] = [];
  const seenRowSignatures = new Map<string, number>();
  let duplicateRows = 0;

  const columnsSummary: QualityColumnSummary[] = configs.map((cfg) => ({
    column: cfg.name,
    role: cfg.role,
    validCount: 0,
    missingCount: 0,
    missingPct: 0,
    impossibleCount: 0,
    impossiblePct: 0,
    allowNegative: cfg.allowNegative,
  }));

  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    const sigParts: string[] = [];

    for (let c = 0; c < configs.length; c++) {
      const cfg = configs[c];
      const cell = row[cfg.name];
      sigParts.push(isCellEmpty(cell) ? '__EMPTY__' : String(cell).trim());

      if (isCellEmpty(cell)) {
        columnsSummary[c].missingCount++;
        totalMissingCells++;
        missingRowSet.add(r);
      } else {
        columnsSummary[c].validCount++;
        if (cfg.role === 'numeric' && !cfg.allowNegative) {
          const num = typeof cell === 'number' ? cell : parseNumberSmart(cell, 'dot');
          if (num !== null && num < 0) {
            columnsSummary[c].impossibleCount++;
            totalImpossibleCells++;
            impossibleRowSet.add(r);
            impossibleCells.push({
              rowIndex: r + 1,
              column: cfg.name,
              value: num,
            });
          }
        }
      }
    }

    const sig = sigParts.join('||');
    const prev = seenRowSignatures.get(sig) || 0;
    if (prev > 0) duplicateRows++;
    seenRowSignatures.set(sig, prev + 1);
  }

  for (const summary of columnsSummary) {
    summary.missingPct = totalRows > 0 ? (summary.missingCount / totalRows) * 100 : 0;
    summary.impossiblePct = totalRows > 0 ? (summary.impossibleCount / totalRows) * 100 : 0;
  }

  return {
    totalRows,
    totalCols,
    totalMissingCells,
    rowsWithMissing: missingRowSet.size,
    totalImpossibleCells,
    rowsWithImpossible: impossibleRowSet.size,
    impossibleCells,
    duplicateRows,
    columns: columnsSummary,
  };
}

export function applyDataCleaning(
  rawRows: DataRow[],
  configs: VariableConfig[],
  cleaning: CleaningConfig
): DataRow[] {
  let working = rawRows.map((r) => ({ ...r }));

  if (cleaning.impossibleAction === 'drop') {
    working = working.filter((row) => {
      for (const cfg of configs) {
        if (cfg.role === 'numeric' && !cfg.allowNegative) {
          const val = row[cfg.name];
          if (typeof val === 'number' && val < 0) return false;
        }
      }
      return true;
    });
  } else if (cleaning.impossibleAction === 'impute_median') {
    for (const cfg of configs) {
      if (cfg.role === 'numeric' && !cfg.allowNegative) {
        const validNums = extractNumericValues(working, cfg.name).filter((n) => n >= 0);
        if (validNums.length > 0) {
          const med = computeMedian(validNums);
          for (const row of working) {
            const val = row[cfg.name];
            if (typeof val === 'number' && val < 0) {
              row[cfg.name] = med;
            }
          }
        }
      }
    }
  }

  if (cleaning.missingAction === 'drop') {
    working = working.filter((row) =>
      configs.every((cfg) => !isCellEmpty(row[cfg.name]))
    );
  } else if (cleaning.missingAction === 'impute_median') {
    for (const cfg of configs) {
      if (cfg.role === 'numeric') {
        const validNums = extractNumericValues(working, cfg.name);
        if (validNums.length > 0) {
          const med = computeMedian(validNums);
          for (const row of working) {
            if (isCellEmpty(row[cfg.name])) {
              row[cfg.name] = med;
            }
          }
        }
      } else if (cfg.role === 'categorical') {
        const freq = new Map<string, number>();
        for (const row of working) {
          if (!isCellEmpty(row[cfg.name])) {
            const k = String(row[cfg.name]).trim();
            freq.set(k, (freq.get(k) || 0) + 1);
          }
        }
        let topCat: string | null = null;
        let topCount = -1;
        for (const [k, count] of freq.entries()) {
          if (count > topCount) {
            topCount = count;
            topCat = k;
          }
        }
        if (topCat !== null) {
          for (const row of working) {
            if (isCellEmpty(row[cfg.name])) {
              row[cfg.name] = topCat;
            }
          }
        }
      }
    }
  }

  if (cleaning.duplicateAction === 'drop') {
    const seen = new Set<string>();
    const deduped: DataRow[] = [];
    for (const row of working) {
      const sig = configs
        .map((cfg) => (isCellEmpty(row[cfg.name]) ? '__EMPTY__' : String(row[cfg.name]).trim()))
        .join('||');
      if (!seen.has(sig)) {
        seen.add(sig);
        deduped.push(row);
      }
    }
    working = deduped;
  }

  return working;
}

export function computeMean(values: number[]): number {
  if (values.length === 0) return 0;
  let sum = 0;
  for (let i = 0; i < values.length; i++) sum += values[i];
  return sum / values.length;
}

/**
 * R quantile(..., type = 7): linear interpolation on (n - 1) * p
 */
export function computeQuantile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  if (sorted.length === 1) return sorted[0];
  const clamped = Math.max(0, Math.min(1, p));
  const index = clamped * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower];
  const weight = index - lower;
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

export function computeMedian(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return computeQuantile(sorted, 0.5);
}

/**
 * R mean(x, trim = 0.2): drops floor(0.2 * n) from each tail!
 * Note: R's trim=0.2 removes 20% from EACH end; user prompt explicitly specifies
 * "media recortada al 20% (mean(x, trim = 0.2))". Let's use trim = 0.2 per side
 * when n >= 10 (or fallback gracefully for smaller n). Wait: in R mean(x, trim=0.2)
 * removes floor(n * 0.2) from both bottom and top (total 40% trimmed). Wait—let's check!
 * R `psych::describe()` defaults to `trim = 0.1` (10% each side = 20% total) while
 * R `mean(x, trim = 0.2)` removes `floor(n * 0.2)` from each side. Using `k = Math.floor(sorted.length * 0.2)`
 * directly matches `mean(x, trim = 0.2)`! Let's make sure k*2 < sorted.length.
 */
export function computeTrimmedMean20(sorted: number[]): number {
  if (sorted.length === 0) return 0;
  const k = Math.floor(sorted.length * 0.2);
  if (k * 2 >= sorted.length) return computeMedian(sorted);
  const slice = sorted.slice(k, sorted.length - k);
  return computeMean(slice);
}

export function computeMode(values: number[]): { mode: number | null; label: string } {
  if (values.length === 0) return { mode: null, label: 'Sin dato' };
  const counts = new Map<number, number>();
  for (const v of values) {
    const key = Math.round(v * 10000) / 10000;
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  let maxFreq = 0;
  let bestVal: number | null = null;
  let ties = 0;
  for (const [val, freq] of counts.entries()) {
    if (freq > maxFreq) {
      maxFreq = freq;
      bestVal = val;
      ties = 1;
    } else if (freq === maxFreq) {
      ties++;
    }
  }
  if (maxFreq <= 1) {
    return { mode: null, label: 'Sin moda única (todos distintos)' };
  }
  if (ties > 1 && bestVal !== null) {
    return {
      mode: bestVal,
      label: `${formatCOAuto(bestVal, 2)} (multimodal, ${maxFreq} rep.)`,
    };
  }
  return {
    mode: bestVal,
    label: bestVal !== null ? `${formatCOAuto(bestVal, 2)} (${maxFreq} rep.)` : 'Sin dato',
  };
}

/**
 * R var(): sample variance with (n - 1) denominator
 */
export function computeSampleVariance(values: number[], meanVal: number): number {
  if (values.length < 2) return 0;
  let sumSq = 0;
  for (const v of values) {
    const d = v - meanVal;
    sumSq += d * d;
  }
  return sumSq / (values.length - 1);
}

/**
 * R mad(x, constant = 1.4826): scaled MAD matching psych::describe()
 */
export function computeMAD(sorted: number[], medianVal: number): number {
  if (sorted.length === 0) return 0;
  const absDevs = sorted.map((v) => Math.abs(v - medianVal)).sort((a, b) => a - b);
  return 1.4826 * computeQuantile(absDevs, 0.5);
}

/**
 * R psych::skew(x, type = 3): sum(((x - mean)/sd)^3) / n
 */
export function computeSkewness(values: number[], meanVal: number, stdDev: number): number {
  const n = values.length;
  if (n < 3 || stdDev === 0) return 0;
  let sumCubed = 0;
  for (const v of values) {
    sumCubed += Math.pow((v - meanVal) / stdDev, 3);
  }
  return sumCubed / n;
}

/**
 * R psych::kurtosi(x, type = 3): sum(((x - mean)/sd)^4) / n - 3
 */
export function computeExcessKurtosis(values: number[], meanVal: number, stdDev: number): number {
  const n = values.length;
  if (n < 4 || stdDev === 0) return 0;
  let sumFourth = 0;
  for (const v of values) {
    sumFourth += Math.pow((v - meanVal) / stdDev, 4);
  }
  return sumFourth / n - 3;
}

export function computeGeometricMean(values: number[]): number | null {
  const positives = values.filter((v) => Number.isFinite(v) && v > 0);
  if (positives.length === 0) return null;
  const meanLog = positives.reduce((acc, v) => acc + Math.log(v), 0) / positives.length;
  return Math.exp(meanLog);
}

export function evaluateCV(cv: number | null): TrafficLightStatus {
  if (cv === null) {
    return {
      level: 'ambar',
      label: 'No aplica',
      explanation: 'La media es cero, por lo que no se puede calcular el porcentaje relativo.',
    };
  }
  if (cv < 20) {
    return {
      level: 'verde',
      label: 'Baja dispersión (Homogéneo)',
      explanation: 'Los datos están muy agrupados alrededor del promedio; el promedio es muy representativo.',
    };
  }
  if (cv <= 50) {
    return {
      level: 'ambar',
      label: 'Dispersión moderada',
      explanation: 'Existe variabilidad natural entre registros; conviene analizar segmentos o percentiles.',
    };
  }
  return {
    level: 'rojo',
    label: 'Alta dispersión (Heterogéneo)',
    explanation: 'Los valores varían muchísimo entre sí; el promedio por sí solo oculta diferencias clave.',
  };
}

export function evaluateSkewness(skew: number): TrafficLightStatus {
  const abs = Math.abs(skew);
  if (abs <= 0.5) {
    return {
      level: 'verde',
      label: 'Distribución simétrica',
      explanation: 'Los valores se reparten de forma equilibrada a ambos lados del centro.',
    };
  }
  if (abs <= 1) {
    return {
      level: 'ambar',
      label: skew > 0 ? 'Asimetría moderada positiva' : 'Asimetría moderada negativa',
      explanation:
        skew > 0
          ? 'Hay una cola moderada hacia valores altos.'
          : 'Hay una cola moderada hacia valores bajos.',
    };
  }
  return {
    level: 'rojo',
    label: skew > 0 ? 'Alta asimetría positiva' : 'Alta asimetría negativa',
    explanation:
      skew > 0
        ? 'Existen valores muy altos que estiran la distribución; usa la mediana como referencia.'
        : 'Existen valores muy bajos que jalan la cola izquierda.',
  };
}

export function evaluateKurtosis(kurt: number): TrafficLightStatus {
  const abs = Math.abs(kurt);
  if (abs <= 1) {
    return {
      level: 'verde',
      label: 'Colas normales (Mesocúrtica)',
      explanation: 'Frecuencia de valores extremos similar a una campana normal.',
    };
  }
  if (kurt > 1) {
    return {
      level: 'rojo',
      label: 'Colas pesadas (Leptocúrtica)',
      explanation: 'Alta concentración en el centro con presencia notable de valores extremos (outliers).',
    };
  }
  return {
    level: 'ambar',
    label: 'Distribución aplanada (Platicúrtica)',
    explanation: 'Los datos están repartidos en un rango amplio con pocos picos extremos.',
  };
}

export function computeDescriptiveStats(
  rows: DataRow[],
  cfg: VariableConfig
): DescriptiveStats {
  const values = extractNumericValues(rows, cfg.name);
  const missing = rows.length - values.length;
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;

  if (n === 0) {
    return {
      column: cfg.name,
      n: 0,
      missing,
      mean: 0,
      median: 0,
      mode: null,
      modeLabel: 'Sin datos',
      trimmedMean20: 0,
      min: 0,
      max: 0,
      range: 0,
      variance: 0,
      stdDev: 0,
      se: 0,
      q1: 0,
      q3: 0,
      iqr: 0,
      mad: 0,
      cv: null,
      skewness: 0,
      kurtosis: 0,
      skewMeanMedianAlert: false,
      skewMeanMedianDirection: 'balanced',
      suggestLogTransform: false,
      logSkewness: null,
      cvStatus: evaluateCV(null),
      skewStatus: evaluateSkewness(0),
      kurtosisStatus: evaluateKurtosis(0),
      isBinary01: false,
      isProportion01: cfg.isProportion01,
      onesPercentage: null,
    };
  }

  const mean = computeMean(sorted);
  const median = computeQuantile(sorted, 0.5);
  const { mode, label: modeLabel } = computeMode(sorted);
  const trimmedMean20 = computeTrimmedMean20(sorted);
  const min = sorted[0];
  const max = sorted[n - 1];
  const range = max - min;
  const variance = computeSampleVariance(sorted, mean);
  const stdDev = Math.sqrt(variance);
  const se = n > 0 ? stdDev / Math.sqrt(n) : 0;
  const q1 = computeQuantile(sorted, 0.25);
  const q3 = computeQuantile(sorted, 0.75);
  const iqr = q3 - q1;
  const mad = computeMAD(sorted, median);
  const cv = Math.abs(mean) > 1e-9 ? (stdDev / Math.abs(mean)) * 100 : null;
  const skewness = computeSkewness(sorted, mean, stdDev);
  const kurtosis = computeExcessKurtosis(sorted, mean, stdDev);

  const uniqueSet = new Set(sorted);
  const isBinary01 =
    !cfg.isProportion01 &&
    uniqueSet.size <= 2 &&
    Array.from(uniqueSet).every((v) => v === 0 || v === 1);
  const onesPercentage = isBinary01 ? mean * 100 : null;

  let skewMeanMedianAlert = false;
  let skewMeanMedianDirection: 'high' | 'low' | 'balanced' = 'balanced';
  if (!isBinary01 && n >= 6) {
    const relDiff = Math.abs(median) > 1e-9 ? (mean - median) / Math.abs(median) : 0;
    const zDiff = stdDev > 1e-9 ? (mean - median) / stdDev : 0;
    if (relDiff > 0.12 || zDiff > 0.25) {
      skewMeanMedianAlert = true;
      skewMeanMedianDirection = 'high';
    } else if (relDiff < -0.12 || zDiff < -0.25) {
      skewMeanMedianAlert = true;
      skewMeanMedianDirection = 'low';
    }
  }

  const suggestLogTransform = !isBinary01 && !cfg.isProportion01 && Math.abs(skewness) > 1 && min >= 0;
  let logSkewness: number | null = null;
  if (suggestLogTransform) {
    const logVals = sorted.map((v) => Math.log1p(v));
    const logMean = computeMean(logVals);
    const logStd = Math.sqrt(computeSampleVariance(logVals, logMean));
    logSkewness = computeSkewness(logVals, logMean, logStd);
  }

  return {
    column: cfg.name,
    n,
    missing,
    mean,
    median,
    mode,
    modeLabel,
    trimmedMean20,
    min,
    max,
    range,
    variance,
    stdDev,
    se,
    q1,
    q3,
    iqr,
    mad,
    cv,
    skewness,
    kurtosis,
    skewMeanMedianAlert,
    skewMeanMedianDirection,
    suggestLogTransform,
    logSkewness,
    cvStatus: evaluateCV(cv),
    skewStatus: evaluateSkewness(skewness),
    kurtosisStatus: evaluateKurtosis(kurtosis),
    isBinary01,
    isProportion01: cfg.isProportion01,
    onesPercentage,
  };
}

export function computeBoxplotSummary(rows: DataRow[], col: string): BoxplotSummary {
  const indexed: Array<{ rowIndex: number; value: number }> = [];
  for (let i = 0; i < rows.length; i++) {
    const v = rows[i][col];
    if (typeof v === 'number' && Number.isFinite(v)) {
      indexed.push({ rowIndex: i + 1, value: v });
    }
  }
  if (indexed.length === 0) {
    return {
      column: col,
      min: 0,
      lowerFence: 0,
      whiskerMin: 0,
      q1: 0,
      median: 0,
      q3: 0,
      whiskerMax: 0,
      upperFence: 0,
      max: 0,
      mean: 0,
      outliers: [],
    };
  }

  const sortedVals = indexed.map((d) => d.value).sort((a, b) => a - b);
  const q1 = computeQuantile(sortedVals, 0.25);
  const median = computeQuantile(sortedVals, 0.5);
  const q3 = computeQuantile(sortedVals, 0.75);
  const iqr = q3 - q1;
  const lowerFence = q1 - 1.5 * iqr;
  const upperFence = q3 + 1.5 * iqr;

  const nonOutliers = sortedVals.filter((v) => v >= lowerFence && v <= upperFence);
  const whiskerMin = nonOutliers.length > 0 ? nonOutliers[0] : sortedVals[0];
  const whiskerMax =
    nonOutliers.length > 0 ? nonOutliers[nonOutliers.length - 1] : sortedVals[sortedVals.length - 1];

  const outliers: OutlierPoint[] = indexed
    .filter((d) => d.value < lowerFence || d.value > upperFence)
    .map((d) => ({
      rowIndex: d.rowIndex,
      value: d.value,
      side: (d.value < lowerFence ? 'inferior' : 'superior') as 'inferior' | 'superior',
    }))
    .sort((a, b) => Math.abs(b.value - median) - Math.abs(a.value - median));

  return {
    column: col,
    min: sortedVals[0],
    lowerFence,
    whiskerMin,
    q1,
    median,
    q3,
    whiskerMax,
    upperFence,
    max: sortedVals[sortedVals.length - 1],
    mean: computeMean(sortedVals),
    outliers,
  };
}

export function computeGroupedBoxplots(
  rows: DataRow[],
  numCol: string,
  catCol: string,
  maxGroups = 10
): GroupedBoxplotItem[] {
  const buckets = new Map<string, DataRow[]>();
  for (const r of rows) {
    const numVal = r[numCol];
    const catVal = r[catCol];
    if (typeof numVal === 'number' && Number.isFinite(numVal) && !isCellEmpty(catVal)) {
      const label = String(catVal).trim();
      if (!buckets.has(label)) buckets.set(label, []);
      buckets.get(label)!.push(r);
    }
  }

  return Array.from(buckets.entries())
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, maxGroups)
    .map(([group, groupRows]) => {
      const stats = computeBoxplotSummary(groupRows, numCol);
      return {
        group,
        n: groupRows.length,
        mean: stats.mean,
        stats,
      };
    });
}

export function computeQQPlot(values: number[]): QQPlotResult {
  if (values.length < 3) {
    return {
      points: [],
      slope: 1,
      intercept: 0,
      rSquaredFit: 0,
      isApproxNormal: false,
      normalityLabel: 'Muestra insuficiente',
      interpretation: 'Se requieren al menos 3 observaciones válidas para construir el gráfico Q-Q.',
    };
  }
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  const points: QQPlotPoint[] = [];
  for (let i = 0; i < n; i++) {
    // Blom plotting position (similar to R ppoints)
    const p = (i + 1 - 0.375) / (n + 0.25);
    const z = Number(jStatLib.normal.inv(p, 0, 1));
    points.push({ theoretical: z, sample: sorted[i] });
  }

  // R qqline passes through (qnorm(0.25), Q1) and (qnorm(0.75), Q3)
  const z25 = Number(jStatLib.normal.inv(0.25, 0, 1));
  const z75 = Number(jStatLib.normal.inv(0.75, 0, 1));
  const q25 = computeQuantile(sorted, 0.25);
  const q75 = computeQuantile(sorted, 0.75);
  const slope = (q75 - q25) / (z75 - z25 || 1);
  const intercept = q25 - slope * z25;

  const r = computePearsonOnly(
    points.map((pt) => pt.theoretical),
    points.map((pt) => pt.sample)
  );
  const rSquaredFit = r * r;
  const isApproxNormal = rSquaredFit >= 0.94;

  const normalityLabel =
    rSquaredFit >= 0.97
      ? 'Muy cercana a Normal'
      : rSquaredFit >= 0.94
        ? 'Aproximadamente Normal'
        : rSquaredFit >= 0.88
          ? 'Desviación moderada de la Normal'
          : 'No sigue distribución Normal';

  const interpretation = isApproxNormal
    ? `Los puntos se alinean muy bien sobre la línea qqline (ajuste R² = ${(rSquaredFit * 100).toFixed(1).replace('.', ',')}%), por lo que la variable se comporta de forma cercana a una campana normal.`
    : `Los puntos se separan de la línea roja en los extremos (R² = ${(rSquaredFit * 100).toFixed(1).replace('.', ',')}%). Esto indica presencia de colas pesadas o asimetría; apoya tus decisiones en la mediana y los cuantiles.`;

  return {
    points,
    slope,
    intercept,
    rSquaredFit,
    isApproxNormal,
    normalityLabel,
    interpretation,
  };
}

export function computeHistogram(values: number[], requestedBins?: number): HistogramBin[] {
  if (values.length === 0) return [];
  const sorted = [...values].sort((a, b) => a - b);
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  if (min === max) {
    return [
      {
        label: formatCOAuto(min, 2),
        min,
        max,
        count: values.length,
        pct: 100,
      },
    ];
  }

  const sturges = Math.ceil(Math.log2(values.length) + 1);
  const numBins = requestedBins
    ? Math.max(4, Math.min(20, requestedBins))
    : Math.max(5, Math.min(14, sturges));

  const width = (max - min) / numBins;
  const bins: HistogramBin[] = [];

  for (let i = 0; i < numBins; i++) {
    const bMin = min + i * width;
    const bMax = i === numBins - 1 ? max : min + (i + 1) * width;
    bins.push({
      label: `${formatCOAuto(bMin, 1)}–${formatCOAuto(bMax, 1)}`,
      min: bMin,
      max: bMax,
      count: 0,
      pct: 0,
    });
  }

  for (const v of values) {
    let idx = Math.floor((v - min) / width);
    if (idx >= numBins) idx = numBins - 1;
    if (idx < 0) idx = 0;
    bins[idx].count++;
  }

  for (const b of bins) {
    b.pct = (b.count / values.length) * 100;
  }

  return bins;
}

export function computeCategoricalStats(
  rows: DataRow[],
  cfg: VariableConfig
): CategoricalStats {
  const counts = new Map<string, number>();
  let n = 0;
  let missing = 0;
  let onesCount = 0;
  let zerosCount = 0;

  for (const row of rows) {
    const val = row[cfg.name];
    if (isCellEmpty(val)) {
      missing++;
    } else {
      n++;
      const label = String(val).trim();
      counts.set(label, (counts.get(label) || 0) + 1);
      if (label === '1' || label === '1.0' || label === '1,0') onesCount++;
      if (label === '0' || label === '0.0' || label === '0,0') zerosCount++;
    }
  }

  const sortedEntries = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  let cum = 0;
  const frequencies: CategoricalFrequency[] = sortedEntries.map(([category, count]) => {
    const pct = n > 0 ? (count / n) * 100 : 0;
    cum += pct;
    return {
      category,
      count,
      pct,
      cumPct: Math.min(100, cum),
    };
  });

  const isBinary01 =
    cfg.isBinary01 ||
    (sortedEntries.length > 0 && sortedEntries.length <= 2 && onesCount + zerosCount === n);

  return {
    column: cfg.name,
    n,
    missing,
    uniqueCount: frequencies.length,
    frequencies,
    topCategory: frequencies[0]?.category || 'Sin datos',
    topPct: frequencies[0]?.pct || 0,
    isBinary01,
    binaryMeanAsPct: isBinary01 && n > 0 ? (onesCount / n) * 100 : null,
  };
}

export function computePearsonOnly(xs: number[], ys: number[]): number {
  const n = Math.min(xs.length, ys.length);
  if (n < 2) return 0;
  const meanX = computeMean(xs);
  const meanY = computeMean(ys);
  let num = 0;
  let denX = 0;
  let denY = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - meanX;
    const dy = ys[i] - meanY;
    num += dx * dy;
    denX += dx * dx;
    denY += dy * dy;
  }
  const den = Math.sqrt(denX * denY);
  if (den === 0) return 0;
  return Math.max(-1, Math.min(1, num / den));
}

function assignAverageRanks(values: number[]): number[] {
  const indexed = values.map((v, i) => ({ v, i })).sort((a, b) => a.v - b.v);
  const ranks = new Array<number>(values.length);
  let i = 0;
  while (i < indexed.length) {
    let j = i;
    while (j + 1 < indexed.length && indexed[j + 1].v === indexed[i].v) {
      j++;
    }
    const avgRank = (i + j) / 2 + 1;
    for (let k = i; k <= j; k++) {
      ranks[indexed[k].i] = avgRank;
    }
    i = j + 1;
  }
  return ranks;
}

export function computeCorrelationPair(
  rows: DataRow[],
  xCol: string,
  yCol: string
): CorrelationMetrics {
  const xs: number[] = [];
  const ys: number[] = [];
  for (const row of rows) {
    const vx = row[xCol];
    const vy = row[yCol];
    if (
      typeof vx === 'number' &&
      Number.isFinite(vx) &&
      typeof vy === 'number' &&
      Number.isFinite(vy)
    ) {
      xs.push(vx);
      ys.push(vy);
    }
  }
  const n = xs.length;
  if (n < 3) {
    return {
      x: xCol,
      y: yCol,
      n,
      pearsonR: 0,
      pearsonP: 1,
      spearmanRho: 0,
      rSquared: 0,
      slope: 0,
      intercept: 0,
    };
  }

  const pearsonR = computePearsonOnly(xs, ys);
  const rx = assignAverageRanks(xs);
  const ry = assignAverageRanks(ys);
  const spearmanRho = computePearsonOnly(rx, ry);

  const meanX = computeMean(xs);
  const meanY = computeMean(ys);
  let sxx = 0;
  let sxy = 0;
  for (let i = 0; i < n; i++) {
    sxx += Math.pow(xs[i] - meanX, 2);
    sxy += (xs[i] - meanX) * (ys[i] - meanY);
  }
  const slope = sxx > 0 ? sxy / sxx : 0;
  const intercept = meanY - slope * meanX;

  let pearsonP = 1;
  if (Math.abs(pearsonR) >= 0.999999) {
    pearsonP = 0;
  } else {
    const tStat = Math.abs(pearsonR) * Math.sqrt((n - 2) / (1 - pearsonR * pearsonR));
    const cdf = jStatLib.studentt.cdf(tStat, n - 2);
    pearsonP = Math.max(0, Math.min(1, 2 * (1 - cdf)));
  }

  return {
    x: xCol,
    y: yCol,
    n,
    pearsonR,
    pearsonP,
    spearmanRho,
    rSquared: pearsonR * pearsonR,
    slope,
    intercept,
  };
}

function simulateChiSquarePValue(
  rowIds: number[],
  colIds: number[],
  numRows: number,
  numCols: number,
  expected: number[][],
  observedChi2: number,
  iterations = 1000
): number {
  const n = rowIds.length;
  if (n === 0 || numRows < 2 || numCols < 2) return 1;

  // Deterministic LCG PRNG for reproducible simulated p-value
  let state = (n * 1103515245 + Math.round(observedChi2 * 100)) >>> 0;
  const rand = () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };

  const shuffledCols = [...colIds];
  let geCount = 0;
  const simObs = Array.from({ length: numRows }, () => new Array<number>(numCols).fill(0));

  for (let b = 0; b < iterations; b++) {
    // Fisher-Yates shuffle
    for (let i = n - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      const tmp = shuffledCols[i];
      shuffledCols[i] = shuffledCols[j];
      shuffledCols[j] = tmp;
    }

    for (let r = 0; r < numRows; r++) simObs[r].fill(0);
    for (let k = 0; k < n; k++) {
      simObs[rowIds[k]][shuffledCols[k]]++;
    }

    let simChi2 = 0;
    for (let r = 0; r < numRows; r++) {
      for (let c = 0; c < numCols; c++) {
        const exp = expected[r][c];
        if (exp > 0) {
          const diff = simObs[r][c] - exp;
          simChi2 += (diff * diff) / exp;
        }
      }
    }
    if (simChi2 >= observedChi2 - 1e-9) geCount++;
  }

  return (geCount + 1) / (iterations + 1);
}

export function computeChiSquare(
  rows: DataRow[],
  rowVar: string,
  colVar: string,
  groupMinorThreshold = 0,
  includeSimulatedP = false
): ChiSquareResult {
  const rawPairs: Array<{ r: string; c: string }> = [];
  const rowCountsAll = new Map<string, number>();
  const colCountsAll = new Map<string, number>();

  for (const row of rows) {
    const rv = row[rowVar];
    const cv = row[colVar];
    if (!isCellEmpty(rv) && !isCellEmpty(cv)) {
      const rStr = String(rv).trim();
      const cStr = String(cv).trim();
      rawPairs.push({ r: rStr, c: cStr });
      rowCountsAll.set(rStr, (rowCountsAll.get(rStr) || 0) + 1);
      colCountsAll.set(cStr, (colCountsAll.get(cStr) || 0) + 1);
    }
  }

  const totalPairs = rawPairs.length;
  const pairs = rawPairs.map(({ r, c }) => {
    let nr = r;
    let nc = c;
    if (groupMinorThreshold > 0 && totalPairs > 0) {
      if ((rowCountsAll.get(r) || 0) < groupMinorThreshold && rowCountsAll.size > 2) {
        nr = 'Otros (agrupado)';
      }
      if ((colCountsAll.get(c) || 0) < groupMinorThreshold && colCountsAll.size > 2) {
        nc = 'Otros (agrupado)';
      }
    }
    return { r: nr, c: nc };
  });

  const rowSet = Array.from(new Set(pairs.map((p) => p.r))).sort((a, b) => {
    if (a === 'Otros (agrupado)') return 1;
    if (b === 'Otros (agrupado)') return -1;
    return a.localeCompare(b, 'es');
  });
  const colSet = Array.from(new Set(pairs.map((p) => p.c))).sort((a, b) => {
    if (a === 'Otros (agrupado)') return 1;
    if (b === 'Otros (agrupado)') return -1;
    return a.localeCompare(b, 'es');
  });

  const rIdx = new Map(rowSet.map((r, i) => [r, i]));
  const cIdx = new Map(colSet.map((c, j) => [c, j]));

  const observed = rowSet.map(() => colSet.map(() => 0));
  const rowIds: number[] = [];
  const colIds: number[] = [];
  for (const p of pairs) {
    const ri = rIdx.get(p.r)!;
    const ci = cIdx.get(p.c)!;
    observed[ri][ci]++;
    rowIds.push(ri);
    colIds.push(ci);
  }

  const rowTotals = observed.map((r) => r.reduce((a, b) => a + b, 0));
  const colTotals = colSet.map((_, j) => observed.reduce((sum, r) => sum + r[j], 0));
  const grandTotal = rowTotals.reduce((a, b) => a + b, 0);

  const expected = rowSet.map((_, i) =>
    colSet.map((__, j) => (grandTotal > 0 ? (rowTotals[i] * colTotals[j]) / grandTotal : 0))
  );

  const rowPcts = observed.map((r, i) =>
    r.map((val) => (rowTotals[i] > 0 ? (val / rowTotals[i]) * 100 : 0))
  );
  const colPcts = observed.map((r) =>
    r.map((val, j) => (colTotals[j] > 0 ? (val / colTotals[j]) * 100 : 0))
  );
  const totalPcts = observed.map((r) =>
    r.map((val) => (grandTotal > 0 ? (val / grandTotal) * 100 : 0))
  );

  const chiContributions = rowSet.map(() => colSet.map(() => 0));
  const pearsonResiduals = rowSet.map(() => colSet.map(() => 0));

  let chi2 = 0;
  let cellsBelow5 = 0;
  const totalCells = rowSet.length * colSet.length;

  for (let i = 0; i < rowSet.length; i++) {
    for (let j = 0; j < colSet.length; j++) {
      const exp = expected[i][j];
      if (exp < 5) cellsBelow5++;
      if (exp > 0) {
        const contrib = Math.pow(observed[i][j] - exp, 2) / exp;
        chiContributions[i][j] = contrib;
        pearsonResiduals[i][j] = (observed[i][j] - exp) / Math.sqrt(exp);
        chi2 += contrib;
      }
    }
  }

  const df = Math.max(1, (rowSet.length - 1) * (colSet.length - 1));
  let pValue = 1;
  if (rowSet.length >= 2 && colSet.length >= 2 && grandTotal > 0) {
    const cdf = jStatLib.chisquare.cdf(chi2, df);
    pValue = Math.max(0, Math.min(1, 1 - cdf));
  }

  const simulatedPValue =
    includeSimulatedP && rowSet.length >= 2 && colSet.length >= 2 && grandTotal > 0
      ? simulateChiSquarePValue(rowIds, colIds, rowSet.length, colSet.length, expected, chi2, 1000)
      : null;

  const minDim = Math.min(rowSet.length - 1, colSet.length - 1);
  const cramersV =
    grandTotal > 0 && minDim > 0 ? Math.sqrt(chi2 / (grandTotal * minDim)) : 0;

  return {
    rowVar,
    colVar,
    rows: rowSet,
    cols: colSet,
    observed,
    expected,
    rowTotals,
    colTotals,
    rowPcts,
    colPcts,
    totalPcts,
    chiContributions,
    pearsonResiduals,
    grandTotal,
    chi2,
    df,
    pValue,
    simulatedPValue,
    cramersV,
    cellsBelow5,
    totalCells,
    hasSmallExpectedWarning: cellsBelow5 > 0,
    significant: (simulatedPValue ?? pValue) < 0.05 && rowSet.length >= 2 && colSet.length >= 2,
  };
}

export function sortRowsByTime(rows: DataRow[], timeCol: string): DataRow[] {
  return [...rows]
    .filter((r) => !isCellEmpty(r[timeCol]))
    .sort((a, b) => parseTimeSortKey(a[timeCol]) - parseTimeSortKey(b[timeCol]));
}

export function computeTimeSeriesSummary(
  rows: DataRow[],
  timeCol: string,
  col: string
): TimeSeriesMetricSummary | null {
  const sorted = sortRowsByTime(rows, timeCol);
  const points: Array<{ label: string; value: number; sortKey: number }> = [];

  for (const r of sorted) {
    const v = r[col];
    if (typeof v === 'number' && Number.isFinite(v)) {
      points.push({
        label: String(r[timeCol]).trim(),
        value: v,
        sortKey: parseTimeSortKey(r[timeCol]),
      });
    }
  }

  if (points.length === 0) return null;

  const first = points[0];
  const last = points[points.length - 1];
  let peak = points[0];
  for (const p of points) {
    if (p.value > peak.value) peak = p;
  }

  const changeFromPeakPct =
    peak.value !== 0 ? ((last.value - peak.value) / Math.abs(peak.value)) * 100 : 0;
  const totalGrowthPct =
    first.value !== 0 ? ((last.value - first.value) / Math.abs(first.value)) * 100 : 0;

  let cagrPct: number | null = null;
  const nSteps = points.length - 1;
  if (nSteps >= 1 && first.value > 0 && last.value > 0) {
    cagrPct = (Math.pow(last.value / first.value, 1 / nSteps) - 1) * 100;
  }

  let worstDropPct: number | null = null;
  let worstDropFromLabel: string | null = null;
  let worstDropToLabel: string | null = null;

  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    if (prev.value > 0) {
      const pct = ((curr.value - prev.value) / prev.value) * 100;
      if (worstDropPct === null || pct < worstDropPct) {
        worstDropPct = pct;
        worstDropFromLabel = prev.label;
        worstDropToLabel = curr.label;
      }
    }
  }

  let crisis2020ChangePct: number | null = null;
  const idx2020 = points.findIndex((p) => p.label.startsWith('2020'));
  if (idx2020 > 0 && points[idx2020 - 1].value > 0) {
    crisis2020ChangePct =
      ((points[idx2020].value - points[idx2020 - 1].value) /
        points[idx2020 - 1].value) *
      100;
  }

  return {
    column: col,
    validPeriods: points.length,
    firstPeriodLabel: first.label,
    firstValue: first.value,
    peakPeriodLabel: peak.label,
    peakValue: peak.value,
    lastPeriodLabel: last.label,
    lastValue: last.value,
    changeFromPeakPct,
    totalGrowthPct,
    cagrPct,
    worstDropPct,
    worstDropFromLabel,
    worstDropToLabel,
    crisis2020ChangePct,
  };
}

export function computeSmoothTrendLine(values: Array<number | null>): Array<number | null> {
  return values.map((v, idx) => {
    if (v === null) return null;
    const neighbors: number[] = [];
    for (let offset = -1; offset <= 1; offset++) {
      const nv = values[idx + offset];
      if (nv !== null && nv !== undefined) neighbors.push(nv);
    }
    return neighbors.length > 0 ? computeMean(neighbors) : v;
  });
}

export function computeParticipationDeltas(
  rows: DataRow[],
  timeCol: string | null,
  componentCols: string[]
): {
  periods: Array<{ label: string; shares: Record<string, number>; total: number }>;
  deltas: ParticipationDelta[];
} {
  if (componentCols.length === 0) return { periods: [], deltas: [] };

  const orderedRows = timeCol ? sortRowsByTime(rows, timeCol) : rows;
  const periods: Array<{ label: string; shares: Record<string, number>; total: number }> = [];

  for (let i = 0; i < orderedRows.length; i++) {
    const r = orderedRows[i];
    const label = timeCol ? String(r[timeCol]).trim() : `Fila ${i + 1}`;
    let total = 0;
    for (const c of componentCols) {
      const v = r[c];
      if (typeof v === 'number' && Number.isFinite(v) && v > 0) total += v;
    }
    if (total <= 0) continue;
    const shares: Record<string, number> = {};
    for (const c of componentCols) {
      const v = r[c];
      shares[c] =
        typeof v === 'number' && Number.isFinite(v) && v > 0 ? (v / total) * 100 : 0;
    }
    periods.push({ label, shares, total });
  }

  if (periods.length === 0) return { periods: [], deltas: [] };

  const first = periods[0];
  const last = periods[periods.length - 1];
  const deltas: ParticipationDelta[] = componentCols
    .map((c) => {
      const startSharePct = first.shares[c] ?? 0;
      const endSharePct = last.shares[c] ?? 0;
      return {
        column: c,
        startPeriod: first.label,
        endPeriod: last.label,
        startSharePct,
        endSharePct,
        deltaPP: endSharePct - startSharePct,
      };
    })
    .sort((a, b) => b.deltaPP - a.deltaPP);

  return { periods, deltas };
}
