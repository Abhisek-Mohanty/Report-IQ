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
import { ComingSoonView } from "@/components/views/ComingSoonView";
import { AiInsightsView } from "@/components/views/AiInsightsView";
import { AiValidatorView } from "@/components/views/AiValidatorView";

export default function WorkspacePage() {
  const activeTab = useAnalyticsStore((state) => state.activeTab);
  const theme = useAnalyticsStore((state) => state.theme);
  const setTheme = useAnalyticsStore((state) => state.setTheme);

  // Initialize theme class on mount
  useEffect(() => {
    setTheme(theme);
  }, [theme, setTheme]);

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
      
      // AI Placeholders
      case "ai-insights":
        return <AiInsightsView/>;
      
      case "ai-validator":
        return <AiValidatorView />;

      case "ai-chat":
        return (
          <ComingSoonView
            title="AI Copilot Chat"
            description="Chat directly with your CSV and Excel datasets. Ask questions like 'Which product category had the highest gross margin in Q3?' and watch it compute pivots and filters in real-time."
            features={[
              "Natural Language to JS Data-Grid Queries",
              "Interactive Table Summarization",
              "Local Context Injection (RAG on your cells)",
              "Automated Code Snippet Generation",
            ]}
          />
        );
      case "ai-query":
        return (
          <ComingSoonView
            title="AI Query Generator"
            description="Describe the subset of data you want in natural language (e.g. 'Show me orders from London above $500 placed last week'), and watch our local compiler translate it into compound Boolean filters."
            features={[
              "Semantic Search & Query Parsing",
              "Text-to-SQL / Text-to-Filter translation",
              "Interactive Query Optimization",
              "Instant Dry-Runs on Active Sheets",
            ]}
          />
        );
      case "ai-report":
        return (
          <ComingSoonView
            title="AI Report Architect"
            description="Generate stunning, business-ready executive PDF and slide decks. Write a simple prompt explaining your goal, and let the planner construct layouts, summaries, and charts."
            features={[
              "Executive Summary Writing",
              "Optimal Chart Selection Engine",
              "Custom Dashboard Template Generator",
              "Automated Slide Deck & Document Export",
            ]}
          />
        );
      default:
        return <UploadView />;
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground transition-colors duration-200">
      {/* Sidebar Navigation */}
      <Sidebar />

      {/* Main Workspace Frame */}
      <div className="flex flex-col flex-1 h-full min-w-0">
        <Navbar />

        {/* View Port with animations */}
        <main className="flex-1 overflow-hidden relative bg-background/55 p-6 flex flex-col">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="flex-1 flex flex-col min-h-0"
            >
              {renderActiveView()}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
