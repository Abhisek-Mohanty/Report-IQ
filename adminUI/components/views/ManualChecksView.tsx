"use client";

import React, { useState, useMemo, useRef } from "react";
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
  evaluateRuleOnRow,
  executeValidationSuite,
} from "@/utils/validatorFormulaEngine";
import {
  CheckSquare,
  UploadCloud,
  Database,
  Plus,
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
} from "lucide-react";
import { Button } from "@/components/ui/button";

export function ManualChecksView() {
  const datasets = useAnalyticsStore((state) => state.datasets);
  const selectedDatasetId = useAnalyticsStore((state) => state.selectedDatasetId);
  const selectedSheetName = useAnalyticsStore((state) => state.selectedSheetName);
  const selectDataset = useAnalyticsStore((state) => state.selectDataset);
  const selectSheet = useAnalyticsStore((state) => state.selectSheet);
  const setActiveTab = useAnalyticsStore((state) => state.setActiveTab);

  // Active dataset and sheet resolution
  const activeDataset: Dataset | null = useMemo(() => {
    return datasets.find((d) => d.id === selectedDatasetId) || datasets[0] || null;
  }, [datasets, selectedDatasetId]);

  const activeSheet: SheetData | null = useMemo(() => {
    if (!activeDataset) return null;
    return (
      activeDataset.sheets.find((s) => s.name === selectedSheetName) ||
      activeDataset.sheets[0] ||
      null
    );
  }, [activeDataset, selectedSheetName]);

  // Working state key: isolates state by dataset and sheet
  const scopeKey = useMemo(() => {
    return `${activeDataset?.id || "none"}:${activeSheet?.name || "none"}`;
  }, [activeDataset, activeSheet]);

  // Default initial rules for the active sheet
  const defaultRules: ManualRuleConfig[] = useMemo(() => {
    if (!activeSheet || activeSheet.headers.length === 0) return [];
    const headers = activeSheet.headers;
    const numCol = headers.find((h) => activeSheet.columnTypes[h] === "number") || headers[0];
    const catCol = headers.find((h) => activeSheet.columnTypes[h] === "string") || headers[0];

    return [
      {
        id: "rule_1",
        name: `Required ${catCol}`,
        description: `Ensure ${catCol} is non-empty for all records`,
        templateType: "required",
        category: "validation",
        enabled: true,
        targetColumn: catCol,
      },
      {
        id: "rule_2",
        name: `Positive ${numCol}`,
        description: `Verify that ${numCol} is greater than or equal to 0`,
        templateType: "range",
        category: "validation",
        enabled: true,
        targetColumn: numCol,
        minBound: 0,
        inclusiveBounds: true,
      },
    ];
  }, [activeSheet]);

  const [manualRulesByScope, setManualRulesByScope] = useState<Record<string, ManualRuleConfig[]>>({});
  const [suiteResultsByScope, setSuiteResultsByScope] = useState<
    Record<string, { results: RuleEvaluationResult[]; summary: ValidationSuiteSummary | null }>
  >({});
  const [isExecutingValidation, setIsExecutingValidation] = useState<boolean>(false);
  const [validationProgress, setValidationProgress] = useState<number>(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Filter & Search state for results table
  const [resultOutcomeFilter, setResultOutcomeFilter] = useState<string>("all");
  const [resultRuleFilter, setResultRuleFilter] = useState<string>("all");
  const [resultSearchQuery, setResultSearchQuery] = useState<string>("");

  // Rule Builder Modal state
  const [isRuleModalOpen, setIsRuleModalOpen] = useState<boolean>(false);
  const [editingRule, setEditingRule] = useState<Partial<ManualRuleConfig> | null>(null);
  const [ruleSyntaxError, setRuleSyntaxError] = useState<string | null>(null);

  // Active rules for current dataset/sheet
  const currentRules = manualRulesByScope[scopeKey] || defaultRules;
  const currentResultsData = suiteResultsByScope[scopeKey] || { results: [], summary: null };

  const setCurrentRules = (updater: (prev: ManualRuleConfig[]) => ManualRuleConfig[]) => {
    setManualRulesByScope((prev) => {
      const existing = prev[scopeKey] || defaultRules;
      const updated = updater(existing);
      return { ...prev, [scopeKey]: updated };
    });
    // Mark results stale when rules change
    setSuiteResultsByScope((prev) => {
      const entry = prev[scopeKey];
      if (!entry || !entry.summary) return prev;
      return {
        ...prev,
        [scopeKey]: {
          ...entry,
          summary: { ...entry.summary, isStale: true },
        },
      };
    });
  };

  // Execute manual validation suite
  const handleRunValidation = async () => {
    if (!activeSheet || !activeDataset) {
      toast.error("No active dataset selected.");
      return;
    }
    const enabled = currentRules.filter((r) => r.enabled);
    if (enabled.length === 0) {
      toast.error("Please enable at least one rule to run validation.");
      return;
    }

    try {
      setIsExecutingValidation(true);
      setValidationProgress(0);
      abortControllerRef.current = new AbortController();

      const { results, summary } = await executeValidationSuite(
        activeSheet,
        activeDataset.id,
        currentRules,
        (progress) => setValidationProgress(progress),
        abortControllerRef.current.signal
      );

      setSuiteResultsByScope((prev) => ({
        ...prev,
        [scopeKey]: { results, summary },
      }));

      toast.success(
        `Validation finished! Evaluated ${summary.totalEvaluations.toLocaleString()} assertions in ${summary.executionDurationMs}ms.`
      );
    } catch (err: any) {
      if (err.message?.includes("cancelled")) {
        toast.info("Validation was cancelled.");
      } else {
        toast.error(`Validation failed: ${err.message}`);
      }
    } finally {
      setIsExecutingValidation(false);
      abortControllerRef.current = null;
    }
  };

  // Cancel validation execution
  const handleCancelValidation = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  // Open Rule Modal
  const handleOpenAddRule = (template: RuleTemplateType = "required") => {
    const targetCol = activeSheet?.headers[0] || "";
    const isCalc = template === "calculate";

    setEditingRule({
      id: `rule_${Date.now()}`,
      name:
        template === "required"
          ? `Required ${targetCol}`
          : template === "range"
          ? `Range check on ${targetCol}`
          : template === "match_column"
          ? `Match ${targetCol} with ${activeSheet?.headers[1] || targetCol}`
          : template === "calculate"
          ? `Calculate Expected ${targetCol}`
          : template === "compare_calculated"
          ? `Verify ${targetCol} Formula`
          : "Custom Business Condition",
      templateType: template,
      category: isCalc ? "calculation" : "validation",
      enabled: true,
      targetColumn: targetCol,
      secondaryColumn: activeSheet?.headers[1] || targetCol,
      minBound: 0,
      maxBound: 1000000,
      inclusiveBounds: true,
      numericTolerance: 0.01,
      roundingDecimals: 2,
      formulaExpression: `[${targetCol}]`,
    });
    setRuleSyntaxError(null);
    setIsRuleModalOpen(true);
  };

  // Save rule from modal
  const handleSaveRule = () => {
    if (!editingRule || !editingRule.name || !editingRule.targetColumn) {
      toast.error("Please provide rule name and target column.");
      return;
    }

    // Validate formula if applicable
    if (
      ["calculate", "compare_calculated", "custom_formula"].includes(editingRule.templateType || "")
    ) {
      const expr = editingRule.formulaExpression || "";
      const { error } = compileFormula(expr);
      if (error) {
        setRuleSyntaxError(error);
        return;
      }
    }

    const ruleToSave = editingRule as ManualRuleConfig;
    setCurrentRules((prev) => {
      const idx = prev.findIndex((r) => r.id === ruleToSave.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = ruleToSave;
        return copy;
      }
      return [...prev, ruleToSave];
    });

    setIsRuleModalOpen(false);
    setEditingRule(null);
    toast.success(`Rule "${ruleToSave.name}" saved!`);
  };

  // Delete rule
  const handleDeleteRule = (id: string) => {
    setCurrentRules((prev) => prev.filter((r) => r.id !== id));
    toast.success("Rule removed.");
  };

  // Toggle rule
  const handleToggleRule = (id: string) => {
    setCurrentRules((prev) =>
      prev.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r))
    );
  };

  // Filtered results for the table
  const filteredResults = useMemo(() => {
    const list = currentResultsData.results;
    return list.filter((item) => {
      if (resultOutcomeFilter !== "all" && item.outcome !== resultOutcomeFilter) {
        return false;
      }
      if (resultRuleFilter !== "all" && item.ruleId !== resultRuleFilter) {
        return false;
      }
      if (resultSearchQuery.trim()) {
        const q = resultSearchQuery.toLowerCase();
        const rowMatch = `row #${item.rowId}`.includes(q) || String(item.rowId).includes(q);
        const colMatch = item.targetColumn.toLowerCase().includes(q);
        const reasonMatch = item.reason.toLowerCase().includes(q);
        const actualMatch = String(item.actualValue ?? "").toLowerCase().includes(q);
        if (!rowMatch && !colMatch && !reasonMatch && !actualMatch) {
          return false;
        }
      }
      return true;
    });
  }, [currentResultsData.results, resultOutcomeFilter, resultRuleFilter, resultSearchQuery]);

  // Export Results to CSV
  const handleExportResultsCsv = () => {
    if (currentResultsData.results.length === 0) {
      toast.error("No results to export.");
      return;
    }

    const headers = [
      "Row_ID",
      "Rule_Name",
      "Category",
      "Target_Column",
      "Actual_Value",
      "Expected_Value",
      "Outcome",
      "Reason",
    ];

    const rows = currentResultsData.results.map((r) => [
      r.rowId,
      `"${r.ruleName.replace(/"/g, '""')}"`,
      r.category,
      `"${r.targetColumn.replace(/"/g, '""')}"`,
      `"${String(r.actualValue ?? "").replace(/"/g, '""')}"`,
      `"${String(r.expectedValue ?? "").replace(/"/g, '""')}"`,
      r.outcome.toUpperCase(),
      `"${r.reason.replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Validation_Results_${activeDataset?.name || "Dataset"}_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Validation results exported to CSV.");
  };

  // =========================================================================
  // ZERO-STATE: NO DATASET SELECTED
  // =========================================================================
  if (!activeDataset || !activeSheet) {
    return (
      <div className="min-h-[700px] flex flex-col items-center justify-center p-8 text-center space-y-6 max-w-2xl mx-auto">
        <div className="w-20 h-20 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shadow-xl shadow-emerald-500/5">
          <CheckSquare className="w-10 h-10" />
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-extrabold text-white tracking-tight">
            Data Validation & Manual Checks
          </h2>
          <p className="text-sm text-slate-400 leading-relaxed max-w-md mx-auto">
            Build client-side validation rules and formulas with instant local execution, tolerance checks, and CSV reporting.
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full text-left space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <Database className="w-4 h-4 text-emerald-400" />
            Get Started: Select or Upload a Dataset
          </h3>

          {datasets.length > 0 ? (
            <div className="space-y-3">
              <p className="text-xs text-slate-400">Choose one of your existing datasets to validate:</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {datasets.map((d) => (
                  <button
                    key={d.id}
                    onClick={() => selectDataset(d.id)}
                    className="p-3 rounded-xl border border-slate-800 bg-slate-800/50 hover:bg-slate-800 hover:border-emerald-500/50 text-left transition-all"
                  >
                    <div className="text-xs font-bold text-white truncate">{d.name}</div>
                    <div className="text-[11px] text-slate-400 mt-1">
                      {d.sheets.length} Sheet(s) &bull; {d.sheets[0]?.rowCount.toLocaleString()} rows
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-400">
              No datasets loaded yet. Upload your Excel or CSV file to start creating checks.
            </p>
          )}

          <div className="pt-2 flex items-center justify-end">
            <Button
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs gap-2"
              onClick={() => setActiveTab("upload")}
            >
              <UploadCloud className="w-4 h-4" />
              Upload New Dataset
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-8 pb-20 animate-in fade-in duration-200">
      {/* =========================================================================
          TOP BANNER: SCOPE & OVERVIEW
         ========================================================================= */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-48 bg-gradient-to-bl from-emerald-500/10 via-teal-500/5 to-transparent pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <CheckSquare className="w-3.5 h-3.5" />
                Data Prep & Visuals Module
              </span>

              {/* Dataset & Sheet Switcher */}
              <div className="flex items-center gap-1.5 bg-slate-800/90 px-3 py-1 rounded-lg border border-slate-700 text-xs text-slate-300">
                <Database className="w-3.5 h-3.5 text-slate-400" />
                <span>Dataset:</span>
                <select
                  value={activeDataset.id}
                  onChange={(e) => selectDataset(e.target.value)}
                  className="bg-transparent text-white font-semibold focus:outline-none cursor-pointer"
                >
                  {datasets.map((d) => (
                    <option key={d.id} value={d.id} className="bg-slate-900 text-white">
                      {d.name}
                    </option>
                  ))}
                </select>
                <span className="text-slate-600">&bull;</span>
                <span>Sheet:</span>
                <select
                  value={activeSheet.name}
                  onChange={(e) => selectSheet(e.target.value)}
                  className="bg-transparent text-white font-semibold focus:outline-none cursor-pointer"
                >
                  {activeDataset.sheets.map((s) => (
                    <option key={s.name} value={s.name} className="bg-slate-900 text-white">
                      {s.name} ({s.rowCount.toLocaleString()} rows)
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Create a Check (Rule Checks & Formulas)
            </h1>
            <p className="text-sm text-slate-400 max-w-3xl">
              Configure deterministic data validation rules, bounds checks, column matches, and custom calculated formulas. Runs 100% locally with zero API or LLM latency.
            </p>
          </div>

          <div className="flex items-center gap-2 pt-2 lg:pt-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActiveTab("ai-validator")}
              className="border-slate-700 text-slate-300 hover:bg-slate-800 text-xs gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>AI Report Validator</span>
              <ArrowRight className="w-3 h-3 text-slate-500" />
            </Button>
          </div>
        </div>
      </div>

      {/* =========================================================================
          RULES SUITE MANAGER
         ========================================================================= */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <CheckSquare className="w-5 h-5 text-emerald-400" />
              Active Rule Suite
            </h2>
            <p className="text-xs text-slate-400">
              Sandboxed AST expression engine with floating-point tolerance handling and financial precision.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              onClick={() => handleOpenAddRule("required")}
              className="bg-slate-800 hover:bg-slate-700 text-white text-xs border border-slate-700"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              Add Rule
            </Button>

            <Button
              size="sm"
              disabled={isExecutingValidation || currentRules.filter((r) => r.enabled).length === 0}
              onClick={handleRunValidation}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs gap-2 px-4 shadow-sm shadow-emerald-600/20"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Run Validation ({activeSheet.rowCount.toLocaleString()} rows)</span>
            </Button>
          </div>
        </div>

        {/* Quick Template Picker Buttons */}
        <div className="space-y-2 pt-2 border-t border-slate-800">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Quick Template Builders:
          </span>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => handleOpenAddRule("required")}
              className="px-3 py-1.5 rounded-lg text-xs bg-slate-800/80 hover:bg-slate-800 text-slate-200 border border-slate-700 flex items-center gap-1.5 transition-colors"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Required Value</span>
            </button>
            <button
              type="button"
              onClick={() => handleOpenAddRule("range")}
              className="px-3 py-1.5 rounded-lg text-xs bg-slate-800/80 hover:bg-slate-800 text-slate-200 border border-slate-700 flex items-center gap-1.5 transition-colors"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-blue-400" />
              <span>Value within Range</span>
            </button>
            <button
              type="button"
              onClick={() => handleOpenAddRule("match_column")}
              className="px-3 py-1.5 rounded-lg text-xs bg-slate-800/80 hover:bg-slate-800 text-slate-200 border border-slate-700 flex items-center gap-1.5 transition-colors"
            >
              <Layers className="w-3.5 h-3.5 text-purple-400" />
              <span>Match Another Column</span>
            </button>
            <button
              type="button"
              onClick={() => handleOpenAddRule("calculate")}
              className="px-3 py-1.5 rounded-lg text-xs bg-slate-800/80 hover:bg-slate-800 text-slate-200 border border-slate-700 flex items-center gap-1.5 transition-colors"
            >
              <Code2 className="w-3.5 h-3.5 text-amber-400" />
              <span>Calculate Expected Value</span>
            </button>
            <button
              type="button"
              onClick={() => handleOpenAddRule("compare_calculated")}
              className="px-3 py-1.5 rounded-lg text-xs bg-slate-800/80 hover:bg-slate-800 text-slate-200 border border-slate-700 flex items-center gap-1.5 transition-colors"
            >
              <CheckSquare className="w-3.5 h-3.5 text-teal-400" />
              <span>Compare Calculated vs Recorded</span>
            </button>
            <button
              type="button"
              onClick={() => handleOpenAddRule("custom_formula")}
              className="px-3 py-1.5 rounded-lg text-xs bg-slate-800/80 hover:bg-slate-800 text-slate-200 border border-slate-700 flex items-center gap-1.5 ml-auto text-indigo-300 font-semibold transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>Advanced Custom Formula</span>
            </button>
          </div>
        </div>

        {/* Execution Progress Bar (if running) */}
        {isExecutingValidation && (
          <div className="bg-slate-950 p-4 rounded-xl border border-emerald-500/30 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-emerald-400 font-bold flex items-center gap-2">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                Executing Validation Suite... {validationProgress}%
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCancelValidation}
                className="text-xs text-rose-400 hover:text-rose-300 h-6 px-2"
              >
                Cancel
              </Button>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-emerald-500 transition-all duration-150"
                style={{ width: `${validationProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Active Rules List */}
        <div className="space-y-3">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Configured Rules ({currentRules.length})
          </span>

          {currentRules.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500 bg-slate-950/40 rounded-xl border border-slate-800">
              No validation rules created yet. Click one of the template builders above to add a check.
            </div>
          ) : (
            <div className="space-y-2.5">
              {currentRules.map((rule) => (
                <div
                  key={rule.id}
                  className={`p-3.5 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 ${
                    rule.enabled
                      ? "bg-slate-800/50 border-slate-700/80"
                      : "bg-slate-900/40 border-slate-800/60 opacity-60"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={rule.enabled}
                      onChange={() => handleToggleRule(rule.id)}
                      className="mt-1 rounded border-slate-700 text-emerald-600 focus:ring-0 cursor-pointer"
                    />
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">{rule.name}</span>
                        <span
                          className={`text-[10px] uppercase font-semibold px-1.5 py-0.2 rounded border ${
                            rule.category === "calculation"
                              ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                              : "bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
                          }`}
                        >
                          {rule.category}
                        </span>
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
                          {rule.templateType}
                        </span>
                      </div>

                      <div className="text-[11px] text-slate-400 flex flex-wrap items-center gap-2">
                        <span>
                          Target: <strong className="text-slate-300 font-mono">{rule.targetColumn}</strong>
                        </span>
                        {rule.secondaryColumn && (
                          <span>
                            &bull; Match With:{" "}
                            <strong className="text-slate-300 font-mono">{rule.secondaryColumn}</strong>
                          </span>
                        )}
                        {rule.minBound !== undefined && (
                          <span>
                            &bull; Range: [{rule.minBound}, {rule.maxBound ?? "+∞"}]
                          </span>
                        )}
                        {rule.formulaExpression && (
                          <span className="font-mono text-indigo-300 text-[11px]">
                            &bull; {rule.formulaExpression}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditingRule({ ...rule });
                        setIsRuleModalOpen(true);
                      }}
                      className="text-xs text-slate-300 hover:text-white h-7 px-2"
                    >
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteRule(rule.id)}
                      className="text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 h-7 px-2"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* =========================================================================
          RESULTS DASHBOARD (DISTINGUISHES CALCULATION VS VALIDATION)
         ========================================================================= */}
      {currentResultsData.summary && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-6 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-800">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  Validation Outcomes & Execution Results
                </h3>
                {currentResultsData.summary.isStale && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    Results Stale (Rules Modified)
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                Executed locally across {currentResultsData.summary.totalRows.toLocaleString()} rows in {currentResultsData.summary.executionDurationMs}ms
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportResultsCsv}
                className="border-slate-700 text-xs text-slate-200 hover:bg-slate-800 gap-1.5"
              >
                <FileDown className="w-3.5 h-3.5 text-emerald-400" />
                <span>Export Validation CSV</span>
              </Button>
            </div>
          </div>

          {/* Summary Scoreboard KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="bg-slate-800/40 p-3 rounded-xl border border-slate-700/60">
              <span className="text-[11px] text-slate-400 uppercase font-medium">Evaluations</span>
              <div className="text-lg font-bold text-white mt-1">
                {currentResultsData.summary.totalEvaluations.toLocaleString()}
              </div>
              <span className="text-[10px] text-slate-500">
                {currentResultsData.summary.totalRows.toLocaleString()} dataset rows
              </span>
            </div>

            <div className="bg-emerald-950/20 p-3 rounded-xl border border-emerald-500/20">
              <span className="text-[11px] text-emerald-400 uppercase font-medium">Passed</span>
              <div className="text-lg font-bold text-emerald-400 mt-1">
                {currentResultsData.summary.passedCount.toLocaleString()}
              </div>
              <span className="text-[10px] text-slate-500">
                {currentResultsData.summary.totalEvaluations > 0
                  ? (
                      (currentResultsData.summary.passedCount /
                        currentResultsData.summary.totalEvaluations) *
                      100
                    ).toFixed(1)
                  : 0}
                % pass rate
              </span>
            </div>

            <div className="bg-rose-950/20 p-3 rounded-xl border border-rose-500/20">
              <span className="text-[11px] text-rose-400 uppercase font-medium">Failed</span>
              <div className="text-lg font-bold text-rose-400 mt-1">
                {currentResultsData.summary.failedCount.toLocaleString()}
              </div>
              <span className="text-[10px] text-slate-500">Defect anomalies</span>
            </div>

            <div className="bg-amber-950/20 p-3 rounded-xl border border-amber-500/20">
              <span className="text-[11px] text-amber-400 uppercase font-medium">Cannot Validate</span>
              <div className="text-lg font-bold text-amber-400 mt-1">
                {currentResultsData.summary.cannotValidateCount.toLocaleString()}
              </div>
              <span className="text-[10px] text-slate-500">Blank or missing inputs</span>
            </div>

            <div className="bg-purple-950/20 p-3 rounded-xl border border-purple-500/20">
              <span className="text-[11px] text-purple-400 uppercase font-medium">Errors</span>
              <div className="text-lg font-bold text-purple-400 mt-1">
                {currentResultsData.summary.errorCount.toLocaleString()}
              </div>
              <span className="text-[10px] text-slate-500">Div by zero / type faults</span>
            </div>
          </div>

          {/* Working Filters & Search Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                onClick={() => setResultOutcomeFilter("all")}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                  resultOutcomeFilter === "all"
                    ? "bg-slate-700 text-white"
                    : "bg-slate-800 text-slate-400 hover:text-white"
                }`}
              >
                All ({currentResultsData.results.length})
              </button>
              <button
                onClick={() => setResultOutcomeFilter("pass")}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                  resultOutcomeFilter === "pass"
                    ? "bg-emerald-600 text-white"
                    : "bg-slate-800 text-slate-400 hover:text-emerald-400"
                }`}
              >
                Pass ({currentResultsData.summary.passedCount})
              </button>
              <button
                onClick={() => setResultOutcomeFilter("fail")}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                  resultOutcomeFilter === "fail"
                    ? "bg-rose-600 text-white"
                    : "bg-slate-800 text-slate-400 hover:text-rose-400"
                }`}
              >
                Fail ({currentResultsData.summary.failedCount})
              </button>
              <button
                onClick={() => setResultOutcomeFilter("cannot_validate")}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                  resultOutcomeFilter === "cannot_validate"
                    ? "bg-amber-600 text-white"
                    : "bg-slate-800 text-slate-400 hover:text-amber-400"
                }`}
              >
                Cannot Validate ({currentResultsData.summary.cannotValidateCount})
              </button>
              <button
                onClick={() => setResultOutcomeFilter("error")}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                  resultOutcomeFilter === "error"
                    ? "bg-purple-600 text-white"
                    : "bg-slate-800 text-slate-400 hover:text-purple-400"
                }`}
              >
                Errors ({currentResultsData.summary.errorCount})
              </button>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={resultRuleFilter}
                onChange={(e) => setResultRuleFilter(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded-lg p-1.5 text-xs text-white"
              >
                <option value="all">All Rules</option>
                {currentRules.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>

              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Search row or value..."
                  value={resultSearchQuery}
                  onChange={(e) => setResultSearchQuery(e.target.value)}
                  className="bg-slate-800 border border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 w-40 sm:w-48"
                />
              </div>
            </div>
          </div>

          {/* Row-by-Row Evaluation Table */}
          <div className="overflow-x-auto max-h-96 rounded-xl border border-slate-800">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-950 text-slate-400 sticky top-0">
                <tr>
                  <th className="p-2.5 font-semibold">Row</th>
                  <th className="p-2.5 font-semibold">Rule Name</th>
                  <th className="p-2.5 font-semibold">Target Column</th>
                  <th className="p-2.5 font-semibold">Actual / Recorded</th>
                  <th className="p-2.5 font-semibold">Expected / Calculated</th>
                  <th className="p-2.5 font-semibold">Outcome</th>
                  <th className="p-2.5 font-semibold">Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 text-slate-300">
                {filteredResults.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-slate-500">
                      No results matching the active filter.
                    </td>
                  </tr>
                ) : (
                  filteredResults.slice(0, 500).map((r, idx) => (
                    <tr key={idx} className="hover:bg-slate-900/50">
                      <td className="p-2.5 font-mono text-slate-400">#{r.rowId}</td>
                      <td className="p-2.5 font-semibold text-white">{r.ruleName}</td>
                      <td className="p-2.5 font-mono text-slate-300">{r.targetColumn}</td>
                      <td className="p-2.5 font-mono text-slate-200">
                        {r.actualValue !== null && r.actualValue !== undefined
                          ? String(r.actualValue)
                          : "null"}
                      </td>
                      <td className="p-2.5 font-mono text-slate-200">
                        {r.expectedValue !== null && r.expectedValue !== undefined
                          ? String(r.expectedValue)
                          : "-"}
                      </td>
                      <td className="p-2.5">
                        <span
                          className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border inline-block ${
                            r.outcome === "pass"
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                              : r.outcome === "fail"
                              ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                              : r.outcome === "cannot_validate"
                              ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                              : "bg-purple-500/10 text-purple-400 border-purple-500/20"
                          }`}
                        >
                          {r.outcome.replace("_", " ")}
                        </span>
                      </td>
                      <td className="p-2.5 text-slate-400 leading-tight max-w-xs truncate" title={r.reason}>
                        {r.reason}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {filteredResults.length > 500 && (
            <p className="text-[11px] text-slate-500 text-right">
              Showing first 500 of {filteredResults.length.toLocaleString()} matching records. Use CSV export for full details.
            </p>
          )}
        </div>
      )}

      {/* =========================================================================
          RULE CREATION / EDITING MODAL
         ========================================================================= */}
      {isRuleModalOpen && editingRule && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <CheckSquare className="w-5 h-5 text-emerald-400" />
                <span>Configure Validation Rule</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsRuleModalOpen(false)}
                className="text-slate-400 hover:text-white text-lg font-bold px-2"
              >
                ✕
              </button>
            </div>

            {/* Template Type Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">Rule Template</label>
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
                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-xs text-white"
              >
                <option value="required">Required Value (Must not be blank)</option>
                <option value="range">Value within a Range (Min / Max)</option>
                <option value="match_column">Match Another Column</option>
                <option value="calculate">Calculate an Expected Value (Calculation Only)</option>
                <option value="compare_calculated">Compare Calculated with Existing Column</option>
                <option value="custom_formula">Advanced Custom Formula (Boolean Condition)</option>
              </select>
            </div>

            {/* Rule Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">Rule Name</label>
              <input
                type="text"
                value={editingRule.name || ""}
                onChange={(e) => setEditingRule((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="e.g. Valid Service Amount"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-xs text-white"
              />
            </div>

            {/* Target Column */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">Target Column</label>
              <select
                value={editingRule.targetColumn}
                onChange={(e) =>
                  setEditingRule((prev) => ({ ...prev, targetColumn: e.target.value }))
                }
                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-xs text-white"
              >
                {activeSheet.headers.map((h) => (
                  <option key={h} value={h}>
                    {h} ({activeSheet.columnTypes[h] || "string"})
                  </option>
                ))}
              </select>
            </div>

            {/* Template Specific Options */}
            {editingRule.templateType === "range" && (
              <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                <div className="space-y-1">
                  <span className="text-[11px] text-slate-400">Minimum Bound:</span>
                  <input
                    type="number"
                    value={editingRule.minBound ?? ""}
                    onChange={(e) =>
                      setEditingRule((prev) => ({ ...prev, minBound: Number(e.target.value) }))
                    }
                    className="w-full bg-slate-800 border border-slate-700 rounded p-1.5 text-xs text-white"
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-[11px] text-slate-400">Maximum Bound:</span>
                  <input
                    type="number"
                    value={editingRule.maxBound ?? ""}
                    onChange={(e) =>
                      setEditingRule((prev) => ({ ...prev, maxBound: Number(e.target.value) }))
                    }
                    className="w-full bg-slate-800 border border-slate-700 rounded p-1.5 text-xs text-white"
                  />
                </div>
                <label className="col-span-2 flex items-center gap-2 cursor-pointer text-xs text-slate-300 pt-1">
                  <input
                    type="checkbox"
                    checked={editingRule.inclusiveBounds !== false}
                    onChange={(e) =>
                      setEditingRule((prev) => ({ ...prev, inclusiveBounds: e.target.checked }))
                    }
                    className="rounded border-slate-700 text-emerald-600"
                  />
                  <span>Inclusive boundaries (min &le; value &le; max)</span>
                </label>
              </div>
            )}

            {editingRule.templateType === "match_column" && (
              <div className="space-y-1.5 p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                <label className="text-xs font-semibold text-slate-300">
                  Secondary Column to Match With
                </label>
                <select
                  value={editingRule.secondaryColumn}
                  onChange={(e) =>
                    setEditingRule((prev) => ({ ...prev, secondaryColumn: e.target.value }))
                  }
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-xs text-white"
                >
                  {activeSheet.headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Formula Entry for Calculation & Compare */}
            {["calculate", "compare_calculated", "custom_formula"].includes(
              editingRule.templateType || ""
            ) && (
              <div className="space-y-2 p-3.5 rounded-xl bg-slate-950/80 border border-slate-800">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-300">
                    Formula Expression (Sandboxed AST)
                  </label>
                  <span className="text-[10px] text-emerald-400 font-mono">
                    Operators: +, -, *, /, %, ^, AND, OR, IF()
                  </span>
                </div>

                <input
                  type="text"
                  value={editingRule.formulaExpression || ""}
                  onChange={(e) => {
                    const expr = e.target.value;
                    setEditingRule((prev) => ({ ...prev, formulaExpression: expr }));
                    const { error } = compileFormula(expr);
                    setRuleSyntaxError(error);
                  }}
                  placeholder="e.g. [Service Amount] * 0.18"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-xs text-white font-mono"
                />

                {ruleSyntaxError ? (
                  <p className="text-[11px] text-rose-400 font-medium">Syntax Error: {ruleSyntaxError}</p>
                ) : (
                  <p className="text-[10px] text-slate-500">
                    Use <code>[Column Name]</code> for column values. Examples: <code>[Amount] * 1.18</code> or <code>IF([Status] == 'APPROVED', 1, 0)</code>.
                  </p>
                )}

                {editingRule.templateType === "compare_calculated" && (
                  <div className="flex items-center gap-3 pt-2">
                    <span className="text-xs text-slate-400">Numeric Tolerance (&epsilon;):</span>
                    <input
                      type="number"
                      step="0.001"
                      value={editingRule.numericTolerance ?? 0.01}
                      onChange={(e) =>
                        setEditingRule((prev) => ({
                          ...prev,
                          numericTolerance: Number(e.target.value),
                        }))
                      }
                      className="w-24 bg-slate-800 border border-slate-700 rounded p-1 text-xs text-white"
                    />
                  </div>
                )}
              </div>
            )}

            {/* 5-Row Live Preview of the Rule */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Live Preview (First 5 Rows)
              </span>

              <div className="space-y-1.5 max-h-36 overflow-y-auto">
                {activeSheet.rows.slice(0, 5).map((row, idx) => {
                  const { ast } = compileFormula(editingRule.formulaExpression || "");
                  const previewRes = evaluateRuleOnRow(
                    editingRule as ManualRuleConfig,
                    row,
                    idx + 1,
                    ast
                  );

                  return (
                    <div
                      key={idx}
                      className="p-2 rounded bg-slate-950 border border-slate-800 flex items-center justify-between text-[11px]"
                    >
                      <span className="font-mono text-slate-400">Row #{idx + 1}</span>
                      <span className="font-mono text-slate-300">
                        {editingRule.targetColumn}: {String(row[editingRule.targetColumn || ""] ?? "null")}
                      </span>
                      <span
                        className={`font-bold uppercase text-[9px] px-1.5 py-0.2 rounded border ${
                          previewRes.outcome === "pass"
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            : previewRes.outcome === "fail"
                            ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                            : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                        }`}
                      >
                        {previewRes.outcome}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsRuleModalOpen(false)}
                className="text-xs text-slate-300 hover:text-white"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSaveRule}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs px-4"
              >
                Save Rule
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
