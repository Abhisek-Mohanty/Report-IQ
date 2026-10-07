"use client";

import React, { useState, useMemo } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { SheetData, AiScenario } from "@/types";
import { toast } from "@/components/ui/toast";
import { 
  Sparkles, 
  Plus, 
  HelpCircle, 
  BarChart3, 
  Database, 
  SlidersHorizontal,
  Table,
  CheckCircle2,
  TrendingUp,
  AlertTriangle
} from "lucide-react";

interface CustomRelationshipModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeSheet: SheetData;
  onAddCustomScenario: (scenario: AiScenario) => void;
}

export function CustomRelationshipModal({
  isOpen,
  onClose,
  activeSheet,
  onAddCustomScenario,
}: CustomRelationshipModalProps) {
  const headers = activeSheet?.headers || [];
  const columnTypes = activeSheet?.columnTypes || {};

  // Form states
  const [colA, setColA] = useState<string>(headers[0] || "");
  const [colB, setColB] = useState<string>(headers[1] || "none");
  const [analysisType, setAnalysisType] = useState<string>("group_comparison");
  const [suggestedChart, setSuggestedChart] = useState<string>("bar");
  const [customTitle, setCustomTitle] = useState<string>("");
  const [businessQuestion, setBusinessQuestion] = useState<string>("");
  const [whyItMatters, setWhyItMatters] = useState<string>("");

  // Auto-generate suggested title and business question when columns change
  React.useEffect(() => {
    if (colA) {
      if (colB && colB !== "none") {
        setCustomTitle(`${colB} by ${colA}`);
        setBusinessQuestion(`How does ${colB} vary across different categories of ${colA}?`);
        setWhyItMatters(`Identifies key concentration, variations, and operational trends between ${colA} and ${colB}.`);
      } else {
        if (analysisType === "distribution") {
          setCustomTitle(`${colA} Distribution`);
          setBusinessQuestion(`What is the proportional distribution and frequency of ${colA}?`);
          setWhyItMatters(`Provides visibility into the dominant categories and segments for ${colA}.`);
        } else if (analysisType === "outlier_detection") {
          setCustomTitle(`${colA} Outliers & Anomalies`);
          setBusinessQuestion(`Are there any statistically anomalous values or extreme outliers in ${colA}?`);
          setWhyItMatters(`Highlights extreme records that may pose risk or require manual review.`);
        } else if (analysisType === "duplicate_check") {
          setCustomTitle(`${colA} Duplicate Integrity Check`);
          setBusinessQuestion(`Are there duplicate or redundant records associated with ${colA}?`);
          setWhyItMatters(`Ensures data hygiene and verifies that ${colA} preserves unique referential integrity.`);
        } else {
          setCustomTitle(`${colA} Analysis`);
          setBusinessQuestion(`What patterns and insights can be discovered from ${colA}?`);
          setWhyItMatters(`Assists in understanding key distribution metrics for ${colA}.`);
        }
      }
    }
  }, [colA, colB, analysisType]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!colA) {
      toast.error("Please select at least one primary column.");
      return;
    }

    const columns = [colA];
    if (colB && colB !== "none") {
      columns.push(colB);
    }

    // Determine category based on analysis type
    let category = "category";
    if (analysisType === "outlier_detection" || analysisType === "duplicate_check") {
      category = "anomaly";
    } else if (analysisType === "time_series") {
      category = "trend";
    } else if (analysisType === "correlation") {
      category = "relationship";
    }

    const newScenario: AiScenario = {
      id: `custom-${Date.now()}`,
      title: customTitle.trim() || `${colA} Custom Relation`,
      category,
      columns,
      analysisType,
      method: analysisType === "outlier_detection" 
        ? "IQR" 
        : analysisType === "duplicate_check" 
        ? "duplicate-check" 
        : analysisType === "time_series" 
        ? "time-aggregation" 
        : analysisType === "correlation" 
        ? "pearson" 
        : "groupby-aggregate",
      suggestedChart,
      businessQuestion: businessQuestion.trim() || `What is the relationship between ${columns.join(" and ")}?`,
      whyItMatters: whyItMatters.trim() || `Enables targeted decision making based on custom relationship modeling.`,
      confidence: "high",
      confidenceReason: "Custom user-defined relationship on verified active dataset columns.",
      isCustom: true,
    };

    onAddCustomScenario(newScenario);
    toast.success(`Custom relationship "${newScenario.title}" added to active scenarios.`);
    onClose();
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Define Custom Column Relationship"
      className="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="p-6 space-y-5">
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex items-start gap-3">
          <Sparkles className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            Construct your own relationship between spreadsheet attributes. Our analytics engine will instantly compute statistical distributions, generate visual charts, and produce tailored AI insights for your custom selection.
          </p>
        </div>

        {/* Column Selection Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground flex items-center justify-between">
              <span>Primary Column (Dimension / Key)</span>
              <span className="text-[10px] text-primary font-mono font-medium">Required</span>
            </label>
            <select
              value={colA}
              onChange={(e) => setColA(e.target.value)}
              className="w-full bg-accent/40 text-foreground border border-border rounded-lg px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-primary/40 focus:outline-none cursor-pointer"
            >
              {headers.map((h) => (
                <option key={h} value={h} className="bg-card text-foreground">
                  {h} ({columnTypes[h] || "string"})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground flex items-center justify-between">
              <span>Target Metric / Comparison Column</span>
              <span className="text-[10px] text-muted-foreground font-mono">Optional</span>
            </label>
            <select
              value={colB}
              onChange={(e) => setColB(e.target.value)}
              className="w-full bg-accent/40 text-foreground border border-border rounded-lg px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-primary/40 focus:outline-none cursor-pointer"
            >
              <option value="none" className="bg-card text-foreground">
                (None - Single Column Profiling)
              </option>
              {headers
                .filter((h) => h !== colA)
                .map((h) => (
                  <option key={h} value={h} className="bg-card text-foreground">
                    {h} ({columnTypes[h] || "string"})
                  </option>
                ))}
            </select>
          </div>
        </div>

        {/* Analysis Type & Suggested Chart */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">
              Analytical Method / Investigation Type
            </label>
            <select
              value={analysisType}
              onChange={(e) => {
                const val = e.target.value;
                setAnalysisType(val);
                if (val === "distribution") setSuggestedChart("pie");
                else if (val === "time_series") setSuggestedChart("line");
                else if (val === "correlation") setSuggestedChart("scatter");
                else setSuggestedChart("bar");
              }}
              className="w-full bg-accent/40 text-foreground border border-border rounded-lg px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-primary/40 focus:outline-none cursor-pointer"
            >
              <option value="group_comparison">Group Comparison (Dimension vs. Measure)</option>
              <option value="distribution">Distribution & Category Frequency</option>
              <option value="time_series">Time Series & Chronological Trend</option>
              <option value="outlier_detection">Outlier Detection (Statistical IQR)</option>
              <option value="correlation">Correlation & Numerical Association</option>
              <option value="duplicate_check">Duplicate Record Integrity Check</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">
              Suggested Visual Representation
            </label>
            <select
              value={suggestedChart}
              onChange={(e) => setSuggestedChart(e.target.value)}
              className="w-full bg-accent/40 text-foreground border border-border rounded-lg px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-primary/40 focus:outline-none cursor-pointer"
            >
              <option value="bar">Bar / Column Chart</option>
              <option value="pie">Pie Chart</option>
              <option value="line">Line Chart</option>
              <option value="area">Area Chart</option>
              <option value="scatter">Scatter Plot</option>
            </select>
          </div>
        </div>

        {/* Title & Question */}
        <div className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">
              Relationship Title
            </label>
            <input
              type="text"
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
              placeholder="e.g. Service Amount by Branch"
              className="w-full bg-accent/40 text-foreground border border-border rounded-lg px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-primary/40 focus:outline-none"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">
              Business Question to Answer
            </label>
            <input
              type="text"
              value={businessQuestion}
              onChange={(e) => setBusinessQuestion(e.target.value)}
              placeholder="e.g. Which branches process the highest service volume?"
              className="w-full bg-accent/40 text-foreground border border-border rounded-lg px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-primary/40 focus:outline-none"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">
              Why It Matters (Strategic Value)
            </label>
            <textarea
              value={whyItMatters}
              onChange={(e) => setWhyItMatters(e.target.value)}
              rows={2}
              placeholder="Explain the commercial or operational rationale for this analysis..."
              className="w-full bg-accent/40 text-foreground border border-border rounded-lg px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-primary/40 focus:outline-none resize-none"
            />
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            size="sm"
            className="bg-primary hover:bg-primary/90 text-white font-bold gap-2 shadow-md shadow-primary/20"
          >
            <Plus className="h-4 w-4" />
            <span>Add to Relationships Catalog</span>
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
