"use client";

import React, { useState, useMemo } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { SheetData, AiScenario, DetailedInsightResult } from "@/types";
import { analyzeScenario } from "@/utils/scenarioAnalyzer";
import { toast } from "@/components/ui/toast";
import { 
  Sparkles, 
  Download, 
  Copy, 
  BarChart3, 
  CheckCircle2, 
  Lightbulb, 
  ArrowRight, 
  Table, 
  Grid3X3, 
  ShieldAlert, 
  TrendingUp, 
  Layers,
  FileText,
  Activity,
  ChevronRight,
  ExternalLink
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend
} from "recharts";

const CHART_COLORS = [
  "#6366f1", "#10b981", "#3b82f6", "#f59e0b", "#ef4444", 
  "#8b5cf6", "#ec4899", "#14b8a6", "#f97316", "#06b6d4"
];

interface DetailedInsightsModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedScenarios: AiScenario[];
  activeSheet: SheetData;
  onOpenInPivot?: (scenario: AiScenario) => void;
}

export function DetailedInsightsModal({
  isOpen,
  onClose,
  selectedScenarios,
  activeSheet,
  onOpenInPivot,
}: DetailedInsightsModalProps) {
  // Compute analytics for all selected scenarios
  const insights: DetailedInsightResult[] = useMemo(() => {
    if (!activeSheet || selectedScenarios.length === 0) return [];
    return selectedScenarios.map((sc) => analyzeScenario(activeSheet, sc));
  }, [activeSheet, selectedScenarios]);

  // Tab index for multi-scenario viewing
  const [activeInsightIndex, setActiveInsightIndex] = useState(0);

  // Active insight
  const currentInsight = insights[activeInsightIndex] || insights[0];

  if (!currentInsight) {
    return null;
  }

  const handleCopySummary = () => {
    const text = `
=== REPORT IQ AI DETAILED INSIGHTS ===
Title: ${currentInsight.scenarioTitle}
Question: ${currentInsight.businessQuestion}
Why It Matters: ${currentInsight.whyItMatters}

KEY SUMMARY:
${currentInsight.summary}

QUANTITATIVE FINDINGS:
${currentInsight.narrativeParagraphs.join("\n\n")}

ACTIONABLE RECOMMENDATIONS:
${currentInsight.actionableRecommendations.map((r, i) => `${i + 1}. ${r}`).join("\n")}
    `.trim();

    navigator.clipboard.writeText(text);
    toast.success("Detailed AI insights copied to clipboard!");
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Detailed AI Relationship Intelligence"
      className="max-w-4xl max-h-[92vh] overflow-y-auto"
    >
      <div className="p-6 space-y-6">
        
        {/* Multi-scenario navigation tabs if more than 1 scenario is selected */}
        {selectedScenarios.length > 1 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-border">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider shrink-0 mr-2">
              Selected ({selectedScenarios.length}):
            </span>
            {selectedScenarios.map((sc, idx) => {
              const isActive = idx === activeInsightIndex;
              return (
                <button
                  key={sc.id}
                  onClick={() => setActiveInsightIndex(idx)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 ${
                    isActive
                      ? "bg-primary text-white shadow-sm shadow-primary/20"
                      : "bg-accent/50 text-foreground hover:bg-accent"
                  }`}
                >
                  <span className="opacity-70 font-mono text-[10px]">#{idx + 1}</span>
                  <span>{sc.title}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Header Title & Badges */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
                {currentInsight.category}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono text-muted-foreground bg-accent border border-border">
                {currentInsight.analysisType}
              </span>
              <div className="flex items-center gap-1 text-[11px] text-muted-foreground font-mono">
                <span>Columns:</span>
                <span className="font-semibold text-foreground">[{currentInsight.columns.join(" ↔ ")}]</span>
              </div>
            </div>

            <h2 className="font-display font-extrabold text-2xl text-foreground">
              {currentInsight.scenarioTitle}
            </h2>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopySummary}
              className="gap-1.5 text-xs text-foreground"
            >
              <Copy className="h-3.5 w-3.5" />
              <span>Copy Summary</span>
            </Button>
            {onOpenInPivot && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  const targetScenario = selectedScenarios[activeInsightIndex];
                  if (targetScenario) {
                    onOpenInPivot(targetScenario);
                    onClose();
                  }
                }}
                className="gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
              >
                <Grid3X3 className="h-3.5 w-3.5" />
                <span>Open in Pivot Matrix</span>
              </Button>
            )}
          </div>
        </div>

        {/* Business Question & Executive Summary Callout */}
        <div className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-4 space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-primary uppercase tracking-wider">
            <Lightbulb className="h-4 w-4" />
            <span>Investigative Business Question</span>
          </div>
          <p className="text-sm font-semibold text-foreground italic">
            "{currentInsight.businessQuestion}"
          </p>
          <p className="text-xs text-muted-foreground pt-1 border-t border-primary/10">
            <strong className="text-foreground">Why It Matters:</strong> {currentInsight.whyItMatters}
          </p>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {currentInsight.keyMetrics.map((km, idx) => (
            <div key={idx} className="bg-card border border-border rounded-xl p-3 shadow-sm">
              <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider block mb-1">
                {km.label}
              </span>
              <div className="text-lg font-bold font-display text-foreground truncate">
                {km.value}
              </div>
            </div>
          ))}
        </div>

        {/* Visual Chart Section */}
        {currentInsight.chartData && currentInsight.chartData.length > 0 && (
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                <h4 className="font-display font-bold text-sm text-foreground">
                  Empirical Visual Distribution: {currentInsight.scenarioTitle}
                </h4>
              </div>
              <span className="text-[11px] text-muted-foreground font-mono">
                {currentInsight.chartType.toUpperCase()} CHART
              </span>
            </div>

            <div className="h-72 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                {currentInsight.chartType === "pie" ? (
                  <PieChart>
                    <RechartsTooltip
                      contentStyle={{ backgroundColor: "#1e293b", borderColor: "#334155", borderRadius: "8px", color: "#f8fafc", fontSize: "12px" }}
                    />
                    <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
                    <Pie
                      data={currentInsight.chartData}
                      dataKey={currentInsight.chartYKey || "value"}
                      nameKey={currentInsight.chartXKey || "name"}
                      cx="50%"
                      cy="50%"
                      outerRadius={95}
                      innerRadius={45}
                      paddingAngle={3}
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    >
                      {currentInsight.chartData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                  </PieChart>
                ) : currentInsight.chartType === "line" || currentInsight.chartType === "area" ? (
                  <AreaChart data={currentInsight.chartData} margin={{ top: 10, right: 20, left: 0, bottom: 25 }}>
                    <defs>
                      <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                    <XAxis dataKey={currentInsight.chartXKey || "date"} tick={{ fontSize: 11 }} angle={-25} textAnchor="end" />
                    <YAxis tick={{ fontSize: 11 }} />
                    <RechartsTooltip
                      contentStyle={{ backgroundColor: "#1e293b", borderColor: "#334155", borderRadius: "8px", color: "#f8fafc", fontSize: "12px" }}
                    />
                    <Area type="monotone" dataKey={currentInsight.chartYKey || "volume"} stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#areaGradient)" />
                  </AreaChart>
                ) : (
                  <BarChart data={currentInsight.chartData} margin={{ top: 10, right: 20, left: 0, bottom: 35 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                    <XAxis dataKey={currentInsight.chartXKey || "name"} tick={{ fontSize: 11 }} angle={-25} textAnchor="end" interval={0} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <RechartsTooltip
                      contentStyle={{ backgroundColor: "#1e293b", borderColor: "#334155", borderRadius: "8px", color: "#f8fafc", fontSize: "12px" }}
                    />
                    <Bar dataKey={currentInsight.chartYKey || "value"} fill="#6366f1" radius={[4, 4, 0, 0]}>
                      {currentInsight.chartData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.isOutlierZone ? "#ef4444" : CHART_COLORS[index % CHART_COLORS.length]} 
                        />
                      ))}
                    </Bar>
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Narrative & Statistical Explanation */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-3">
            <div className="flex items-center gap-2 text-primary font-bold text-sm font-display">
              <Sparkles className="h-4 w-4" />
              <span>AI Analytical Synthesis & Findings</span>
            </div>
            <div className="space-y-2 text-xs text-muted-foreground leading-relaxed">
              {currentInsight.narrativeParagraphs.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-3">
            <div className="flex items-center gap-2 text-emerald-500 font-bold text-sm font-display">
              <CheckCircle2 className="h-4 w-4" />
              <span>Recommended Strategic Actions</span>
            </div>
            <ul className="space-y-2.5">
              {currentInsight.actionableRecommendations.map((rec, i) => (
                <li key={i} className="flex items-start gap-2.5 text-xs text-foreground">
                  <div className="h-4 w-4 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0 mt-0.5 font-bold text-[10px]">
                    {i + 1}
                  </div>
                  <span className="leading-relaxed font-medium">{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Outlier Records Preview Table (if applicable) */}
        {currentInsight.outlierRows && currentInsight.outlierRows.length > 0 && (
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-500 font-bold text-sm">
                <ShieldAlert className="h-4 w-4" />
                <span>Flagged Outlier Records Sample ({currentInsight.outlierRows.length} shown)</span>
              </div>
              <span className="text-[11px] text-muted-foreground">
                Statistical anomalies exceeding boundary limits
              </span>
            </div>

            <div className="overflow-x-auto border border-border rounded-lg max-h-48 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-accent/50 text-muted-foreground uppercase text-[10px] tracking-wider border-b border-border sticky top-0">
                  <tr>
                    {currentInsight.columns.map((c) => (
                      <th key={c} className="py-2 px-3 font-bold">{c}</th>
                    ))}
                    {Object.keys(currentInsight.outlierRows[0] || {})
                      .filter((k) => !currentInsight.columns.includes(k))
                      .slice(0, 3)
                      .map((k) => (
                        <th key={k} className="py-2 px-3">{k}</th>
                      ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border font-medium">
                  {currentInsight.outlierRows.map((row, idx) => (
                    <tr key={idx} className="hover:bg-accent/30 font-mono">
                      {currentInsight.columns.map((c) => (
                        <td key={c} className="py-2 px-3 text-amber-500 font-bold">
                          {String(row[c] ?? "-")}
                        </td>
                      ))}
                      {Object.keys(row)
                        .filter((k) => !currentInsight.columns.includes(k))
                        .slice(0, 3)
                        .map((k) => (
                          <td key={k} className="py-2 px-3 text-muted-foreground">
                            {String(row[k] ?? "-")}
                          </td>
                        ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Modal Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-border">
          <div className="text-xs text-muted-foreground">
            Analysis calculated on <strong className="text-foreground">{activeSheet.rows.length.toLocaleString()} active rows</strong>
          </div>
          <Button
            size="sm"
            onClick={onClose}
            className="bg-primary hover:bg-primary/90 text-white font-bold px-6"
          >
            Done
          </Button>
        </div>

      </div>
    </Dialog>
  );
}
