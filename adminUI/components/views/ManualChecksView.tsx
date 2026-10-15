"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import { useAnalyticsStore } from "@/store/useAnalyticsStore";
import { SheetData, Dataset } from "@/types";
import { toast } from "@/components/ui/toast";
import {
  ManualRuleConfig,
  RuleEvaluationResult,
  ValidationSuiteSummary,
  RuleTemplateType,
} from "@/types/validator";
import {
  compileFormula,
  executeValidationSuite,
} from "@/utils/validatorFormulaEngine";
import {
  CheckSquare,
  UploadCloud,
  Database,
  Plus,
  Table,
  Trash2,
  SlidersHorizontal,
  Search,
  Code2,
  ShieldCheck,
  Play,
  FileDown,
  RefreshCw,
  CheckCircle2,
  Layers,
  Sparkles,
  ArrowRight,
  HelpCircle,
  BookOpen,
  GraduationCap,
  XCircle,
  AlertTriangle,
  Lightbulb,
  FileSpreadsheet,
  Check,
  X,
  Square,
  Info,
  Calendar,
  Hash,
  Type
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import * as XLSX from "xlsx";

interface MultiDatasetEvaluationResult extends RuleEvaluationResult {
  datasetName: string;
  datasetId: string;
  sheetName: string;
}

interface DatasetValidationReport {
  datasetId: string;
  datasetName: string;
  sheetName: string;
  totalRows: number;
  totalEvaluations: number;
  passedCount: number;
  failedCount: number;
  cannotValidateCount: number;
  errorCount: number;
  passRate: number;
  durationMs: number;
}

export function ManualChecksView() {
  const datasets = useAnalyticsStore((state) => state.datasets);
  const selectedDatasetId = useAnalyticsStore((state) => state.selectedDatasetId);
  const selectedSheetName = useAnalyticsStore((state) => state.selectedSheetName);
  const selectDataset = useAnalyticsStore((state) => state.selectDataset);
  const setActiveTab = useAnalyticsStore((state) => state.setActiveTab);

  // Selected datasets to validate (supports 1, 2, 3, 4, 5+ files!)
  const [selectedDatasetIds, setSelectedDatasetIds] = useState<string[]>([]);

  // Validation rules
  const [rules, setRules] = useState<ManualRuleConfig[]>([]);

  // Validation execution state
  const [isExecuting, setIsExecuting] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Validation results
  const [evaluationResults, setEvaluationResults] = useState<MultiDatasetEvaluationResult[]>([]);
  const [datasetReports, setDatasetReports] = useState<DatasetValidationReport[]>([]);
  const [totalExecutionTimeMs, setTotalExecutionTimeMs] = useState(0);
  const [hasRun, setHasRun] = useState(false);

  // Result filters
  const [filterOutcome, setFilterOutcome] = useState<string>("all");
  const [filterDatasetName, setFilterDatasetName] = useState<string>("all");
  const [filterRuleId, setFilterRuleId] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Modals
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<Partial<ManualRuleConfig> | null>(null);
  const [ruleSyntaxError, setRuleSyntaxError] = useState<string | null>(null);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [isTipsBannerDismissed, setIsTipsBannerDismissed] = useState(false);

  // Pagination for results table
  const [page, setPage] = useState(1);
  const rowsPerPage = 15;

  // Initialize selected datasets on mount
  useEffect(() => {
    if (datasets.length > 0 && selectedDatasetIds.length === 0) {
      if (selectedDatasetId) {
        setSelectedDatasetIds([selectedDatasetId]);
      } else {
        setSelectedDatasetIds(datasets.map((d) => d.id)); // Default to checking all files
      }
    }
  }, [datasets, selectedDatasetId, selectedDatasetIds.length]);

  // Selected dataset objects
  const selectedDatasets = useMemo(() => {
    return datasets.filter((d) => selectedDatasetIds.includes(d.id));
  }, [datasets, selectedDatasetIds]);

  // Total rows to be checked
  const totalRowsCount = useMemo(() => {
    return selectedDatasets.reduce((sum, d) => sum + (d.sheets[0]?.rowCount || 0), 0);
  }, [selectedDatasets]);

  // Available column names across all selected datasets
  const availableColumns = useMemo(() => {
    if (selectedDatasets.length === 0) return [];
    const colMap = new Map<string, { type: string; count: number }>();

    selectedDatasets.forEach((d) => {
      const sheet = d.sheets[0];
      if (sheet) {
        sheet.headers.forEach((h) => {
          const existing = colMap.get(h) || { type: sheet.columnTypes[h] || "string", count: 0 };
          existing.count++;
          colMap.set(h, existing);
        });
      }
    });

    const list: { name: string; type: string; isCommon: boolean }[] = [];
    colMap.forEach((meta, col) => {
      list.push({
        name: col,
        type: meta.type,
        isCommon: meta.count === selectedDatasets.length,
      });
    });

    return list;
  }, [selectedDatasets]);

  // Initialize sensible starter rules when columns become available
  useEffect(() => {
    if (availableColumns.length > 0 && rules.length === 0) {
      const numCol = availableColumns.find((c) => c.type === "number")?.name;
      const textCol = availableColumns.find((c) => c.type === "string")?.name || availableColumns[0].name;

      const starters: ManualRuleConfig[] = [
        {
          id: "rule_1",
          name: `Make sure "${textCol}" is not blank`,
          description: `Checks that every row has a valid value in ${textCol}`,
          templateType: "required",
          category: "validation",
          enabled: true,
          targetColumn: textCol,
        },
      ];

      if (numCol) {
        starters.push({
          id: "rule_2",
          name: `Check "${numCol}" is a positive number (>= 0)`,
          description: `Checks that ${numCol} is at least 0`,
          templateType: "range",
          category: "validation",
          enabled: true,
          targetColumn: numCol,
          minBound: 0,
          inclusiveBounds: true,
        });
      }

      setRules(starters);
    }
  }, [availableColumns, rules.length]);

  // Toggle selection of a dataset
  const toggleDatasetSelection = (id: string) => {
    setSelectedDatasetIds((prev) => {
      if (prev.includes(id)) {
        if (prev.length === 1) {
          toast.error("Please keep at least one spreadsheet selected!");
          return prev;
        }
        return prev.filter((item) => item !== id);
      } else {
        return [...prev, id];
      }
    });
    setHasRun(false);
  };

  const selectAllDatasets = () => {
    setSelectedDatasetIds(datasets.map((d) => d.id));
    setHasRun(false);
  };

  // Rule operations
  const handleToggleRule = (id: string) => {
    setRules((prev) =>
      prev.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r))
    );
  };

  const handleDeleteRule = (id: string) => {
    setRules((prev) => prev.filter((r) => r.id !== id));
    toast.success("Rule removed.");
  };

  const handleOpenAddRule = (template: RuleTemplateType = "required") => {
    const targetCol = availableColumns[0]?.name || "";
    const secondCol = availableColumns[1]?.name || targetCol;

    let defaultName = `Check ${targetCol} is not blank`;
    if (template === "range") defaultName = `Check ${targetCol} is within range`;
    if (template === "match_column") defaultName = `Make sure ${targetCol} equals ${secondCol}`;
    if (template === "calculate") defaultName = `Calculate expected ${targetCol}`;
    if (template === "compare_calculated") defaultName = `Verify ${targetCol} calculation formula`;
    if (template === "custom_formula") defaultName = `Custom math check for ${targetCol}`;

    setEditingRule({
      id: `rule_${Date.now()}`,
      name: defaultName,
      templateType: template,
      category: template === "calculate" ? "calculation" : "validation",
      enabled: true,
      targetColumn: targetCol,
      secondaryColumn: secondCol,
      minBound: 0,
      maxBound: 100,
      inclusiveBounds: true,
      numericTolerance: 0.01,
      roundingDecimals: 2,
      formulaExpression: `[${targetCol}]`,
    });
    setRuleSyntaxError(null);
    setIsRuleModalOpen(true);
  };

  const handleSaveRule = () => {
    if (!editingRule || !editingRule.name?.trim() || !editingRule.targetColumn) {
      toast.error("Please enter a rule name and choose a column.");
      return;
    }

    if (["calculate", "compare_calculated", "custom_formula"].includes(editingRule.templateType || "")) {
      const expr = editingRule.formulaExpression || "";
      const { error } = compileFormula(expr);
      if (error) {
        setRuleSyntaxError(error);
        return;
      }
    }

    const saved = editingRule as ManualRuleConfig;
    setRules((prev) => {
      const idx = prev.findIndex((r) => r.id === saved.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = saved;
        return copy;
      }
      return [...prev, saved];
    });

    setIsRuleModalOpen(false);
    setEditingRule(null);
    toast.success(`Rule "${saved.name}" saved!`);
  };

  // ==========================================
  // RUN VALIDATION ACROSS MULTIPLE DATASETS
  // ==========================================
  const handleRunValidation = async () => {
    if (selectedDatasets.length === 0) {
      toast.error("Please pick at least one spreadsheet to check!");
      return;
    }

    const enabledRules = rules.filter((r) => r.enabled);
    if (enabledRules.length === 0) {
      toast.error("Please enable at least one rule to run validation.");
      return;
    }

    setIsExecuting(true);
    setProgressPercent(0);
    abortControllerRef.current = new AbortController();
    const startTime = Date.now();

    try {
      const allResults: MultiDatasetEvaluationResult[] = [];
      const reports: DatasetValidationReport[] = [];

      for (let i = 0; i < selectedDatasets.length; i++) {
        if (abortControllerRef.current?.signal.aborted) {
          throw new Error("Validation was cancelled");
        }

        const ds = selectedDatasets[i];
        const sheet = ds.sheets[0];
        if (!sheet) continue;

        const dsStartTime = Date.now();

        // Run validation suite on this dataset
        const { results, summary } = await executeValidationSuite(
          sheet,
          ds.id,
          enabledRules,
          (chunkProgress) => {
            const overall = Math.round(((i + chunkProgress / 100) / selectedDatasets.length) * 100);
            setProgressPercent(overall);
          },
          abortControllerRef.current?.signal
        );

        // Tag each result with dataset file name
        results.forEach((r) => {
          allResults.push({
            ...r,
            datasetName: ds.name,
            datasetId: ds.id,
            sheetName: sheet.name,
          });
        });

        reports.push({
          datasetId: ds.id,
          datasetName: ds.name,
          sheetName: sheet.name,
          totalRows: summary.totalRows,
          totalEvaluations: summary.totalEvaluations,
          passedCount: summary.passedCount,
          failedCount: summary.failedCount,
          cannotValidateCount: summary.cannotValidateCount,
          errorCount: summary.errorCount,
          passRate: summary.totalEvaluations > 0
            ? parseFloat(((summary.passedCount / summary.totalEvaluations) * 100).toFixed(1))
            : 100,
          durationMs: Date.now() - dsStartTime,
        });
      }

      setEvaluationResults(allResults);
      setDatasetReports(reports);
      setTotalExecutionTimeMs(Date.now() - startTime);
      setHasRun(true);
      setPage(1);

      const totalFailed = reports.reduce((s, r) => s + r.failedCount, 0);
      if (totalFailed === 0) {
        toast.success(`Amazing! All ${allResults.length.toLocaleString()} checks passed across ${selectedDatasets.length} spreadsheets! 🎉`);
      } else {
        toast.error(`Validation complete: Found ${totalFailed.toLocaleString()} mistakes across ${selectedDatasets.length} spreadsheets. Check details below!`);
      }
    } catch (err: any) {
      if (err.message?.includes("cancelled")) {
        toast.info("Validation was stopped.");
      } else {
        toast.error(`Validation failed: ${err.message}`);
      }
    } finally {
      setIsExecuting(false);
      abortControllerRef.current = null;
    }
  };

  const handleCancelValidation = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  // Overall aggregate metrics
  const overallSummary = useMemo(() => {
    const totalChecks = datasetReports.reduce((s, r) => s + r.totalEvaluations, 0);
    const passed = datasetReports.reduce((s, r) => s + r.passedCount, 0);
    const failed = datasetReports.reduce((s, r) => s + r.failedCount, 0);
    const cannotValidate = datasetReports.reduce((s, r) => s + r.cannotValidateCount, 0);
    const errors = datasetReports.reduce((s, r) => s + r.errorCount, 0);
    const passRate = totalChecks > 0 ? parseFloat(((passed / totalChecks) * 100).toFixed(1)) : 100;

    return { totalChecks, passed, failed, cannotValidate, errors, passRate };
  }, [datasetReports]);

  // Filtered results for the report card table
  const filteredResults = useMemo(() => {
    return evaluationResults.filter((item) => {
      if (filterOutcome !== "all" && item.outcome !== filterOutcome) return false;
      if (filterDatasetName !== "all" && item.datasetName !== filterDatasetName) return false;
      if (filterRuleId !== "all" && item.ruleId !== filterRuleId) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const rowMatch = `row #${item.rowId}`.includes(q) || String(item.rowId).includes(q);
        const colMatch = item.targetColumn.toLowerCase().includes(q);
        const fileMatch = item.datasetName.toLowerCase().includes(q);
        const reasonMatch = item.reason.toLowerCase().includes(q);
        const valMatch = String(item.actualValue ?? "").toLowerCase().includes(q);
        if (!rowMatch && !colMatch && !fileMatch && !reasonMatch && !valMatch) return false;
      }

      return true;
    });
  }, [evaluationResults, filterOutcome, filterDatasetName, filterRuleId, searchQuery]);

  // Paginated rows
  const paginatedResults = useMemo(() => {
    const start = (page - 1) * rowsPerPage;
    return filteredResults.slice(start, start + rowsPerPage);
  }, [filteredResults, page, rowsPerPage]);

  const totalPages = Math.max(1, Math.ceil(filteredResults.length / rowsPerPage));

  // Export Results to CSV
  const handleExportCsv = () => {
    if (evaluationResults.length === 0) return;

    const headers = [
      "Spreadsheet_File",
      "Row_Number",
      "Rule_Name",
      "Column_Checked",
      "Actual_Value",
      "Expected_Value",
      "Result_Status",
      "Explanation",
    ];

    const csvRows = evaluationResults.map((r) => [
      `"${r.datasetName.replace(/"/g, '""')}"`,
      r.rowId,
      `"${r.ruleName.replace(/"/g, '""')}"`,
      `"${r.targetColumn.replace(/"/g, '""')}"`,
      `"${String(r.actualValue ?? "").replace(/"/g, '""')}"`,
      `"${String(r.expectedValue ?? "").replace(/"/g, '""')}"`,
      r.outcome.toUpperCase(),
      `"${r.reason.replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(","), ...csvRows.map((row) => row.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Validation_Report_${selectedDatasets.length}_Files_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Downloaded Validation CSV Report!");
  };

  // Export Results to Excel (.xlsx)
  const handleExportExcel = () => {
    if (evaluationResults.length === 0) return;

    try {
      const wb = XLSX.utils.book_new();

      // Sheet 1: Summary Report Card
      const summaryData = datasetReports.map((rep) => ({
        "Spreadsheet Name": rep.datasetName,
        "Total Rows": rep.totalRows,
        "Total Checks": rep.totalEvaluations,
        "Passed (OK)": rep.passedCount,
        "Failed (Mistakes)": rep.failedCount,
        "Cannot Check (Blank)": rep.cannotValidateCount,
        "Errors": rep.errorCount,
        "Pass Rate %": `${rep.passRate}%`,
      }));
      const wsSummary = XLSX.utils.json_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, wsSummary, "Report_Card");

      // Sheet 2: Only Failures (Defect Checklist)
      const failedRows = evaluationResults
        .filter((r) => r.outcome === "fail" || r.outcome === "error")
        .map((r) => ({
          "Spreadsheet File": r.datasetName,
          "Row #": r.rowId,
          "Rule Broken": r.ruleName,
          "Column": r.targetColumn,
          "Actual Value in Cell": String(r.actualValue ?? "null"),
          "Expected Value": String(r.expectedValue ?? "-"),
          "Why it Failed": r.reason,
        }));

      if (failedRows.length > 0) {
        const wsFails = XLSX.utils.json_to_sheet(failedRows);
        XLSX.utils.book_append_sheet(wb, wsFails, "Mistakes_To_Fix");
      }

      // Sheet 3: All Checks
      const allData = evaluationResults.slice(0, 5000).map((r) => ({
        "Spreadsheet File": r.datasetName,
        "Row #": r.rowId,
        "Rule": r.ruleName,
        "Column": r.targetColumn,
        "Actual Value": String(r.actualValue ?? "null"),
        "Expected Value": String(r.expectedValue ?? "-"),
        "Status": r.outcome.toUpperCase(),
        "Explanation": r.reason,
      }));
      const wsAll = XLSX.utils.json_to_sheet(allData);
      XLSX.utils.book_append_sheet(wb, wsAll, "All_Evaluations");

      const fileName = `Validation_Report_${selectedDatasets.length}_Files.xlsx`;
      XLSX.writeFile(wb, fileName);
      toast.success(`Downloaded ${fileName}!`);
    } catch (err: any) {
      console.error(err);
      toast.error("Could not export Excel workbook");
    }
  };

  if (datasets.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-muted-foreground bg-card border border-border rounded-2xl">
        <CheckSquare className="h-12 w-12 opacity-30 mb-3 text-primary" />
        <h3 className="font-display font-semibold text-lg text-foreground mb-1">No Spreadsheets Loaded Yet</h3>
        <p className="text-xs max-w-sm mb-4">Please upload an Excel or CSV file in the Upload tab first so we can check it for errors.</p>
        <Button size="sm" onClick={() => setActiveTab("upload")}>
          Go to Upload Tab
        </Button>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-y-auto gap-5 pb-8">
      
      {/* ========================================== */}
      {/* HEADER WITH 10TH-GRADE FRIENDLY EXPLANATION */}
      {/* ========================================== */}
      <div className="flex flex-wrap items-center justify-between gap-4 shrink-0">
        <div>
          <h2 className="font-display font-bold text-2xl text-foreground flex items-center gap-2">
            <CheckSquare className="h-6 w-6 text-primary" />
            <span>Data Validator</span>
          </h2>
          <span className="text-xs text-muted-foreground font-medium block mt-0.5">
            Like a digital spell-checker and math-grader for your spreadsheets. Check 1 file or 3, 4, 5+ files all at once!
          </span>
        </div>

        {/* Action button & Student Guide */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs font-semibold text-primary border-primary/30 hover:bg-primary/10"
            onClick={() => setIsGuideOpen(true)}
          >
            <BookOpen className="h-3.5 w-3.5 text-primary" />
            <span>How to Use (Student Guide)</span>
          </Button>

          <div className="px-3 py-1 bg-accent/60 border border-border rounded-lg text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
            <Database className="h-3.5 w-3.5 text-primary" />
            <span className="text-foreground">{selectedDatasets.length} of {datasets.length} Files Selected</span>
          </div>
        </div>
      </div>

      {/* ========================================== */}
      {/* TOP QUICK TIPS BANNER */}
      {/* ========================================== */}
      {!isTipsBannerDismissed && (
        <div className="p-3.5 bg-primary/10 border border-primary/20 rounded-xl flex items-start justify-between gap-3 text-xs">
          <div className="flex items-start gap-2.5">
            <div className="p-1.5 rounded-lg bg-primary/20 text-primary mt-0.5 shrink-0">
              <GraduationCap className="h-4 w-4" />
            </div>
            <div>
              <div className="font-bold text-foreground mb-0.5">How Data Validation Works:</div>
              <p className="text-muted-foreground leading-relaxed text-[11px]">
                <strong className="text-foreground">Step 1:</strong> Select which spreadsheets you want to inspect (pick 1, 2, 3, or all).<br />
                <strong className="text-foreground">Step 2:</strong> Set up your rules (e.g. <em>"Name cannot be blank"</em> or <em>"Grade must be 0 to 100"</em>).<br />
                <strong className="text-foreground">Step 3:</strong> Click <strong>"Check All Files"</strong>. We'll grade every row and highlight any errors!
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsTipsBannerDismissed(true)}
            className="text-muted-foreground hover:text-foreground p-1 rounded-md transition-colors shrink-0"
            title="Dismiss tip"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* ========================================== */}
      {/* STEP 1: PICK SPREADSHEETS (SUPPORTS >2 DATASETS) */}
      {/* ========================================== */}
      <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-3.5">
        <div className="flex flex-wrap items-center justify-between border-b border-border pb-2.5 gap-2">
          <div className="flex items-center gap-2">
            <span className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold font-display">
              1
            </span>
            <span className="text-xs font-bold text-foreground uppercase tracking-wider">
              Step 1: Choose Spreadsheets to Inspect ({selectedDatasets.length} selected)
            </span>
            <span className="text-[11px] text-muted-foreground font-medium hidden sm:inline">
              (You can select 1, 2, 3, 4, or more files at the same time!)
            </span>
          </div>

          {datasets.length > 1 && (
            <div className="flex items-center gap-2">
              <button
                onClick={selectAllDatasets}
                className="text-xs font-semibold text-primary hover:underline"
              >
                Select All ({datasets.length})
              </button>
            </div>
          )}
        </div>

        {/* Dataset Checkbox Chips */}
        <div className="flex flex-wrap gap-2.5 pt-0.5">
          {datasets.map((d) => {
            const isSelected = selectedDatasetIds.includes(d.id);
            const rowCount = d.sheets[0]?.rowCount || 0;

            return (
              <button
                key={d.id}
                onClick={() => toggleDatasetSelection(d.id)}
                className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border text-xs transition-all select-none text-left ${
                  isSelected
                    ? "bg-primary/10 border-primary text-foreground font-bold shadow-sm ring-1 ring-primary/30"
                    : "bg-accent/20 border-border text-muted-foreground hover:bg-accent/40 hover:text-foreground font-medium"
                }`}
              >
                <div className="mt-0.5">
                  {isSelected ? (
                    <CheckSquare className="h-4 w-4 text-primary shrink-0" />
                  ) : (
                    <Square className="h-4 w-4 text-muted-foreground shrink-0" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="truncate max-w-[210px] text-xs font-bold leading-tight">{d.name}</div>
                  <div className="text-[10px] text-muted-foreground font-medium mt-0.5">
                    {rowCount.toLocaleString()} rows to check
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Helpful text */}
        <div className="text-[11px] text-muted-foreground bg-accent/30 p-2.5 rounded-lg flex items-center gap-2">
          <Sparkles className="h-3.5 w-3.5 text-primary shrink-0" />
          <span>
            {selectedDatasets.length === 1 ? (
              <>Validating <strong className="text-foreground">{selectedDatasets[0].name}</strong> ({totalRowsCount.toLocaleString()} rows).</>
            ) : (
              <>
                Validating across <strong className="text-foreground">{selectedDatasets.length} spreadsheets simultaneously</strong> ({totalRowsCount.toLocaleString()} total rows). You will see a separate report card for every file!
              </>
            )}
          </span>
        </div>
      </div>

      {/* ========================================== */}
      {/* STEP 2: SET UP VALIDATION RULES */}
      {/* ========================================== */}
      <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
        
        <div className="flex flex-wrap items-center justify-between border-b border-border pb-3 gap-3">
          <div className="flex items-center gap-2">
            <span className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold font-display">
              2
            </span>
            <span className="text-xs font-bold text-foreground uppercase tracking-wider">
              Step 2: Choose Your Rules ({rules.filter((r) => r.enabled).length} active)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="h-8 gap-1.5 text-xs font-semibold"
              onClick={() => handleOpenAddRule("required")}
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Create Custom Rule</span>
            </Button>
          </div>
        </div>

        {/* Quick Rule Templates (Pre-made checks) */}
        <div className="space-y-1.5">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
            Quick One-Click Rule Templates:
          </span>
          <div className="flex flex-wrap gap-2 pt-0.5">
            <button
              onClick={() => handleOpenAddRule("required")}
              className="px-3 py-1.5 rounded-lg text-xs bg-accent hover:bg-accent/80 text-foreground border border-border flex items-center gap-1.5 font-medium transition-colors"
            >
              <CheckCircle2 className="h-3.5 w-3.5 text-success" />
              <span>Cannot Be Blank</span>
            </button>
            <button
              onClick={() => handleOpenAddRule("range")}
              className="px-3 py-1.5 rounded-lg text-xs bg-accent hover:bg-accent/80 text-foreground border border-border flex items-center gap-1.5 font-medium transition-colors"
            >
              <SlidersHorizontal className="h-3.5 w-3.5 text-blue-500" />
              <span>Number in Range (Min / Max)</span>
            </button>
            <button
              onClick={() => handleOpenAddRule("match_column")}
              className="px-3 py-1.5 rounded-lg text-xs bg-accent hover:bg-accent/80 text-foreground border border-border flex items-center gap-1.5 font-medium transition-colors"
            >
              <Layers className="h-3.5 w-3.5 text-purple-500" />
              <span>Two Columns Must Match</span>
            </button>
            <button
              onClick={() => handleOpenAddRule("compare_calculated")}
              className="px-3 py-1.5 rounded-lg text-xs bg-accent hover:bg-accent/80 text-foreground border border-border flex items-center gap-1.5 font-medium transition-colors"
            >
              <Code2 className="h-3.5 w-3.5 text-amber-500" />
              <span>Verify Math Formula</span>
            </button>
          </div>
        </div>

        {/* Active Rules List */}
        <div className="space-y-2.5 pt-1">
          {rules.length === 0 ? (
            <div className="py-6 text-center text-muted-foreground border border-dashed border-border rounded-xl text-xs">
              No rules created yet. Click one of the quick templates above!
            </div>
          ) : (
            rules.map((rule, idx) => (
              <div
                key={rule.id}
                className={`p-3.5 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 ${
                  rule.enabled
                    ? "bg-accent/20 border-border hover:border-primary/40"
                    : "bg-accent/5 border-border/50 opacity-50"
                }`}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={rule.enabled}
                    onChange={() => handleToggleRule(rule.id)}
                    className="mt-1 rounded border-border text-primary focus:ring-0 cursor-pointer h-4 w-4"
                  />
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-foreground">{rule.name}</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-accent text-muted-foreground uppercase font-semibold">
                        {rule.templateType.replace("_", " ")}
                      </span>
                    </div>

                    <div className="text-[11px] text-muted-foreground flex flex-wrap items-center gap-2">
                      <span>Checking column: <strong className="text-foreground">{rule.targetColumn}</strong></span>
                      {rule.templateType === "range" && (
                        <span>&bull; Allowed between: <strong className="text-foreground">{rule.minBound} and {rule.maxBound ?? "+∞"}</strong></span>
                      )}
                      {rule.templateType === "match_column" && (
                        <span>&bull; Must match: <strong className="text-foreground">{rule.secondaryColumn}</strong></span>
                      )}
                      {rule.formulaExpression && (
                        <span>&bull; Formula: <code className="bg-accent px-1 rounded text-primary font-mono">{rule.formulaExpression}</code></span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 self-end sm:self-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => {
                      setEditingRule({ ...rule });
                      setIsRuleModalOpen(true);
                    }}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs text-danger hover:bg-danger/10"
                    onClick={() => handleDeleteRule(rule.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Progress Bar (if validating) */}
        {isExecuting && (
          <div className="p-3 bg-primary/10 border border-primary/20 rounded-xl space-y-2 animate-pulse">
            <div className="flex items-center justify-between text-xs">
              <span className="text-primary font-bold flex items-center gap-2">
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                Grading and inspecting spreadsheets... {progressPercent}%
              </span>
              <button
                onClick={handleCancelValidation}
                className="text-xs text-danger font-semibold hover:underline"
              >
                Stop
              </button>
            </div>
            <div className="w-full h-2 rounded-full bg-accent overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-150"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}

        {/* Action Button: Run Validation */}
        <div className="flex flex-wrap items-center justify-between border-t border-border pt-4 gap-3">
          <div className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
            <Info className="h-4 w-4 text-primary shrink-0" />
            <span>
              {selectedDatasets.length === 1
                ? `Will validate ${totalRowsCount.toLocaleString()} rows in 1 spreadsheet.`
                : `Will validate ${totalRowsCount.toLocaleString()} rows across ${selectedDatasets.length} spreadsheets simultaneously.`}
            </span>
          </div>

          <Button
            className="gap-2 h-10 px-7 font-bold shadow-md shadow-primary/20 text-sm"
            onClick={handleRunValidation}
            disabled={isExecuting || rules.filter((r) => r.enabled).length === 0}
          >
            <Play className="h-4 w-4" />
            <span>
              {selectedDatasets.length === 1
                ? "Validate This Spreadsheet"
                : `Validate All ${selectedDatasets.length} Spreadsheets`}
            </span>
          </Button>
        </div>
      </div>

      {/* ========================================== */}
      {/* STEP 3: REPORT CARD & INSPECTION RESULTS */}
      {/* ========================================== */}
      {hasRun && (
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-5 animate-in fade-in duration-200">
          
          <div className="flex flex-wrap items-center justify-between border-b border-border pb-3.5 gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="h-6 w-6 rounded-full bg-success text-success-foreground flex items-center justify-center text-xs font-bold font-display">
                  3
                </span>
                <ShieldCheck className="h-5 w-5 text-success" />
                <h3 className="font-display font-bold text-lg text-foreground">
                  Validation Report Card
                </h3>
              </div>
              <p className="text-xs text-muted-foreground font-semibold mt-1">
                Completed in {totalExecutionTimeMs}ms across {selectedDatasets.length} spreadsheets ({totalRowsCount.toLocaleString()} rows checked).
              </p>
            </div>

            {/* Export Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs gap-1.5"
                onClick={handleExportExcel}
                title="Download detailed Excel Report with Mistake Checklist"
              >
                <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-500" />
                <span>Download Excel Report</span>
              </Button>

              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs gap-1.5"
                onClick={handleExportCsv}
                title="Download CSV report"
              >
                <FileText className="h-3.5 w-3.5 text-blue-500" />
                <span>Download CSV</span>
              </Button>
            </div>
          </div>

          {/* Overall Scoreboard Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="bg-accent/30 p-3.5 rounded-xl border border-border text-center sm:text-left">
              <span className="text-[10px] font-bold text-muted-foreground uppercase">Total Checks</span>
              <div className="text-xl font-display font-bold text-foreground mt-0.5">
                {overallSummary.totalChecks.toLocaleString()}
              </div>
              <span className="text-[10px] text-muted-foreground">across all files</span>
            </div>

            <div className="bg-success/10 p-3.5 rounded-xl border border-success/30 text-center sm:text-left">
              <span className="text-[10px] font-bold text-success uppercase">Passed ✅</span>
              <div className="text-xl font-display font-bold text-success mt-0.5">
                {overallSummary.passed.toLocaleString()}
              </div>
              <span className="text-[10px] text-success/80 font-semibold">{overallSummary.passRate}% pass rate</span>
            </div>

            <div className="bg-danger/10 p-3.5 rounded-xl border border-danger/30 text-center sm:text-left">
              <span className="text-[10px] font-bold text-danger uppercase">Failed (Mistakes) ❌</span>
              <div className="text-xl font-display font-bold text-danger mt-0.5">
                {overallSummary.failed.toLocaleString()}
              </div>
              <span className="text-[10px] text-danger/80">Rules broken</span>
            </div>

            <div className="bg-amber-500/10 p-3.5 rounded-xl border border-amber-500/30 text-center sm:text-left">
              <span className="text-[10px] font-bold text-amber-500 uppercase">Cannot Check ⚠️</span>
              <div className="text-xl font-display font-bold text-amber-500 mt-0.5">
                {overallSummary.cannotValidate.toLocaleString()}
              </div>
              <span className="text-[10px] text-amber-500/80">Blank or missing</span>
            </div>

            <div className="bg-purple-500/10 p-3.5 rounded-xl border border-purple-500/30 text-center sm:text-left">
              <span className="text-[10px] font-bold text-purple-500 uppercase">Errors 🛑</span>
              <div className="text-xl font-display font-bold text-purple-500 mt-0.5">
                {overallSummary.errors.toLocaleString()}
              </div>
              <span className="text-[10px] text-purple-500/80">Math faults</span>
            </div>
          </div>

          {/* Individual Spreadsheet Breakdown Cards (When > 1 file checked) */}
          {selectedDatasets.length > 1 && (
            <div className="space-y-2 pt-1">
              <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                <span>Spreadsheet Report Cards ({datasetReports.length} files):</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {datasetReports.map((rep) => {
                  const isSelected = filterDatasetName === rep.datasetName;
                  const isPerfect = rep.failedCount === 0;

                  return (
                    <div
                      key={rep.datasetId}
                      onClick={() => {
                        setFilterDatasetName(isSelected ? "all" : rep.datasetName);
                        setPage(1);
                      }}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? "bg-primary/10 border-primary ring-2 ring-primary/20 shadow-sm"
                          : "bg-accent/20 border-border hover:bg-accent/40"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-bold text-xs text-foreground truncate max-w-[190px]">
                          {rep.datasetName}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isPerfect
                            ? "bg-success/20 text-success"
                            : "bg-danger/20 text-danger"
                        }`}>
                          {rep.passRate}% Pass
                        </span>
                      </div>

                      <div className="text-xs text-muted-foreground flex items-center justify-between">
                        <span>{rep.totalRows.toLocaleString()} rows checked</span>
                        {rep.failedCount === 0 ? (
                          <span className="text-success font-semibold flex items-center gap-1">
                            <Check className="h-3 w-3" /> 0 Mistakes
                          </span>
                        ) : (
                          <span className="text-danger font-semibold">
                            {rep.failedCount} Mistakes Found
                          </span>
                        )}
                      </div>

                      {/* Progress bar */}
                      <div className="w-full bg-accent h-1.5 rounded-full overflow-hidden mt-2">
                        <div
                          className={`h-full transition-all ${isPerfect ? "bg-success" : "bg-primary"}`}
                          style={{ width: `${rep.passRate}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Results Table Filters */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                onClick={() => { setFilterOutcome("all"); setPage(1); }}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  filterOutcome === "all"
                    ? "bg-primary text-primary-foreground font-bold shadow-sm"
                    : "bg-accent text-muted-foreground hover:text-foreground"
                }`}
              >
                All Checks ({evaluationResults.length})
              </button>

              <button
                onClick={() => { setFilterOutcome("pass"); setPage(1); }}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  filterOutcome === "pass"
                    ? "bg-success text-white font-bold shadow-sm"
                    : "bg-accent text-muted-foreground hover:text-success"
                }`}
              >
                Passed ({overallSummary.passed})
              </button>

              <button
                onClick={() => { setFilterOutcome("fail"); setPage(1); }}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  filterOutcome === "fail"
                    ? "bg-danger text-white font-bold shadow-sm"
                    : "bg-accent text-muted-foreground hover:text-danger"
                }`}
              >
                Failed ({overallSummary.failed})
              </button>

              <button
                onClick={() => { setFilterOutcome("cannot_validate"); setPage(1); }}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  filterOutcome === "cannot_validate"
                    ? "bg-amber-500 text-white font-bold shadow-sm"
                    : "bg-accent text-muted-foreground hover:text-amber-500"
                }`}
              >
                Blank Cells ({overallSummary.cannotValidate})
              </button>
            </div>

            <div className="flex items-center gap-2">
              {/* Filter by file dropdown */}
              {selectedDatasets.length > 1 && (
                <select
                  value={filterDatasetName}
                  onChange={(e) => { setFilterDatasetName(e.target.value); setPage(1); }}
                  className="bg-accent border border-border rounded-lg px-2.5 py-1 text-xs font-semibold text-foreground focus:outline-none"
                >
                  <option value="all">All Files</option>
                  {selectedDatasets.map((d) => (
                    <option key={d.name} value={d.name}>
                      {d.name}
                    </option>
                  ))}
                </select>
              )}

              {/* Search box */}
              <div className="relative">
                <Search className="h-3.5 w-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search row or value..."
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                  className="bg-accent border border-border rounded-lg pl-8 pr-3 py-1 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary w-40"
                />
              </div>
            </div>
          </div>

          {/* Row-by-Row Results Table */}
          <div className="overflow-auto border border-border rounded-xl bg-accent/10 max-h-[460px]">
            <table className="w-full text-left border-collapse text-xs select-text">
              <thead className="bg-accent/40 border-b border-border sticky top-0 z-10 shadow-sm">
                <tr>
                  {selectedDatasets.length > 1 && (
                    <th className="px-3 py-2.5 font-bold text-foreground border-r border-border">
                      Spreadsheet File
                    </th>
                  )}
                  <th className="w-14 px-3 py-2.5 font-bold text-muted-foreground border-r border-border text-center">
                    Row #
                  </th>
                  <th className="px-3 py-2.5 font-bold text-foreground border-r border-border">
                    Rule Checked
                  </th>
                  <th className="px-3 py-2.5 font-bold text-foreground border-r border-border">
                    Column
                  </th>
                  <th className="px-3 py-2.5 font-bold text-foreground border-r border-border">
                    Actual Cell Value
                  </th>
                  <th className="px-3 py-2.5 font-bold text-foreground border-r border-border">
                    Expected Value
                  </th>
                  <th className="px-3 py-2.5 font-bold text-foreground border-r border-border text-center">
                    Result Status
                  </th>
                  <th className="px-3 py-2.5 font-bold text-foreground">
                    Explanation
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paginatedResults.length === 0 ? (
                  <tr>
                    <td
                      colSpan={selectedDatasets.length > 1 ? 8 : 7}
                      className="py-12 text-center text-muted-foreground font-semibold"
                    >
                      No checks match your active filters. Try picking "All Checks".
                    </td>
                  </tr>
                ) : (
                  paginatedResults.map((r, idx) => {
                    const isEven = idx % 2 === 0;

                    return (
                      <tr
                        key={idx}
                        className={`hover:bg-primary/5 transition-colors ${
                          isEven ? "bg-card" : "bg-accent/15"
                        }`}
                      >
                        {selectedDatasets.length > 1 && (
                          <td className="px-3 py-2 border-r border-border font-bold text-foreground text-xs truncate max-w-[150px]">
                            {r.datasetName}
                          </td>
                        )}
                        <td className="w-14 px-3 py-2 text-muted-foreground text-center font-mono text-[10px] border-r border-border">
                          #{r.rowId}
                        </td>
                        <td className="px-3 py-2 border-r border-border font-semibold text-foreground truncate max-w-[160px]">
                          {r.ruleName}
                        </td>
                        <td className="px-3 py-2 border-r border-border font-mono text-muted-foreground text-xs">
                          {r.targetColumn}
                        </td>
                        <td className="px-3 py-2 border-r border-border font-mono font-medium text-foreground truncate max-w-[120px]">
                          {r.actualValue !== null && r.actualValue !== undefined ? String(r.actualValue) : "null"}
                        </td>
                        <td className="px-3 py-2 border-r border-border font-mono text-muted-foreground truncate max-w-[120px]">
                          {r.expectedValue !== null && r.expectedValue !== undefined ? String(r.expectedValue) : "-"}
                        </td>
                        <td className="px-3 py-2 border-r border-border text-center">
                          <span
                            className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border inline-block ${
                              r.outcome === "pass"
                                ? "bg-success/10 text-success border-success/30"
                                : r.outcome === "fail"
                                ? "bg-danger/10 text-danger border-danger/30 font-extrabold"
                                : r.outcome === "cannot_validate"
                                ? "bg-amber-500/10 text-amber-500 border-amber-500/30"
                                : "bg-purple-500/10 text-purple-500 border-purple-500/30"
                            }`}
                          >
                            {r.outcome === "pass" ? "PASS ✅" : r.outcome === "fail" ? "FAIL ❌" : r.outcome === "cannot_validate" ? "BLANK ⚠️" : "ERROR 🛑"}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-muted-foreground leading-tight truncate max-w-[220px]" title={r.reason}>
                          {r.reason}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Table Footer Pagination */}
          {filteredResults.length > 0 && (
            <div className="flex flex-wrap items-center justify-between text-xs text-muted-foreground pt-1 select-none">
              <div>
                Showing checks{" "}
                <span className="font-bold text-foreground">
                  {(page - 1) * rowsPerPage + 1}
                </span>{" "}
                to{" "}
                <span className="font-bold text-foreground">
                  {Math.min(filteredResults.length, page * rowsPerPage)}
                </span>{" "}
                of{" "}
                <span className="font-bold text-foreground">
                  {filteredResults.length.toLocaleString()}
                </span>{" "}
                records
              </div>

              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 w-7 p-0"
                  disabled={page === 1}
                  onClick={() => setPage(1)}
                  title="First Page"
                >
                  <ChevronsLeft className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 w-7 p-0"
                  disabled={page === 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  title="Previous Page"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>

                <span className="font-bold px-2 text-foreground">
                  Page {page} of {totalPages}
                </span>

                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 w-7 p-0"
                  disabled={page === totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  title="Next Page"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 w-7 p-0"
                  disabled={page === totalPages}
                  onClick={() => setPage(totalPages)}
                  title="Last Page"
                >
                  <ChevronsRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================== */}
      {/* 10TH-GRADE STUDENT GUIDE MODAL DIALOG */}
      {/* ========================================== */}
      <Dialog
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
        title="🎓 Beginner's Guide to Data Validator"
      >
        <div className="space-y-4 text-xs text-foreground/90 font-normal leading-relaxed">
          
          <div className="p-3 bg-primary/10 border border-primary/20 rounded-xl text-primary font-medium">
            <div className="font-bold text-sm mb-1">What is Data Validation?</div>
            Think of it like a teacher grading homework with an answer key! Instead of checking thousands of spreadsheet rows by hand to spot mistakes, you give Report-IQ rules (like "Scores must be between 0 and 100"), and it checks every single cell in seconds.
          </div>

          <div className="space-y-2">
            <h4 className="font-bold text-foreground text-sm flex items-center gap-1.5">
              <span className="h-5 w-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px]">1</span>
              Checking Multiple Spreadsheets at Once
            </h4>
            <p className="text-muted-foreground">
              Have 3, 4, or 5 different spreadsheets (like Gradebooks for Term 1, Term 2, Term 3, or monthly attendance sheets)?
            </p>
            <p className="text-muted-foreground">
              In <strong>Step 1</strong>, just check all the spreadsheets you want to inspect! The Data Validator will grade all of them at the same time and show you a separate report card for every file!
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="font-bold text-foreground text-sm flex items-center gap-1.5">
              <span className="h-5 w-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px]">2</span>
              Common Rule Types (With Easy Examples)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              <div className="p-2.5 rounded-lg border border-border bg-accent/20">
                <span className="font-bold text-foreground block mb-0.5">Cannot Be Blank</span>
                <span className="text-muted-foreground">
                  Checks that every row has a value.
                  <br />
                  <em className="text-primary font-semibold">Example:</em> Every student must have an ID number.
                </span>
              </div>
              <div className="p-2.5 rounded-lg border border-border bg-accent/20">
                <span className="font-bold text-foreground block mb-0.5">Number Range (Min / Max)</span>
                <span className="text-muted-foreground">
                  Keeps numbers between realistic boundaries.
                  <br />
                  <em className="text-primary font-semibold">Example:</em> Exam scores must be between 0 and 100.
                </span>
              </div>
              <div className="p-2.5 rounded-lg border border-border bg-accent/20">
                <span className="font-bold text-foreground block mb-0.5">Two Columns Must Match</span>
                <span className="text-muted-foreground">
                  Verifies that Column A equals Column B.
                  <br />
                  <em className="text-primary font-semibold">Example:</em> Password must equal Confirm Password.
                </span>
              </div>
              <div className="p-2.5 rounded-lg border border-border bg-accent/20">
                <span className="font-bold text-foreground block mb-0.5">Verify Math Formula</span>
                <span className="text-muted-foreground">
                  Recalculates a math formula to catch errors.
                  <br />
                  <em className="text-primary font-semibold">Example:</em> Total must equal Price × Quantity.
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="font-bold text-foreground text-sm flex items-center gap-1.5">
              <span className="h-5 w-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px]">3</span>
              What Do The Result Badges Mean?
            </h4>
            <ul className="space-y-1.5 text-muted-foreground list-disc pl-4">
              <li><strong className="text-success">PASS ✅:</strong> Perfect! This row followed the rule with no issues.</li>
              <li><strong className="text-danger">FAIL ❌:</strong> Mistake found! The cell value was wrong (e.g. score was 150 instead of 100).</li>
              <li><strong className="text-amber-500">BLANK ⚠️:</strong> The cell was empty, so the check could not be completed.</li>
              <li><strong className="text-purple-500">ERROR 🛑:</strong> Math error in formula (like dividing by zero).</li>
            </ul>
          </div>

          <div className="space-y-2">
            <h4 className="font-bold text-foreground text-sm flex items-center gap-1.5">
              <span className="h-5 w-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px]">4</span>
              Exporting Your Mistake Checklist
            </h4>
            <p className="text-muted-foreground">
              Click <strong className="text-foreground">Download Excel Report</strong> to get an Excel file containing a summary report card plus a dedicated <strong className="text-foreground">"Mistakes_To_Fix"</strong> tab that lists only the rows with problems!
            </p>
          </div>

          <div className="pt-3 flex justify-end border-t border-border">
            <Button size="sm" onClick={() => setIsGuideOpen(false)}>
              Got it, thanks!
            </Button>
          </div>
        </div>
      </Dialog>

      {/* ========================================== */}
      {/* RULE BUILDER / EDIT MODAL */}
      {/* ========================================== */}
      {isRuleModalOpen && editingRule && (
        <Dialog
          isOpen={isRuleModalOpen}
          onClose={() => setIsRuleModalOpen(false)}
          title="Create a Validation Rule"
        >
          <div className="space-y-4 text-xs">
            {/* Rule Name */}
            <div>
              <label className="block text-xs font-bold text-foreground mb-1">
                Rule Name
              </label>
              <input
                type="text"
                placeholder="e.g. Check that Exam Score is between 0 and 100"
                value={editingRule.name || ""}
                onChange={(e) => setEditingRule((prev) => ({ ...prev, name: e.target.value }))}
                className="w-full bg-accent/40 border border-border rounded-lg p-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 font-medium"
                autoFocus
              />
            </div>

            {/* Template Type */}
            <div>
              <label className="block text-xs font-bold text-foreground mb-1">
                Rule Type
              </label>
              <select
                value={editingRule.templateType}
                onChange={(e) => {
                  const t = e.target.value as RuleTemplateType;
                  setEditingRule((prev) => ({
                    ...prev,
                    templateType: t,
                    category: t === "calculate" ? "calculation" : "validation",
                  }));
                }}
                className="w-full bg-accent/40 border border-border rounded-lg p-2 text-xs font-semibold text-foreground focus:outline-none"
              >
                <option value="required">Cannot Be Blank (Must have a value)</option>
                <option value="range">Number in Range (Min / Max)</option>
                <option value="match_column">Must Match Another Column</option>
                <option value="compare_calculated">Verify Math Formula (Check recorded vs calculated)</option>
                <option value="calculate">Calculate Expected Value</option>
                <option value="custom_formula">Custom Math Formula (Advanced)</option>
              </select>
            </div>

            {/* Target Column */}
            <div>
              <label className="block text-xs font-bold text-foreground mb-1">
                Which Column to Check?
              </label>
              <select
                value={editingRule.targetColumn}
                onChange={(e) => setEditingRule((prev) => ({ ...prev, targetColumn: e.target.value }))}
                className="w-full bg-accent/40 border border-border rounded-lg p-2 text-xs font-semibold text-foreground focus:outline-none"
              >
                {availableColumns.map((col) => (
                  <option key={col.name} value={col.name}>
                    {col.name} ({col.type})
                  </option>
                ))}
              </select>
            </div>

            {/* Range options */}
            {editingRule.templateType === "range" && (
              <div className="grid grid-cols-2 gap-3 p-3 bg-accent/20 border border-border rounded-xl">
                <div>
                  <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">
                    Minimum Allowed Value
                  </label>
                  <input
                    type="number"
                    value={editingRule.minBound ?? 0}
                    onChange={(e) => setEditingRule((prev) => ({ ...prev, minBound: Number(e.target.value) }))}
                    className="w-full bg-card border border-border rounded-lg p-1.5 text-xs text-foreground focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">
                    Maximum Allowed Value
                  </label>
                  <input
                    type="number"
                    value={editingRule.maxBound ?? 100}
                    onChange={(e) => setEditingRule((prev) => ({ ...prev, maxBound: Number(e.target.value) }))}
                    className="w-full bg-card border border-border rounded-lg p-1.5 text-xs text-foreground focus:outline-none"
                  />
                </div>
              </div>
            )}

            {/* Match column option */}
            {editingRule.templateType === "match_column" && (
              <div className="p-3 bg-accent/20 border border-border rounded-xl">
                <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">
                  Must Equal Values in Column:
                </label>
                <select
                  value={editingRule.secondaryColumn}
                  onChange={(e) => setEditingRule((prev) => ({ ...prev, secondaryColumn: e.target.value }))}
                  className="w-full bg-card border border-border rounded-lg p-1.5 text-xs font-semibold text-foreground focus:outline-none"
                >
                  {availableColumns.map((col) => (
                    <option key={col.name} value={col.name}>
                      {col.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Formula expression */}
            {["calculate", "compare_calculated", "custom_formula"].includes(editingRule.templateType || "") && (
              <div className="p-3 bg-accent/20 border border-border rounded-xl space-y-2">
                <label className="block text-[10px] font-bold text-muted-foreground uppercase">
                  Math Formula (Use [Column_Name] in brackets)
                </label>
                <input
                  type="text"
                  placeholder="e.g. [Price] * [Quantity] or [Exam] + [Homework]"
                  value={editingRule.formulaExpression || ""}
                  onChange={(e) => setEditingRule((prev) => ({ ...prev, formulaExpression: e.target.value }))}
                  className="w-full bg-card border border-border rounded-lg p-2 text-xs font-mono text-primary focus:outline-none"
                />
                <span className="text-[10px] text-muted-foreground block">
                  Example: <code className="text-foreground">[Price] * [Quantity]</code> or <code className="text-foreground">[Subtotal] + [Tax]</code>
                </span>

                {ruleSyntaxError && (
                  <div className="p-2 rounded bg-danger/10 border border-danger/20 text-danger text-[11px]">
                    Syntax Error: {ruleSyntaxError}
                  </div>
                )}
              </div>
            )}

            {/* Modal action buttons */}
            <div className="pt-3 flex justify-end gap-2 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsRuleModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSaveRule}
              >
                Save Rule
              </Button>
            </div>
          </div>
        </Dialog>
      )}

    </div>
  );
}
