import React, { useMemo } from "react";
import { useAnalyticsStore } from "@/store/useAnalyticsStore";
import { formatBytes } from "@/lib/utils";
import { analyzeDataset } from "@/utils/dataOperations";
import { 
  Database, 
  Layers, 
  Sparkles, 
  BarChart3, 
  HelpCircle,
  FileCheck,
  TrendingUp,
  FileSpreadsheet,
  PlusCircle,
  ArrowRight,
  ShieldCheck
} from "lucide-react";
import { Button } from "@/components/ui/button";

export function DashboardView() {
  const datasets = useAnalyticsStore((state) => state.datasets);
  const selectDataset = useAnalyticsStore((state) => state.selectDataset);
  const selectedDatasetId = useAnalyticsStore((state) => state.selectedDatasetId);
  const setActiveTab = useAnalyticsStore((state) => state.setActiveTab);

  // Compute total aggregates
  const stats = useMemo(() => {
    let totalRecords = 0;
    let totalSheets = 0;
    let totalSize = 0;
    let avgCompleteness = 0;
    let completenessCount = 0;

    datasets.forEach((d) => {
      totalSize += d.size;
      d.sheets.forEach((s) => {
        totalSheets++;
        totalRecords += s.rowCount;
        try {
          const profile = analyzeDataset(s);
          avgCompleteness += profile.completenessScore;
          completenessCount++;
        } catch (_) {}
      });
    });

    const finalCompleteness = completenessCount > 0 
      ? parseFloat((avgCompleteness / completenessCount).toFixed(1)) 
      : 100;

    return {
      totalRecords,
      totalSheets,
      totalSize,
      completeness: finalCompleteness,
    };
  }, [datasets]);

  const activeDataset = useMemo(() => {
    return datasets.find((d) => d.id === selectedDatasetId) || null;
  }, [datasets, selectedDatasetId]);

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-y-auto gap-6 pb-6">
      
      {/* Welcome Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-primary/95 to-violet-600 p-6 text-white relative overflow-hidden shadow-md shrink-0">
        {/* Glow effect */}
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-radial-gradient from-white/10 to-transparent blur-xl pointer-events-none" />
        
        <div className="relative z-10 max-w-xl">
          <h2 className="font-display font-extrabold text-2xl sm:text-3xl mb-1.5 leading-tight">Welcome to Report IQ</h2>
          <p className="text-xs text-indigo-100 mb-5 leading-normal font-medium">
            Analyze, clean, merge, split, and visualize your spreadsheet datasets entirely inside your browser. No files are uploaded to any servers—your data is secure, private, and processes instantly offline.
          </p>
          <div className="flex flex-wrap gap-2.5">
            {datasets.length === 0 ? (
              <Button
                variant="secondary"
                size="sm"
                className="text-primary font-bold shadow-md"
                onClick={() => setActiveTab("upload")}
              >
                <PlusCircle className="h-4 w-4 mr-1.5" />
                <span>Upload First File</span>
              </Button>
            ) : (
              <>
                <Button
                  variant="secondary"
                  size="sm"
                  className="text-primary font-bold shadow-md"
                  onClick={() => setActiveTab("datasets")}
                >
                  <FileSpreadsheet className="h-4 w-4 mr-1.5" />
                  <span>Browse Spreadsheets</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-white hover:bg-white/10 border border-white/20 font-semibold"
                  onClick={() => setActiveTab("visualizations")}
                >
                  <BarChart3 className="h-4 w-4 mr-1.5" />
                  <span>Build Charts</span>
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 shrink-0">
        
        {/* KPI 1: Datasets */}
        <div className="bg-card border border-border rounded-xl p-4.5 shadow-sm flex items-center gap-4 relative overflow-hidden group">
          <div className="h-10 w-10 rounded-lg bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform duration-200">
            <Database className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block">Loaded Datasets</span>
            <span className="text-xl font-bold font-display text-foreground block leading-tight mt-0.5">{datasets.length}</span>
          </div>
        </div>

        {/* KPI 2: Total Records */}
        <div className="bg-card border border-border rounded-xl p-4.5 shadow-sm flex items-center gap-4 relative overflow-hidden group">
          <div className="h-10 w-10 rounded-lg bg-success/10 border border-success/20 text-success flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform duration-200">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block">Total Grid Rows</span>
            <span className="text-xl font-bold font-display text-foreground block leading-tight mt-0.5">{stats.totalRecords.toLocaleString()}</span>
          </div>
        </div>

        {/* KPI 3: Completeness Score */}
        <div className="bg-card border border-border rounded-xl p-4.5 shadow-sm flex items-center gap-4 relative overflow-hidden group">
          <div className="h-10 w-10 rounded-lg bg-warning/10 border border-warning/20 text-warning flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform duration-200">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block">Avg Quality Index</span>
            <span className="text-xl font-bold font-display text-foreground block leading-tight mt-0.5">{stats.completeness}%</span>
          </div>
        </div>

        {/* KPI 4: Size */}
        <div className="bg-card border border-border rounded-xl p-4.5 shadow-sm flex items-center gap-4 relative overflow-hidden group">
          <div className="h-10 w-10 rounded-lg bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform duration-200">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block">Memory Allocated</span>
            <span className="text-xl font-bold font-display text-foreground block leading-tight mt-0.5">{formatBytes(stats.totalSize)}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
        
        {/* Left Side: Datasets Tree navigation (Spans 2 cols) */}
        <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-5 shadow-sm flex flex-col min-h-0">
          <div className="flex items-center justify-between border-b border-border pb-3 shrink-0 mb-4">
            <h3 className="font-display font-bold text-sm text-foreground flex items-center gap-2">
              <Database className="h-4 w-4 text-primary" />
              <span>Workspace Directory Tree</span>
            </h3>
            <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
              Click item to active preview
            </span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3.5 pr-1">
            {datasets.length === 0 ? (
              <div className="h-48 flex flex-col items-center justify-center text-center text-muted-foreground">
                <FileSpreadsheet className="h-10 w-10 opacity-30 mb-2" />
                <span className="text-xs font-semibold">No datasets loaded in memory.</span>
                <span className="text-[10px] opacity-80 mt-1 max-w-xs">Upload an Excel or CSV file to build the catalog tree.</span>
              </div>
            ) : (
              datasets.map((dataset) => {
                const isActive = selectedDatasetId === dataset.id;
                
                return (
                  <div
                    key={dataset.id}
                    onClick={() => selectDataset(dataset.id)}
                    className={`p-3.5 rounded-xl border transition-all duration-200 cursor-pointer relative group ${
                      isActive
                        ? "border-primary/45 bg-primary/5"
                        : "border-border hover:bg-accent/40 bg-accent/15"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <FileCheck className={`h-4 w-4 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                        <span className="text-xs font-bold truncate text-foreground">{dataset.name}</span>
                      </div>
                      <span className="text-[9px] font-bold text-muted-foreground bg-accent px-2 py-0.5 rounded-full border border-border">
                        {formatBytes(dataset.size)}
                      </span>
                    </div>

                    {/* Sheets List */}
                    <div className="pl-6 space-y-2 mt-3 pt-2.5 border-t border-border/80">
                      {dataset.sheets.map((sheet) => (
                        <div key={sheet.name} className="flex items-center justify-between text-[11px] text-muted-foreground/90 font-medium">
                          <div className="flex items-center gap-1.5">
                            <Layers className="h-3.5 w-3.5 text-primary/60 shrink-0" />
                            <span className="truncate">{sheet.name}</span>
                          </div>
                          <div className="flex gap-3 text-[10px] text-muted-foreground/60 shrink-0">
                            <span>Rows: <span className="text-foreground">{sheet.rowCount.toLocaleString()}</span></span>
                            <span>Cols: <span className="text-foreground">{sheet.columnCount}</span></span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Side: Quick Guide & FAQ */}
        <div className="bg-card border border-border rounded-2xl p-5 shadow-sm flex flex-col justify-between gap-4 overflow-y-auto">
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-border pb-3">
              <HelpCircle className="h-4.5 w-4.5 text-primary" />
              <h3 className="font-display font-bold text-sm text-foreground">Quick Start Guide</h3>
            </div>

            <div className="space-y-4 font-semibold text-xs leading-normal">
              
              <div className="flex gap-2">
                <span className="h-5 w-5 rounded bg-primary/10 text-primary flex items-center justify-center text-[10px] shrink-0 mt-0.5">1</span>
                <div>
                  <h4 className="text-foreground text-xs font-bold mb-0.5">Load spreadsheets</h4>
                  <p className="text-muted-foreground text-[10px] leading-relaxed">
                    Navigate to <span className="text-primary cursor-pointer hover:underline" onClick={() => setActiveTab("upload")}>Upload Files</span>, drag Excel/CSV files, and let SheetJS extract columns.
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <span className="h-5 w-5 rounded bg-primary/10 text-primary flex items-center justify-center text-[10px] shrink-0 mt-0.5">2</span>
                <div>
                  <h4 className="text-foreground text-xs font-bold mb-0.5">Profile & Clean Data</h4>
                  <p className="text-muted-foreground text-[10px] leading-relaxed">
                    Use <span className="text-primary cursor-pointer hover:underline" onClick={() => setActiveTab("cleaning")}>Data Cleaning</span> to find missing values, replace empty cells with mean/mode, format strings, and remove duplicates.
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <span className="h-5 w-5 rounded bg-primary/10 text-primary flex items-center justify-center text-[10px] shrink-0 mt-0.5">3</span>
                <div>
                  <h4 className="text-foreground text-xs font-bold mb-0.5">Merge & Slice</h4>
                  <p className="text-muted-foreground text-[10px] leading-relaxed">
                    Join datasets by columns (Inner/Left/Right/Full) or append rows in the Merge wizard. Slice large sheets in the Split tool.
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <span className="h-5 w-5 rounded bg-primary/10 text-primary flex items-center justify-center text-[10px] shrink-0 mt-0.5">4</span>
                <div>
                  <h4 className="text-foreground text-xs font-bold mb-0.5">Visualize & Export</h4>
                  <p className="text-muted-foreground text-[10px] leading-relaxed">
                    Create Bar, Line, Pie, and Area plots in Visualizations, then download the spreadsheets or compile formatted PDF reports.
                  </p>
                </div>
              </div>

            </div>
          </div>

          <div className="p-3 bg-accent/50 border border-border rounded-xl text-[10px] text-muted-foreground leading-normal flex gap-1.5 font-semibold">
            <ShieldCheck className="h-4.5 w-4.5 text-success shrink-0" />
            <span>Off-line Security: All parser operations execute locally. No corporate data ever leaves this window.</span>
          </div>
        </div>

      </div>
    </div>
  );
}
