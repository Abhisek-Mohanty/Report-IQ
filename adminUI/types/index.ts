export interface SheetData {
  name: string;
  headers: string[];
  rows: Record<string, any>[];
  rowCount: number;
  columnCount: number;
  columnTypes: Record<string, ColumnType>;
}

export type ColumnType = "number" | "string" | "date" | "boolean";

export interface Dataset {
  id: string;
  name: string;
  size: number;
  sheets: SheetData[];
  createdAt: string;
}

export type JoinType = "inner" | "left" | "right" | "full" | "append";

export interface MergeConfig {
  datasetAId: string;
  sheetAName: string;
  datasetBId: string;
  sheetBName: string;
  joinType: JoinType;
  keyA?: string;
  keyB?: string;
}

export type SplitStrategy = "rowCount" | "percentage" | "columnValue" | "dateRange";

export interface SplitConfig {
  strategy: SplitStrategy;
  rowCountValue?: number;
  percentageValue?: number;
  columnName?: string;
  columnValue?: string;
  startDate?: string;
  endDate?: string;
}

export type FilterOperator =
  | "equals"
  | "not_equals"
  | "greater_than"
  | "greater_than_or_equals"
  | "less_than"
  | "less_than_or_equals"
  | "contains"
  | "not_contains"
  | "starts_with"
  | "ends_with"
  | "is_empty"
  | "is_not_empty";

export interface FilterRule {
  id: string;
  column: string;
  operator: FilterOperator;
  value: string;
}

export interface FilterGroup {
  id: string;
  conjunction: "AND" | "OR";
  rules: (FilterRule | FilterGroup)[];
}

export type ChartType = "bar" | "line" | "pie" | "doughnut" | "scatter" | "area" | "histogram";

export interface ChartConfig {
  id: string;
  title: string;
  type: ChartType;
  xAxisColumn: string;
  yAxisColumn: string;
  aggregateFunc: "sum" | "avg" | "count" | "none";
}

export interface NullValueSummary {
  columnName: string;
  missingCount: number;
  missingPercentage: number;
  type: ColumnType;
}

export interface DatasetStats {
  totalRows: number;
  totalCols: number;
  duplicateRows: number;
  emptyRows: number;
  completenessScore: number; // 0 - 100
  nullSummaries: NullValueSummary[];
}

export interface AiScenario {
  id: string;
  title: string;
  category: "relationship" | "category" | "trend" | "anomaly" | string;
  columns: string[];
  analysisType: "group_comparison" | "distribution" | "time_series" | "outlier_detection" | "duplicate_check" | "correlation" | "missing_data" | string;
  method: "groupby-aggregate" | "IQR" | "time-aggregation" | "duplicate-check" | "pearson" | "spearman" | "z-score" | "chi-square" | string;
  suggestedChart: "bar" | "pie" | "line" | "box" | "scatter" | "area" | "doughnut" | string;
  businessQuestion: string;
  whyItMatters: string;
  confidence: "high" | "medium" | "low" | string;
  confidenceReason: string;
  isCustom?: boolean;
}

export interface AiPatternAnalysisResponse {
  datasetSummary: string;
  scenarios: AiScenario[];
}

export interface DetailedInsightResult {
  scenarioId: string;
  scenarioTitle: string;
  category: string;
  analysisType: string;
  columns: string[];
  chartType: string;
  chartData: any[];
  chartXKey?: string;
  chartYKey?: string;
  businessQuestion: string;
  whyItMatters: string;
  summary: string;
  keyMetrics: { label: string; value: string | number; badge?: string }[];
  narrativeParagraphs: string[];
  actionableRecommendations: string[];
  outlierRows?: Record<string, any>[];
  statsTable?: { label: string; value: string | number }[];
}
