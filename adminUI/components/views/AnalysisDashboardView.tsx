"use client";

import React, { useState, useMemo } from "react";
import {
  AnalysisDashboardData,
  ScenarioAnalysisItem,
  MetricObject,
  KpiBannerItem,
  KeyHighlightItem,
  ChartSpec,
  ActionObject,
  ComparisonItem,
  ConcentrationItem,
  DataQualityItem,
  AdditionalCalculationItem,
} from "@/types/dashboard";
import { SheetData } from "@/types";
import {
  resolveJsonPointer,
  formatMetricValue,
  resolveTemplate,
  validateChartSpec,
  computeColumnDiagnostics,
  ColumnDiagnostics,
  EXAMPLE_LOAN_PORTFOLIO_PAYLOAD,
} from "@/utils/jsonPointerResolver";
import { SAMPLE_ANALYSIS_DASHBOARD } from "@/utils/sampleReportData";
import {
  Sparkles,
  Users,
  Percent,
  Building2,
  ShoppingCart,
  Megaphone,
  BarChart3,
  AlertTriangle,
  Trophy,
  Layers,
  Activity,
  CheckCircle2,
  AlertCircle,
  Info,
  TrendingUp,
  Calendar,
  Hash,
  Type,
  Check,
  FileText,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Download,
  Database,
  ShieldCheck,
  ShieldAlert,
  ArrowLeft,
  ChevronRight,
  HelpCircle,
  CheckSquare,
  BarChart2,
  PieChart as PieChartIcon,
  Maximize2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ReferenceLine,
} from "recharts";

const PALETTE = [
  "#6366f1", // indigo
  "#10b981", // emerald
  "#3b82f6", // blue
  "#f59e0b", // amber
  "#ec4899", // pink
  "#8b5cf6", // violet
  "#14b8a6", // teal
  "#f97316", // orange
  "#06b6d4", // cyan
  "#e11d48", // rose
];

interface AnalysisDashboardViewProps {
  report: AnalysisDashboardData | null;
  payload: any;
  activeSheet: SheetData | null;
  activeDatasetName: string;
  isLoading?: boolean;
  error?: string | null;
  onBack: () => void;
  onLoadSample?: () => void;
}

export function AnalysisDashboardView({
  report,
  payload,
  activeSheet,
  activeDatasetName,
  isLoading = false,
  error = null,
  onBack,
  onLoadSample,
}: AnalysisDashboardViewProps) {
  // Scenario tab navigation
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>("all");

  // Chart view mode (visual chart vs raw data table)
  const [chartViewModes, setChartViewModes] = useState<Record<string, "chart" | "table">>({});

  // Column Distribution Explorer selected column
  const [selectedDiagColumn, setSelectedDiagColumn] = useState<string>("");

  // Active scenario
  const scenarios = report?.scenarioAnalysis || [];
  const activeScenario = useMemo(() => {
    if (selectedScenarioId === "all") return null;
    return scenarios.find((s) => s.scenarioId === selectedScenarioId) || null;
  }, [scenarios, selectedScenarioId]);

  // Relevant columns for the scenario
  const relevantColumns = useMemo(() => {
    if (!activeSheet) return [];
    if (activeScenario) {
      // Find columns mentioned in this scenario
      const set = new Set<string>();
      activeScenario.charts?.forEach((c) => {
        if (c.dimension && activeSheet.headers.includes(c.dimension)) set.add(c.dimension);
        if (c.measure && activeSheet.headers.includes(c.measure)) set.add(c.measure);
      });
      activeScenario.findings?.forEach((f) => {
        f.metrics?.forEach((m) => {
          if (activeSheet.headers.includes(m.label)) set.add(m.label);
        });
      });
      if (set.size > 0) return Array.from(set);
    }
    return activeSheet.headers.slice(0, 10);
  }, [activeSheet, activeScenario]);

  // Set default diagnostics column
  React.useEffect(() => {
    if (relevantColumns.length > 0 && !relevantColumns.includes(selectedDiagColumn)) {
      setSelectedDiagColumn(relevantColumns[0]);
    } else if (!selectedDiagColumn && activeSheet && activeSheet.headers.length > 0) {
      setSelectedDiagColumn(activeSheet.headers[0]);
    }
  }, [relevantColumns, selectedDiagColumn, activeSheet]);

  // Compute live diagnostics for selected column
  const columnDiagnostics = useMemo<ColumnDiagnostics | null>(() => {
    if (!activeSheet || !selectedDiagColumn) return null;
    return computeColumnDiagnostics(activeSheet, selectedDiagColumn);
  }, [activeSheet, selectedDiagColumn]);

  // Deduplicate top KPI Banner items to avoid duplicates in the same view
  const deduplicatedKpis = useMemo(() => {
    if (!report?.kpiBanner) return [];
    const seen = new Set<string>();
    return report.kpiBanner.filter((kpi) => {
      const key = `${kpi.label}::${kpi.valueRef}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [report?.kpiBanner]);

  // Export report as JSON
  const handleExportJson = () => {
    if (!report) return;
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(report.title || "Report").replace(/\s+/g, "_")}_Export.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Helper to resolve icon
  const renderKpiIcon = (iconName?: string) => {
    const iconClass = "w-5 h-5 text-indigo-400";
    switch (iconName?.toLowerCase()) {
      case "users":
        return <Users className={iconClass} />;
      case "rupee":
        return <span className="font-bold text-lg text-emerald-400 leading-none">₹</span>;
      case "dollar":
      case "currency":
        return <span className="font-bold text-lg text-emerald-400 leading-none">$</span>;
      case "percent":
        return <Percent className={iconClass} />;
      case "building":
        return <Building2 className={iconClass} />;
      case "cart":
        return <ShoppingCart className={iconClass} />;
      case "megaphone":
        return <Megaphone className={iconClass} />;
      case "chart":
        return <BarChart3 className={iconClass} />;
      case "alert":
        return <AlertTriangle className="w-5 h-5 text-amber-400" />;
      case "trophy":
        return <Trophy className="w-5 h-5 text-amber-400" />;
      case "layers":
        return <Layers className={iconClass} />;
      default:
        return <Activity className={iconClass} />;
    }
  };

  // Helper for tone color
  const getToneBadgeClass = (tone?: string) => {
    switch (tone?.toLowerCase()) {
      case "positive":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      case "negative":
        return "bg-rose-500/10 text-rose-400 border-rose-500/20";
      default:
        return "bg-slate-700/40 text-slate-300 border-slate-600/30";
    }
  };

  // Loading State
  if (isLoading) {
    return (
      <div className="min-h-[600px] flex flex-col items-center justify-center p-8 text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center animate-spin">
          <RefreshCw className="w-8 h-8 text-indigo-400" />
        </div>
        <div className="space-y-2 max-w-md">
          <h3 className="text-xl font-bold text-white">Synthesizing Executive Analysis...</h3>
          <p className="text-sm text-slate-400">
            Evaluating multi-dimensional scenarios, resolving JSON pointer evidence nodes, and compiling statistical distributions.
          </p>
        </div>
      </div>
    );
  }

  // Error State
  if (error && !report) {
    return (
      <div className="min-h-[500px] flex flex-col items-center justify-center p-8 text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
          <AlertCircle className="w-8 h-8" />
        </div>
        <div className="space-y-2 max-w-lg">
          <h3 className="text-xl font-bold text-white">Analysis Generation Failed</h3>
          <p className="text-sm text-slate-400">{error}</p>
        </div>
        <div className="flex items-center gap-3 pt-2">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Scenarios
          </Button>
          {onLoadSample && (
            <Button
              className="bg-indigo-600 hover:bg-indigo-500 text-white"
              onClick={onLoadSample}
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Load Example Report
            </Button>
          )}
        </div>
      </div>
    );
  }

  // Empty / Unavailable State
  if (!report) {
    return (
      <div className="min-h-[500px] flex flex-col items-center justify-center p-8 text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400">
          <FileText className="w-8 h-8" />
        </div>
        <div className="space-y-2 max-w-md">
          <h3 className="text-xl font-bold text-white">No Dashboard Report Loaded</h3>
          <p className="text-sm text-slate-400">
            Generate detailed AI insights from your selected relationship scenarios, or preview the sample Loan Portfolio Executive Dashboard.
          </p>
        </div>
        <div className="flex items-center gap-3 pt-2">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Relationships
          </Button>
          {onLoadSample && (
            <Button
              className="bg-indigo-600 hover:bg-indigo-500 text-white"
              onClick={onLoadSample}
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Load Example Loan Portfolio Dashboard
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-8 pb-16 animate-in fade-in-50 duration-200">
      {/* =========================================================================
          TOP ACTION BAR & TITLE HEADER
         ========================================================================= */}
      <div className="bg-slate-900/90 backdrop-blur border border-slate-800/80 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-48 bg-gradient-to-bl from-indigo-500/10 via-purple-500/5 to-transparent pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={onBack}
                className="text-slate-400 hover:text-white hover:bg-slate-800 -ml-2 h-8 px-2"
              >
                <ArrowLeft className="w-4 h-4 mr-1.5" />
                Scenarios
              </Button>
              <span className="text-slate-600">|</span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <Sparkles className="w-3 h-3" />
                Report IQ Schema v{report.schemaVersion || "1.0"}
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700">
                <Database className="w-3 h-3 text-slate-400" />
                {activeDatasetName} &bull; {activeSheet?.name || "Sheet"}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {report.title}
            </h1>
            <p className="text-sm sm:text-base text-slate-400 max-w-4xl">
              {report.subtitle}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 pt-2 lg:pt-0">
            {onLoadSample && (
              <Button
                variant="outline"
                size="sm"
                onClick={onLoadSample}
                className="border-slate-700 text-slate-300 hover:bg-slate-800 text-xs"
              >
                <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                Reload Sample
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportJson}
              className="border-slate-700 text-slate-300 hover:bg-slate-800 text-xs"
            >
              <Download className="w-3.5 h-3.5 mr-1.5" />
              Export Spec
            </Button>
          </div>
        </div>
      </div>

      {/* =========================================================================
          1. KPI BANNER (Deduplicated, Safe Pointers, Preserves 0)
         ========================================================================= */}
      {deduplicatedKpis.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-indigo-400" />
              Portfolio Executive KPIs
            </h2>
            <span className="text-xs text-slate-500">
              Resolved from calculation payload
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {deduplicatedKpis.map((kpi, idx) => {
              const rawVal = resolveJsonPointer(payload, kpi.valueRef);
              const formattedVal = formatMetricValue(rawVal, kpi);

              // Delta indicator
              let deltaFormatted: string | null = null;
              if (kpi.delta?.valueRef) {
                const deltaRaw = resolveJsonPointer(payload, kpi.delta.valueRef);
                deltaFormatted = formatMetricValue(deltaRaw, {
                  format: kpi.delta.format || undefined,
                  percentScale: kpi.delta.percentScale || undefined,
                });
              }

              return (
                <div
                  key={`${kpi.label}-${idx}`}
                  className="bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all rounded-xl p-5 shadow-sm space-y-3 flex flex-col justify-between"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider line-clamp-1">
                      {kpi.label}
                    </span>
                    <div className="p-2 rounded-lg bg-slate-800/80 border border-slate-700/60 flex items-center justify-center shrink-0">
                      {renderKpiIcon(kpi.icon)}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                      {formattedVal}
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                      <span className="capitalize px-2 py-0.5 rounded bg-slate-800 border border-slate-700/50 text-[11px] text-slate-300">
                        {kpi.scenarioId === "overall" ? "Portfolio Scope" : `Scenario ${kpi.scenarioId}`}
                      </span>

                      {deltaFormatted && (
                        <span
                          className={`inline-flex items-center gap-1 font-medium text-[11px] px-1.5 py-0.5 rounded border ${getToneBadgeClass(
                            kpi.delta?.tone
                          )}`}
                        >
                          {kpi.delta?.tone === "positive" ? (
                            <ArrowUpRight className="w-3 h-3" />
                          ) : (
                            <ArrowDownRight className="w-3 h-3" />
                          )}
                          {deltaFormatted}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* =========================================================================
          2. KEY HIGHLIGHTS & EXECUTIVE SUMMARY
         ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Key Highlights */}
        {report.keyHighlights && report.keyHighlights.length > 0 && (
          <div className="lg:col-span-2 space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-400" />
              Strategic Highlights
            </h2>

            <div className="space-y-3">
              {report.keyHighlights.map((hl, idx) => {
                const resolvedText = resolveTemplate(hl.template, payload);

                return (
                  <div
                    key={idx}
                    className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm flex items-start gap-3.5 hover:border-slate-700 transition-colors"
                  >
                    <div
                      className={`p-2 rounded-lg shrink-0 border mt-0.5 ${getToneBadgeClass(
                        hl.tone
                      )}`}
                    >
                      <Sparkles className="w-4 h-4" />
                    </div>

                    <div className="space-y-2 flex-1">
                      <p className="text-sm font-medium text-slate-200 leading-relaxed">
                        {resolvedText}
                      </p>

                      {hl.evidenceRefs && hl.evidenceRefs.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                          <span className="text-[11px] text-slate-500 font-medium">
                            Evidence:
                          </span>
                          {hl.evidenceRefs.map((ref, rIdx) => {
                            const val = resolveJsonPointer(payload, ref);
                            const displayVal =
                              val !== undefined && val !== null ? String(val) : "Unavailable";
                            return (
                              <span
                                key={rIdx}
                                className="px-2 py-0.5 rounded text-[11px] bg-slate-800/80 text-slate-300 border border-slate-700/60 font-mono"
                                title={ref}
                              >
                                {displayVal}
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Executive Summary */}
        {report.executiveSummary && (
          <div className="space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-400" />
              Executive Takeaway
            </h2>

            <div className="bg-gradient-to-b from-indigo-950/30 to-slate-900 border border-indigo-900/40 rounded-xl p-5 shadow-sm space-y-4">
              {report.executiveSummary.keyTakeaway && (
                <div className="space-y-1.5">
                  <div className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">
                    Core Finding
                  </div>
                  <p className="text-sm text-slate-200 leading-relaxed font-medium">
                    {resolveTemplate(report.executiveSummary.keyTakeaway, payload)}
                  </p>
                </div>
              )}

              {report.executiveSummary.datasetImpact && (
                <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
                  <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Dataset Scope & Completeness
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {resolveTemplate(report.executiveSummary.datasetImpact, payload)}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* =========================================================================
          3. DATASET PROFILE OVERVIEW (Separate from fixed LLM response schema)
         ========================================================================= */}
      {activeSheet && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="space-y-1">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <Database className="w-4 h-4 text-emerald-400" />
                Active Dataset Profile & Scope
              </h2>
              <p className="text-xs text-slate-400">
                Ground-truth metadata from active sheet data versus LLM calculation scope
              </p>
            </div>
            <div className="text-xs text-slate-400 bg-slate-800 px-3 py-1 rounded-lg border border-slate-700 w-fit">
              Dataset: <strong className="text-slate-200">{activeDatasetName}</strong> &bull; Sheet: <strong className="text-slate-200">{activeSheet.name}</strong>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
            <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/50">
              <span className="text-[11px] text-slate-400 uppercase font-medium">Total Sheet Rows</span>
              <div className="text-xl font-bold text-white mt-1">
                {(activeSheet.rows?.length || activeSheet.rowCount || 0).toLocaleString()}
              </div>
              <span className="text-[10px] text-slate-500">100% of local dataset</span>
            </div>

            <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/50">
              <span className="text-[11px] text-slate-400 uppercase font-medium">Total Columns</span>
              <div className="text-xl font-bold text-white mt-1">
                {activeSheet.headers?.length || activeSheet.columnCount || 0}
              </div>
              <span className="text-[10px] text-slate-500">Detected schema fields</span>
            </div>

            <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/50">
              <span className="text-[11px] text-slate-400 uppercase font-medium">Scenario Scope</span>
              <div className="text-xl font-bold text-indigo-400 mt-1">
                {scenarios.length} Scenarios
              </div>
              <span className="text-[10px] text-slate-500">Multidimensional aggregations</span>
            </div>

            <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/50">
              <span className="text-[11px] text-slate-400 uppercase font-medium">Quality Flags</span>
              <div className="text-xl font-bold text-amber-400 mt-1">
                {report.dataQuality?.length || 0} Notices
              </div>
              <span className="text-[10px] text-slate-500">Completeness & formatting</span>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          4. SCENARIO ANALYSIS WORKSPACE & NAVIGATION
         ========================================================================= */}
      {scenarios.length > 0 && (
        <div className="space-y-6">
          <div className="border-b border-slate-800 pb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-indigo-400" />
                Scenario Deep-Dive Analyses
              </h2>
              <p className="text-xs text-slate-400">
                Explore statistical findings, comparisons, concentrations, and charts by scenario
              </p>
            </div>

            {/* Scenario Navigation Pills */}
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                onClick={() => setSelectedScenarioId("all")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  selectedScenarioId === "all"
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                }`}
              >
                All Scenarios ({scenarios.length})
              </button>
              {scenarios.map((sc) => (
                <button
                  key={sc.scenarioId}
                  onClick={() => setSelectedScenarioId(sc.scenarioId)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    selectedScenarioId === sc.scenarioId
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                  }`}
                >
                  {sc.title}
                </button>
              ))}
            </div>
          </div>

          {/* Render scenarios: either all or the selected single scenario */}
          <div className="space-y-8">
            {(selectedScenarioId === "all" ? scenarios : [activeScenario!]).map((scenario) => {
              if (!scenario) return null;

              return (
                <div
                  key={scenario.scenarioId}
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-6"
                >
                  {/* Scenario Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-800/80 gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-semibold">
                          ID: {scenario.scenarioId}
                        </span>
                        <h3 className="text-xl font-bold text-white tracking-tight">
                          {scenario.title}
                        </h3>
                      </div>
                    </div>
                  </div>

                  {/* Scenario KPIs & Statistics */}
                  {scenario.kpis && scenario.kpis.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-xs font-semibold uppercase text-slate-400 tracking-wider">
                        Scenario Metrics
                      </span>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {scenario.kpis.map((kpi, kIdx) => {
                          const val = resolveJsonPointer(payload, kpi.valueRef);
                          const formatted = formatMetricValue(val, kpi);

                          return (
                            <div
                              key={kIdx}
                              className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3.5 space-y-1"
                            >
                              <span className="text-xs text-slate-400 line-clamp-1">
                                {kpi.label}
                              </span>
                              <div className="text-xl font-extrabold text-white">
                                {formatted}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Charts with Validation */}
                  {scenario.charts && scenario.charts.length > 0 && (
                    <div className="space-y-4">
                      {scenario.charts.map((chartSpec, cIdx) => {
                        const chartKey = `${scenario.scenarioId}-chart-${cIdx}`;
                        const viewMode = chartViewModes[chartKey] || "chart";
                        const resolvedChartData = resolveJsonPointer(payload, chartSpec.dataRef);
                        const validation = validateChartSpec(chartSpec, resolvedChartData);

                        return (
                          <div
                            key={cIdx}
                            className="bg-slate-950/60 border border-slate-800 rounded-xl p-5 space-y-4"
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <BarChart3 className="w-4 h-4 text-indigo-400" />
                                  <h4 className="text-sm font-bold text-white">
                                    {chartSpec.title}
                                  </h4>
                                  <span className="text-[11px] uppercase font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                                    {chartSpec.type}
                                  </span>
                                </div>
                                {chartSpec.insightRef && (
                                  <span className="text-xs text-indigo-300/80 inline-flex items-center gap-1">
                                    <Sparkles className="w-3 h-3" />
                                    Finding: {chartSpec.insightRef}
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    setChartViewModes((prev) => ({
                                      ...prev,
                                      [chartKey]: viewMode === "chart" ? "table" : "chart",
                                    }))
                                  }
                                  className="text-xs text-slate-400 hover:text-white hover:bg-slate-800 h-8"
                                >
                                  {viewMode === "chart" ? "View Raw Table" : "View Visualization"}
                                </Button>
                              </div>
                            </div>

                            {/* Chart Body: Valid vs Unavailable State */}
                            {!validation.isValid ? (
                              <div className="bg-slate-900/80 border border-amber-500/20 rounded-xl p-6 text-center space-y-3">
                                <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mx-auto">
                                  <AlertTriangle className="w-6 h-6" />
                                </div>
                                <div className="space-y-1 max-w-md mx-auto">
                                  <h5 className="text-sm font-bold text-amber-300">
                                    {validation.reason}
                                  </h5>
                                  <p className="text-xs text-slate-400 leading-relaxed">
                                    {validation.details}
                                  </p>
                                </div>
                                {Array.isArray(resolvedChartData) && resolvedChartData.length > 0 && (
                                  <div className="pt-2">
                                    <span className="text-xs text-slate-400">
                                      Switch to the table view above to inspect available data fields.
                                    </span>
                                  </div>
                                )}
                              </div>
                            ) : viewMode === "table" ? (
                              /* Data Table View */
                              <div className="overflow-x-auto max-h-72 rounded-lg border border-slate-800">
                                <table className="w-full text-xs text-left">
                                  <thead className="bg-slate-900 text-slate-400 sticky top-0">
                                    <tr>
                                      {Array.isArray(resolvedChartData) &&
                                        resolvedChartData.length > 0 &&
                                        Object.keys(resolvedChartData[0]).map((k) => (
                                          <th key={k} className="p-2.5 font-semibold">
                                            {k}
                                          </th>
                                        ))}
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-800 text-slate-300">
                                    {Array.isArray(resolvedChartData) &&
                                      resolvedChartData.map((row: any, rIdx: number) => (
                                        <tr key={rIdx} className="hover:bg-slate-900/50">
                                          {Object.keys(row).map((k) => (
                                            <td key={k} className="p-2.5 font-mono">
                                              {row[k] !== null && row[k] !== undefined
                                                ? String(row[k])
                                                : "Unavailable"}
                                            </td>
                                          ))}
                                        </tr>
                                      ))}
                                  </tbody>
                                </table>
                              </div>
                            ) : (
                              /* Render Chart */
                              <div className="h-64 sm:h-72 w-full pt-2">
                                <ResponsiveContainer width="100%" height="100%">
                                  {chartSpec.type === "pie" || chartSpec.type === "donut" ? (
                                    <PieChart>
                                      <RechartsTooltip
                                        contentStyle={{
                                          backgroundColor: "#0f172a",
                                          borderColor: "#334155",
                                          borderRadius: "8px",
                                          fontSize: "12px",
                                        }}
                                      />
                                      <Legend
                                        verticalAlign="bottom"
                                        height={36}
                                        formatter={(val) => (
                                          <span className="text-xs text-slate-300">{val}</span>
                                        )}
                                      />
                                      <Pie
                                        data={resolvedChartData}
                                        dataKey={chartSpec.measure || "count"}
                                        nameKey={chartSpec.dimension || Object.keys(resolvedChartData[0])[0]}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={chartSpec.type === "donut" ? 55 : 0}
                                        outerRadius={80}
                                        paddingAngle={2}
                                      >
                                        {resolvedChartData.map((entry: any, eIdx: number) => {
                                          const dimVal = String(
                                            entry[chartSpec.dimension] || entry[Object.keys(entry)[0]]
                                          );
                                          const isHighlighted =
                                            chartSpec.highlight?.itemRef &&
                                            dimVal === chartSpec.highlight.itemRef;

                                          const color = isHighlighted
                                            ? chartSpec.highlight?.tone === "negative"
                                              ? "#e11d48"
                                              : "#6366f1"
                                            : PALETTE[eIdx % PALETTE.length];

                                          return <Cell key={`cell-${eIdx}`} fill={color} />;
                                        })}
                                      </Pie>
                                    </PieChart>
                                  ) : chartSpec.type === "line" ? (
                                    <LineChart data={resolvedChartData}>
                                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                                      <XAxis
                                        dataKey={chartSpec.dimension || Object.keys(resolvedChartData[0])[0]}
                                        stroke="#64748b"
                                        fontSize={11}
                                      />
                                      <YAxis stroke="#64748b" fontSize={11} />
                                      <RechartsTooltip
                                        contentStyle={{
                                          backgroundColor: "#0f172a",
                                          borderColor: "#334155",
                                          borderRadius: "8px",
                                          fontSize: "12px",
                                        }}
                                      />
                                      <Line
                                        type="monotone"
                                        dataKey={chartSpec.measure || Object.keys(resolvedChartData[0])[1]}
                                        stroke="#6366f1"
                                        strokeWidth={2.5}
                                        dot={{ fill: "#6366f1", r: 4 }}
                                      />
                                    </LineChart>
                                  ) : (
                                    /* Bar / Column Chart */
                                    <BarChart data={resolvedChartData}>
                                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                                      <XAxis
                                        dataKey={chartSpec.dimension || Object.keys(resolvedChartData[0])[0]}
                                        stroke="#64748b"
                                        fontSize={11}
                                      />
                                      <YAxis stroke="#64748b" fontSize={11} />
                                      <RechartsTooltip
                                        contentStyle={{
                                          backgroundColor: "#0f172a",
                                          borderColor: "#334155",
                                          borderRadius: "8px",
                                          fontSize: "12px",
                                        }}
                                      />
                                      {chartSpec.benchmarkRef && (
                                        <ReferenceLine
                                          y={Number(resolveJsonPointer(payload, chartSpec.benchmarkRef)) || undefined}
                                          stroke="#e11d48"
                                          strokeDasharray="3 3"
                                          label={{
                                            value: "Benchmark",
                                            fill: "#f43f5e",
                                            fontSize: 10,
                                          }}
                                        />
                                      )}
                                      <Bar
                                        dataKey={chartSpec.measure || Object.keys(resolvedChartData[0])[1]}
                                        fill="#6366f1"
                                        radius={[4, 4, 0, 0]}
                                      >
                                        {resolvedChartData.map((entry: any, eIdx: number) => {
                                          const dimVal = String(
                                            entry[chartSpec.dimension] || entry[Object.keys(entry)[0]]
                                          );
                                          const isHighlighted =
                                            chartSpec.highlight?.itemRef &&
                                            dimVal === chartSpec.highlight.itemRef;
                                          return (
                                            <Cell
                                              key={`bar-${eIdx}`}
                                              fill={isHighlighted ? "#ec4899" : PALETTE[eIdx % PALETTE.length]}
                                            />
                                          );
                                        })}
                                      </Bar>
                                    </BarChart>
                                  )}
                                </ResponsiveContainer>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Scenario Findings */}
                  {scenario.findings && scenario.findings.length > 0 && (
                    <div className="space-y-3">
                      <span className="text-xs font-semibold uppercase text-slate-400 tracking-wider">
                        Scenario Findings
                      </span>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {scenario.findings.map((finding, fIdx) => (
                          <div
                            key={fIdx}
                            className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-4 space-y-3"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <h4 className="text-sm font-bold text-white">
                                {finding.title}
                              </h4>
                              <div className="flex items-center gap-1.5">
                                <span
                                  className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${
                                    finding.importance === "high"
                                      ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                                      : "bg-slate-700 text-slate-300 border-slate-600"
                                  }`}
                                >
                                  {finding.importance}
                                </span>
                              </div>
                            </div>

                            <p className="text-xs text-slate-300 leading-relaxed">
                              {resolveTemplate(finding.interpretation, payload)}
                            </p>

                            {finding.metrics && finding.metrics.length > 0 && (
                              <div className="flex flex-wrap gap-2 pt-1">
                                {finding.metrics.map((m, mIdx) => {
                                  const val = resolveJsonPointer(payload, m.valueRef);
                                  const formatted = formatMetricValue(val, m);

                                  return (
                                    <div
                                      key={mIdx}
                                      className="px-2.5 py-1 rounded bg-slate-800 border border-slate-700 text-xs"
                                    >
                                      <span className="text-slate-400 text-[11px] mr-1.5">{m.label}:</span>
                                      <strong className="text-slate-200">{formatted}</strong>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Comparisons */}
                  {scenario.comparisons && scenario.comparisons.length > 0 && (
                    <div className="space-y-3">
                      <span className="text-xs font-semibold uppercase text-slate-400 tracking-wider">
                        Comparative Assessments
                      </span>
                      <div className="space-y-3">
                        {scenario.comparisons.map((comp, cpIdx) => {
                          const leftVal = resolveJsonPointer(payload, comp.left.valueRef);
                          const rightVal = resolveJsonPointer(payload, comp.right.valueRef);

                          return (
                            <div
                              key={cpIdx}
                              className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-4 space-y-3"
                            >
                              <div className="flex items-center justify-between">
                                <h4 className="text-sm font-bold text-white">
                                  {comp.title}
                                </h4>
                                <span className="text-xs font-mono px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                                  {comp.operator}
                                </span>
                              </div>

                              <div className="grid grid-cols-2 gap-3 max-w-md">
                                <div className="bg-slate-800 p-2.5 rounded-lg border border-slate-700">
                                  <span className="text-[11px] text-slate-400 block">{comp.left.label}</span>
                                  <strong className="text-base text-white">{formatMetricValue(leftVal, comp.left)}</strong>
                                </div>
                                <div className="bg-slate-800 p-2.5 rounded-lg border border-slate-700">
                                  <span className="text-[11px] text-slate-400 block">{comp.right.label}</span>
                                  <strong className="text-base text-white">{formatMetricValue(rightVal, comp.right)}</strong>
                                </div>
                              </div>

                              <p className="text-xs text-slate-300 leading-relaxed">
                                {resolveTemplate(comp.interpretation, payload)}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Concentration */}
                  {scenario.concentration && scenario.concentration.length > 0 && (
                    <div className="space-y-3">
                      <span className="text-xs font-semibold uppercase text-slate-400 tracking-wider">
                        Portfolio Concentration
                      </span>
                      <div className="space-y-3">
                        {scenario.concentration.map((conc, cIdx) => {
                          const shareRaw = resolveJsonPointer(payload, conc.shareRef);
                          const formattedShare = formatMetricValue(shareRaw, {
                            format: "percent",
                            percentScale: conc.percentScale,
                          });

                          return (
                            <div
                              key={cIdx}
                              className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-4 space-y-2"
                            >
                              <div className="flex items-center justify-between">
                                <h4 className="text-sm font-bold text-white">{conc.label}</h4>
                                <span className="text-xs font-bold text-emerald-400 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                                  Top {conc.topN}: {formattedShare}
                                </span>
                              </div>
                              <p className="text-xs text-slate-300 leading-relaxed">
                                {resolveTemplate(conc.interpretation, payload)}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Outliers & Patterns */}
                  {((scenario.outliers && scenario.outliers.length > 0) ||
                    (scenario.patterns && scenario.patterns.length > 0)) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {scenario.outliers?.map((outlier, oIdx) => (
                        <div
                          key={`outlier-${oIdx}`}
                          className="bg-amber-950/20 border border-amber-500/20 rounded-xl p-4 space-y-2"
                        >
                          <div className="flex items-center gap-2 text-amber-400">
                            <AlertTriangle className="w-4 h-4" />
                            <h4 className="text-sm font-bold text-white">{outlier.title}</h4>
                          </div>
                          <p className="text-xs text-slate-300 leading-relaxed">
                            {resolveTemplate(outlier.interpretation, payload)}
                          </p>
                        </div>
                      ))}

                      {scenario.patterns?.map((pattern, pIdx) => (
                        <div
                          key={`pattern-${pIdx}`}
                          className="bg-indigo-950/20 border border-indigo-500/20 rounded-xl p-4 space-y-2"
                        >
                          <div className="flex items-center gap-2 text-indigo-400">
                            <TrendingUp className="w-4 h-4" />
                            <h4 className="text-sm font-bold text-white">{pattern.title}</h4>
                            <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                              {pattern.type}
                            </span>
                          </div>
                          <p className="text-xs text-slate-300 leading-relaxed">
                            {resolveTemplate(pattern.interpretation, payload)}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Recommendations */}
                  {scenario.recommendations && scenario.recommendations.length > 0 && (
                    <div className="space-y-3">
                      <span className="text-xs font-semibold uppercase text-slate-400 tracking-wider">
                        Actionable Recommendations
                      </span>
                      <div className="space-y-2.5">
                        {scenario.recommendations.map((rec, rIdx) => (
                          <div
                            key={rIdx}
                            className="bg-slate-800/50 border border-slate-700/60 rounded-xl p-4 space-y-2 flex items-start gap-3"
                          >
                            <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 mt-0.5 shrink-0">
                              <CheckCircle2 className="w-4 h-4" />
                            </div>
                            <div className="space-y-1.5 flex-1">
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-sm font-medium text-slate-200">
                                  {rec.action}
                                </p>
                                <span
                                  className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border shrink-0 ${
                                    rec.priority === "high"
                                      ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                                      : "bg-slate-700 text-slate-300 border-slate-600"
                                  }`}
                                >
                                  {rec.priority} Priority
                                </span>
                              </div>

                              {rec.question && (
                                <p className="text-xs text-indigo-300/90 italic">
                                  Prompt Question: &ldquo;{rec.question}&rdquo;
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* =========================================================================
          5. COLUMN STATISTICS & DISTRIBUTIONS SUITE
         ========================================================================= */}
      {activeSheet && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-800/80">
            <div className="space-y-1">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <BarChart2 className="w-5 h-5 text-indigo-400" />
                Live Column Statistics & Distributions
              </h2>
              <p className="text-xs text-slate-400">
                Ground-truth statistical distributions computed directly across the full active sheet ({activeSheet.rows?.length || 0} rows)
              </p>
            </div>

            {/* Column Picker Dropdown */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-medium">Inspect Column:</span>
              <select
                value={selectedDiagColumn}
                onChange={(e) => setSelectedDiagColumn(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                {activeSheet.headers.map((h) => (
                  <option key={h} value={h}>
                    {h} ({activeSheet.columnTypes[h] || "string"})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {columnDiagnostics ? (
            <div className="space-y-6">
              {/* Top Metrics Row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-800/60 rounded-xl p-3.5 border border-slate-700/60">
                  <span className="text-[11px] text-slate-400 uppercase font-medium">Valid Count</span>
                  <div className="text-lg font-bold text-white mt-1">
                    {columnDiagnostics.validCount.toLocaleString()}
                  </div>
                  <span className="text-[10px] text-slate-500">
                    {columnDiagnostics.completenessPercent}% completeness
                  </span>
                </div>

                <div className="bg-slate-800/60 rounded-xl p-3.5 border border-slate-700/60">
                  <span className="text-[11px] text-slate-400 uppercase font-medium">Missing / NA</span>
                  <div className="text-lg font-bold text-amber-400 mt-1">
                    {columnDiagnostics.missingCount.toLocaleString()}
                  </div>
                  <span className="text-[10px] text-slate-500">Records omitted</span>
                </div>

                <div className="bg-slate-800/60 rounded-xl p-3.5 border border-slate-700/60">
                  <span className="text-[11px] text-slate-400 uppercase font-medium">Detected Type</span>
                  <div className="text-lg font-bold text-indigo-400 mt-1 capitalize">
                    {columnDiagnostics.detectedType}
                  </div>
                  <span className="text-[10px] text-slate-500">Schema inference</span>
                </div>

                <div className="bg-slate-800/60 rounded-xl p-3.5 border border-slate-700/60">
                  <span className="text-[11px] text-slate-400 uppercase font-medium">
                    {columnDiagnostics.detectedType === "numeric"
                      ? "Median Value"
                      : columnDiagnostics.detectedType === "text"
                      ? "Distinct Values"
                      : "Earliest Range"}
                  </span>
                  <div className="text-lg font-bold text-white mt-1 truncate">
                    {columnDiagnostics.detectedType === "numeric"
                      ? columnDiagnostics.median?.toLocaleString() || "Unavailable"
                      : columnDiagnostics.detectedType === "text"
                      ? columnDiagnostics.uniqueCount?.toLocaleString() || "Unavailable"
                      : columnDiagnostics.earliestDate || "Unavailable"}
                  </div>
                  <span className="text-[10px] text-slate-500">Sample parameter</span>
                </div>
              </div>

              {/* Type-Appropriate Statistics & Distribution */}
              {columnDiagnostics.detectedType === "numeric" && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Numeric Stats Table */}
                  <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Statistical Parametrics
                    </h4>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between py-1 border-b border-slate-800">
                        <span className="text-slate-400">Minimum:</span>
                        <strong className="text-white font-mono">{columnDiagnostics.min?.toLocaleString()}</strong>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-800">
                        <span className="text-slate-400">Maximum:</span>
                        <strong className="text-white font-mono">{columnDiagnostics.max?.toLocaleString()}</strong>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-800">
                        <span className="text-slate-400">Arithmetic Mean:</span>
                        <strong className="text-white font-mono">{columnDiagnostics.avg?.toLocaleString()}</strong>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-slate-400">Median (P50):</span>
                        <strong className="text-white font-mono">{columnDiagnostics.median?.toLocaleString()}</strong>
                      </div>
                    </div>
                  </div>

                  {/* Histogram Chart */}
                  <div className="lg:col-span-2 bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Frequency Histogram Distribution
                    </h4>
                    {columnDiagnostics.histogram && columnDiagnostics.histogram.length > 0 ? (
                      <div className="h-48 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={columnDiagnostics.histogram}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                            <XAxis dataKey="range" stroke="#64748b" fontSize={10} />
                            <YAxis stroke="#64748b" fontSize={10} />
                            <RechartsTooltip
                              contentStyle={{
                                backgroundColor: "#0f172a",
                                borderColor: "#334155",
                                borderRadius: "8px",
                                fontSize: "12px",
                              }}
                            />
                            <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500">No histogram bins available.</p>
                    )}
                  </div>
                </div>
              )}

              {columnDiagnostics.detectedType === "text" && (
                <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Category Frequency Frequencies (Top 10)
                  </h4>
                  {columnDiagnostics.topCategories && columnDiagnostics.topCategories.length > 0 ? (
                    <div className="h-56 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={columnDiagnostics.topCategories}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                          <XAxis dataKey="category" stroke="#64748b" fontSize={10} />
                          <YAxis stroke="#64748b" fontSize={10} />
                          <RechartsTooltip
                            contentStyle={{
                              backgroundColor: "#0f172a",
                              borderColor: "#334155",
                              borderRadius: "8px",
                              fontSize: "12px",
                            }}
                          />
                          <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500">No categorical frequencies found.</p>
                  )}
                </div>
              )}

              {columnDiagnostics.detectedType === "datetime" && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Date Range Boundaries
                    </h4>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between py-1 border-b border-slate-800">
                        <span className="text-slate-400">Earliest Timestamp:</span>
                        <strong className="text-white">{columnDiagnostics.earliestDate || "Unavailable"}</strong>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-slate-400">Latest Timestamp:</span>
                        <strong className="text-white">{columnDiagnostics.latestDate || "Unavailable"}</strong>
                      </div>
                    </div>
                  </div>

                  <div className="lg:col-span-2 bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Date Interval Volumes
                    </h4>
                    {columnDiagnostics.dateDistribution && columnDiagnostics.dateDistribution.length > 0 ? (
                      <div className="h-48 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={columnDiagnostics.dateDistribution}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                            <XAxis dataKey="interval" stroke="#64748b" fontSize={10} />
                            <YAxis stroke="#64748b" fontSize={10} />
                            <RechartsTooltip
                              contentStyle={{
                                backgroundColor: "#0f172a",
                                borderColor: "#334155",
                                borderRadius: "8px",
                                fontSize: "12px",
                              }}
                            />
                            <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500">No date distribution available.</p>
                    )}
                  </div>
                </div>
              )}

              {columnDiagnostics.detectedType === "boolean" && (
                <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Boolean Frequency Count
                  </h4>
                  <div className="h-48 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={[
                          { label: "True", count: columnDiagnostics.trueCount || 0 },
                          { label: "False", count: columnDiagnostics.falseCount || 0 },
                          { label: "Missing", count: columnDiagnostics.missingCount || 0 },
                        ]}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis dataKey="label" stroke="#64748b" fontSize={11} />
                        <YAxis stroke="#64748b" fontSize={11} />
                        <RechartsTooltip
                          contentStyle={{
                            backgroundColor: "#0f172a",
                            borderColor: "#334155",
                            borderRadius: "8px",
                            fontSize: "12px",
                          }}
                        />
                        <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-slate-400">Select a column to view statistical distributions.</p>
          )}
        </div>
      )}

      {/* =========================================================================
          6. DATA QUALITY, GOVERNANCE & CALCULATIONS
         ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Data Quality notices */}
        {report.dataQuality && report.dataQuality.length > 0 && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              Data Quality & Governance Notices
            </h2>

            <div className="space-y-3">
              {report.dataQuality.map((dq, idx) => (
                <div
                  key={idx}
                  className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-3.5 space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <strong className="text-xs font-semibold text-white">
                      Column: {dq.column}
                    </strong>
                    <span
                      className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${
                        dq.severity === "high"
                          ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                          : dq.severity === "medium"
                          ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                          : "bg-blue-500/10 text-blue-400 border-blue-500/20"
                      }`}
                    >
                      {dq.severity} Severity
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">
                    {resolveTemplate(dq.message, payload)}
                  </p>

                  {dq.evidenceRefs && dq.evidenceRefs.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {dq.evidenceRefs.map((ref, rIdx) => {
                        const val = resolveJsonPointer(payload, ref);
                        const display = val !== undefined && val !== null ? String(val) : "Unavailable";
                        return (
                          <span
                            key={rIdx}
                            className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700"
                            title={ref}
                          >
                            {ref.replace(/^\//, "")}: {display}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Suggested Additional Calculations */}
        {report.additionalCalculations && report.additionalCalculations.length > 0 && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              Suggested Additional Calculations
            </h2>

            <div className="space-y-3">
              {report.additionalCalculations.map((calc, idx) => (
                <div
                  key={idx}
                  className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-3.5 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-white">{calc.name}</h4>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">{calc.reason}</p>
                  {calc.requiredColumns && (
                    <div className="flex flex-wrap items-center gap-1 pt-1">
                      <span className="text-[10px] text-slate-400 font-medium">Required:</span>
                      {calc.requiredColumns.map((col, cIdx) => (
                        <span
                          key={cIdx}
                          className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-mono"
                        >
                          {col}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
