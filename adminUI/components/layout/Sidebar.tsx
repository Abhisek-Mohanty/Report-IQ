"use client";

import React from "react";
import { useAnalyticsStore } from "@/store/useAnalyticsStore";
import { 
  BarChart3, 
  UploadCloud, 
  Database, 
  GitMerge, 
  Scissors, 
  Sparkles, 
  FileSpreadsheet, 
  Filter, 
  Download, 
  Brain, 
  MessageSquareCode, 
  SearchCode, 
  FileHeart, 
  Activity
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarItem {
  id: string;
  name: string;
  icon: React.ComponentType<any>;
  category: "core" | "prep" | "ai";
  requiresAuth?: boolean;
}

const SIDEBAR_ITEMS: SidebarItem[] = [
  // Core Analytics
  { id: "dashboard", name: "Dashboard", icon: Activity, category: "core", requiresAuth: false },
  { id: "upload", name: "Upload Files", icon: UploadCloud, category: "core", requiresAuth: false },
  { id: "datasets", name: "Datasets", icon: Database, category: "core", requiresAuth: false },
  
  // Data Preparation
  { id: "merge", name: "Merge Tool", icon: GitMerge, category: "prep", requiresAuth: false },
  { id: "split", name: "Split Tool", icon: Scissors, category: "prep", requiresAuth: false },
  { id: "cleaning", name: "Data Cleaning", icon: FileSpreadsheet, category: "prep", requiresAuth: false },
  { id: "query", name: "Query Builder", icon: Filter, category: "prep", requiresAuth: false },
  { id: "visualizations", name: "Visualizations", icon: BarChart3, category: "prep", requiresAuth: false },
  { id: "export", name: "Export Report", icon: Download, category: "prep", requiresAuth: false },
  
  // AI Insights placeholders
  { id: "ai-insights", name: "AI Insights", icon: Brain, category: "ai", requiresAuth: true },
  { id: "ai-chat", name: "AI Copilot Chat", icon: MessageSquareCode, category: "ai", requiresAuth: true },
  { id: "ai-query", name: "AI Query Agent", icon: SearchCode, category: "ai", requiresAuth: true },
  { id: "ai-report", name: "AI Report Builder", icon: FileHeart, category: "ai", requiresAuth: true },
];

export function Sidebar() {
  const [showLoginModal, setShowLoginModal] = React.useState(false);
  const activeTab = useAnalyticsStore((state) => state.activeTab);
  const setActiveTab = useAnalyticsStore((state) => state.setActiveTab);
  const datasets = useAnalyticsStore((state) => state.datasets);

  const renderGroup = (category: "core" | "prep" | "ai", title: string) => {
    const items = SIDEBAR_ITEMS.filter((item) => item.category === category);
    
    return (
      <div className="mb-6">
        <h4 className="px-4 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider font-display">
          {title}
        </h4>
        <ul className="space-y-1 px-2">
          {items.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            const isDataRequired = ["datasets", "merge", "split", "cleaning", "query", "visualizations", "export"].includes(item.id);
            const isDisabled = isDataRequired && datasets.length === 0;

            return (
              <li key={item.id}>
                <button
                 onClick={() => {
                        if (isDisabled) return;

                        if (item.requiresAuth) {
                          const token = localStorage.getItem("access_token");

                          if (!token) {
                            setShowLoginModal(true);
                            return;
                          }
                        }
                        setActiveTab(item.id);
                      }}
                  disabled={isDisabled}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 relative group",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20 font-semibold"
                      : isDisabled
                      ? "text-muted-foreground/45 cursor-not-allowed opacity-50"
                      : "text-foreground hover:bg-accent hover:text-foreground"
                  )}
                >
                  <Icon className={cn("h-4 w-4 shrink-0 transition-transform", !isDisabled && "group-hover:scale-110")} />
                  <span className="truncate">{item.name}</span>
                  
                  {/* Tooltip for disabled items */}
                  {isDisabled && (
                    <span className="absolute left-full ml-2 px-2 py-1 text-[10px] text-white bg-slate-900 rounded opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-none whitespace-nowrap">
                      Upload a dataset first
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    );
  };

  return (
    <aside className="w-64 border-r border-border bg-card flex flex-col h-full shrink-0">
      {/* Brand Logo Header */}
      <div className="h-16 flex items-center gap-2.5 px-6 border-b border-border">
        <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center shadow-md shadow-primary/20">
          <BarChart3 className="h-4 w-4 text-primary-foreground" />
        </div>
        <div>
          <h1 className="font-display font-bold text-base leading-none text-foreground">Report IQ</h1>
          <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Browser Suite</span>
        </div>
      </div>

      {/* Nav Content */}
      <nav className="flex-1 overflow-y-auto pt-6">
        {renderGroup("core", "Workspace Core")}
        {renderGroup("prep", "Data Prep & Visuals")}
        {renderGroup("ai", "AI Copilots (Beta)")}
      </nav>

      {/* Workspace Status */}
      <div className="p-4 border-t border-border bg-accent/20">
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5 font-medium">
          <span>Active Datasets:</span>
          <span className="font-bold text-foreground bg-accent px-2 py-0.5 rounded-full">{datasets.length}</span>
        </div>
        {datasets.length > 0 && (
          <div className="text-[10px] text-muted-foreground truncate font-medium">
            Active: <span className="font-semibold text-foreground">{datasets[datasets.length - 1].name}</span>
          </div>
        )}
        {showLoginModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
              <div className="w-96 rounded-xl bg-card p-6 shadow-xl">

                <h2 className="text-xl font-semibold">
                  Login Required
                </h2>

                <p className="mt-2 text-sm text-muted-foreground">
                  Please login to use Report IQ AI features.
                </p>

                <div className="mt-6 flex justify-end gap-3">

                  <button
                    onClick={() => setShowLoginModal(false)}
                    className="rounded-lg px-4 py-2 text-sm hover:bg-accent"
                  >
                    Cancel
                  </button>

                  <button
                    onClick={() => {
                      window.location.href =
                        "http://localhost:8000/api/v1/auth/google";
                    }}
                    className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground"
                  >
                    Login with Google
                  </button>

                </div>
              </div>
            </div>
          )}
      </div>
    </aside>
  );
}
