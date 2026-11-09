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
  BrainCog,  
  FileHeart, 
  Activity, 
  MonitorCheck, 
  CheckSquare,
  X,
  Monitor
} from "lucide-react";
import { cn } from "@/lib/utils";
import { LoginModal } from "@/components/modals/LoginModal";

interface SidebarItem {
  id: string;
  name: string;
  icon: React.ComponentType<any>;
  category: "core" | "prep" | "ai" | "convert";
  requiresAuth?: boolean;
  desktopOnly?: boolean;
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
  { id: "manual-checks", name: "Data Validator", icon: CheckSquare, category: "prep", requiresAuth: false },
  { id: "query", name: "Query Builder", icon: Filter, category: "prep", requiresAuth: false },
  { id: "visualizations", name: "Visualizations", icon: BarChart3, category: "prep", requiresAuth: false },
  { id: "export", name: "From Excel", icon: Download, category: "convert", requiresAuth: false },
  
  // AI Insights placeholders (Desktop Only)
  { id: "ai-insights", name: "AI Insights", icon: BrainCog, category: "ai", requiresAuth: true, desktopOnly: true },
  { id: "ai-validator", name: "AI Report Validator", icon: MonitorCheck, category: "ai", requiresAuth: true, desktopOnly: true },
  { id: "ai-chat", name: "AI Copilot Chat", icon: MessageSquareCode, category: "ai", requiresAuth: true, desktopOnly: true },
  { id: "ai-query", name: "AI Query Agent", icon: SearchCode, category: "ai", requiresAuth: true, desktopOnly: true },
  { id: "ai-report", name: "AI Report Builder", icon: FileHeart, category: "ai", requiresAuth: true, desktopOnly: true },
];

export function Sidebar() {
  const [showLoginModal, setShowLoginModal] = React.useState(false);
  const activeTab = useAnalyticsStore((state) => state.activeTab);
  const setActiveTab = useAnalyticsStore((state) => state.setActiveTab);
  const datasets = useAnalyticsStore((state) => state.datasets);
  const isMobileSidebarOpen = useAnalyticsStore((state) => state.isMobileSidebarOpen);
  const setMobileSidebarOpen = useAnalyticsStore((state) => state.setMobileSidebarOpen);

  const renderNavGroup = (category: "core" | "prep" | "ai" | "convert", title: string, isMobileDrawer = false) => {
    const items = SIDEBAR_ITEMS.filter((item) => item.category === category);
    
    return (
      <div className="mb-6">
        <div className="px-4 mb-2 flex items-center justify-between">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider font-display">
            {title}
          </h4>
          {/* {category === "ai" && (
            <span className="text-[9px] font-semibold text-primary/80 bg-primary/10 px-1.5 py-0.5 rounded border border-primary/20">
              Desktop
            </span>
          )} */}
        </div>
        <ul className="space-y-1 px-2">
          {items.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            const isDataRequired = ["datasets", "merge", "split", "cleaning", "manual-checks", "query", "visualizations", "export"].includes(item.id);
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
                    if (isMobileDrawer) {
                      setMobileSidebarOpen(false);
                    }
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

                  {/* Desktop Only Badge for AI items on mobile drawer */}
                  {item.category === "ai" && isMobileDrawer && (
                    <span className="ml-auto text-[9px] font-medium tracking-wide text-primary/90 bg-primary/15 px-1.5 py-0.5 rounded border border-primary/20 shrink-0">
                      Desktop
                    </span>
                  )}
                  
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
    <>
      {/* =========================================================================
          DESKTOP SIDEBAR (Static on screens md and wider)
         ========================================================================= */}
      <aside className="hidden md:flex w-64 border-r border-border bg-card flex-col h-full shrink-0">
        {/* Brand Logo Header */}
        <div className="h-16 flex items-center gap-2.5 px-6 border-b border-border">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center shadow-md shadow-primary/20">
            <span style={{color:"white"}} className="font-bold text-base">IQ</span>
          </div>
          <div>
            <h1 className="font-display font-bold text-base leading-none text-foreground">Report IQ</h1>
            <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Browser Suite</span>
          </div>
        </div>

        {/* Desktop Nav Content */}
        <nav className="flex-1 overflow-y-auto pt-6">
          {renderNavGroup("core", "Workspace Core")}
          {renderNavGroup("prep", "Data Prep & Visuals")}
          {renderNavGroup("convert", "Data Converter")}
          {renderNavGroup("ai", "AI Copilots")}
        </nav>

        {/* Desktop Workspace Status */}
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
        </div>
      </aside>

      {/* =========================================================================
          MOBILE SIDEBAR DRAWER (Sliding overlay on screens smaller than md)
         ========================================================================= */}
      {/* Backdrop */}
      {isMobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden transition-opacity duration-200"
          onClick={() => setMobileSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Drawer */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 w-72 max-w-[85vw] bg-card border-r border-border z-50 flex flex-col shadow-2xl md:hidden transition-transform duration-300 ease-in-out",
          isMobileSidebarOpen ? "translate-x-0" : "-translate-x-full pointer-events-none"
        )}
      >
        {/* Mobile Header with Brand & Close Button */}
        <div className="h-14 sm:h-16 flex items-center justify-between px-5 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center shadow-md shadow-primary/20">
            <span style={{color:"white"}} className="font-bold text-base">IQ</span>
            </div>
            <div>
              <h1 className="font-display font-bold text-base leading-none text-foreground">Report IQ</h1>
              <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Browser Suite</span>
            </div>
          </div>
          <button
            onClick={() => setMobileSidebarOpen(false)}
            className="p-1.5 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            aria-label="Close navigation menu"
            title="Close Menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Mobile Nav Links */}
        <nav className="flex-1 overflow-y-auto pt-4">
          {renderNavGroup("core", "Workspace Core", true)}
          {renderNavGroup("prep", "Data Prep & Visuals", true)}
          {renderNavGroup("ai", "AI Copilots", true)}
        </nav>

        {/* Mobile Workspace Status */}
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
        </div>
      </aside>

      {/* Shared Login Modal */}
      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
      />
    </>
  );
}
