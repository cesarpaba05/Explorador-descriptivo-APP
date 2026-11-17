import type {
  BusinessContext,
  CategoricalStats,
  ChiSquareResult,
  CleaningConfig,
  CorrelationMetrics,
  DataRow,
  DescriptiveStats,
  ExecutiveFinding,
  ExpertAnalysisResult,
  ParticipationDelta,
  QualityReport,
  StrategyAction,
  TimeSeriesMetricSummary,
  TotalCheckResult,
  VariableConfig,
} from '../types/data';
import {
  formatCO,
  formatCOInt,
  formatCOPercent,
  formatCOPValue,
  formatWithUnit,
} from './formatters';
import {
  computeBoxplotSummary,
  computeCategoricalStats,
  computeChiSquare,
  computeCorrelationPair,
  computeDescriptiveStats,
  computeGeometricMean,
  computeParticipationDeltas,
  computeQQPlot,
  computeTimeSeriesSummary,
  detectTotalColumnAndComponents,
  extractNumericValues,
} from './statistics';

export function buildStepFinding(params: {
  step: number;
  context: BusinessContext;
  rows: DataRow[];
  rawRows: DataRow[];
  configs: VariableConfig[];
  qualityBefore: QualityReport;
  qualityAfter: QualityReport;
  cleaning: CleaningConfig;
  descStats: DescriptiveStats[];
  catStats: CategoricalStats[];
  timeCol: string | null;
  selectedNumVar?: string;
  selectedCatVar?: string;
  totalCheck?: TotalCheckResult | null;
  timeSummaries?: TimeSeriesMetricSummary[];
  participationDeltas?: ParticipationDelta[];
  corrMatrixPairs?: CorrelationMetrics[];
  activeChiSquare?: ChiSquareResult | null;
  expertAnalysis?: ExpertAnalysisResult | null;
}): string {
  const {
    step,
    context,
    rows,
    rawRows,
    configs,
    qualityBefore,
    qualityAfter,
    cleaning,
    descStats,
    catStats,
    timeCol,
    selectedNumVar,
    selectedCatVar,
    totalCheck,
    timeSummaries,
    participationDeltas,
    corrMatrixPairs,
    activeChiSquare,
    expertAnalysis,
  } = params;

  const numCount = configs.filter((c) => c.role === 'numeric').length;
  const catCount = configs.filter((c) => c.role === 'categorical').length;
  const propCols = configs.filter((c) => c.isProportion01);
  const focusDesc = descStats.find((s) => s.column === selectedNumVar) || descStats[0];

  switch (step) {
    case 1:
      if (!context.question.trim()) {
        return 'El objetivo de este paso es entender qué pregunta de negocio queremos responder y conocer primero los datos antes de sacar conclusiones apresuradas.';
      }
      return `Enfoque definido para ${context.sector || 'el negocio'} (cifras en ${context.unit}): exploraremos los datos antes de concluir para responder «${context.question.trim()}».`;

    case 2:
      return `Se cargaron ${formatCOInt(rawRows.length)} filas y ${formatCOInt(configs.length)} variables directamente en el navegador sobre una copia segura en memoria, sin modificar el archivo original.`;

    case 3:
      return `Vista previa verificada (head): ${formatCOInt(rows.length)} filas × ${formatCOInt(configs.length)} columnas (${timeCol ? `serie cronológica por "${timeCol}"` : 'base de individuos o registros'}).`;

    case 4: {
      const factorSuggestions = configs.filter((c) => c.suggestFactor && c.role === 'numeric').length;
      const propNote =
        propCols.length > 0
          ? ` Hay ${formatCOInt(propCols.length)} proporción(es) (0–1) mostradas en %.`
          : '';
      return `Estructura (str/class): ${formatCOInt(numCount)} numéricas, ${formatCOInt(catCount)} categóricas${timeCol ? ' y 1 de tiempo' : ''}.${factorSuggestions > 0 ? ` Hay ${formatCOInt(factorSuggestions)} variable(s) tipo código/binaria que conviene tratar como factor.` : ''}${propNote}`;
    }

    case 5: {
      const totalNote = totalCheck
        ? totalCheck.isExactMatch
          ? ` Además, "${totalCheck.totalColumn}" cuadra exactamente con la suma de sus componentes.`
          : ` Atención: "${totalCheck.totalColumn}" difiere de la suma en ${formatCOInt(totalCheck.mismatchRows)} filas.`
        : '';
      if (
        qualityBefore.totalMissingCells === 0 &&
        qualityBefore.totalImpossibleCells === 0 &&
        qualityBefore.duplicateRows === 0
      ) {
        return `Base íntegra en ${formatCOInt(rows.length)} filas: cero faltantes, cero negativos imposibles y cero duplicados.${totalNote}`;
      }
      if (timeCol && cleaning.missingAction === 'keep') {
        return `En esta serie de tiempo hay ${formatCOInt(qualityBefore.totalMissingCells)} celdas vacías. Con na.rm = TRUE se conservan sin rellenar para no inventar mediciones históricas; quedan ${formatCOInt(qualityAfter.totalRows)} filas activas.${totalNote}`;
      }
      return `Auditoría: ${formatCOInt(qualityBefore.totalMissingCells)} faltantes, ${formatCOInt(qualityBefore.totalImpossibleCells)} negativos imposibles y ${formatCOInt(qualityBefore.duplicateRows)} duplicados iniciales. Quedan ${formatCOInt(qualityAfter.totalRows)} filas activas.${totalNote}`;
    }

    case 6: {
      if (!focusDesc) return 'No hay variables numéricas para resumir con summary().';
      return `Resumen general (summary): para "${focusDesc.column}", el 50% central va de ${formatWithUnit(focusDesc.q1, context.unit, { isProportion01: focusDesc.isProportion01 })} (Q1) a ${formatWithUnit(focusDesc.q3, context.unit, { isProportion01: focusDesc.isProportion01 })} (Q3), con mínimo en ${formatWithUnit(focusDesc.min, context.unit, { isProportion01: focusDesc.isProportion01 })} y máximo en ${formatWithUnit(focusDesc.max, context.unit, { isProportion01: focusDesc.isProportion01 })}.`;
    }

    case 7: {
      if (!focusDesc) return 'Selecciona una variable numérica.';
      if (focusDesc.skewMeanMedianAlert) {
        return `En "${focusDesc.column}", la media (${formatWithUnit(focusDesc.mean, context.unit, { isProportion01: focusDesc.isProportion01 })}) supera a la mediana (${formatWithUnit(focusDesc.median, context.unit, { isProportion01: focusDesc.isProportion01 })}) porque unos pocos registros muy altos jalan el promedio; la media recortada al 20% (${formatWithUnit(focusDesc.trimmedMean20, context.unit, { isProportion01: focusDesc.isProportion01 })}) refleja mejor el nivel típico.`;
      }
      return `En "${focusDesc.column}", media (${formatWithUnit(focusDesc.mean, context.unit, { isProportion01: focusDesc.isProportion01 })}) y mediana (${formatWithUnit(focusDesc.median, context.unit, { isProportion01: focusDesc.isProportion01 })}) están alineadas, por lo que el promedio describe bien el centro.`;
    }

    case 8: {
      const validCVs = descStats.filter((s) => s.cv !== null && !s.isBinary01);
      if (validCVs.length === 0) return 'No hay suficientes variables para comparar dispersión.';
      const sortedByCV = [...validCVs].sort((a, b) => (b.cv ?? 0) - (a.cv ?? 0));
      const highest = sortedByCV[0];
      const lowest = sortedByCV[sortedByCV.length - 1];
      return `Comparando todas las columnas (apply CV): "${highest.column}" es la variable más volátil (CV = ${formatCOPercent(highest.cv, 1)}), mientras "${lowest.column}" es la más estable (CV = ${formatCOPercent(lowest.cv, 1)}).`;
    }

    case 9: {
      const cvs = descStats
        .filter((s) => s.cv !== null && s.cv > 0 && !s.isBinary01)
        .map((s) => s.cv as number);
      const geomCV = computeGeometricMean(cvs);
      const highSkew = descStats.filter((s) => s.suggestLogTransform);
      return `Tabla describe() lista sobre datos válidos. La media geométrica de los CV es ${geomCV !== null ? formatCOPercent(geomCV, 1) : 'N/A'}. ${highSkew.length > 0 ? `Se sugiere transformación logarítmica en ${highSkew.map((h) => h.column).join(', ')} por alta asimetría.` : 'Las asimetrías se mantienen en rangos manejables.'}`;
    }

    case 10: {
      if (!focusDesc) return 'No hay variables numéricas para calcular cuantiles.';
      const vals = extractNumericValues(rows, focusDesc.column);
      const sorted = [...vals].sort((a, b) => a - b);
      const p90 = sorted.length > 0 ? sorted[Math.floor(0.9 * (sorted.length - 1))] : focusDesc.max;
      return `En "${focusDesc.column}", el 75% de los registros es igual o menor a ${formatWithUnit(focusDesc.q3, context.unit, { isProportion01: focusDesc.isProportion01 })} y el 90% llega hasta ${formatWithUnit(p90, context.unit, { isProportion01: focusDesc.isProportion01 })}, frente a un máximo de ${formatWithUnit(focusDesc.max, context.unit, { isProportion01: focusDesc.isProportion01 })}.`;
    }

    case 11: {
      if (!focusDesc) return 'No hay variables numéricas para graficar.';
      const box = computeBoxplotSummary(rows, focusDesc.column);
      const qq = computeQQPlot(extractNumericValues(rows, focusDesc.column));
      return `"${focusDesc.column}" presenta ${formatCOInt(box.outliers.length)} punto(s) atípico(s) en rojo fuera de los bigotes y en el gráfico Q-Q resulta: ${qq.normalityLabel.toLowerCase()}.`;
    }

    case 12: {
      if (!timeCol || !timeSummaries || timeSummaries.length === 0) {
        return 'Esta base no tiene una variable de tiempo asignada; los gráficos temporales aplican cuando existe una columna de año, mes o fecha.';
      }
      const best = [...timeSummaries].sort((a, b) => b.totalGrowthPct - a.totalGrowthPct)[0];
      const partNote =
        participationDeltas && participationDeltas.length > 0
          ? ` En participación, "${participationDeltas[0].column}" lidera con ${participationDeltas[0].deltaPP >= 0 ? '+' : ''}${formatCO(participationDeltas[0].deltaPP, 1)} pp.`
          : '';
      return `"${best.column}" lidera la evolución temporal (${best.totalGrowthPct >= 0 ? '+' : ''}${formatCOPercent(best.totalGrowthPct, 1)}, CAGR ${best.cagrPct !== null ? formatCOPercent(best.cagrPct, 1) : 'N/A'}).${partNote}`;
    }

    case 13: {
      const target = catStats.find((c) => c.column === selectedCatVar) || catStats[0];
      if (!target) {
        return 'No hay variables categóricas clasificadas en esta base. Si tienes códigos numéricos o variables 0/1, puedes convertirlas a Categórica (factor) en el Paso 4.';
      }
      return `En "${target.column}", la categoría dominante es "${target.topCategory}" con el ${formatCOPercent(target.topPct, 1)} de los casos válidos.`;
    }

    case 14: {
      const topPair =
        corrMatrixPairs && corrMatrixPairs.length > 0
          ? [...corrMatrixPairs].sort((a, b) => Math.abs(b.pearsonR) - Math.abs(a.pearsonR))[0]
          : null;
      const chiPart = activeChiSquare
        ? ` En el cruce categórico "${activeChiSquare.rowVar} × ${activeChiSquare.colVar}", p = ${formatCOPValue(activeChiSquare.simulatedPValue ?? activeChiSquare.pValue)} (${activeChiSquare.significant ? 'asociación significativa' : 'sin asociación significativa'}).`
        : '';
      if (!topPair) {
        return `Explora las relaciones bivariadas según el tipo de cada par.${chiPart}`;
      }
      return `El par numérico más correlacionado es "${topPair.x}" con "${topPair.y}" (r = ${formatCO(topPair.pearsonR, 2)}).${timeCol ? ' En series temporales, recuerda que dos tendencias comunes no implican causalidad.' : ' Recuerda que correlación no implica causalidad.'}${chiPart}`;
    }

    case 15:
      if (!expertAnalysis) return 'Elige una variable foco para generar el diagnóstico experto y las 5 acciones.';
      return `Diagnóstico experto para "${expertAnalysis.focusVariable}" (${expertAnalysis.profileLabel}) con plan estratégico de ${formatCOInt(expertAnalysis.actions.length)} acciones concretas.`;

    default:
      return 'Los 5 hallazgos principales, el informe HTML completo (con código R equivalente) y el CSV de descriptivos están listos para descargar.';
  }
}

export function generateExpertAnalysis(params: {
  focusVar: string;
  context: BusinessContext;
  rows: DataRow[];
  configs: VariableConfig[];
  timeCol: string | null;
}): ExpertAnalysisResult | null {
  const { focusVar, context, rows, configs, timeCol } = params;
  const numericCols = configs.filter((c) => c.role === 'numeric');
  const focusCfg = numericCols.find((c) => c.name === focusVar) || numericCols[0];
  if (!focusCfg) return null;

  const focusStats = computeDescriptiveStats(rows, focusCfg);
  const allStats = numericCols.map((c) => computeDescriptiveStats(rows, c));
  const unit = context.unit;
  const fmt = (v: number) =>
    formatWithUnit(v, unit, { isProportion01: focusCfg.isProportion01 });

  const diagnosisBlocks: ExpertAnalysisResult['diagnosisBlocks'] = [];
  const actions: StrategyAction[] = [];

  if (timeCol) {
    const { totalCol, components } = detectTotalColumnAndComponents(configs);
    const tsFocus = computeTimeSeriesSummary(rows, timeCol, focusCfg.name);
    const allTs = components
      .map((c) => computeTimeSeriesSummary(rows, timeCol, c))
      .filter((x): x is TimeSeriesMetricSummary => x !== null);
    const { deltas } = computeParticipationDeltas(rows, timeCol, components);
    const focusDelta = deltas.find((d) => d.column === focusCfg.name);
    const topGrower = [...allTs].sort((a, b) => b.totalGrowthPct - a.totalGrowthPct)[0];
    const topWinnerShare = deltas[0];

    const isGrowing = (tsFocus?.totalGrowthPct ?? 0) > 15;
    const isLosingShare = focusDelta ? focusDelta.deltaPP < -1 : false;
    const isDeclining =
      (tsFocus?.totalGrowthPct ?? 0) < -5 || (tsFocus?.changeFromPeakPct ?? 0) < -10;

    const profileLabel =
      isGrowing && !isLosingShare
        ? 'Motor en expansión'
        : isLosingShare || isDeclining
          ? 'Canal maduro bajo presión competitiva'
          : 'Canal estable de consolidación';

    if (tsFocus) {
      diagnosisBlocks.push({
        title: '1. Tendencia histórica y distancia frente al pico',
        metric: `Crecimiento total ${tsFocus.totalGrowthPct >= 0 ? '+' : ''}${formatCOPercent(tsFocus.totalGrowthPct, 1)} · CAGR ${tsFocus.cagrPct !== null ? formatCOPercent(tsFocus.cagrPct, 1) : 'N/A'}`,
        text: `Entre ${tsFocus.firstPeriodLabel} (${fmt(tsFocus.firstValue)}) y ${tsFocus.lastPeriodLabel} (${fmt(tsFocus.lastValue)}), "${focusCfg.name}" alcanzó su máximo en ${tsFocus.peakPeriodLabel} (${fmt(tsFocus.peakValue)}). Hoy se ubica un ${formatCOPercent(Math.abs(tsFocus.changeFromPeakPct), 1)} ${tsFocus.changeFromPeakPct < 0 ? 'por debajo' : 'por encima'} de ese techo histórico.`,
      });
    }

    if (focusDelta) {
      diagnosisBlocks.push({
        title: '2. Participación dentro del mercado total',
        metric: `${formatCOPercent(focusDelta.startSharePct, 1)} → ${formatCOPercent(focusDelta.endSharePct, 1)} (${focusDelta.deltaPP >= 0 ? '+' : ''}${formatCO(focusDelta.deltaPP, 1)} pp)`,
        text:
          focusDelta.deltaPP < -0.5
            ? `"${focusCfg.name}" perdió ${formatCO(Math.abs(focusDelta.deltaPP), 1)} puntos porcentuales entre ${focusDelta.startPeriod} y ${focusDelta.endPeriod}${topWinnerShare && topWinnerShare.column !== focusCfg.name ? `, mientras "${topWinnerShare.column}" ganó ${formatCO(topWinnerShare.deltaPP, 1)} pp hasta capturar el ${formatCOPercent(topWinnerShare.endSharePct, 1)} del total` : ''}.`
            : `"${focusCfg.name}" ganó ${formatCO(focusDelta.deltaPP, 1)} puntos porcentuales, consolidando el ${formatCOPercent(focusDelta.endSharePct, 1)} del total.`,
      });
    }

    diagnosisBlocks.push({
      title: '3. Volatilidad y estabilidad',
      metric: `CV = ${focusStats.cv !== null ? formatCOPercent(focusStats.cv, 1) : 'N/A'} · MAD = ${fmt(focusStats.mad)}`,
      text: `Con una desviación estándar de ${fmt(focusStats.stdDev)} y un IQR de ${fmt(focusStats.iqr)}, "${focusCfg.name}" muestra ${focusStats.cvStatus.label.toLowerCase()}. ${tsFocus && tsFocus.worstDropPct !== null && tsFocus.worstDropPct < 0 ? `Su mayor caída interanual fue de ${formatCOPercent(tsFocus.worstDropPct, 1)} entre ${tsFocus.worstDropFromLabel} y ${tsFocus.worstDropToLabel}.` : 'Sin caídas interanuales bruscas.'}`,
    });

    if (tsFocus && tsFocus.crisis2020ChangePct !== null) {
      diagnosisBlocks.push({
        title: '4. Comportamiento ante el choque de 2020',
        metric: `Variación 2019 → 2020: ${tsFocus.crisis2020ChangePct >= 0 ? '+' : ''}${formatCOPercent(tsFocus.crisis2020ChangePct, 1)}`,
        text:
          tsFocus.crisis2020ChangePct < 0
            ? `Durante 2020 retrocedió ${formatCOPercent(Math.abs(tsFocus.crisis2020ChangePct), 1)} frente a 2019, evidenciando sensibilidad ante frenazos de actividad.`
            : `Resistió 2020 con +${formatCOPercent(tsFocus.crisis2020ChangePct, 1)}, mostrando comportamiento contracíclico.`,
      });
    }

    if (topGrower && topGrower.column !== focusCfg.name) {
      const peerCorr = computeCorrelationPair(rows, focusCfg.name, topGrower.column);
      const totalLabel = totalCol ? ` sobre "${totalCol}"` : '';
      diagnosisBlocks.push({
        title: '5. Comparación frente a las demás variables',
        metric: `Líder: ${topGrower.column} (+${formatCOPercent(topGrower.totalGrowthPct, 0)}) · r = ${formatCO(peerCorr.pearsonR, 2)}`,
        text: `Mientras "${topGrower.column}" lideró el crecimiento${totalLabel}, "${focusCfg.name}" ${isLosingShare || isDeclining ? 'creció por debajo del ritmo del mercado' : 'acompañó la expansión'}.`,
      });
    }

    const rivalName =
      topWinnerShare && topWinnerShare.column !== focusCfg.name
        ? topWinnerShare.column
        : topGrower && topGrower.column !== focusCfg.name
          ? topGrower.column
          : 'el canal digital';

    if (isLosingShare || isDeclining) {
      actions.push(
        {
          id: 'act-1',
          title: `Paquetes híbridos integrados con "${rivalName}"`,
          action: `Empaquetar cada pauta de "${focusCfg.name}" con extensiones medibles en "${rivalName}" (audio streaming, pauta programática o códigos QR) para retener presupuestos que migran de canal.`,
          kpi: `Frenar caída de participación (hoy ${focusDelta ? formatCOPercent(focusDelta.endSharePct, 1) : 'bajo presión'})`,
          horizon: 'Corto plazo (0–3 meses)',
        },
        {
          id: 'act-2',
          title: 'Defensa de tarifa mediante bonificaciones de alcance',
          action: `Como el nivel actual (${tsFocus ? fmt(tsFocus.lastValue) : fmt(focusStats.mean)}) está ${tsFocus ? formatCOPercent(Math.abs(tsFocus.changeFromPeakPct), 1) : ''} por debajo del pico, defender el ticket con inventario adicional en horarios valle en vez de rebajar tarifas.`,
          kpi: 'Ingreso promedio por anunciante',
          horizon: 'Corto plazo (1–3 meses)',
        },
        {
          id: 'act-3',
          title: 'Medición de respuesta directa y atribución',
          action: `Incorporar cupones únicos, enlaces cortos y encuestas de recordación para demostrar retorno directo frente a "${rivalName}".`,
          kpi: '% de campañas con reporte de conversión',
          horizon: 'Mediano plazo (3–6 meses)',
        },
        {
          id: 'act-4',
          title: 'Enfoque comercial en nichos de alta afinidad regional',
          action: `Priorizar sectores con necesidad de cobertura local, tráfico en horas pico y audiencias recurrentes donde "${focusCfg.name}" conserva ventaja.`,
          kpi: 'Tasa de renovación en cuentas clave ≥ 80%',
          horizon: 'Mediano plazo (3–9 meses)',
        },
        {
          id: 'act-5',
          title: 'Formato ágil anticrisis para pymes',
          action: `Diseñar paquetes flexibles de activación rápida y bajo ticket mínimo para amortiguar caídas bruscas ante choques económicos como el de 2020.`,
          kpi: 'Participación de nuevos anunciantes pyme',
          horizon: 'Largo plazo (6–12 meses)',
        }
      );
    } else {
      actions.push(
        {
          id: 'act-1',
          title: `Escalar autoservicio comercial sobre "${focusCfg.name}"`,
          action: `Capitalizar la tendencia (${tsFocus ? `+${formatCOPercent(tsFocus.totalGrowthPct, 0)}` : 'expansión'}) con compra automatizada para capturar demanda creciente.`,
          kpi: 'Crecimiento anual superior al total del mercado',
          horizon: 'Corto plazo (0–3 meses)',
        },
        {
          id: 'act-2',
          title: 'Monitoreo de saturación y defensa de margen',
          action: `Evitar competencia solo por volumen y diferenciar formatos premium con segmentación avanzada.`,
          kpi: 'Margen operativo por campaña',
          horizon: 'Mediano plazo (3–6 meses)',
        },
        {
          id: 'act-3',
          title: 'Venta cruzada con canales complementarios',
          action: `Combinar "${focusCfg.name}" con canales tradicionales de cobertura masiva para elevar recordación de marca.`,
          kpi: 'Ticket promedio de paquetes multicanal',
          horizon: 'Mediano plazo (3–6 meses)',
        },
        {
          id: 'act-4',
          title: 'Suavizar volatilidad mediante contratos anuales',
          action: `Estabilizar el flujo (CV = ${focusStats.cv !== null ? formatCOPercent(focusStats.cv, 1) : 'N/A'}) ofreciendo incentivos por compromiso trimestral o anual.`,
          kpi: 'Ingresos recurrentes comprometidos',
          horizon: 'Mediano plazo (3–9 meses)',
        },
        {
          id: 'act-5',
          title: 'Auditoría independiente de resultados',
          action: `Publicar métricas auditadas de retorno para sostener la confianza de los grandes anunciantes.`,
          kpi: 'Retención neta de ingresos > 105%',
          horizon: 'Largo plazo (6–12 meses)',
        }
      );
    }

    return {
      focusVariable: focusCfg.name,
      isTimeSeries: true,
      profileLabel,
      headline: `Diagnóstico experto sobre "${focusCfg.name}" (${tsFocus ? `${tsFocus.firstPeriodLabel}–${tsFocus.lastPeriodLabel}` : 'serie'})`,
      diagnosisBlocks,
      actions,
    };
  }

  // Individual / client dataset diagnosis
  const box = computeBoxplotSummary(rows, focusCfg.name);
  const peerStats = allStats.filter((s) => s.column !== focusCfg.name && !s.isBinary01);
  let strongestPeer: CorrelationMetrics | null = null;
  for (const p of peerStats) {
    const pair = computeCorrelationPair(rows, focusCfg.name, p.column);
    if (!strongestPeer || Math.abs(pair.pearsonR) > Math.abs(strongestPeer.pearsonR)) {
      strongestPeer = pair;
    }
  }

  const isSkewed = focusStats.skewMeanMedianAlert || Math.abs(focusStats.skewness) > 1;
  const profileLabel = isSkewed
    ? 'Distribución asimétrica con extremos altos'
    : focusStats.cv !== null && focusStats.cv > 45
      ? 'Alta heterogeneidad entre segmentos'
      : 'Comportamiento estable y predecible';

  diagnosisBlocks.push(
    {
      title: '1. Nivel típico frente al promedio',
      metric: `Mediana ${fmt(focusStats.median)} vs. Media ${fmt(focusStats.mean)}`,
      text: isSkewed
        ? `Unos pocos valores muy altos jalan el promedio (${fmt(focusStats.mean)}) por encima del caso típico (${fmt(focusStats.median)}). La media recortada al 20% (${fmt(focusStats.trimmedMean20)}) confirma el centro real.`
        : `La media (${fmt(focusStats.mean)}) y la mediana (${fmt(focusStats.median)}) son cercanas; el promedio representa bien al conjunto.`,
    },
    {
      title: '2. Dispersión relativa y MAD',
      metric: `CV = ${focusStats.cv !== null ? formatCOPercent(focusStats.cv, 1) : 'N/A'} · MAD = ${fmt(focusStats.mad)}`,
      text: `El 50% central se concentra entre ${fmt(box.q1)} y ${fmt(box.q3)} (IQR = ${fmt(focusStats.iqr)}). El 10% superior marca la diferencia frente al grueso de la base.`,
    },
    {
      title: '3. Casos atípicos ($out)',
      metric: `${formatCOInt(box.outliers.length)} atípicos detectados`,
      text:
        box.outliers.length > 0
          ? `Se detectaron ${formatCOInt(box.outliers.length)} registros fuera de los bigotes de Tukey (hasta ${fmt(box.max)}), que requieren gestión o reglas diferenciadas.`
          : 'No se observan puntos atípicos fuera de los bigotes esperados.',
    },
    {
      title: '4. Relación principal con otras variables',
      metric: strongestPeer
        ? `Par más relacionado: ${strongestPeer.y} (r = ${formatCO(strongestPeer.pearsonR, 2)})`
        : 'Sin pares numéricos adicionales',
      text: strongestPeer
        ? `Su mayor correlación es con "${strongestPeer.y}" (R² = ${formatCOPercent(strongestPeer.rSquared * 100, 1)}, p = ${formatCOPValue(strongestPeer.pearsonP)}).`
        : 'Activa más columnas numéricas para analizar impulsores asociados.',
    }
  );

  actions.push(
    {
      id: 'ind-1',
      title: `Fijar metas y tableros sobre la mediana (${fmt(focusStats.median)})`,
      action: `Usar la mediana y los cuartiles (Q1 = ${fmt(box.q1)}, Q3 = ${fmt(box.q3)}) como referencia operativa para evitar metas infladas por extremos.`,
      kpi: 'Cumplimiento sobre mediana del segmento',
      horizon: 'Inmediato (0–1 mes)',
    },
    {
      id: 'ind-2',
      title: 'Protocolo diferenciado para el cuartil superior (> Q3)',
      action: `Gestionar de forma dedicada el 25% superior por encima de ${fmt(box.q3)}, priorizando los ${formatCOInt(box.outliers.length)} casos atípicos.`,
      kpi: 'Retención / control del segmento superior',
      horizon: 'Corto plazo (1–3 meses)',
    },
    {
      id: 'ind-3',
      title: 'Segmentar ofertas o alertas según dispersión',
      action: `Con un CV de ${focusStats.cv !== null ? formatCOPercent(focusStats.cv, 1) : 'N/A'}, crear tres bandas operativas (baja, media, alta) con reglas propias.`,
      kpi: 'Eficiencia / conversión por banda',
      horizon: 'Mediano plazo (2–4 meses)',
    },
    {
      id: 'ind-4',
      title: strongestPeer
        ? `Validar causalidad mediante piloto sobre "${strongestPeer.y}"`
        : 'Investigación de causas en campo',
      action: strongestPeer
        ? `Diseñar una prueba piloto interviniendo "${strongestPeer.y}" para comprobar si mueve realmente a "${focusCfg.name}" (hoy r = ${formatCO(strongestPeer.pearsonR, 2)}).`
        : 'Entrevistar una muestra de los casos atípicos para documentar sus causas operativas.',
      kpi: 'Diferencia medida en grupo piloto vs. control',
      horizon: 'Mediano plazo (3–6 meses)',
    },
    {
      id: 'ind-5',
      title: 'Reglas de captura limpia y seguimiento mensual',
      action: `Implementar validaciones automáticas para bloquear valores negativos imposibles o vacíos y monitorear la evolución cada mes.`,
      kpi: 'Calidad de captura ≥ 99%',
      horizon: 'Continuo',
    }
  );

  return {
    focusVariable: focusCfg.name,
    isTimeSeries: false,
    profileLabel,
    headline: `Diagnóstico experto sobre "${focusCfg.name}" (${formatCOInt(rows.length)} registros)`,
    diagnosisBlocks,
    actions,
  };
}

export function generateExecutiveSummary(params: {
  context: BusinessContext;
  rows: DataRow[];
  configs: VariableConfig[];
  qualityBefore: QualityReport;
  timeCol: string | null;
}): ExecutiveFinding[] {
  const { context, rows, configs, qualityBefore, timeCol } = params;
  const findings: ExecutiveFinding[] = [];
  const unit = context.unit;
  const qLink = context.question.trim()
    ? `Conexión con tu pregunta («${context.question.trim()}»)`
    : 'Conexión con el objetivo del negocio';

  const numericCols = configs.filter((c) => c.role === 'numeric');
  const descStats = numericCols.map((c) => computeDescriptiveStats(rows, c));
  const contStats = descStats.filter((s) => !s.isBinary01 && !s.isProportion01);

  // 1. Calidad y estructura de la base
  findings.push({
    id: 'f-1',
    title: '1. Alcance y calidad de los datos analizados',
    metricBadge: `${formatCOInt(rows.length)} filas activas · ${formatCOInt(configs.length)} variables`,
    summary: `La base cuenta con ${formatCOInt(rows.length)} registros activos (${timeCol ? `serie temporal por "${timeCol}"` : 'registros individuales'}). Inicialmente se detectaron ${formatCOInt(qualityBefore.totalMissingCells)} faltantes, ${formatCOInt(qualityBefore.totalImpossibleCells)} negativos imposibles y ${formatCOInt(qualityBefore.duplicateRows)} duplicados.`,
    questionLink: `${qLink}: garantiza que las conclusiones se apoyen en datos auditados con na.rm = TRUE.`,
  });

  // 2. Nivel típico vs promedio (skew / trimmed mean)
  const skewedVar = contStats.find((s) => s.skewMeanMedianAlert) || contStats[0];
  if (skewedVar) {
    const f = (v: number) => formatWithUnit(v, unit, { isProportion01: skewedVar.isProportion01 });
    findings.push({
      id: 'f-2',
      title: `2. Nivel típico vs. extremos en «${skewedVar.column}»`,
      metricBadge: `Mediana ${f(skewedVar.median)} vs. Media ${f(skewedVar.mean)}`,
      summary: skewedVar.skewMeanMedianAlert
        ? `Unos pocos valores muy altos elevan la media (${f(skewedVar.mean)}) por encima del valor típico real (${f(skewedVar.median)}). La media recortada al 20% (${f(skewedVar.trimmedMean20)}) confirma el centro habitual.`
        : `La mediana (${f(skewedVar.median)}) y la media (${f(skewedVar.mean)}) son consistentes, por lo que el promedio describe fielmente a la variable.`,
      questionLink: `${qLink}: evita tomar decisiones sobre promedios inflados por casos extremos.`,
    });
  }

  // 3. Dispersión comparada (CV & media geométrica)
  const cvs = contStats.filter((s) => s.cv !== null && s.cv > 0);
  if (cvs.length > 0) {
    const sortedCV = [...cvs].sort((a, b) => (b.cv ?? 0) - (a.cv ?? 0));
    const topVar = sortedCV[0];
    const geom = computeGeometricMean(cvs.map((s) => s.cv as number));
    findings.push({
      id: 'f-3',
      title: `3. Mayor variabilidad en «${topVar.column}»`,
      metricBadge: `CV máx: ${formatCOPercent(topVar.cv, 1)} · Media geom. CV: ${geom !== null ? formatCOPercent(geom, 1) : 'N/A'}`,
      summary: `Al comparar todas las variables en porcentaje (CV), "${topVar.column}" muestra la mayor dispersión (${formatCOPercent(topVar.cv, 1)})${sortedCV.length > 1 ? `, muy por encima de "${sortedCV[sortedCV.length - 1].column}" (${formatCOPercent(sortedCV[sortedCV.length - 1].cv, 1)})` : ''}.`,
      questionLink: `${qLink}: concentra las palancas de cambio en las variables que realmente varían.`,
    });
  }

  // 4. Tendencia temporal O valores atípicos / categóricas
  if (timeCol && contStats.length > 0) {
    const tsAll = contStats
      .map((c) => computeTimeSeriesSummary(rows, timeCol, c.column))
      .filter((x): x is TimeSeriesMetricSummary => x !== null);
    if (tsAll.length > 0) {
      const winner = [...tsAll].sort((a, b) => b.totalGrowthPct - a.totalGrowthPct)[0];
      const laggard = [...tsAll].sort((a, b) => a.totalGrowthPct - b.totalGrowthPct)[0];
      findings.push({
        id: 'f-4',
        title: '4. Dinámica histórica y ganadores de participación',
        metricBadge: `${winner.column}: ${winner.totalGrowthPct >= 0 ? '+' : ''}${formatCOPercent(winner.totalGrowthPct, 1)}`,
        summary: `Entre ${winner.firstPeriodLabel} y ${winner.lastPeriodLabel}, "${winner.column}" lideró la expansión (CAGR ${winner.cagrPct !== null ? formatCOPercent(winner.cagrPct, 1) : 'N/A'}), mientras "${laggard.column}" mostró el desempeño más rezagado (${laggard.totalGrowthPct >= 0 ? '+' : ''}${formatCOPercent(laggard.totalGrowthPct, 1)}).`,
        questionLink: `${qLink}: muestra dónde está creciendo el mercado y dónde se pierde terreno.`,
      });
    }
  } else {
    const catCols = configs.filter((c) => c.role === 'categorical');
    const binaryCols = descStats.filter((s) => s.isBinary01);
    if (binaryCols.length > 0) {
      const b = binaryCols[0];
      findings.push({
        id: 'f-4',
        title: `4. Tasa global del evento en «${b.column}»`,
        metricBadge: `${formatCOPercent(b.onesPercentage ?? 0, 1)} de casos «1»`,
        summary: `En la variable binaria "${b.column}", el ${formatCOPercent(b.onesPercentage ?? 0, 1)} de los registros corresponde al estado «1» (equivalente directo a su media aritmética).`,
        questionLink: `${qLink}: fija la línea base del indicador objetivo a mejorar.`,
      });
    } else if (catCols.length > 0) {
      const cs = computeCategoricalStats(rows, catCols[0]);
      findings.push({
        id: 'f-4',
        title: `4. Concentración categórica en «${cs.column}»`,
        metricBadge: `${cs.topCategory}: ${formatCOPercent(cs.topPct, 1)}`,
        summary: `La categoría "${cs.topCategory}" concentra el ${formatCOPercent(cs.topPct, 1)} de los registros válidos de "${cs.column}".`,
        questionLink: `${qLink}: ayuda a priorizar los segmentos de mayor peso.`,
      });
    }
  }

  // 5. Relación estadística principal (correlación o Chi-cuadrado)
  const catLike = configs.filter((c) => c.role === 'categorical' || c.isBinary01);
  let bestChi: ChiSquareResult | null = null;
  for (let i = 0; i < Math.min(4, catLike.length); i++) {
    for (let j = i + 1; j < Math.min(4, catLike.length); j++) {
      const res = computeChiSquare(rows, catLike[i].name, catLike[j].name, 0);
      if (res.rows.length >= 2 && res.cols.length >= 2) {
        if (!bestChi || res.pValue < bestChi.pValue) bestChi = res;
      }
    }
  }

  if (bestChi && bestChi.significant) {
    findings.push({
      id: 'f-5',
      title: `5. Asociación significativa entre «${bestChi.rowVar}» y «${bestChi.colVar}»`,
      metricBadge: `χ² = ${formatCO(bestChi.chi2, 2)} · p = ${formatCOPValue(bestChi.pValue)}`,
      summary: `La prueba Chi-cuadrado confirma que la distribución de "${bestChi.colVar}" cambia de forma real según "${bestChi.rowVar}" (V de Cramér = ${formatCO(bestChi.cramersV, 2)}).`,
      questionLink: `${qLink}: señala qué segmentos concentran el resultado observado.`,
    });
  } else if (numericCols.length >= 2) {
    let bestCorr: CorrelationMetrics | null = null;
    for (let i = 0; i < Math.min(6, numericCols.length); i++) {
      for (let j = i + 1; j < Math.min(6, numericCols.length); j++) {
        const pair = computeCorrelationPair(rows, numericCols[i].name, numericCols[j].name);
        if (!bestCorr || Math.abs(pair.pearsonR) > Math.abs(bestCorr.pearsonR)) {
          bestCorr = pair;
        }
      }
    }
    if (bestCorr) {
      findings.push({
        id: 'f-5',
        title: `5. Relación principal: «${bestCorr.x}» y «${bestCorr.y}»`,
        metricBadge: `r = ${formatCO(bestCorr.pearsonR, 2)} · R² = ${formatCOPercent(bestCorr.rSquared * 100, 1)}`,
        summary: `Son las dos variables con mayor movimiento conjunto. ${timeCol ? 'Recuerda validar si comparten tendencia temporal antes de asumir causalidad.' : 'Recuerda validar causalidad con una prueba piloto antes de escalar cambios.'}`,
        questionLink: `${qLink}: orienta qué relaciones merecen verificación práctica.`,
      });
    }
  }

  return findings.slice(0, 5);
}
