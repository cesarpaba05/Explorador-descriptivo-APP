import type { NumberUnit, RawCell } from '../types/data';

export type DecimalPreference = 'auto' | 'dot' | 'comma';
export type DelimiterPreference = 'auto' | ',' | ';' | '\t';

export const UNIT_LABELS: Record<NumberUnit, string> = {
  pesos: 'Pesos ($ COP)',
  miles: 'Miles de pesos ($ miles)',
  millones: 'Millones de pesos ($ millones)',
  unidades: 'Unidades / Cantidades (sin moneda)',
};

/**
 * Formato numérico colombiano estricto:
 * punto (.) para miles, coma (,) para decimales.
 */
export function formatCO(
  value: number | null | undefined,
  decimals = 2,
  fallback = 'Sin dato'
): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return fallback;
  }
  const fixed = Number(value.toFixed(decimals));
  const normalized = Object.is(fixed, -0) ? 0 : fixed;
  return new Intl.NumberFormat('es-CO', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(normalized);
}

export function formatCOAuto(
  value: number | null | undefined,
  maxDecimals = 2,
  fallback = 'Sin dato'
): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return fallback;
  }
  if (Number.isInteger(value)) {
    return new Intl.NumberFormat('es-CO', {
      maximumFractionDigits: 0,
    }).format(value);
  }
  const abs = Math.abs(value);
  const decimals = abs > 0 && abs < 0.01 ? Math.max(maxDecimals, 4) : maxDecimals;
  return new Intl.NumberFormat('es-CO', {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function formatCOInt(value: number | null | undefined, fallback = '0'): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return fallback;
  }
  return new Intl.NumberFormat('es-CO', {
    maximumFractionDigits: 0,
  }).format(Math.round(value));
}

export function formatCOPercent(
  pctValue: number | null | undefined,
  decimals = 1,
  fallback = 'Sin dato'
): string {
  if (pctValue === null || pctValue === undefined || !Number.isFinite(pctValue)) {
    return fallback;
  }
  return `${formatCO(pctValue, decimals)}%`;
}

export function formatCOPValue(p: number | null | undefined): string {
  if (p === null || p === undefined || !Number.isFinite(p)) {
    return 'No calculable';
  }
  if (p < 0.0001) {
    return '< 0,0001';
  }
  return formatCO(p, 4);
}

/**
 * Formatea una cifra monetaria o numérica usando escala colombiana larga
 * ("4,9 billones", "559 mil millones", "12,4 millones") según la unidad elegida en el Paso 1.
 */
export function formatWithUnit(
  value: number | null | undefined,
  unit: NumberUnit,
  options?: { isProportion01?: boolean; compact?: boolean; fallback?: string }
): string {
  const fallback = options?.fallback ?? 'Sin dato';
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return fallback;
  }
  if (options?.isProportion01) {
    return formatCOPercent(value * 100, 1);
  }

  const compact = options?.compact ?? true;
  if (unit === 'unidades') {
    if (compact && Math.abs(value) >= 1_000_000_000_000) {
      return `${formatCO(value / 1_000_000_000_000, 2)} billones`;
    }
    if (compact && Math.abs(value) >= 1_000_000_000) {
      return `${formatCO(value / 1_000_000_000, 1)} mil millones`;
    }
    if (compact && Math.abs(value) >= 1_000_000) {
      return `${formatCO(value / 1_000_000, 1)} millones`;
    }
    return formatCOAuto(value, 2);
  }

  const multiplier = unit === 'miles' ? 1_000 : unit === 'millones' ? 1_000_000 : 1;
  const pesos = value * multiplier;
  const abs = Math.abs(pesos);
  const sign = pesos < 0 ? '-' : '';
  const absVal = abs;

  if (compact) {
    if (absVal >= 1_000_000_000_000) {
      const b = absVal / 1_000_000_000_000;
      const dec = b >= 100 ? 0 : b >= 10 ? 1 : 2;
      return `${sign}$${formatCOAuto(Number(b.toFixed(dec)), dec)} ${Math.abs(b - 1) < 0.05 ? 'billón' : 'billones'}`;
    }
    if (absVal >= 1_000_000_000) {
      const mm = absVal / 1_000_000_000;
      const dec = mm >= 100 ? 0 : 1;
      return `${sign}$${formatCOAuto(Number(mm.toFixed(dec)), dec)} mil millones`;
    }
    if (absVal >= 1_000_000) {
      const m = absVal / 1_000_000;
      const dec = m >= 100 ? 0 : 1;
      return `${sign}$${formatCOAuto(Number(m.toFixed(dec)), dec)} ${Math.abs(m - 1) < 0.05 ? 'millón' : 'millones'}`;
    }
    if (absVal >= 1_000) {
      return `${sign}$${formatCOInt(absVal)}`;
    }
  }

  return `${sign}$${formatCOAuto(absVal, 2)}`;
}

export function isCellEmpty(val: RawCell): boolean {
  if (val === null || val === undefined) return true;
  if (typeof val === 'number') return !Number.isFinite(val);
  if (typeof val === 'string') {
    const t = val.trim();
    return (
      t === '' ||
      t.toLowerCase() === 'na' ||
      t.toLowerCase() === 'n/a' ||
      t.toLowerCase() === 'null' ||
      t === '-'
    );
  }
  return false;
}

export function parseNumberSmart(
  val: RawCell,
  decimalSep: 'dot' | 'comma' = 'dot'
): number | null {
  if (typeof val === 'number') {
    return Number.isFinite(val) ? val : null;
  }
  if (typeof val === 'boolean' || val === null || val === undefined) {
    return null;
  }
  let raw = String(val).trim();
  if (
    !raw ||
    raw.toLowerCase() === 'na' ||
    raw.toLowerCase() === 'n/a' ||
    raw.toLowerCase() === 'null' ||
    raw === '-'
  ) {
    return null;
  }

  const hasPct = raw.includes('%');
  raw = raw.replace(/[\s$€£%]/g, '');

  if (/^\(.*\)$/.test(raw)) {
    raw = '-' + raw.slice(1, -1);
  }

  if (decimalSep === 'comma') {
    const hasComma = raw.includes(',');
    const hasDot = raw.includes('.');
    if (hasComma && hasDot) {
      raw = raw.replace(/\./g, '').replace(',', '.');
    } else if (hasComma) {
      raw = raw.replace(',', '.');
    } else if (hasDot) {
      const parts = raw.split('.');
      if (parts.length > 2 || (parts.length === 2 && parts[1].length === 3 && !raw.startsWith('0.'))) {
        raw = raw.replace(/\./g, '');
      }
    }
  } else {
    const hasComma = raw.includes(',');
    const hasDot = raw.includes('.');
    if (hasComma && hasDot) {
      raw = raw.replace(/,/g, '');
    } else if (hasComma) {
      const parts = raw.split(',');
      if (parts.length > 2 || (parts.length === 2 && parts[1].length === 3)) {
        raw = raw.replace(/,/g, '');
      } else {
        raw = raw.replace(',', '.');
      }
    }
  }

  if (!/^-?\d*(\.\d+)?([eE][+-]?\d+)?$/.test(raw) || raw === '' || raw === '-' || raw === '.') {
    return null;
  }
  const num = Number(raw);
  if (!Number.isFinite(num)) return null;
  return hasPct ? num / 100 : num;
}

export function detectDelimiterAndDecimal(text: string): {
  delimiter: ',' | ';' | '\t';
  decimal: 'dot' | 'comma';
} {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .slice(0, 20);

  const candidates: Array<',' | ';' | '\t'> = [',', ';', '\t'];
  let bestDelimiter: ',' | ';' | '\t' = ',';
  let bestScore = -1;

  for (const delim of candidates) {
    const counts = lines.map((line) => {
      let inQuotes = false;
      let count = 0;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') inQuotes = !inQuotes;
        else if (ch === delim && !inQuotes) count++;
      }
      return count;
    });
    const nonZero = counts.filter((c) => c > 0);
    if (nonZero.length === 0) continue;
    const avg = nonZero.reduce((a, b) => a + b, 0) / counts.length;
    const first = counts[0];
    const consistency = counts.filter((c) => c === first).length / counts.length;
    const score = avg * (0.5 + consistency);
    if (score > bestScore) {
      bestScore = score;
      bestDelimiter = delim;
    }
  }

  let commaDecimalVotes = 0;
  let dotDecimalVotes = 0;
  for (const line of lines.slice(1)) {
    const cells = line.split(bestDelimiter);
    for (const rawCell of cells) {
      const cell = rawCell.replace(/^["']|["']$/g, '').trim();
      if (/^-?\d{1,3}(\.\d{3})+,\d+$/.test(cell) || /^-?\d+,\d{1,4}$/.test(cell)) {
        commaDecimalVotes += 2;
      } else if (/^-?\d{1,3}(,\d{3})+\.\d+$/.test(cell) || /^-?\d+\.\d{1,4}$/.test(cell)) {
        dotDecimalVotes += 2;
      }
    }
  }

  let decimal: 'dot' | 'comma' = 'dot';
  if (commaDecimalVotes > dotDecimalVotes) {
    decimal = 'comma';
  } else if (bestDelimiter === ';' && dotDecimalVotes === 0 && commaDecimalVotes > 0) {
    decimal = 'comma';
  }

  return { delimiter: bestDelimiter, decimal };
}

export function formatCellForDisplay(
  val: RawCell,
  role: 'numeric' | 'categorical' | 'time',
  unit: NumberUnit = 'unidades',
  isProportion01 = false
): string {
  if (isCellEmpty(val)) return 'Sin dato';
  if (role === 'time') {
    return String(val);
  }
  if (role === 'numeric' && typeof val === 'number') {
    if (isProportion01) return formatCOPercent(val * 100, 1);
    if (unit === 'unidades') return formatCOAuto(val, 2);
    return formatWithUnit(val, unit, { compact: true });
  }
  return String(val);
}
