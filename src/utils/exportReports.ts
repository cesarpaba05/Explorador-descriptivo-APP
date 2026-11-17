import type {
  BusinessContext,
  CategoricalStats,
  ChiSquareResult,
  DatasetWorkspace,
  DataRow,
  DescriptiveStats,
  ExecutiveFinding,
  ExpertAnalysisResult,
  QualityReport,
  TimeSeriesMetricSummary,
  VariableConfig,
} from '../types/data';
import {
  formatCO,
  formatCOAuto,
  formatCOInt,
  formatCOPercent,
  formatCOPValue,
  formatWithUnit,
  UNIT_LABELS,
} from './formatters';
import { generateRCodeForStep } from './rCodeGenerator';
import {
  computeBoxplotSummary,
  computeCategoricalStats,
  computeChiSquare,
  computeCorrelationPair,
  computeDescriptiveStats,
  computeGeometricMean,
  computeHistogram,
  computeParticipationDeltas,
  computeTimeSeriesSummary,
  detectTotalColumnAndComponents,
  extractNumericValues,
  sortRowsByTime,
} from './statistics';

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildHistogramSvg(values: number[], title: string): string {
  const bins = computeHistogram(values, 10);
  if (bins.length === 0) return '';
  const w = 520;
  const h = 200;
  const padL = 42;
  const padR = 16;
  const padT = 28;
  const padB = 42;
  const innerW = w - padL - padR;
  const innerH = h - padT - padB;
  const maxCount = Math.max(...bins.map((b) => b.count), 1);
  const barW = innerW / bins.length;

  const bars = bins
    .map((b, idx) => {
      const barH = (b.count / maxCount) * innerH;
      const x = padL + idx * barW + 2;
      const y = padT + innerH - barH;
      return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${Math.max(4, barW - 4).toFixed(1)}" height="${barH.toFixed(1)}" fill="#1d4ed8" opacity="0.88" rx="2" />
      <text x="${(x + (barW - 4) / 2).toFixed(1)}" y="${(y - 4).toFixed(1)}" text-anchor="middle" font-size="9" fill="#475569">${b.count}</text>`;
    })
    .join('');

  return `<svg viewBox="0 0 ${w} ${h}" width="100%" style="max-width:520px;background:#fff;border:1px solid #e2e8f0;border-radius:8px;">
    <text x="${padL}" y="18" font-size="11" font-weight="700" fill="#0f172a">Histograma: ${escapeHtml(title)}</text>
    <line x1="${padL}" y1="${padT + innerH}" x2="${w - padR}" y2="${padT + innerH}" stroke="#cbd5e1" />
    <line x1="${padL}" y1="${padT}" x2="${padL}" y2="${padT + innerH}" stroke="#cbd5e1" />
    ${bars}
  </svg>`;
}

function buildTimeSeriesSvg(
  rows: DataRow[],
  timeCol: string,
  seriesCols: string[],
  unit: BusinessContext['unit']
): string {
  const ordered = sortRowsByTime(rows, timeCol);
  if (ordered.length < 2 || seriesCols.length === 0) return '';
  const palette = ['#1d4ed8', '#0d9488', '#d97706', '#e11d48', '#4338ca'];
  const w = 780;
  const h = 260;
  const padL = 72;
  const padR = 24;
  const padT = 32;
  const padB = 46;
  const innerW = w - padL - padR;
  const innerH = h - padT - padB;

  const allVals: number[] = [];
  for (const r of ordered) {
    for (const c of seriesCols) {
      const v = r[c];
      if (typeof v === 'number' && Number.isFinite(v)) allVals.push(v);
    }
  }
  if (allVals.length === 0) return '';
  const minV = Math.min(...allVals, 0);
  const maxV = Math.max(...allVals);
  const spanV = maxV - minV || 1;
  const scaleX = (i: number) => padL + (i / Math.max(1, ordered.length - 1)) * innerW;
  const scaleY = (v: number) => padT + innerH - ((v - minV) / spanV) * innerH;

  const linesSvg = seriesCols
    .slice(0, 5)
    .map((c, ci) => {
      const color = palette[ci % palette.length];
      const pts: Array<{ x: number; y: number }> = [];
      ordered.forEach((r, idx) => {
        const v = r[c];
        if (typeof v === 'number' && Number.isFinite(v)) {
          pts.push({ x: scaleX(idx), y: scaleY(v) });
        }
      });
      if (pts.length === 0) return '';
      const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
      const dots = pts
        .map((p) => `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="3" fill="${color}" />`)
        .join('');
      return `<path d="${d}" fill="none" stroke="${color}" stroke-width="2" />${dots}`;
    })
    .join('');

  const legend = seriesCols
    .slice(0, 5)
    .map((c, ci) => {
      const color = palette[ci % palette.length];
      const x = padL + ci * 135;
      return `<rect x="${x}" y="10" width="10" height="10" fill="${color}" rx="2" />
      <text x="${x + 14}" y="19" font-size="10" fill="#334155">${escapeHtml(c)}</text>`;
    })
    .join('');

  const xTicks = [0, Math.floor(ordered.length / 2), ordered.length - 1]
    .filter((v, i, arr) => arr.indexOf(v) === i)
    .map((idx) => {
      const lbl = String(ordered[idx][timeCol] ?? '');
      return `<text x="${scaleX(idx).toFixed(1)}" y="${h - 14}" text-anchor="middle" font-size="10" fill="#64748b">${escapeHtml(lbl)}</text>`;
    })
    .join('');

  const yTicks = [minV, (minV + maxV) / 2, maxV]
    .map((v) => {
      const y = scaleY(v);
      return `<text x="${padL - 8}" y="${(y + 3).toFixed(1)}" text-anchor="end" font-size="9" fill="#64748b">${escapeHtml(formatWithUnit(v, unit, { compact: true }))}</text>`;
    })
    .join('');

  return `<svg viewBox="0 0 ${w} ${h}" width="100%" style="max-width:780px;background:#fff;border:1px solid #e2e8f0;border-radius:8px;">
    ${legend}
    <line x1="${padL}" y1="${padT + innerH}" x2="${w - padR}" y2="${padT + innerH}" stroke="#cbd5e1" />
    <line x1="${padL}" y1="${padT}" x2="${padL}" y2="${padT + innerH}" stroke="#cbd5e1" />
    ${yTicks}
    ${linesSvg}
    ${xTicks}
  </svg>`;
}

function buildCategoricalBarSvg(cat: CategoricalStats): string {
  const items = cat.frequencies.slice(0, 8);
  if (items.length === 0) return '';
  const w = 520;
  const rowH = 26;
  const padL = 135;
  const padR = 70;
  const padT = 30;
  const h = padT + items.length * rowH + 14;
  const innerW = w - padL - padR;
  const maxPct = Math.max(...items.map((i) => i.pct), 1);

  const rows = items
    .map((item, idx) => {
      const y = padT + idx * rowH;
      const bw = (item.pct / maxPct) * innerW;
      const label = item.category.length > 18 ? item.category.slice(0, 17) + '…' : item.category;
      return `<text x="${padL - 8}" y="${y + 15}" text-anchor="end" font-size="10" fill="#334155">${escapeHtml(label)}</text>
      <rect x="${padL}" y="${y + 4}" width="${Math.max(2, bw).toFixed(1)}" height="16" fill="#0f766e" rx="2" />
      <text x="${(padL + bw + 6).toFixed(1)}" y="${y + 15}" font-size="10" fill="#0f172a">${formatCOInt(item.count)} (${formatCOPercent(item.pct, 1)})</text>`;
    })
    .join('');

  return `<svg viewBox="0 0 ${w} ${h}" width="100%" style="max-width:520px;background:#fff;border:1px solid #e2e8f0;border-radius:8px;">
    <text x="14" y="18" font-size="11" font-weight="700" fill="#0f172a">Distribución: ${escapeHtml(cat.column)}</text>
    ${rows}
  </svg>`;
}

export function generateHtmlReport(params: {
  workspace: DatasetWorkspace | null;
  context: BusinessContext;
  rows: DataRow[];
  rawRows: DataRow[];
  configs: VariableConfig[];
  qualityBefore: QualityReport;
  timeCol: string | null;
  findings: ExecutiveFinding[];
  expertAnalysis: ExpertAnalysisResult | null;
  customNotes: string;
}): string {
  const {
    workspace,
    context,
    rows,
    rawRows,
    configs,
    qualityBefore,
    timeCol,
    findings,
    expertAnalysis,
    customNotes,
  } = params;

  const numericCols = configs.filter((c) => c.role === 'numeric');
  const categoricalCols = configs.filter((c) => c.role === 'categorical');
  const descStats: DescriptiveStats[] = numericCols.map((c) => computeDescriptiveStats(rows, c));
  const catStats: CategoricalStats[] = categoricalCols.map((c) => computeCategoricalStats(rows, c));
  const unit = context.unit;

  const cvs = descStats
    .filter((s) => s.cv !== null && s.cv > 0 && !s.isBinary01)
    .map((s) => s.cv as number);
  const geomCV = computeGeometricMean(cvs);

  const dateStr = new Date().toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const descRowsHtml = descStats
    .map((s) => {
      const box = computeBoxplotSummary(rows, s.column);
      const fmt = (v: number) =>
        formatWithUnit(v, unit, { isProportion01: s.isProportion01, compact: true });
      return `<tr>
        <td><strong>${escapeHtml(s.column)}</strong></td>
        <td class="num">${formatCOInt(s.n)}</td>
        <td class="num">${fmt(s.mean)}</td>
        <td class="num">${fmt(s.stdDev)}</td>
        <td class="num">${fmt(s.median)}</td>
        <td class="num">${fmt(s.trimmedMean20)}</td>
        <td class="num">${fmt(s.mad)}</td>
        <td class="num">${fmt(s.min)}</td>
        <td class="num">${fmt(s.max)}</td>
        <td class="num">${fmt(s.range)}</td>
        <td class="num">${formatCO(s.skewness, 2)}</td>
        <td class="num">${formatCO(s.kurtosis, 2)}</td>
        <td class="num">${fmt(s.se)}</td>
        <td class="num">${s.cv !== null ? formatCOPercent(s.cv, 1) : 'N/A'}</td>
        <td class="num">${formatCOInt(box.outliers.length)}</td>
      </tr>`;
    })
    .join('');

  let timeHtml = '';
  let participationHtml = '';
  if (timeCol) {
    const tsCols = numericCols.filter((c) => !c.isBinary01 && !c.isProportion01);
    const tsRows = tsCols
      .map((c) => computeTimeSeriesSummary(rows, timeCol, c.name))
      .filter((x): x is TimeSeriesMetricSummary => x !== null);

    if (tsRows.length > 0) {
      const tsTableRows = tsRows
        .map(
          (t) => `<tr>
          <td><strong>${escapeHtml(t.column)}</strong></td>
          <td>${escapeHtml(t.firstPeriodLabel)}</td>
          <td>${escapeHtml(t.peakPeriodLabel)} (${escapeHtml(formatWithUnit(t.peakValue, unit))})</td>
          <td class="num">${escapeHtml(formatWithUnit(t.lastValue, unit))}</td>
          <td class="num">${formatCOPercent(t.changeFromPeakPct, 1)}</td>
          <td class="num">${t.totalGrowthPct >= 0 ? '+' : ''}${formatCOPercent(t.totalGrowthPct, 1)}</td>
          <td class="num">${t.cagrPct !== null ? `${t.cagrPct >= 0 ? '+' : ''}${formatCOPercent(t.cagrPct, 1)}` : 'N/A'}</td>
          <td>${t.worstDropPct !== null ? `${formatCOPercent(t.worstDropPct, 1)} (${escapeHtml(t.worstDropFromLabel || '')}→${escapeHtml(t.worstDropToLabel || '')})` : 'Sin caídas'}</td>
        </tr>`
        )
        .join('');

      const { components } = detectTotalColumnAndComponents(configs);
      const chartSvg = buildTimeSeriesSvg(
        rows,
        timeCol,
        components.length > 0 ? components : tsCols.map((c) => c.name),
        unit
      );

      timeHtml = `
        <h2>Evolución temporal (Variable de tiempo: ${escapeHtml(timeCol)})</h2>
        <div style="margin-bottom:14px;">${chartSvg}</div>
        <div style="overflow-x:auto;">
          <table>
            <thead>
              <tr>
                <th>Variable</th>
                <th>Primer dato</th>
                <th>Máximo histórico</th>
                <th class="num">Valor actual</th>
                <th class="num">Vs. máximo</th>
                <th class="num">Crec. total</th>
                <th class="num">CAGR anual</th>
                <th>Mayor caída anual</th>
              </tr>
            </thead>
            <tbody>${tsTableRows}</tbody>
          </table>
        </div>`;

      if (components.length >= 2) {
        const { deltas } = computeParticipationDeltas(rows, timeCol, components);
        if (deltas.length > 0) {
          const deltaRows = deltas
            .map(
              (d) => `<tr>
              <td><strong>${escapeHtml(d.column)}</strong></td>
              <td class="num">${formatCOPercent(d.startSharePct, 1)}</td>
              <td class="num">${formatCOPercent(d.endSharePct, 1)}</td>
              <td class="num" style="font-weight:700;color:${d.deltaPP >= 0 ? '#15803d' : '#b91c1c'};">${d.deltaPP >= 0 ? '+' : ''}${formatCO(d.deltaPP, 1)} pp</td>
            </tr>`
            )
            .join('');
          participationHtml = `
            <h2>Participación porcentual (${escapeHtml(deltas[0].startPeriod)} vs. ${escapeHtml(deltas[0].endPeriod)})</h2>
            <table>
              <thead>
                <tr>
                  <th>Componente</th>
                  <th class="num">% Inicial</th>
                  <th class="num">% Final</th>
                  <th class="num">Cambio (puntos porcentuales)</th>
                </tr>
              </thead>
              <tbody>${deltaRows}</tbody>
            </table>`;
        }
      }
    }
  }

  let corrHtml = '';
  if (numericCols.length >= 2) {
    const corrCols = numericCols.slice(0, 8);
    const headerCells = corrCols
      .map((c) => `<th style="font-size:11px;">${escapeHtml(c.name)}</th>`)
      .join('');
    const bodyRows = corrCols
      .map((rCol) => {
        const cells = corrCols
          .map((cCol) => {
            if (rCol.name === cCol.name) {
              return `<td style="text-align:center;background:#eff6ff;font-weight:700;">1,00</td>`;
            }
            const pair = computeCorrelationPair(rows, rCol.name, cCol.name);
            const abs = Math.abs(pair.pearsonR);
            const bg =
              pair.pearsonR > 0.3
                ? `rgba(29, 78, 216, ${(abs * 0.28).toFixed(2)})`
                : pair.pearsonR < -0.3
                  ? `rgba(220, 38, 38, ${(abs * 0.25).toFixed(2)})`
                  : '#ffffff';
            return `<td style="text-align:center;background:${bg};font-variant-numeric:tabular-nums;">${formatCO(pair.pearsonR, 2)}</td>`;
          })
          .join('');
        return `<tr><th style="text-align:left;font-size:11px;">${escapeHtml(rCol.name)}</th>${cells}</tr>`;
      })
      .join('');
    corrHtml = `
      <h2>Matriz de correlación (Pearson r)</h2>
      <p class="note">${timeCol ? '<strong>Advertencia de serie de tiempo:</strong> dos variables que crecen o caen con los años muestran correlación alta sin que una cause la otra. ' : ''}Correlación no implica causalidad.</p>
      <div style="overflow-x:auto;">
        <table>
          <thead><tr><th>Variable</th>${headerCells}</tr></thead>
          <tbody>${bodyRows}</tbody>
        </table>
      </div>`;
  }

  let chiHtml = '';
  const chiCandidates = [
    ...categoricalCols.map((c) => c.name),
    ...descStats.filter((d) => d.isBinary01).map((d) => d.column),
  ];
  if (chiCandidates.length >= 2) {
    let bestChi: ChiSquareResult | null = null;
    for (let i = 0; i < Math.min(4, chiCandidates.length); i++) {
      for (let j = i + 1; j < Math.min(4, chiCandidates.length); j++) {
        const res = computeChiSquare(rows, chiCandidates[i], chiCandidates[j], 0, true);
        if (res.rows.length >= 2 && res.cols.length >= 2) {
          if (!bestChi || res.pValue < bestChi.pValue) bestChi = res;
        }
      }
    }
    if (bestChi) {
      chiHtml = `
        <h2>Prueba de asociación categórica (CrossTable y Chi-cuadrado)</h2>
        <p>Cruce entre <strong>${escapeHtml(bestChi.rowVar)}</strong> y <strong>${escapeHtml(bestChi.colVar)}</strong>:
        χ² = ${formatCO(bestChi.chi2, 2)}, gl = ${bestChi.df}, p-value = ${formatCOPValue(bestChi.pValue)}${bestChi.hasSmallExpectedWarning && bestChi.simulatedPValue !== null ? ` (p-value simulado = ${formatCOPValue(bestChi.simulatedPValue)})` : ''}
        (${bestChi.significant ? 'Relación estadísticamente significativa, p < 0,05' : 'Sin evidencia de relación significativa, p ≥ 0,05'}).</p>`;
    }
  }

  const chartsHtml = [
    ...numericCols
      .filter((c) => !c.isBinary01)
      .slice(0, 4)
      .map((c) => buildHistogramSvg(extractNumericValues(rows, c.name), c.name)),
    ...catStats.slice(0, 4).map((c) => buildCategoricalBarSvg(c)),
  ]
    .filter(Boolean)
    .map((svg) => `<div class="chart-box">${svg}</div>`)
    .join('');

  const findingsHtml =
    findings.length > 0
      ? `<h2>5 Hallazgos principales conectados con la pregunta de negocio</h2>
         ${findings
           .map(
             (f) => `<div class="card">
               <div class="kicker">${escapeHtml(f.metricBadge)}</div>
               <h3>${escapeHtml(f.title)}</h3>
               <p>${escapeHtml(f.summary)}</p>
               <p style="font-size:12px;color:#0f766e;"><strong>${escapeHtml(f.questionLink)}</strong></p>
             </div>`
           )
           .join('')}`
      : '';

  const expertHtml = expertAnalysis
    ? `
    <h2>Análisis experto y estrategia — Foco: ${escapeHtml(expertAnalysis.focusVariable)}</h2>
    <p><strong>Perfil diagnosticado:</strong> ${escapeHtml(expertAnalysis.profileLabel)}</p>
    ${expertAnalysis.diagnosisBlocks
      .map(
        (b) => `<div class="card">
          <div class="kicker">${escapeHtml(b.metric)}</div>
          <h3>${escapeHtml(b.title)}</h3>
          <p>${escapeHtml(b.text)}</p>
        </div>`
      )
      .join('')}
    <h3>Estrategia recomendada (5 acciones concretas)</h3>
    ${expertAnalysis.actions
      .map(
        (a, idx) => `<div class="card">
          <div class="kicker">Acción 0${idx + 1} · ${escapeHtml(a.horizon)} · KPI: ${escapeHtml(a.kpi)}</div>
          <h3>${escapeHtml(a.title)}</h3>
          <p>${escapeHtml(a.action)}</p>
        </div>`
      )
      .join('')}`
    : '';

  const rBlocksHtml = Array.from({ length: 16 }, (_, idx) => idx + 1)
    .map((stepNum) => {
      const rInfo = generateRCodeForStep({
        step: stepNum,
        workspace,
        timeCol,
        configs,
        cleaning: workspace?.cleaning || {
          missingAction: 'keep',
          impossibleAction: 'keep',
          duplicateAction: 'keep',
        },
      });
      return `<div class="r-block">
        <div class="r-title">Paso ${stepNum}: ${escapeHtml(rInfo.title)}</div>
        <pre><code>${escapeHtml(rInfo.code)}</code></pre>
      </div>`;
    })
    .join('');

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Informe Descriptivo · ${escapeHtml(context.projectTitle || 'Explorador Descriptivo de Datos')}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #0f172a; background: #f8fafc; margin: 0; padding: 32px 20px; line-height: 1.55; }
    .container { max-width: 1120px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 40px; }
    header { border-bottom: 1px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 28px; }
    .eyebrow { font-size: 12px; color: #1d4ed8; font-weight: 700; letter-spacing: 0.04em; }
    h1 { font-size: 26px; margin: 6px 0 8px; color: #0f172a; }
    h2 { font-size: 19px; margin: 30px 0 12px; color: #0f172a; border-bottom: 1px solid #f1f5f9; padding-bottom: 6px; }
    h3 { font-size: 15px; margin: 0 0 6px; color: #0f172a; }
    p { margin: 0 0 10px; color: #334155; font-size: 14px; }
    .meta { font-size: 13px; color: #64748b; }
    .kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; margin: 18px 0; }
    .kpi { border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; background: #f8fafc; }
    .kpi-label { font-size: 12px; color: #64748b; }
    .kpi-val { font-size: 18px; font-weight: 700; color: #0f172a; font-variant-numeric: tabular-nums; margin-top: 2px; }
    table { width: 100%; border-collapse: collapse; margin: 12px 0 20px; font-size: 12px; }
    th, td { border: 1px solid #e2e8f0; padding: 7px 9px; text-align: left; }
    th { background: #f8fafc; color: #334155; font-weight: 600; }
    td.num, th.num { text-align: right; font-variant-numeric: tabular-nums; }
    .charts-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(420px, 1fr)); gap: 16px; margin-top: 14px; }
    .chart-box { padding: 8px; border: 1px solid #f1f5f9; border-radius: 8px; background: #fff; }
    .card { border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 12px; background: #ffffff; }
    .kicker { font-size: 12px; font-weight: 600; color: #1d4ed8; margin-bottom: 4px; }
    .note { background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 10px 14px; font-size: 13px; color: #92400e; }
    .r-block { margin-bottom: 14px; border: 1px solid #cbd5e1; border-radius: 8px; overflow: hidden; }
    .r-title { background: #0f172a; color: #e2e8f0; font-size: 12px; font-weight: 600; padding: 8px 12px; }
    pre { margin: 0; background: #1e293b; color: #f8fafc; padding: 12px; font-size: 11.5px; overflow-x: auto; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
    @media print { body { background: #fff; padding: 0; } .container { border: none; padding: 12px; } }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div class="eyebrow">EXPLORADOR DESCRIPTIVO DE DATOS · CRISP-DM + R</div>
      <h1>${escapeHtml(context.projectTitle || 'Informe de Análisis Descriptivo de Datos')}</h1>
      <div class="meta">Base: ${escapeHtml(workspace?.shortName || 'base')} · Sector: ${escapeHtml(context.sector || 'General')} · Unidad: ${escapeHtml(UNIT_LABELS[unit])} · Fecha: ${escapeHtml(dateStr)}</div>
    </header>

    <h2>1. Contexto de negocio</h2>
    <p><strong>Pregunta de negocio:</strong> ${escapeHtml(context.question || 'No especificada')}</p>
    <p><strong>Objetivo del análisis:</strong> ${escapeHtml(context.objective || 'No especificado')}</p>

    <div class="kpi-grid">
      <div class="kpi"><div class="kpi-label">Registros iniciales</div><div class="kpi-val">${formatCOInt(rawRows.length)}</div></div>
      <div class="kpi"><div class="kpi-label">Registros activos</div><div class="kpi-val">${formatCOInt(rows.length)}</div></div>
      <div class="kpi"><div class="kpi-label">Media geométrica de CV</div><div class="kpi-val">${geomCV !== null ? formatCOPercent(geomCV, 1) : 'N/A'}</div></div>
      <div class="kpi"><div class="kpi-label">Celdas vacías iniciales</div><div class="kpi-val">${formatCOInt(qualityBefore.totalMissingCells)}</div></div>
    </div>

    <h2>2. Descriptivos completos (psych::describe + CV)</h2>
    <div style="overflow-x:auto;">
      <table>
        <thead>
          <tr>
            <th>Variable</th>
            <th class="num">n</th>
            <th class="num">Media</th>
            <th class="num">Desv.</th>
            <th class="num">Mediana</th>
            <th class="num">Recort. 20%</th>
            <th class="num">MAD</th>
            <th class="num">Mín</th>
            <th class="num">Máx</th>
            <th class="num">Rango</th>
            <th class="num">Asim.</th>
            <th class="num">Curt.</th>
            <th class="num">SE</th>
            <th class="num">CV</th>
            <th class="num">Atípicos</th>
          </tr>
        </thead>
        <tbody>${descRowsHtml}</tbody>
      </table>
    </div>

    ${timeHtml}
    ${participationHtml}

    <h2>Visualizaciones univariadas</h2>
    <div class="charts-grid">${chartsHtml}</div>

    ${corrHtml}
    ${chiHtml}
    ${findingsHtml}
    ${expertHtml}

    ${customNotes.trim() ? `<h2>Notas del equipo</h2><div class="card"><p>${escapeHtml(customNotes)}</p></div>` : ''}

    <h2>Anexo reproducible: Código R equivalente por paso</h2>
    <p>Ejecuta estas instrucciones en RStudio usando tu objeto <code>${escapeHtml(workspace?.shortName || 'base')}</code> para reproducir exactamente los cálculos:</p>
    ${rBlocksHtml}
  </div>
</body>
</html>`;
}

export function generateDescriptiveStatsCsv(
  rows: DataRow[],
  configs: VariableConfig[]
): string {
  const numericCols = configs.filter((c) => c.role === 'numeric');
  const headers = [
    'Variable',
    'n',
    'Faltantes',
    'Media',
    'Desviacion_estandar',
    'Mediana',
    'Media_recortada_20pct',
    'MAD_1_4826',
    'Minimo',
    'Maximo',
    'Rango',
    'Varianza_muestral',
    'Q1_25pct',
    'Q3_75pct',
    'IQR',
    'Asimetria',
    'Curtosis_exceso',
    'Error_estandar_se',
    'CV_porcentaje',
    'Valores_atipicos_Tukey',
  ];

  const lines = [headers.join(';')];
  for (const col of numericCols) {
    const s = computeDescriptiveStats(rows, col);
    const box = computeBoxplotSummary(rows, col.name);
    const row = [
      `"${s.column.replace(/"/g, '""')}"`,
      s.n,
      s.missing,
      formatCO(s.mean, 4),
      formatCO(s.stdDev, 4),
      formatCO(s.median, 4),
      formatCO(s.trimmedMean20, 4),
      formatCO(s.mad, 4),
      formatCO(s.min, 4),
      formatCO(s.max, 4),
      formatCO(s.range, 4),
      formatCO(s.variance, 4),
      formatCO(s.q1, 4),
      formatCO(s.q3, 4),
      formatCO(s.iqr, 4),
      formatCO(s.skewness, 4),
      formatCO(s.kurtosis, 4),
      formatCO(s.se, 4),
      s.cv !== null ? formatCO(s.cv, 2) : 'N/A',
      box.outliers.length,
    ];
    lines.push(row.join(';'));
  }

  return '\uFEFF' + lines.join('\r\n');
}

export function generateCleanedDataCsv(rows: DataRow[], columns: string[]): string {
  const escapeCsvCell = (val: unknown) => {
    if (val === null || val === undefined) return '';
    if (typeof val === 'number') return formatCOAuto(val, 4).replace(/\./g, '');
    const s = String(val);
    if (s.includes(';') || s.includes('"') || s.includes('\n')) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };
  const header = columns.map((c) => `"${c.replace(/"/g, '""')}"`).join(';');
  const body = rows.map((r) => columns.map((c) => escapeCsvCell(r[c])).join(';'));
  return '\uFEFF' + [header, ...body].join('\r\n');
}

export function triggerFileDownload(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
