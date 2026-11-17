export type RawCell = string | number | boolean | null | undefined;
export type DataRow = Record<string, RawCell>;

export type NumberUnit = 'pesos' | 'miles' | 'millones' | 'unidades';
export type VariableRole = 'numeric' | 'categorical' | 'time';
export type NumericSubType = 'integer' | 'decimal';
export type SemanticSubType =
  | 'continuous'
  | 'integer'
  | 'binary01'
  | 'proportion01'
  | 'code'
  | 'time'
  | 'text';

export interface VariableConfig {
  name: string;
  role: VariableRole;
  detectedRole: VariableRole;
  numericSubType: NumericSubType | null;
  semanticHint: SemanticSubType;
  suggestFactor: boolean;
  allowNegative: boolean;
  isBinary01: boolean;
  isProportion01: boolean;
  uniqueCount: number;
  missingCount: number;
  sampleValues: string[];
}

export interface BusinessContext {
  question: string;
  sector: string;
  objective: string;
  projectTitle: string;
  unit: NumberUnit;
  presetId?: string;
}

export type MissingAction = 'keep' | 'drop' | 'impute_median';
export type ImpossibleAction = 'keep' | 'drop' | 'impute_median';
export type DuplicateAction = 'keep' | 'drop';

export interface CleaningConfig {
  missingAction: MissingAction;
  impossibleAction: ImpossibleAction;
  duplicateAction: DuplicateAction;
}

export interface ImpossibleCellIssue {
  rowIndex: number; // 1-based row number in rawRows
  column: string;
  value: number;
}

export interface QualityColumnSummary {
  column: string;
  role: VariableRole;
  validCount: number;
  missingCount: number;
  missingPct: number;
  impossibleCount: number;
  impossiblePct: number;
  allowNegative: boolean;
}

export interface TotalCheckResult {
  totalColumn: string;
  componentColumns: string[];
  checkedRows: number;
  matchingRows: number;
  mismatchRows: number;
  maxAbsDiff: number;
  isExactMatch: boolean;
}

export interface QualityReport {
  totalRows: number;
  totalCols: number;
  totalMissingCells: number;
  rowsWithMissing: number;
  totalImpossibleCells: number;
  rowsWithImpossible: number;
  impossibleCells: ImpossibleCellIssue[];
  duplicateRows: number;
  columns: QualityColumnSummary[];
}

export interface TrafficLightStatus {
  level: 'verde' | 'ambar' | 'rojo';
  label: string;
  explanation: string;
}

export interface DescriptiveStats {
  column: string;
  n: number;
  missing: number;
  mean: number;
  median: number;
  mode: number | null;
  modeLabel: string;
  trimmedMean20: number;
  min: number;
  max: number;
  range: number;
  variance: number;
  stdDev: number;
  se: number;
  q1: number;
  q3: number;
  iqr: number;
  mad: number;
  cv: number | null;
  skewness: number;
  kurtosis: number;
  skewMeanMedianAlert: boolean;
  skewMeanMedianDirection: 'high' | 'low' | 'balanced';
  suggestLogTransform: boolean;
  logSkewness: number | null;
  cvStatus: TrafficLightStatus;
  skewStatus: TrafficLightStatus;
  kurtosisStatus: TrafficLightStatus;
  isBinary01: boolean;
  isProportion01: boolean;
  onesPercentage: number | null;
}

export interface OutlierPoint {
  rowIndex: number;
  value: number;
  side: 'inferior' | 'superior';
}

export interface BoxplotSummary {
  column: string;
  min: number;
  lowerFence: number;
  whiskerMin: number;
  q1: number;
  median: number;
  q3: number;
  whiskerMax: number;
  upperFence: number;
  max: number;
  mean: number;
  outliers: OutlierPoint[];
}

export interface GroupedBoxplotItem {
  group: string;
  n: number;
  mean: number;
  stats: BoxplotSummary;
}

export interface QQPlotPoint {
  theoretical: number;
  sample: number;
}

export interface QQPlotResult {
  points: QQPlotPoint[];
  slope: number;
  intercept: number;
  rSquaredFit: number;
  isApproxNormal: boolean;
  normalityLabel: string;
  interpretation: string;
}

export interface HistogramBin {
  label: string;
  min: number;
  max: number;
  count: number;
  pct: number;
}

export interface CategoricalFrequency {
  category: string;
  count: number;
  pct: number;
  cumPct: number;
}

export interface CategoricalStats {
  column: string;
  n: number;
  missing: number;
  uniqueCount: number;
  frequencies: CategoricalFrequency[];
  topCategory: string;
  topPct: number;
  isBinary01: boolean;
  binaryMeanAsPct: number | null;
}

export interface CorrelationMetrics {
  x: string;
  y: string;
  n: number;
  pearsonR: number;
  pearsonP: number;
  spearmanRho: number;
  rSquared: number;
  slope: number;
  intercept: number;
}

export interface ChiSquareResult {
  rowVar: string;
  colVar: string;
  rows: string[];
  cols: string[];
  observed: number[][];
  expected: number[][];
  rowTotals: number[];
  colTotals: number[];
  rowPcts: number[][];
  colPcts: number[][];
  totalPcts: number[][];
  chiContributions: number[][];
  pearsonResiduals: number[][];
  grandTotal: number;
  chi2: number;
  df: number;
  pValue: number;
  simulatedPValue: number | null;
  cramersV: number;
  cellsBelow5: number;
  totalCells: number;
  hasSmallExpectedWarning: boolean;
  significant: boolean;
}

export interface TimeSeriesMetricSummary {
  column: string;
  validPeriods: number;
  firstPeriodLabel: string;
  firstValue: number;
  peakPeriodLabel: string;
  peakValue: number;
  lastPeriodLabel: string;
  lastValue: number;
  changeFromPeakPct: number;
  totalGrowthPct: number;
  cagrPct: number | null;
  worstDropPct: number | null;
  worstDropFromLabel: string | null;
  worstDropToLabel: string | null;
  crisis2020ChangePct: number | null;
}

export interface ParticipationDelta {
  column: string;
  startPeriod: string;
  endPeriod: string;
  startSharePct: number;
  endSharePct: number;
  deltaPP: number;
}

export interface StrategyAction {
  id: string;
  title: string;
  action: string;
  kpi: string;
  horizon: string;
}

export interface ExpertAnalysisResult {
  focusVariable: string;
  isTimeSeries: boolean;
  headline: string;
  profileLabel: string;
  diagnosisBlocks: Array<{
    title: string;
    metric: string;
    text: string;
  }>;
  actions: StrategyAction[];
}

export interface ExecutiveFinding {
  id: string;
  title: string;
  metricBadge: string;
  summary: string;
  questionLink: string;
}

export interface WizardStepMeta {
  id: number;
  shortTitle: string;
  title: string;
  crispPhase:
    | 'Entendimiento del negocio'
    | 'Entendimiento de los datos'
    | 'Preparación de datos'
    | 'Análisis descriptivo'
    | 'Estrategia y entrega';
  description: string;
}

export interface PresetBundleItem {
  presetId: string;
  shortName: string;
  fileName: string;
  sourceKind: 'csv' | 'excel' | 'preset';
  delimiterUsed: ',' | ';' | '\t';
  decimalUsed: 'dot' | 'comma';
  context: BusinessContext;
  generate: () => DataRow[];
}

export interface PresetDatasetInfo {
  id: 'publicidad_co' | 'telecom' | 'retail' | 'b2b' | 'taller_clase2';
  shortName: string;
  name: string;
  sector: string;
  kindLabel: string;
  subtitle: string;
  rowCount: number;
  colCount: number;
  context: BusinessContext;
  generate: () => DataRow[];
  bundleDatasets?: PresetBundleItem[];
}

export interface DatasetWorkspace {
  id: string;
  shortName: string;
  fileName: string;
  sourceKind: 'csv' | 'excel' | 'preset';
  delimiterUsed?: ',' | ';' | '\t';
  decimalUsed: 'dot' | 'comma';
  context: BusinessContext;
  rawRows: DataRow[];
  variableConfigs: VariableConfig[];
  cleaning: CleaningConfig;
  selectedNumVar: string;
  selectedCatVar: string;
  scatterX: string;
  scatterY: string;
  groupNumVar: string;
  groupCatVar: string;
  chiRowVar: string;
  chiColVar: string;
  chiInterestColCategory: string;
  groupMinorThreshold: number;
  totalCol: string | null;
  totalCheckComponents: string[];
  participationComponents: string[];
  focusVar: string;
  customPercentiles: number[];
  customNotes: string;
}
