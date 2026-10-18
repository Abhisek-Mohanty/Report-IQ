import { SheetData } from "@/types";
import {
  ColumnSummaryProfile,
  DocumentExtractionResult,
  DocumentRulesPayload,
  ExtractedDocumentSection,
  ReferenceExcelPayload,
  ReferenceExcelScope,
  ReferenceDatasetEntry,
  ReferenceDocumentEntry,
  ChatInteractionMessage,
  AiValidationScenario,
  UnifiedAiValidatorPayload,
} from "@/types/validator";

/**
 * Computes statistical summary profile for a column in a sheet
 */
export function buildColumnProfile(sheet: SheetData, columnName: string): ColumnSummaryProfile {
  const rows = sheet.rows || [];
  const totalCount = rows.length;
  const rawType = sheet.columnTypes[columnName] || "string";

  let validCount = 0;
  let missingCount = 0;
  const nonNullValues: any[] = [];
  const numericValues: number[] = [];
  const uniqueSet = new Set<string>();

  for (const r of rows) {
    const val = r[columnName];
    if (val === null || val === undefined || val === "" || String(val).trim().toUpperCase() === "NA") {
      missingCount++;
    } else {
      validCount++;
      nonNullValues.push(val);
      uniqueSet.add(String(val));
      const num = Number(val);
      if (!isNaN(num) && typeof val !== "boolean") {
        numericValues.push(num);
      }
    }
  }

  const completenessPercent = totalCount > 0 ? Math.round((validCount / totalCount) * 1000) / 10 : 0;

  let min: number | string | undefined = undefined;
  let max: number | string | undefined = undefined;
  let average: number | undefined = undefined;

  if (numericValues.length > 0) {
    min = Math.min(...numericValues);
    max = Math.max(...numericValues);
    const sum = numericValues.reduce((a, b) => a + b, 0);
    average = Math.round((sum / numericValues.length) * 100) / 100;
  } else if (nonNullValues.length > 0) {
    const sorted = [...nonNullValues].map(String).sort();
    min = sorted[0];
    max = sorted[sorted.length - 1];
  }

  return {
    columnName,
    detectedType: rawType,
    totalCount,
    validCount,
    missingCount,
    completenessPercent,
    uniqueCount: uniqueSet.size,
    min,
    max,
    average,
  };
}

/**
 * Selects up to 5 representative rows from a sheet.
 * Preserves actual string values, leading zeros, and exact column headers.
 */
export function extractRepresentativeRows(
  rows: Record<string, any>[],
  selectedColumns?: string[]
): Record<string, any>[] {
  if (!rows || rows.length === 0) return [];

  const sampleSize = Math.min(5, rows.length);
  // Pick evenly distributed sample rows (first, middle, last, etc.)
  const step = rows.length <= sampleSize ? 1 : Math.floor(rows.length / sampleSize);
  const sampleIndices: number[] = [];
  for (let i = 0; i < sampleSize; i++) {
    sampleIndices.push(Math.min(i * step, rows.length - 1));
  }

  return sampleIndices.map((idx) => {
    const rawRow = rows[idx];
    if (!selectedColumns || selectedColumns.length === 0) {
      return { ...rawRow };
    }
    const filteredRow: Record<string, any> = {};
    for (const col of selectedColumns) {
      filteredRow[col] = rawRow[col] !== undefined ? rawRow[col] : null;
    }
    return filteredRow;
  });
}

/**
 * Builds the typed request payload for Reference Excel Comparison
 */
export function buildReferenceExcelPayload(params: {
  activeDatasetId: string;
  activeDatasetName: string;
  activeSheet: SheetData;
  activeSelectedColumns: string[];
  referenceFile: File;
  referenceSheet: SheetData;
  referenceScope: ReferenceExcelScope;
  userPrompt: string;
}): ReferenceExcelPayload {
  const {
    activeDatasetId,
    activeDatasetName,
    activeSheet,
    activeSelectedColumns,
    referenceFile,
    referenceSheet,
    referenceScope,
    userPrompt,
  } = params;

  // Active dataset profiling
  const activeProfiles = (activeSelectedColumns.length > 0 ? activeSelectedColumns : activeSheet.headers).map(
    (col) => buildColumnProfile(activeSheet, col)
  );
  const activeExamples = extractRepresentativeRows(activeSheet.rows, activeSelectedColumns);

  // Reference dataset profiling & scope filtering
  const refCols =
    referenceScope.selectedColumns.length > 0
      ? referenceScope.selectedColumns
      : referenceSheet.headers;

  const refProfiles = refCols.map((col) => buildColumnProfile(referenceSheet, col));

  // Determine reference row scope
  let selectedRefRowCount = referenceSheet.rowCount;
  let filterDesc: string | undefined = undefined;

  if (referenceScope.rowScopeMode === "range") {
    const start = Math.max(1, referenceScope.rangeStart || 1);
    const end = Math.min(referenceSheet.rowCount, referenceScope.rangeEnd || referenceSheet.rowCount);
    selectedRefRowCount = Math.max(0, end - start + 1);
  } else if (referenceScope.rowScopeMode === "filter" && referenceScope.filterColumn) {
    filterDesc = `Filter: [${referenceScope.filterColumn}] ${referenceScope.filterOperator || "equals"} "${referenceScope.filterValue || ""}"`;
    // Estimate count
    const col = referenceScope.filterColumn;
    const val = String(referenceScope.filterValue || "").toLowerCase();
    selectedRefRowCount = referenceSheet.rows.filter((r) =>
      String(r[col] ?? "").toLowerCase().includes(val)
    ).length;
  }

  const refExamples = extractRepresentativeRows(referenceSheet.rows, refCols);

  return {
    payloadVersion: "1.0",
    operationType: "reference_excel_comparison",
    createdAt: new Date().toISOString(),
    userPrompt: userPrompt.trim() || "Compare reference spreadsheet with active portfolio dataset",

    activeDataset: {
      datasetId: activeDatasetId,
      datasetName: activeDatasetName,
      sheetName: activeSheet.name,
      sourceRowCount: activeSheet.rowCount,
      sourceColumnCount: activeSheet.columnCount,
      selectedColumns: activeSelectedColumns,
      columnProfiles: activeProfiles,
      exampleRows: activeExamples,
    },

    referenceDataset: {
      fileName: referenceFile.name,
      fileSizeBytes: referenceFile.size,
      sheetName: referenceSheet.name,
      sourceRowCount: referenceSheet.rowCount,
      sourceColumnCount: referenceSheet.columnCount,
      selectedColumns: refCols,
      rowScope: {
        mode: referenceScope.rowScopeMode,
        rangeStart: referenceScope.rangeStart,
        rangeEnd: referenceScope.rangeEnd,
        filterDescription: filterDesc,
      },
      selectedRowCount: selectedRefRowCount,
      columnProfiles: refProfiles,
      exampleRows: refExamples,
    },
  };
}

/**
 * Builds the typed request payload for Document Rules Extraction
 */
export function buildDocumentRulesPayload(params: {
  extractionResult: DocumentExtractionResult;
  selectedSections: ExtractedDocumentSection[];
  activeDatasetId: string;
  activeDatasetName: string;
  activeSheet: SheetData;
  userPrompt: string;
}): DocumentRulesPayload {
  const {
    extractionResult,
    selectedSections,
    activeDatasetId,
    activeDatasetName,
    activeSheet,
    userPrompt,
  } = params;

  const totalChars = selectedSections.reduce((sum, s) => sum + s.characterCount, 0);
  const totalWords = selectedSections
    .map((s) => s.content)
    .join(" ")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;

  const fullText = selectedSections.map((s) => `### ${s.heading || "Section"}\n\n${s.content}`).join("\n\n");
  const contentSnippet = fullText.slice(0, 1000) + (fullText.length > 1000 ? "..." : "");

  return {
    payloadVersion: "1.0",
    operationType: "document_rules_extraction",
    createdAt: new Date().toISOString(),
    userPrompt: userPrompt.trim() || "Extract business validation rules and criteria from document",

    documentMetadata: {
      fileName: extractionResult.fileName,
      fileSizeBytes: extractionResult.fileSizeBytes,
      fileType: extractionResult.fileType,
      characterCount: totalChars,
      wordCount: totalWords,
      sectionCount: selectedSections.length,
    },

    extractedContent: {
      sections: selectedSections,
      contentSnippet,
    },

    targetDatasetContext: {
      datasetId: activeDatasetId,
      datasetName: activeDatasetName,
      sheetName: activeSheet.name,
      totalRowCount: activeSheet.rowCount,
      availableColumns: activeSheet.headers.map((h) => ({
        name: h,
        type: activeSheet.columnTypes[h] || "string",
      })),
    },
  };
}

/**
 * Builds the typed unified request payload for multi-dataset and multi-document validation
 */
export function buildUnifiedAiValidatorPayload(params: {
  activeDatasetId: string;
  activeDatasetName: string;
  activeSheet: SheetData;
  activeSelectedColumns: string[];
  referenceDatasets: ReferenceDatasetEntry[];
  referenceDocuments: ReferenceDocumentEntry[];
  selectedScenarioIds: string[];
  selectedScenarios: AiValidationScenario[];
  conversationHistory: ChatInteractionMessage[];
  userPrompt: string;
}): UnifiedAiValidatorPayload {
  const {
    activeDatasetId,
    activeDatasetName,
    activeSheet,
    activeSelectedColumns,
    referenceDatasets,
    referenceDocuments,
    selectedScenarioIds,
    selectedScenarios,
    conversationHistory,
    userPrompt,
  } = params;

  const colsToProfile = activeSelectedColumns.length > 0 ? activeSelectedColumns : activeSheet.headers;
  const activeProfiles = colsToProfile.map((col) => buildColumnProfile(activeSheet, col));
  const activeExamples = extractRepresentativeRows(activeSheet.rows, activeSelectedColumns);

  return {
    payloadVersion: "2.0",
    operationType: "unified_ai_validation",
    createdAt: new Date().toISOString(),
    userPrompt:
      userPrompt.trim() ||
      "Perform comprehensive multi-source validation, reconciliation, and policy rule checks.",
    conversationHistory,
    activeDataset: {
      datasetId: activeDatasetId,
      datasetName: activeDatasetName,
      sheetName: activeSheet.name,
      sourceRowCount: activeSheet.rowCount,
      sourceColumnCount: activeSheet.columnCount,
      selectedColumns: activeSelectedColumns,
      columnProfiles: activeProfiles,
      exampleRows: activeExamples,
    },
    referenceDatasets,
    referenceDocuments,
    selectedScenarioIds,
    selectedScenarios,
  };
}
