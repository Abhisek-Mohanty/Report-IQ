export interface MetricObject {
  label: string;
  valueRef: string;
  format: "integer" | "decimal" | "currency" | "percent" | string;
  currency?: string | null;
  unit?: string | null;
  percentScale?: "percentage_points" | "ratio" | string | null;
  decimalPlaces?: number | null;
}

export interface ActionObject {
  action: string;
  priority: "high" | "medium" | "low" | string;
  confidence: "high" | "medium" | "low" | string;
  evidenceRefs: string[];
  question?: string | null;
}

export interface KpiDelta {
  valueRef?: string | null;
  format?: string | null;
  percentScale?: string | null;
  comparisonLabel?: string | null;
  tone?: "positive" | "negative" | "neutral" | string;
}

export interface KpiBannerItem {
  label: string;
  valueRef: string;
  format: string;
  currency?: string | null;
  unit?: string | null;
  percentScale?: string | null;
  decimalPlaces?: number | null;
  icon?: "users" | "rupee" | "percent" | "building" | "cart" | "megaphone" | "chart" | "alert" | "trophy" | "layers" | string;
  scenarioId: string;
  delta?: KpiDelta;
}

export interface KeyHighlightItem {
  template: string;
  emphasis: string[];
  tone: "positive" | "negative" | "neutral" | string;
  evidenceRefs: string[];
}

export interface ExecutiveSummary {
  keyTakeaway: string | null;
  datasetImpact: string | null;
  evidenceRefs: string[];
}

export interface ScenarioFinding {
  title: string;
  metrics: MetricObject[];
  interpretation: string;
  importance: "high" | "medium" | "low" | string;
  confidence: "high" | "medium" | "low" | string;
  evidenceRefs: string[];
}

export interface ComparisonItem {
  title: string;
  left: MetricObject;
  right: MetricObject;
  operator: "greater_than" | "less_than" | "equals" | "not_equals" | string;
  interpretation: string;
  confidence: "high" | "medium" | "low" | string;
  evidenceRefs: string[];
}

export interface ConcentrationItem {
  label: string;
  topN: number;
  shareRef: string;
  percentScale: "percentage_points" | "ratio" | string;
  interpretation: string;
  evidenceRefs: string[];
}

export interface DatasetImpactItem {
  shareOfDatasetRef?: string | null;
  percentScale?: "percentage_points" | "ratio" | string | null;
  metrics: MetricObject[];
  driversOfOverall: string[];
  uncoveredAreas: string[];
  interpretation?: string | null;
  evidenceRefs: string[];
}

export interface OutlierItem {
  title: string;
  dataRef: string;
  metrics: MetricObject[];
  interpretation: string;
  confidence: "high" | "medium" | "low" | string;
  evidenceRefs: string[];
}

export interface PatternItem {
  title: string;
  type: "trend" | "seasonal" | "cycle" | string;
  metrics: MetricObject[];
  interpretation: string;
  confidence: "high" | "medium" | "low" | string;
  evidenceRefs: string[];
}

export interface ChartHighlight {
  itemRef?: string | null;
  tone: "positive" | "negative" | "neutral" | string;
  reason?: string | null;
}

export interface ChartSpec {
  type: "bar" | "column" | "horizontal_bar" | "pie" | "donut" | "line" | "scatter" | "histogram" | "box" | "pareto" | string;
  title: string;
  dimension: string;
  measure: string;
  aggregation: "sum" | "avg" | "count" | "none" | string;
  sort: "descending" | "ascending" | "none" | string;
  limit?: number | null;
  groupOthers: boolean;
  benchmarkRef?: string | null;
  highlight?: ChartHighlight;
  dataRef: string;
  insightRef?: string | null;
  format: string;
  currency?: string | null;
  unit?: string | null;
  percentScale?: string | null;
}

export interface ScenarioAnalysisItem {
  scenarioId: string;
  title: string;
  kpis: MetricObject[];
  statistics: MetricObject[];
  findings: ScenarioFinding[];
  comparisons: ComparisonItem[];
  concentration: ConcentrationItem[];
  datasetImpact: DatasetImpactItem;
  outliers: OutlierItem[];
  patterns: PatternItem[];
  businessInsights: ActionObject[];
  recommendations: ActionObject[];
  charts: ChartSpec[];
}

export interface CrossScenarioInsightItem {
  title: string;
  scenarioIds: string[];
  metrics: MetricObject[];
  interpretation: string;
  confidence: "high" | "medium" | "low" | string;
  evidenceRefs: string[];
}

export interface DataQualityItem {
  column: string;
  scenarioId?: string | null;
  message: string;
  severity: "low" | "medium" | "high" | string;
  evidenceRefs: string[];
}

export interface AdditionalCalculationItem {
  name: string;
  reason: string;
  requiredColumns: string[];
}

export interface ValidationWarningItem {
  severity: "low" | "medium" | "high" | string;
  scenarioId?: string | null;
  message: string;
  evidenceRefs: string[];
}

export interface DashboardFilter {
  column: string;
  type: string;
  valuesRef?: string | null;
  dataRef: string;
  scenarioIds: string[];
  operators: string[];
}

export interface AnalysisDashboardData {
  schemaVersion: string;
  title: string;
  subtitle: string;
  filters: DashboardFilter[];
  kpiBanner: KpiBannerItem[];
  keyHighlights: KeyHighlightItem[];
  executiveSummary: ExecutiveSummary;
  scenarioAnalysis: ScenarioAnalysisItem[];
  crossScenarioInsights: CrossScenarioInsightItem[];
  dataQuality: DataQualityItem[];
  additionalCalculations: AdditionalCalculationItem[];
  validationWarnings: ValidationWarningItem[];
}
