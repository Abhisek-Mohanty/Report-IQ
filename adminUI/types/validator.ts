import { ColumnType } from "@/types";

/**
 * Column statistical profile used in payload preparation
 */
export interface ColumnSummaryProfile {
  columnName: string;
  detectedType: ColumnType;
  totalCount: number;
  validCount: number;
  missingCount: number;
  completenessPercent: number;
  uniqueCount?: number;
  min?: number | string;
  max?: number | string;
  average?: number;
}

/**
 * Scope definition for Reference Excel comparison
 */
export interface ReferenceExcelScope {
  sheetName: string;
  selectedColumns: string[];
  rowScopeMode: "all" | "range" | "filter";
  rangeStart?: number; // 1-indexed
  rangeEnd?: number;   // 1-indexed
  filterColumn?: string;
  filterOperator?: string;
  filterValue?: string;
}

/**
 * Typed Payload for Reference Excel comparison request
 * (Stopped before sending to LLM)
 */
export interface ReferenceExcelPayload {
  payloadVersion: "1.0";
  operationType: "reference_excel_comparison";
  createdAt: string;
  userPrompt: string;

  activeDataset: {
    datasetId: string;
    datasetName: string;
    sheetName: string;
    sourceRowCount: number;
    sourceColumnCount: number;
    selectedColumns: string[];
    columnProfiles: ColumnSummaryProfile[];
    exampleRows: Record<string, any>[]; // Up to 5 representative rows
  };

  referenceDataset: {
    fileName: string;
    fileSizeBytes: number;
    sheetName: string;
    sourceRowCount: number;
    sourceColumnCount: number;
    selectedColumns: string[];
    rowScope: {
      mode: "all" | "range" | "filter";
      rangeStart?: number;
      rangeEnd?: number;
      filterDescription?: string;
    };
    selectedRowCount: number;
    columnProfiles: ColumnSummaryProfile[];
    exampleRows: Record<string, any>[]; // Up to 5 representative rows
  };
}

/**
 * Document extraction section with provenance
 */
export interface ExtractedDocumentSection {
  heading?: string;
  pageNumber?: number;
  content: string;
  characterCount: number;
}

/**
 * Result of client-side document extraction
 */
export interface DocumentExtractionResult {
  success: boolean;
  fileName: string;
  fileSizeBytes: number;
  fileType: string;
  sections: ExtractedDocumentSection[];
  rawText: string;
  characterCount: number;
  wordCount: number;
  paragraphCount: number;
  error?: string;
  warning?: string;
  isScannedOrEmpty?: boolean;
}

/**
 * Typed Payload for Document Rules extraction request
 * (Stopped before sending to LLM)
 */
export interface DocumentRulesPayload {
  payloadVersion: "1.0";
  operationType: "document_rules_extraction";
  createdAt: string;
  userPrompt: string;

  documentMetadata: {
    fileName: string;
    fileSizeBytes: number;
    fileType: string;
    characterCount: number;
    wordCount: number;
    sectionCount: number;
  };

  extractedContent: {
    sections: ExtractedDocumentSection[];
    contentSnippet: string; // First 1,000 characters for human preview
  };

  targetDatasetContext: {
    datasetId: string;
    datasetName: string;
    sheetName: string;
    totalRowCount: number;
    availableColumns: {
      name: string;
      type: ColumnType;
    }[];
  };
}

/**
 * Enhanced Reference Dataset Entry for multi-excel / multi-dataset comparison
 */
export interface ReferenceDatasetEntry {
  id: string;
  sourceType: "uploaded_file" | "workspace_dataset";
  fileName: string;
  fileSizeBytes: number;
  sheetName: string;
  availableSheets: string[];
  sourceRowCount: number;
  sourceColumnCount: number;
  selectedColumns: string[];
  rowScope: {
    mode: "all" | "range" | "filter";
    rangeStart?: number;
    rangeEnd?: number;
    filterColumn?: string;
    filterOperator?: string;
    filterValue?: string;
    filterDescription?: string;
  };
  selectedRowCount: number;
  columnProfiles: ColumnSummaryProfile[];
  exampleRows: Record<string, any>[]; // Up to 5 representative rows
  sheets?: any[];
}

/**
 * Enhanced Reference Document Entry for multi-document rule extraction
 */
export interface ReferenceDocumentEntry {
  id: string;
  fileName: string;
  fileSizeBytes: number;
  fileType: string;
  characterCount: number;
  wordCount: number;
  sectionCount: number;
  sections: ExtractedDocumentSection[];
  selectedSectionIndices: number[];
  summary?: string;
  extractedRules?: string[];
  contentSnippet: string;
}

/**
 * Interactive Chat Clarification and Question Message
 */
export interface ChatInteractionQuestion {
  id: string;
  question: string;
  reason?: string;
  options?: string[];
  selectedOption?: string;
}

export interface ChatInteractionMessage {
  id: string;
  sender: "user" | "ai" | "system";
  text: string;
  timestamp: string;
  questions?: ChatInteractionQuestion[];
  suggestedRules?: string[];
  status?: string;
  issues?: any[];
}

/**
 * Selectable validation scenario/rule item (modeled like AiInsightsView scenario)
 */
export interface AiValidationScenario {
  id: string;
  title: string;
  category: "reconciliation" | "policy" | "anomaly" | "integrity" | "calculation" | string;
  source: "document" | "system" | "custom" | "insights";
  ruleType: "equality" | "threshold" | "membership" | "formula" | "outlier" | string;
  targetColumns: string[];
  referenceColumns?: string[];
  businessQuestion: string;
  description: string;
  tolerance?: number;
  confidence: "high" | "medium" | "low";
  suggestedAction: string;
}

/**
 * Unified AI Validator Request Payload supporting multiple datasets, documents, chat interaction, and scenario rules
 */
export interface UnifiedAiValidatorPayload {
  payloadVersion: "2.0";
  operationType: "unified_ai_validation";
  createdAt: string;
  userPrompt: string;
  conversationHistory: ChatInteractionMessage[];

  activeDataset: {
    datasetId: string;
    datasetName: string;
    sheetName: string;
    sourceRowCount: number;
    sourceColumnCount: number;
    selectedColumns: string[];
    columnProfiles: ColumnSummaryProfile[];
    exampleRows: Record<string, any>[];
  };

  referenceDatasets: ReferenceDatasetEntry[];
  referenceDocuments: ReferenceDocumentEntry[];
  selectedScenarioIds: string[];
  selectedScenarios: AiValidationScenario[];
}

/**
 * Manual validation and calculation rule types
 */
export type RuleTemplateType =
  | "required"             // Checks value is not null, empty, or "NA"
  | "range"                // Checks min <= value <= max
  | "match_column"         // Checks columnA == columnB
  | "calculate"            // Calculation-only: produces a calculated column
  | "compare_calculated"   // Validation: compares recorded column against calculated formula
  | "custom_formula";      // Advanced custom boolean expression

export type ValidationOutcome = "pass" | "fail" | "cannot_validate" | "error";

export type RuleCategory = "validation" | "calculation";

export interface ManualRuleConfig {
  id: string;
  name: string;
  description?: string;
  templateType: RuleTemplateType;
  category: RuleCategory; // "validation" compares values; "calculation" produces numbers
  enabled: boolean;

  // Template specific settings
  targetColumn: string;               // Main column being validated/calculated
  secondaryColumn?: string;          // For match_column
  minBound?: number;                 // For range check
  maxBound?: number;                 // For range check
  inclusiveBounds?: boolean;         // For range check (default true)
  allowBlank?: boolean;              // Skip row if target is blank?

  // Formula settings (for calculate, compare_calculated, and custom_formula)
  formulaExpression?: string;        // e.g. "[Loan Amount] * [Interest Rate] / 100"
  numericTolerance?: number;         // For compare_calculated (e.g. 0.01)
  roundingDecimals?: number;         // Number of decimals for calculation
}

/**
 * Evaluation result for a single row against a single rule
 */
export interface RuleEvaluationResult {
  rowId: number;                     // 1-indexed row number
  ruleId: string;
  ruleName: string;
  category: RuleCategory;
  targetColumn: string;
  actualValue: any;
  expectedValue: any;
  calculatedValue?: any;
  outcome: ValidationOutcome;
  reason: string;
  timestamp: number;
}

/**
 * Summary metrics of a validation suite execution
 */
export interface ValidationSuiteSummary {
  datasetId: string;
  sheetName: string;
  totalRows: number;
  totalEvaluations: number;
  passedCount: number;
  failedCount: number;
  cannotValidateCount: number;
  errorCount: number;
  executionDurationMs: number;
  executedAt: string;
  isStale: boolean;
}

export interface AggregationSourceConfig {
  sourceRef: string;
  groupColumns: string[];
  measureColumn: string;
  mappingStatus?: string;
  evidenceRefs?: string[];
}

export interface AggregationRuleConfig {
  id: string;
  title: string;
  operation: string;
  activeGroupColumns: string[];
  sources: AggregationSourceConfig[];
  aggregation: "sum" | "avg" | "count" | "min" | "max" | string;
  combineMode: "union_all" | "join" | string;
  outputColumn: string;
  outputGrain?: string;
  normalization?: string;
  missingGroupPolicy?: string;
  invalidMeasurePolicy?: string;
  noMatchPolicy?: string;
  status?: string;
}

export interface AggregationTableResult {
  ruleId: string;
  ruleTitle: string;
  groupColumn: string;
  measureColumn: string;
  totalRecordsProcessed: number;
  totalMeasureSum: number;
  rows: Array<{
    agentName: string;
    referenceRole: string;
    recordCount: number;
    totalAmount: number;
    sourceBreakdown: Record<string, number>;
    status: string;
  }>;
}
