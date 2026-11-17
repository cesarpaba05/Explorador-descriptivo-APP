import { useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  ChevronDown,
  Download,
  Menu,
  Sparkles,
} from 'lucide-react';
import { DatasetSwitcherBar } from './components/DatasetSwitcherBar';
import { KeyFindingBox } from './components/KeyFindingBox';
import { RCodeBox } from './components/RCodeBox';
import { Step01Context } from './components/steps/Step01Context';
import { Step02Upload } from './components/steps/Step02Upload';
import { Step03Preview } from './components/steps/Step03Preview';
import { Step04Variables } from './components/steps/Step04Variables';
import { Step05Quality } from './components/steps/Step05Quality';
import { Step06GeneralSummary } from './components/steps/Step06GeneralSummary';
import { Step07CentralTendency } from './components/steps/Step07CentralTendency';
import { Step08Dispersion } from './components/steps/Step08Dispersion';
import { Step09Describe } from './components/steps/Step09Describe';
import { Step10Quantiles } from './components/steps/Step10Quantiles';
import { Step11UnivariateCharts } from './components/steps/Step11UnivariateCharts';
import { Step12TimeTrends } from './components/steps/Step12TimeTrends';
import { Step13Categorical } from './components/steps/Step13Categorical';
import { Step14Bivariate } from './components/steps/Step14Bivariate';
import { Step15ExpertStrategy } from './components/steps/Step15ExpertStrategy';
import { Step16FindingsExport } from './components/steps/Step16FindingsExport';
import { WizardSidebar } from './components/WizardSidebar';
import type {
  BusinessContext,
  CleaningConfig,
  DataRow,
  DatasetWorkspace,
  PresetDatasetInfo,
  VariableConfig,
  VariableRole,
  WizardStepMeta,
} from './types/data';
import {
  generateCleanedDataCsv,
  generateDescriptiveStatsCsv,
  generateHtmlReport,
  triggerFileDownload,
} from './utils/exportReports';
import {
  buildStepFinding,
  generateExecutiveSummary,
  generateExpertAnalysis,
} from './utils/insightsGenerator';
import { sanitizeRObjectName } from './utils/rCodeGenerator';
import { PRESET_DATASETS } from './utils/sampleDatasets';
import {
  applyDataCleaning,
  computeCategoricalStats,
  computeChiSquare,
  computeCorrelationPair,
  computeDescriptiveStats,
  computeParticipationDeltas,
  computeQualityReport,
  computeTimeSeriesSummary,
  detectTotalColumnAndComponents,
  detectVariables,
  verifyTotalColumn,
} from './utils/statistics';

const WIZARD_STEPS: WizardStepMeta[] = [
  {
    id: 1,
    shortTitle: 'Contexto de negocio',
    title: 'Paso 1 · Contexto de negocio y objetivo CRISP-DM',
    crispPhase: 'Entendimiento del negocio',
    description:
      'Define la pregunta, sector y unidad de cifras. El objetivo es conocer primero los datos antes de concluir.',
  },
  {
    id: 2,
    shortTitle: 'Cargar datos',
    title: 'Paso 2 · Cargar base CSV o Excel (copia segura)',
    crispPhase: 'Entendimiento de los datos',
    description:
      'Importa una o varias bases, detecta separador y decimal automáticamente y trabaja sobre una copia local.',
  },
  {
    id: 3,
    shortTitle: 'Vista previa (head)',
    title: 'Paso 3 · Vista previa de las primeras filas (head)',
    crispPhase: 'Entendimiento de los datos',
    description:
      'Revisa las primeras 3 y 5 filas junto con el total de observaciones y columnas de la base.',
  },
  {
    id: 4,
    shortTitle: 'Tipos (str / class)',
    title: 'Paso 4 · Tipos de variables (Entero, Decimal, Factor, Tiempo)',
    crispPhase: 'Entendimiento de los datos',
    description:
      'Ajusta manualmente numéricas, categóricas (factor), tiempo y proporciones entre 0 y 1.',
  },
  {
    id: 5,
    shortTitle: 'Calidad de datos',
    title: 'Paso 5 · Auditoría de calidad, fila exacta y cuadre de totales',
    crispPhase: 'Preparación de datos',
    description:
      'Detecta faltantes, valores imposibles por número de fila, duplicados y corrige celdas puntuales.',
  },
  {
    id: 6,
    shortTitle: 'Resumen (summary)',
    title: 'Paso 6 · Resumen general (summary) y gráfico de puntos',
    crispPhase: 'Análisis descriptivo',
    description:
      'Inspecciona mínimo, cuartiles, mediana, media, máximo y NAs, más el gráfico de puntos por registro.',
  },
  {
    id: 7,
    shortTitle: 'Tendencia central',
    title: 'Paso 7 · Media, Mediana, Moda y Media recortada al 20%',
    crispPhase: 'Análisis descriptivo',
    description:
      'Identifica el centro típico de cada variable y recibe alertas cuando extremos altos jalan el promedio.',
  },
  {
    id: 8,
    shortTitle: 'Dispersión y CV',
    title: 'Paso 8 · Varianza, Desviación, IQR, MAD y CV comparado',
    crispPhase: 'Análisis descriptivo',
    description:
      'Mide la dispersión de una variable y compara el Coeficiente de Variación de todas las columnas a la vez.',
  },
  {
    id: 9,
    shortTitle: 'Descriptivos (describe)',
    title: 'Paso 9 · Tabla completa psych::describe() y Media geométrica de CV',
    crispPhase: 'Análisis descriptivo',
    description:
      'Consulta en una sola tabla n, media, desviación, mediana, recortada, MAD, asimetría, curtosis, error estándar y CV.',
  },
  {
    id: 10,
    shortTitle: 'Cuantiles (quantile)',
    title: 'Paso 10 · Cuartiles y percentiles personalizados',
    crispPhase: 'Análisis descriptivo',
    description:
      'Calcula percentiles a medida para una variable y para toda la base numérica con lectura de negocio.',
  },
  {
    id: 11,
    shortTitle: 'Gráficos univariados',
    title: 'Paso 11 · Histograma, Boxplot ($out) y Gráfico Q-Q Normal',
    crispPhase: 'Análisis descriptivo',
    description:
      'Evalúa la distribución visualmente, lista los valores atípicos en rojo y verifica normalidad en Q-Q.',
  },
  {
    id: 12,
    shortTitle: 'Tendencias en el tiempo',
    title: 'Paso 12 · Evolución histórica, CAGR y participación al 100%',
    crispPhase: 'Análisis descriptivo',
    description:
      'Analiza crecimiento acumulado, caídas anuales y ganadores o perdedores de participación en series temporales.',
  },
  {
    id: 13,
    shortTitle: 'Variables categóricas',
    title: 'Paso 13 · Frecuencias (table) y proporciones (prop.table)',
    crispPhase: 'Análisis descriptivo',
    description:
      'Tabula categorías de mayor a menor frecuencia y explica por qué en variables 0/1 la media equivale al % de «1».',
  },
  {
    id: 14,
    shortTitle: 'Cruces bivariados',
    title: 'Paso 14 · Cruces de dos variables (Dispersión, Boxplot, CrossTable y Mosaico)',
    crispPhase: 'Análisis descriptivo',
    description:
      'Cruza pares numéricos, numérica por grupo categórico y categóricas con Chi-cuadrado y gráfico de mosaico.',
  },
  {
    id: 15,
    shortTitle: 'Análisis experto',
    title: 'Paso 15 · Análisis experto y estrategia de negocio',
    crispPhase: 'Estrategia y entrega',
    description:
      'Elige tu variable foco para obtener un diagnóstico integral y un plan con 5 acciones concretas.',
  },
  {
    id: 16,
    shortTitle: 'Hallazgos y exportar',
    title: 'Paso 16 · 5 hallazgos principales, notas y exportación reproducible',
    crispPhase: 'Estrategia y entrega',
    description:
      'Resume los 5 hallazgos conectados con tu pregunta inicial y descarga el informe HTML con el código R.',
  },
];

const DEFAULT_CLEANING: CleaningConfig = {
  missingAction: 'keep',
  impossibleAction: 'keep',
  duplicateAction: 'keep',
};

const EMPTY_CONTEXT: BusinessContext = {
  projectTitle: '',
  sector: '',
  question: '',
  objective: '',
  unit: 'unidades',
};

function createWorkspaceFromRows(params: {
  id: string;
  shortName: string;
  fileName: string;
  sourceKind: 'csv' | 'excel' | 'preset';
  delimiterUsed?: ',' | ';' | '\t';
  decimalUsed: 'dot' | 'comma';
  context: BusinessContext;
  rawRows: DataRow[];
  columns: string[];
}): DatasetWorkspace {
  const { configs, normalizedRows } = detectVariables(
    params.rawRows,
    params.columns,
    params.decimalUsed
  );
  const numCols = configs.filter((c) => c.role === 'numeric');
  const contCols = numCols.filter((c) => !c.isBinary01 && !c.isProportion01);
  const catLikeCols = configs.filter((c) => c.role === 'categorical' || c.isBinary01);
  const { totalCol, components } = detectTotalColumnAndComponents(configs);

  const defaultNum = contCols[0]?.name || numCols[0]?.name || '';
  const secondNum = contCols[1]?.name || numCols[1]?.name || defaultNum;
  const defaultCat = catLikeCols[0]?.name || '';
  const secondCat = catLikeCols[1]?.name || defaultCat;

  return {
    id: params.id,
    shortName: sanitizeRObjectName(params.shortName),
    fileName: params.fileName,
    sourceKind: params.sourceKind,
    delimiterUsed: params.delimiterUsed,
    decimalUsed: params.decimalUsed,
    context: params.context,
    rawRows: normalizedRows,
    variableConfigs: configs,
    cleaning: { ...DEFAULT_CLEANING },
    selectedNumVar: defaultNum,
    selectedCatVar: defaultCat,
    scatterX: defaultNum,
    scatterY: secondNum,
    groupNumVar: defaultNum,
    groupCatVar: defaultCat,
    chiRowVar: defaultCat,
    chiColVar: secondCat,
    chiInterestColCategory: '',
    groupMinorThreshold: 0,
    totalCol,
    totalCheckComponents: components,
    participationComponents: components.slice(0, 7),
    focusVar:
      configs.find((c) => c.name.toLowerCase() === 'radio')?.name || defaultNum,
    customPercentiles: [10, 45, 90],
    customNotes: '',
  };
}

function createInitialBundleState(): {
  workspaces: DatasetWorkspace[];
  activeWorkspaceId: string | null;
} {
  const defaultPreset =
    PRESET_DATASETS.find((p) => p.id === 'taller_clase2') || PRESET_DATASETS[0];
  if (!defaultPreset?.bundleDatasets || defaultPreset.bundleDatasets.length === 0) {
    return { workspaces: [], activeWorkspaceId: null };
  }
  const now = Date.now();
  const initialWorkspaces = defaultPreset.bundleDatasets.map((item, index) => {
    const rows = item.generate();
    const cols = rows.length > 0 ? Object.keys(rows[0]) : [];
    return createWorkspaceFromRows({
      id: `ws-${now}-${index}-${item.presetId}`,
      shortName: item.shortName,
      fileName: item.fileName,
      sourceKind: item.sourceKind,
      delimiterUsed: item.delimiterUsed,
      decimalUsed: item.decimalUsed,
      context: { ...item.context },
      rawRows: rows,
      columns: cols,
    });
  });
  const telcoWs =
    initialWorkspaces.find((w) => w.shortName === 'telco') ||
    initialWorkspaces[0] ||
    null;
  return {
    workspaces: initialWorkspaces,
    activeWorkspaceId: telcoWs ? telcoWs.id : null,
  };
}

export default function App() {
  const [initialBundle] = useState(createInitialBundleState);
  const [currentStep, setCurrentStep] = useState(1);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [presetMenuOpen, setPresetMenuOpen] = useState(false);

  const [workspaces, setWorkspaces] = useState<DatasetWorkspace[]>(
    initialBundle.workspaces
  );
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(
    initialBundle.activeWorkspaceId
  );
  const [draftContext, setDraftContext] = useState<BusinessContext>(EMPTY_CONTEXT);
  const [draftShortName, setDraftShortName] = useState('base');

  const activeWorkspace = useMemo(
    () => workspaces.find((w) => w.id === activeWorkspaceId) || workspaces[0] || null,
    [workspaces, activeWorkspaceId]
  );

  const hasData = Boolean(activeWorkspace && activeWorkspace.rawRows.length > 0);
  const activeContext = activeWorkspace ? activeWorkspace.context : draftContext;
  const activeShortName = activeWorkspace ? activeWorkspace.shortName : draftShortName;
  const configs = activeWorkspace ? activeWorkspace.variableConfigs : [];
  const cleaning = activeWorkspace ? activeWorkspace.cleaning : DEFAULT_CLEANING;
  const rawRows = activeWorkspace ? activeWorkspace.rawRows : [];

  const updateActiveWorkspace = (
    updater: (ws: DatasetWorkspace) => DatasetWorkspace
  ) => {
    if (!activeWorkspace) return;
    setWorkspaces((prev) =>
      prev.map((ws) => (ws.id === activeWorkspace.id ? updater(ws) : ws))
    );
  };

  const handleLoadPreset = (preset: PresetDatasetInfo) => {
    setPresetMenuOpen(false);
    if (preset.bundleDatasets && preset.bundleDatasets.length > 0) {
      const created: DatasetWorkspace[] = [];
      const resolvedIds: Array<{ shortName: string; id: string }> = [];
      const now = Date.now();

      preset.bundleDatasets.forEach((item, index) => {
        const existingItem = workspaces.find(
          (w) => w.context.presetId === item.presetId
        );
        if (existingItem) {
          resolvedIds.push({ shortName: existingItem.shortName, id: existingItem.id });
          return;
        }
        const rows = item.generate();
        const cols = rows.length > 0 ? Object.keys(rows[0]) : [];
        const newWs = createWorkspaceFromRows({
          id: `ws-${now}-${index}-${item.presetId}`,
          shortName: item.shortName,
          fileName: item.fileName,
          sourceKind: item.sourceKind,
          delimiterUsed: item.delimiterUsed,
          decimalUsed: item.decimalUsed,
          context: { ...item.context },
          rawRows: rows,
          columns: cols,
        });
        created.push(newWs);
        resolvedIds.push({ shortName: newWs.shortName, id: newWs.id });
      });

      if (created.length > 0) {
        setWorkspaces((prev) => [...prev, ...created]);
      }
      const preferred =
        resolvedIds.find((r) => r.shortName === 'telco') || resolvedIds[0];
      if (preferred) {
        setActiveWorkspaceId(preferred.id);
      }
      return;
    }

    const existing = workspaces.find(
      (w) => w.sourceKind === 'preset' && w.context.presetId === preset.id
    );
    if (existing) {
      setActiveWorkspaceId(existing.id);
      return;
    }
    const rows = preset.generate();
    const cols = rows.length > 0 ? Object.keys(rows[0]) : [];
    const newWs = createWorkspaceFromRows({
      id: `ws-${Date.now()}-${preset.id}`,
      shortName: preset.shortName,
      fileName: `${preset.shortName}.csv`,
      sourceKind: 'preset',
      delimiterUsed: ';',
      decimalUsed: 'comma',
      context: { ...preset.context },
      rawRows: rows,
      columns: cols,
    });
    setWorkspaces((prev) => [...prev, newWs]);
    setActiveWorkspaceId(newWs.id);
  };

  const handleDatasetLoaded = (payload: {
    rows: DataRow[];
    columns: string[];
    fileName: string;
    shortName: string;
    sourceKind: 'csv' | 'excel';
    delimiterUsed?: ',' | ';' | '\t';
    decimal: 'dot' | 'comma';
    detectedInfo: string;
    addAsNew: boolean;
  }) => {
    const baseContext: BusinessContext = activeWorkspace
      ? {
          ...activeWorkspace.context,
          presetId: undefined,
          projectTitle:
            activeWorkspace.context.projectTitle ||
            payload.fileName.replace(/\.[^.]+$/, ''),
        }
      : {
          ...draftContext,
          presetId: undefined,
          projectTitle:
            draftContext.projectTitle || payload.fileName.replace(/\.[^.]+$/, ''),
        };

    const newWs = createWorkspaceFromRows({
      id: `ws-${Date.now()}`,
      shortName: payload.shortName,
      fileName: payload.fileName,
      sourceKind: payload.sourceKind,
      delimiterUsed: payload.delimiterUsed,
      decimalUsed: payload.decimal,
      context: baseContext,
      rawRows: payload.rows,
      columns: payload.columns,
    });

    if (payload.addAsNew || !activeWorkspace) {
      setWorkspaces((prev) => [...prev, newWs]);
      setActiveWorkspaceId(newWs.id);
    } else {
      setWorkspaces((prev) =>
        prev.map((ws) => (ws.id === activeWorkspace.id ? newWs : ws))
      );
      setActiveWorkspaceId(newWs.id);
    }
  };

  const handleRenameWorkspace = (id: string, nextShortName: string) => {
    setWorkspaces((prev) =>
      prev.map((ws) =>
        ws.id === id ? { ...ws, shortName: sanitizeRObjectName(nextShortName) } : ws
      )
    );
  };

  const handleRemoveWorkspace = (id: string) => {
    setWorkspaces((prev) => {
      const filtered = prev.filter((w) => w.id !== id);
      if (activeWorkspaceId === id) {
        setActiveWorkspaceId(filtered[0]?.id || null);
      }
      return filtered;
    });
  };

  const handleChangeRole = (colName: string, role: VariableRole) => {
    updateActiveWorkspace((ws) => {
      const nextConfigs: VariableConfig[] = ws.variableConfigs.map((c) => {
        if (c.name === colName) {
          return { ...c, role };
        }
        // Only one time column at a time
        if (role === 'time' && c.role === 'time') {
          return { ...c, role: c.detectedRole === 'time' ? 'numeric' : c.detectedRole };
        }
        return c;
      });

      const numCols = nextConfigs.filter((c) => c.role === 'numeric');
      const catCols = nextConfigs.filter((c) => c.role === 'categorical' || c.isBinary01);

      return {
        ...ws,
        variableConfigs: nextConfigs,
        selectedNumVar: numCols.some((c) => c.name === ws.selectedNumVar)
          ? ws.selectedNumVar
          : numCols[0]?.name || '',
        selectedCatVar: catCols.some((c) => c.name === ws.selectedCatVar)
          ? ws.selectedCatVar
          : catCols[0]?.name || '',
        groupNumVar: numCols.some((c) => c.name === ws.groupNumVar)
          ? ws.groupNumVar
          : numCols[0]?.name || '',
        groupCatVar: catCols.some((c) => c.name === ws.groupCatVar)
          ? ws.groupCatVar
          : catCols[0]?.name || '',
        chiRowVar: catCols.some((c) => c.name === ws.chiRowVar)
          ? ws.chiRowVar
          : catCols[0]?.name || '',
        chiColVar: catCols.some((c) => c.name === ws.chiColVar)
          ? ws.chiColVar
          : catCols[1]?.name || catCols[0]?.name || '',
      };
    });
  };

  const handleToggleProportion01 = (colName: string, isProp: boolean) => {
    updateActiveWorkspace((ws) => ({
      ...ws,
      variableConfigs: ws.variableConfigs.map((c) =>
        c.name === colName ? { ...c, isProportion01: isProp } : c
      ),
    }));
  };

  const handleToggleAllowNegative = (colName: string, allowNegative: boolean) => {
    updateActiveWorkspace((ws) => ({
      ...ws,
      variableConfigs: ws.variableConfigs.map((c) =>
        c.name === colName ? { ...c, allowNegative } : c
      ),
    }));
  };

  const handleFixCellValue = (
    rowIndex1Based: number,
    column: string,
    newValue: number
  ) => {
    updateActiveWorkspace((ws) => {
      const nextRows = ws.rawRows.map((row, idx) =>
        idx === rowIndex1Based - 1 ? { ...row, [column]: newValue } : row
      );
      return { ...ws, rawRows: nextRows };
    });
  };

  // Derived statistical datasets for the active workspace
  const timeCol = useMemo(
    () => configs.find((c) => c.role === 'time')?.name || null,
    [configs]
  );

  const activeRows = useMemo(
    () => (hasData ? applyDataCleaning(rawRows, configs, cleaning) : []),
    [hasData, rawRows, configs, cleaning]
  );

  const qualityBefore = useMemo(
    () => computeQualityReport(rawRows, configs),
    [rawRows, configs]
  );

  const qualityAfter = useMemo(
    () => computeQualityReport(activeRows, configs),
    [activeRows, configs]
  );

  const totalCheck = useMemo(() => {
    if (!activeWorkspace?.totalCol || activeWorkspace.totalCheckComponents.length === 0) {
      return null;
    }
    return verifyTotalColumn(
      activeRows,
      activeWorkspace.totalCol,
      activeWorkspace.totalCheckComponents
    );
  }, [activeRows, activeWorkspace]);

  const descStats = useMemo(() => {
    const numCols = configs.filter((c) => c.role === 'numeric');
    return numCols.map((c) => computeDescriptiveStats(activeRows, c));
  }, [activeRows, configs]);

  const catStats = useMemo(() => {
    const catCols = configs.filter((c) => c.role === 'categorical' || c.isBinary01);
    return catCols.map((c) => computeCategoricalStats(activeRows, c));
  }, [activeRows, configs]);

  const timeSummaries = useMemo(() => {
    if (!timeCol) return [];
    const numCols = configs.filter(
      (c) => c.role === 'numeric' && !c.isBinary01 && !c.isProportion01
    );
    return numCols
      .map((c) => computeTimeSeriesSummary(activeRows, timeCol, c.name))
      .filter((x): x is NonNullable<typeof x> => x !== null);
  }, [activeRows, configs, timeCol]);

  const participationDeltas = useMemo(() => {
    if (!timeCol || !activeWorkspace) return [];
    const comps =
      activeWorkspace.participationComponents.length >= 2
        ? activeWorkspace.participationComponents
        : configs
            .filter(
              (c) =>
                c.role === 'numeric' &&
                !c.isBinary01 &&
                !c.isProportion01 &&
                c.name !== activeWorkspace.totalCol
            )
            .slice(0, 7)
            .map((c) => c.name);
    return computeParticipationDeltas(activeRows, timeCol, comps).deltas;
  }, [activeRows, timeCol, configs, activeWorkspace]);

  const corrMatrixPairs = useMemo(() => {
    const numCols = configs.filter((c) => c.role === 'numeric').slice(0, 6);
    const pairs = [];
    for (let i = 0; i < numCols.length; i++) {
      for (let j = i + 1; j < numCols.length; j++) {
        pairs.push(computeCorrelationPair(activeRows, numCols[i].name, numCols[j].name));
      }
    }
    return pairs;
  }, [activeRows, configs]);

  const activeChiSquare = useMemo(() => {
    if (!activeWorkspace) return null;
    const catLike = configs.filter((c) => c.role === 'categorical' || c.isBinary01);
    if (catLike.length < 2) return null;
    const rVar = activeWorkspace.chiRowVar || catLike[0].name;
    const cVar = activeWorkspace.chiColVar || catLike[1].name;
    return computeChiSquare(
      activeRows,
      rVar,
      cVar,
      activeWorkspace.groupMinorThreshold,
      true
    );
  }, [activeRows, configs, activeWorkspace]);

  const expertAnalysis = useMemo(() => {
    if (!hasData || !activeWorkspace) return null;
    return generateExpertAnalysis({
      focusVar: activeWorkspace.focusVar || activeWorkspace.selectedNumVar,
      context: activeContext,
      rows: activeRows,
      configs,
      timeCol,
    });
  }, [hasData, activeWorkspace, activeContext, activeRows, configs, timeCol]);

  const executiveFindings = useMemo(() => {
    if (!hasData) return [];
    return generateExecutiveSummary({
      context: activeContext,
      rows: activeRows,
      configs,
      qualityBefore,
      timeCol,
    });
  }, [hasData, activeContext, activeRows, configs, qualityBefore, timeCol]);

  const htmlReport = useMemo(() => {
    if (!hasData) return '';
    return generateHtmlReport({
      workspace: activeWorkspace,
      context: activeContext,
      rows: activeRows,
      rawRows,
      configs,
      qualityBefore,
      timeCol,
      findings: executiveFindings,
      expertAnalysis,
      customNotes: activeWorkspace?.customNotes || '',
    });
  }, [
    hasData,
    activeWorkspace,
    activeContext,
    activeRows,
    rawRows,
    configs,
    qualityBefore,
    timeCol,
    executiveFindings,
    expertAnalysis,
  ]);

  const stepFinding = useMemo(
    () =>
      buildStepFinding({
        step: currentStep,
        context: activeContext,
        rows: activeRows,
        rawRows,
        configs,
        qualityBefore,
        qualityAfter,
        cleaning,
        descStats,
        catStats,
        timeCol,
        selectedNumVar: activeWorkspace?.selectedNumVar,
        selectedCatVar: activeWorkspace?.selectedCatVar,
        totalCheck,
        timeSummaries,
        participationDeltas,
        corrMatrixPairs,
        activeChiSquare,
        expertAnalysis,
      }),
    [
      currentStep,
      activeContext,
      activeRows,
      rawRows,
      configs,
      qualityBefore,
      qualityAfter,
      cleaning,
      descStats,
      catStats,
      timeCol,
      activeWorkspace,
      totalCheck,
      timeSummaries,
      participationDeltas,
      corrMatrixPairs,
      activeChiSquare,
      expertAnalysis,
    ]
  );

  const activeStepMeta =
    WIZARD_STEPS.find((s) => s.id === currentStep) || WIZARD_STEPS[0];

  const handleDownloadHtml = () => {
    if (!htmlReport) return;
    triggerFileDownload(
      htmlReport,
      `informe_${activeShortName || 'base'}.html`,
      'text/html;charset=utf-8'
    );
  };

  const handleDownloadStatsCsv = () => {
    const csv = generateDescriptiveStatsCsv(activeRows, configs);
    triggerFileDownload(
      csv,
      `descriptivos_${activeShortName || 'base'}.csv`,
      'text/csv;charset=utf-8'
    );
  };

  const handleDownloadCleanedCsv = () => {
    const csv = generateCleanedDataCsv(
      activeRows,
      configs.map((c) => c.name)
    );
    triggerFileDownload(
      csv,
      `datos_limpios_${activeShortName || 'base'}.csv`,
      'text/csv;charset=utf-8'
    );
  };

  const goToStep = (next: number) => {
    if (!hasData && next > 2) return;
    setCurrentStep(Math.max(1, Math.min(WIZARD_STEPS.length, next)));
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {/* Strictly 3-zone Top Bar */}
      <header className="sticky top-0 z-30 h-[60px] border-b border-slate-200 bg-white/95 backdrop-blur-xs px-4 sm:px-6 lg:px-8">
        <div className="mx-auto flex h-full max-w-[1440px] items-center justify-between gap-8">
          {/* Zone 1: Brand */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Abrir pasos del asistente"
              className="rounded-lg border border-slate-200 p-1.5 text-slate-700 hover:bg-slate-100 lg:hidden"
            >
              <Menu className="h-4.5 w-4.5" />
            </button>
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#0f1d32] text-sky-300">
              <BarChart3 className="h-4.5 w-4.5" />
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-bold text-slate-900">
                Explorador Descriptivo de Datos
              </div>
              <div className="hidden sm:block truncate text-[11px] text-slate-500">
                CRISP-DM · Estadística descriptiva paso a paso con R
              </div>
            </div>
          </div>

          {/* Zone 2: Nav links */}
          <nav
            aria-label="Navegación principal"
            className="hidden md:flex items-center gap-6 text-xs font-semibold text-slate-600"
          >
            <button
              type="button"
              onClick={() => goToStep(1)}
              className={`whitespace-nowrap hover:text-blue-700 ${
                currentStep <= 5 ? 'text-blue-700' : ''
              }`}
            >
              Contexto y datos
            </button>
            <button
              type="button"
              disabled={!hasData}
              onClick={() => goToStep(6)}
              className={`whitespace-nowrap hover:text-blue-700 disabled:opacity-40 ${
                currentStep >= 6 && currentStep <= 14 ? 'text-blue-700' : ''
              }`}
            >
              Análisis descriptivo
            </button>
            <button
              type="button"
              disabled={!hasData}
              onClick={() => goToStep(16)}
              className={`whitespace-nowrap hover:text-blue-700 disabled:opacity-40 ${
                currentStep >= 15 ? 'text-blue-700' : ''
              }`}
            >
              Estrategia y reporte
            </button>
          </nav>

          {/* Zone 3: Cargar caso ejemplo menu + Primary CTA */}
          <div className="relative flex items-center gap-2 shrink-0">
            <div className="relative">
              <button
                type="button"
                onClick={() => setPresetMenuOpen((prev) => !prev)}
                aria-expanded={presetMenuOpen}
                aria-haspopup="menu"
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold shadow-xs whitespace-nowrap ${
                  hasData
                    ? 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                    : 'bg-blue-700 text-white hover:bg-blue-800'
                }`}
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>Cargar caso ejemplo</span>
                <ChevronDown className="h-3.5 w-3.5" />
              </button>

              {presetMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setPresetMenuOpen(false)}
                    aria-hidden="true"
                  />
                  <div
                    role="menu"
                    aria-label="Casos de ejemplo"
                    className="absolute right-0 z-50 mt-2 w-88 overflow-hidden rounded-xl border border-slate-200 bg-white py-1.5 shadow-lg"
                  >
                    <div className="border-b border-slate-100 px-3.5 py-2 text-[11px] font-semibold text-slate-500">
                      Elige un caso de ejemplo para cargar
                    </div>
                    {PRESET_DATASETS.map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        role="menuitem"
                        onClick={() => handleLoadPreset(preset)}
                        className="flex w-full flex-col items-start gap-0.5 px-3.5 py-2.5 text-left transition-colors hover:bg-blue-50/70"
                      >
                        <div className="flex w-full items-center justify-between gap-2">
                          <span className="text-xs font-semibold text-slate-900">
                            {preset.name}
                          </span>
                          {preset.recommended && (
                            <span className="shrink-0 rounded border border-violet-200 bg-violet-50 px-1.5 py-0.5 text-[10px] font-bold text-violet-700">
                              Recomendado
                            </span>
                          )}
                        </div>
                        <span className="font-mono text-[11px] text-slate-500">
                          {preset.shortName} · {preset.kindLabel}
                        </span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {hasData && (
              <button
                type="button"
                onClick={handleDownloadHtml}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-800 whitespace-nowrap"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Exportar HTML</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main layout with left wizard sidebar + workspace */}
      <div className="flex flex-1">
        <WizardSidebar
          steps={WIZARD_STEPS}
          currentStep={currentStep}
          hasData={hasData}
          onSelectStep={goToStep}
          mobileOpen={mobileMenuOpen}
          onCloseMobile={() => setMobileMenuOpen(false)}
        />

        <main className="min-w-0 flex-1 flex flex-col">
          {/* Multi-dataset switcher bar inside main workspace */}
          <DatasetSwitcherBar
            workspaces={workspaces}
            activeId={activeWorkspace?.id || null}
            onSelectWorkspace={(id) => setActiveWorkspaceId(id)}
            onRenameWorkspace={handleRenameWorkspace}
            onRemoveWorkspace={handleRemoveWorkspace}
            onAddNewClick={() => goToStep(2)}
          />

          <div className="mx-auto w-full max-w-[1160px] flex-1 px-4 py-6 sm:px-6 lg:px-8">
            {/* Step header */}
            <div className="mb-6 border-b border-slate-200 pb-4">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-semibold text-blue-700">
                <span>
                  {activeStepMeta.crispPhase} · Paso {currentStep} de {WIZARD_STEPS.length}
                </span>
                {hasData && (
                  <span className="font-mono text-slate-500">
                    Base activa: {activeShortName} · {activeRows.length} filas activas
                  </span>
                )}
              </div>
              <h1 className="mt-1 text-xl sm:text-2xl font-bold text-slate-900 text-balance">
                {activeStepMeta.title}
              </h1>
              <p className="mt-1 text-sm text-slate-600">{activeStepMeta.description}</p>
            </div>

            {/* Active Step Body */}
            {currentStep === 1 && (
              <Step01Context
                context={activeContext}
                shortName={activeShortName}
                onChangeContext={(next) => {
                  if (activeWorkspace) {
                    updateActiveWorkspace((ws) => ({ ...ws, context: next }));
                  } else {
                    setDraftContext(next);
                  }
                }}
                onChangeShortName={(next) => {
                  if (activeWorkspace) {
                    handleRenameWorkspace(activeWorkspace.id, next);
                  } else {
                    setDraftShortName(next);
                  }
                }}
                onLoadPreset={handleLoadPreset}
                activeDatasetName={activeShortName}
                hasData={hasData}
              />
            )}

            {currentStep === 2 && (
              <Step02Upload
                onDatasetLoaded={handleDatasetLoaded}
                onLoadPreset={handleLoadPreset}
                activeShortName={activeShortName}
                activeFileName={activeWorkspace?.fileName || ''}
                activeRowCount={rawRows.length}
                activeColCount={configs.length}
                hasActiveWorkspace={hasData}
              />
            )}

            {currentStep === 3 && hasData && (
              <Step03Preview
                rows={activeRows}
                configs={configs}
                datasetName={activeShortName}
                unit={activeContext.unit}
                timeCol={timeCol}
              />
            )}

            {currentStep === 4 && hasData && (
              <Step04Variables
                configs={configs}
                onChangeRole={handleChangeRole}
                onToggleProportion01={handleToggleProportion01}
                onToggleAllowNegative={handleToggleAllowNegative}
              />
            )}

            {currentStep === 5 && hasData && activeWorkspace && (
              <Step05Quality
                qualityBefore={qualityBefore}
                qualityAfter={qualityAfter}
                cleaning={cleaning}
                onChangeCleaning={(next) =>
                  updateActiveWorkspace((ws) => ({ ...ws, cleaning: next }))
                }
                onResetCleaning={() =>
                  updateActiveWorkspace((ws) => ({
                    ...ws,
                    cleaning: { ...DEFAULT_CLEANING },
                  }))
                }
                onFixCellValue={handleFixCellValue}
                timeCol={timeCol}
                configs={configs}
                totalCol={activeWorkspace.totalCol}
                componentCols={activeWorkspace.totalCheckComponents}
                onChangeTotalCheckConfig={(totalCol, components) =>
                  updateActiveWorkspace((ws) => ({
                    ...ws,
                    totalCol,
                    totalCheckComponents: components,
                  }))
                }
                totalCheck={totalCheck}
                unit={activeContext.unit}
              />
            )}

            {currentStep === 6 && hasData && activeWorkspace && (
              <Step06GeneralSummary
                rows={activeRows}
                configs={configs}
                descStats={descStats}
                catStats={catStats}
                selectedVar={activeWorkspace.selectedNumVar}
                onSelectVar={(col) =>
                  updateActiveWorkspace((ws) => ({ ...ws, selectedNumVar: col }))
                }
                unit={activeContext.unit}
              />
            )}

            {currentStep === 7 && hasData && activeWorkspace && (
              <Step07CentralTendency
                configs={configs}
                descStats={descStats}
                selectedVar={activeWorkspace.selectedNumVar}
                onSelectVar={(col) =>
                  updateActiveWorkspace((ws) => ({ ...ws, selectedNumVar: col }))
                }
                unit={activeContext.unit}
              />
            )}

            {currentStep === 8 && hasData && activeWorkspace && (
              <Step08Dispersion
                configs={configs}
                descStats={descStats}
                selectedVar={activeWorkspace.selectedNumVar}
                onSelectVar={(col) =>
                  updateActiveWorkspace((ws) => ({ ...ws, selectedNumVar: col }))
                }
                unit={activeContext.unit}
              />
            )}

            {currentStep === 9 && hasData && activeWorkspace && (
              <Step09Describe
                descStats={descStats}
                selectedVar={activeWorkspace.selectedNumVar}
                onSelectVar={(col) =>
                  updateActiveWorkspace((ws) => ({ ...ws, selectedNumVar: col }))
                }
                unit={activeContext.unit}
              />
            )}

            {currentStep === 10 && hasData && activeWorkspace && (
              <Step10Quantiles
                rows={activeRows}
                configs={configs}
                selectedVar={activeWorkspace.selectedNumVar}
                onSelectVar={(col) =>
                  updateActiveWorkspace((ws) => ({ ...ws, selectedNumVar: col }))
                }
                customPercentiles={activeWorkspace.customPercentiles}
                onChangeCustomPercentiles={(pcts) =>
                  updateActiveWorkspace((ws) => ({ ...ws, customPercentiles: pcts }))
                }
                unit={activeContext.unit}
              />
            )}

            {currentStep === 11 && hasData && activeWorkspace && (
              <Step11UnivariateCharts
                rows={activeRows}
                configs={configs}
                selectedVar={activeWorkspace.selectedNumVar}
                onSelectVar={(col) =>
                  updateActiveWorkspace((ws) => ({ ...ws, selectedNumVar: col }))
                }
                unit={activeContext.unit}
              />
            )}

            {currentStep === 12 && hasData && activeWorkspace && (
              <Step12TimeTrends
                rows={activeRows}
                configs={configs}
                timeCol={timeCol}
                selectedVar={activeWorkspace.selectedNumVar}
                onSelectVar={(col) =>
                  updateActiveWorkspace((ws) => ({ ...ws, selectedNumVar: col }))
                }
                participationComponents={activeWorkspace.participationComponents}
                onChangeParticipationComponents={(cols) =>
                  updateActiveWorkspace((ws) => ({
                    ...ws,
                    participationComponents: cols,
                  }))
                }
                totalCol={activeWorkspace.totalCol}
                unit={activeContext.unit}
                onGoToStep4={() => goToStep(4)}
              />
            )}

            {currentStep === 13 && hasData && activeWorkspace && (
              <Step13Categorical
                catStats={catStats}
                selectedVar={activeWorkspace.selectedCatVar}
                onSelectVar={(col) =>
                  updateActiveWorkspace((ws) => ({ ...ws, selectedCatVar: col }))
                }
                onGoToStep4={() => goToStep(4)}
              />
            )}

            {currentStep === 14 && hasData && activeWorkspace && (
              <Step14Bivariate
                rows={activeRows}
                configs={configs}
                timeCol={timeCol}
                unit={activeContext.unit}
                scatterX={activeWorkspace.scatterX}
                scatterY={activeWorkspace.scatterY}
                onChangeScatterPair={(x, y) =>
                  updateActiveWorkspace((ws) => ({ ...ws, scatterX: x, scatterY: y }))
                }
                groupNumVar={activeWorkspace.groupNumVar}
                groupCatVar={activeWorkspace.groupCatVar}
                onChangeGroupPair={(numCol, catCol) =>
                  updateActiveWorkspace((ws) => ({
                    ...ws,
                    groupNumVar: numCol,
                    groupCatVar: catCol,
                  }))
                }
                chiRowVar={activeWorkspace.chiRowVar}
                chiColVar={activeWorkspace.chiColVar}
                chiInterestColCategory={activeWorkspace.chiInterestColCategory}
                onChangeChiVars={(rowVar, colVar, interestCat) =>
                  updateActiveWorkspace((ws) => ({
                    ...ws,
                    chiRowVar: rowVar,
                    chiColVar: colVar,
                    chiInterestColCategory: interestCat,
                  }))
                }
                groupMinorThreshold={activeWorkspace.groupMinorThreshold}
                onChangeGroupMinorThreshold={(thr) =>
                  updateActiveWorkspace((ws) => ({
                    ...ws,
                    groupMinorThreshold: thr,
                  }))
                }
              />
            )}

            {currentStep === 15 && hasData && activeWorkspace && (
              <Step15ExpertStrategy
                configs={configs}
                focusVar={activeWorkspace.focusVar}
                onChangeFocusVar={(col) =>
                  updateActiveWorkspace((ws) => ({ ...ws, focusVar: col }))
                }
                analysis={expertAnalysis}
              />
            )}

            {currentStep === 16 && hasData && activeWorkspace && (
              <Step16FindingsExport
                context={activeContext}
                shortName={activeShortName}
                findings={executiveFindings}
                expertAnalysis={expertAnalysis}
                customNotes={activeWorkspace.customNotes}
                onChangeNotes={(notes) =>
                  updateActiveWorkspace((ws) => ({ ...ws, customNotes: notes }))
                }
                htmlReportPreview={htmlReport}
                onDownloadHtml={handleDownloadHtml}
                onDownloadStatsCsv={handleDownloadStatsCsv}
                onDownloadCleanedCsv={handleDownloadCleanedCsv}
                activeRowCount={activeRows.length}
                activeColCount={configs.length}
              />
            )}

            {/* Required on EVERY step: Key Finding Box + Collapsible Equivalent R Code Box */}
            <KeyFindingBox
              text={stepFinding}
              stepTitle={activeStepMeta.shortTitle}
            />

            <RCodeBox
              step={currentStep}
              workspace={activeWorkspace}
              timeCol={timeCol}
              configs={configs}
              cleaning={cleaning}
            />

            {/* Wizard navigation buttons */}
            <div className="mt-8 flex items-center justify-between gap-4 border-t border-slate-200 pt-5">
              <button
                type="button"
                disabled={currentStep === 1}
                onClick={() => goToStep(currentStep - 1)}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Anterior</span>
              </button>

              <span className="font-mono text-xs text-slate-500 tabular-nums">
                Paso {currentStep} de {WIZARD_STEPS.length}
              </span>

              <button
                type="button"
                disabled={currentStep === WIZARD_STEPS.length || (!hasData && currentStep >= 2)}
                onClick={() => goToStep(currentStep + 1)}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-xs hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <span>
                  {currentStep === 2 && !hasData
                    ? 'Carga una base para continuar'
                    : currentStep === WIZARD_STEPS.length
                      ? 'Fin del asistente'
                      : 'Siguiente'}
                </span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
