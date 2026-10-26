"use client";

import React from "react";
import { useAnalyticsStore } from "@/store/useAnalyticsStore";
import {
  Monitor,
  Sparkles,
  Brain,
  ArrowRight,
  Database,
  BarChart3,
  FileSpreadsheet,
  CheckCircle2,
  SlidersHorizontal,
  Download,
  Info
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface DesktopOnlyNoticeProps {
  featureName?: string;
  description?: string;
}

export function DesktopOnlyNotice({
  featureName = "AI Copilot & Validator Suite",
  description = "The AI Copilot, Validator, and Report Architect tools are high-density analytical workspaces with multi-table cross-comparisons, RFC 6901 diagnostic trees, and deep statistical anomaly matrices engineered specifically for desktop displays.",
}: DesktopOnlyNoticeProps) {
  const setActiveTab = useAnalyticsStore((state) => state.setActiveTab);
  const datasets = useAnalyticsStore((state) => state.datasets);

  return (
    <div className="flex-1 flex items-center justify-center min-h-0 w-full p-2 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-xl bg-card border border-border/80 rounded-3xl p-6 sm:p-8 shadow-xl shadow-primary/5 overflow-hidden text-center my-auto">
        {/* Subtle decorative background gradient */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-80 h-80 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
        
        {/* Top Badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[11px] font-semibold mb-4 tracking-wide">
          <Monitor className="h-3.5 w-3.5" />
          <span>Desktop Mode Required (min 768px)</span>
        </div>

        {/* Feature Icon Spotlight */}
        <div className="relative mx-auto mb-4 h-16 w-16 sm:h-20 sm:w-20 rounded-2xl bg-gradient-to-tr from-primary/20 via-violet-500/20 to-indigo-500/10 border border-primary/30 flex items-center justify-center text-primary shadow-lg shadow-primary/10">
          <Brain className="h-8 w-8 sm:h-10 sm:w-10 text-primary" />
          <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-lg bg-primary text-primary-foreground flex items-center justify-center shadow-md">
            <Sparkles className="h-3.5 w-3.5" />
          </div>
        </div>

        {/* Title & Description */}
        <h2 className="font-display font-bold text-xl sm:text-2xl text-foreground mb-2 leading-snug">
          {featureName}
        </h2>
        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-md mx-auto mb-6">
          {description}
        </p>

        {/* Mobile-Available Workspace Highlights */}
        <div className="text-left bg-accent/30 border border-border/70 rounded-2xl p-4 sm:p-5 mb-6">
          <div className="flex items-center gap-2 mb-3 text-xs font-semibold text-foreground font-display">
            <Info className="h-4 w-4 text-primary shrink-0" />
            <span>Mobile-Optimized Tools Ready Now:</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
              <span>Spreadsheet Upload &amp; Grid</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
              <span>Data Quality &amp; Cleaning</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
              <span>Multi-Source Joins &amp; Split</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
              <span>Universal 27-Format Exporter</span>
            </div>
          </div>
        </div>

        {/* Action Buttons to Mobile-Ready Views */}
        <div className="flex flex-col sm:flex-row gap-2.5 justify-center">
          <Button
            variant="primary"
            size="sm"
            className="w-full sm:w-auto gap-2 text-xs font-semibold shadow-md shadow-primary/20"
            onClick={() => setActiveTab(datasets.length > 0 ? "datasets" : "upload")}
          >
            {datasets.length > 0 ? (
              <>
                <Database className="h-3.5 w-3.5" />
                <span>Open Datasets Grid</span>
              </>
            ) : (
              <>
                <FileSpreadsheet className="h-3.5 w-3.5" />
                <span>Upload a Spreadsheet</span>
              </>
            )}
            <ArrowRight className="h-3.5 w-3.5 ml-auto sm:ml-0" />
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="w-full sm:w-auto gap-2 text-xs font-semibold"
            onClick={() => setActiveTab("dashboard")}
          >
            <BarChart3 className="h-3.5 w-3.5" />
            <span>Go to Dashboard</span>
          </Button>
        </div>

        <p className="text-[10px] text-muted-foreground/70 mt-5">
          Tip: Log in from a desktop browser or resize your window above 768px to unlock AI Copilots.
        </p>
      </div>
    </div>
  );
}
