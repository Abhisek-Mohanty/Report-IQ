"use client";

import React, { useEffect } from "react";
import { useAnalyticsStore } from "@/store/useAnalyticsStore";
import { Sidebar } from "@/components/layout/Sidebar";
import { Navbar } from "@/components/layout/Navbar";
import { motion, AnimatePresence } from "framer-motion";

// Lazy-loaded or directly imported views to avoid bundling bottlenecks
import { DashboardView } from "@/components/views/DashboardView";
import { UploadView } from "@/components/views/UploadView";
import { DatasetsView } from "@/components/views/DatasetsView";
import { MergeView } from "@/components/views/MergeView";
import { SplitView } from "@/components/views/SplitView";
import { CleaningView } from "@/components/views/CleaningView";
import { ManualChecksView } from "@/components/views/ManualChecksView";
import { VisualizationsView } from "@/components/views/VisualizationsView";
import { QueryBuilderView } from "@/components/views/QueryBuilderView";
import { ExportView } from "@/components/views/ExportView";
import { JsonConverterView } from "@/components/views/JsonConverterView";
import { ComingSoonView } from "@/components/views/ComingSoonView";
import { AiInsightsView } from "@/components/views/AiInsightsView";
import { AiValidatorView } from "@/components/views/AiValidatorView";
import { DesktopOnlyNotice } from "@/components/ui/DesktopOnlyNotice";

export default function WorkspacePage() {
  const activeTab = useAnalyticsStore((state) => state.activeTab);
  const theme = useAnalyticsStore((state) => state.theme);
  const setTheme = useAnalyticsStore((state) => state.setTheme);

  // Initialize theme class on mount
  useEffect(() => {
    setTheme(theme);
  }, [theme, setTheme]);

  // Wrapper to enforce desktop-only availability for AI Copilot suites
  const renderAiDesktopOnly = (title: string, component: React.ReactNode, description?: string) => {
    return (
      <div className="flex-1 flex flex-col min-h-0 w-full h-full">
        {/* Mobile Viewport Notice (< md / 768px) */}
        <div className="flex md:hidden flex-1 flex-col min-h-0 w-full">
          <DesktopOnlyNotice featureName={title} description={description} />
        </div>
        {/* Desktop Viewport Workspace (>= md / 768px) */}
        <div className="hidden md:flex flex-1 flex-col min-h-0 w-full">
          {component}
        </div>
      </div>
    );
  };

  const renderActiveView = () => {
    switch (activeTab) {
      case "dashboard":
        return <DashboardView />;
      case "upload":
        return <UploadView />;
      case "datasets":
        return <DatasetsView />;
      case "merge":
        return <MergeView />;
      case "split":
        return <SplitView />;
      case "cleaning":
        return <CleaningView />;
      case "manual-checks":
        return <ManualChecksView />;
      case "query":
        return <QueryBuilderView />;
      case "visualizations":
        return <VisualizationsView />;
      case "export":
        return <ExportView />;
      case "json-converter":
        return <JsonConverterView />;
      
      // AI Features (Desktop Mode Only)
      case "ai-insights":
        return renderAiDesktopOnly(
          "AI Dataset Insights",
          <AiInsightsView />,
          "AI Dataset Insights calculates deep statistical regressions, distribution anomalies, and counterparty portfolio charts tailored for desktop viewing."
        );
      
      case "ai-validator":
        return renderAiDesktopOnly(
          "AI Report & Reference Validator",
          <AiValidatorView />,
          "The AI Report Validator performs multi-document schema reconciliation, dual-sheet audits, and AST formula checks optimized for high-resolution desktop workspaces."
        );

      case "ai-chat":
        return renderAiDesktopOnly(
          "AI Copilot Chat",
          <ComingSoonView
            title="AI Copilot Chat"
            description="Chat directly with your CSV and Excel datasets. Ask questions like 'Which product category had the highest gross margin in Q3?' and watch it compute pivots and filters in real-time."
            features={[
              "Natural Language to JS Data-Grid Queries",
              "Interactive Table Summarization",
              "Local Context Injection (RAG on your cells)",
              "Automated Code Snippet Generation",
            ]}
          />,
          "Natural language AI Copilot conversation is an intensive analytical workspace designed for desktop screens."
        );

      case "ai-query":
        return renderAiDesktopOnly(
          "AI Query Generator",
          <ComingSoonView
            title="AI Query Generator"
            description="Describe the subset of data you want in natural language (e.g. 'Show me orders from London above $500 placed last week'), and watch our local compiler translate it into compound Boolean filters."
            features={[
              "Semantic Search & Query Parsing",
              "Text-to-SQL / Text-to-Filter translation",
              "Interactive Query Optimization",
              "Instant Dry-Runs on Active Sheets",
            ]}
          />,
          "Natural language compound query translation is optimized for desktop data engineering workflows."
        );

      case "ai-report":
        return renderAiDesktopOnly(
          "AI Report Architect",
          <ComingSoonView
            title="AI Report Architect"
            description="Generate stunning, business-ready executive PDF and slide decks. Write a simple prompt explaining your goal, and let the planner construct layouts, summaries, and charts."
            features={[
              "Executive Summary Writing",
              "Optimal Chart Selection Engine",
              "Custom Dashboard Template Generator",
              "Automated Slide Deck & Document Export",
            ]}
          />,
          "Slide deck presentations and executive document generation are available exclusively on desktop displays."
        );

      default:
        return <UploadView />;
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground transition-colors duration-200">
      {/* Sidebar Navigation (Desktop fixed + Mobile sliding drawer) */}
      <Sidebar />

      {/* Main Workspace Frame */}
      <div className="flex flex-col flex-1 h-full min-w-0 overflow-hidden">
        <Navbar />

        {/* View Port with responsive padding */}
        <main className="flex-1 overflow-hidden relative bg-background/55 p-2.5 sm:p-4 md:p-6 flex flex-col min-w-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="flex-1 flex flex-col min-h-0 w-full"
            >
              {renderActiveView()}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
