import React, { useState, useMemo } from "react";
import { useAnalyticsStore } from "@/store/useAnalyticsStore";
import { 
  splitDatasetByCount, 
  splitDatasetByPercentage, 
  splitDatasetByColumnValue 
} from "@/utils/dataOperations";
import { toast } from "@/components/ui/toast";
import { 
  Scissors, 
  Table, 
  Download, 
  Plus, 
  Columns,
  Layers,
  ArrowRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import * as XLSX from "xlsx";

export function SplitView() {
  const datasets = useAnalyticsStore((state) => state.datasets);
  const selectedDatasetId = useAnalyticsStore((state) => state.selectedDatasetId);
  const selectedSheetName = useAnalyticsStore((state) => state.selectedSheetName);
  const addDataset = useAnalyticsStore((state) => state.addDataset);
  const selectDataset = useAnalyticsStore((state) => state.selectDataset);
  const setActiveTab = useAnalyticsStore((state) => state.setActiveTab);

  // Active dataset & sheet
  const activeDataset = useMemo(() => {
    return datasets.find((d) => d.id === selectedDatasetId) || null;
  }, [datasets, selectedDatasetId]);

  const activeSheet = useMemo(() => {
    if (!activeDataset || !selectedSheetName) return null;
    return activeDataset.sheets.find((s) => s.name === selectedSheetName) || activeDataset.sheets[0] || null;
  }, [activeDataset, selectedSheetName]);

  // Strategy Form State
  const [strategy, setStrategy] = useState<"rowCount" | "percentage" | "columnValue">("rowCount");
  const [rowCountVal, setRowCountVal] = useState(100);
  const [percentageVal, setPercentageVal] = useState(80);
  const [splitColumn, setSplitColumn] = useState("");

  const [splitResults, setSplitResults] = useState<any[]>([]);

  // Headers for current sheet
  const headers = useMemo(() => {
    return activeSheet ? activeSheet.headers : [];
  }, [activeSheet]);

  // Reset Split Column on Sheet change
  React.useEffect(() => {
    if (headers.length > 0) setSplitColumn(headers[0]);
  }, [headers]);

  const handleExecuteSplit = () => {
    if (!activeSheet) return;

    try {
      let results: any[] = [];
      if (strategy === "rowCount") {
        if (rowCountVal <= 0) {
          toast.error("Please enter a valid row count above 0");
          return;
        }
        results = splitDatasetByCount(activeSheet, rowCountVal);
      } else if (strategy === "percentage") {
        if (percentageVal <= 0 || percentageVal >= 100) {
          toast.error("Please enter a percentage between 1 and 99");
          return;
        }
        results = splitDatasetByPercentage(activeSheet, percentageVal);
      } else if (strategy === "columnValue") {
        if (!splitColumn) {
          toast.error("Please select a column to group by");
          return;
        }
        results = splitDatasetByColumnValue(activeSheet, splitColumn);
      }

      setSplitResults(results);
      toast.success(`Split computed successfully! Generated ${results.length} subsets.`);
    } catch (err: any) {
      console.error(err);
      toast.error(`Split operation failed: ${err.message || "Invalid setup"}`);
    }
  };

  const handleLoadToWorkspace = (split: any) => {
    const newDataset = {
      id: crypto.randomUUID(),
      name: `${split.name}.xlsx`,
      size: JSON.stringify(split.rows).length,
      sheets: [split],
      createdAt: new Date().toISOString(),
    };

    addDataset(newDataset);
    selectDataset(newDataset.id);
    toast.success(`Loaded "${split.name}" into workspace!`);
    setActiveTab("datasets");
  };

  const handleDownloadExcel = (split: any) => {
    try {
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(split.rows);
      XLSX.utils.book_append_sheet(wb, ws, "Sheet_1");
      
      const fileName = `${split.name.replace(/\s+/g, "_")}.xlsx`;
      XLSX.writeFile(wb, fileName);
      toast.success(`Downloaded ${fileName}`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to compile Excel file");
    }
  };

  if (!activeDataset || !activeSheet) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-muted-foreground bg-card border border-border rounded-2xl">
        <Scissors className="h-12 w-12 opacity-30 mb-3" />
        <h3 className="font-display font-semibold text-lg text-foreground mb-1">No Active Dataset</h3>
        <p className="text-xs max-w-sm mb-4">Please upload a spreadsheet file in the Upload tab before using the split tool.</p>
        <Button size="sm" onClick={() => setActiveTab("upload")}>
          Go to Upload Tab
        </Button>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-y-auto gap-5">
      <h2 className="font-display font-bold text-2xl text-foreground flex items-center gap-2">
        <Scissors className="h-6 w-6 text-primary" />
        <span>Split Wizard</span>
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Dataset Reference info */}
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2 font-display font-bold text-sm text-foreground border-b border-border pb-2">
            <Table className="h-4.5 w-4.5 text-primary shrink-0" />
            <span>Target Spreadsheet</span>
          </div>
          <div className="space-y-3 font-semibold text-xs">
            <div>
              <span className="text-muted-foreground block mb-0.5">ACTIVE DATASET</span>
              <span className="text-foreground text-sm font-bold block">{activeDataset.name}</span>
            </div>
            <div>
              <span className="text-muted-foreground block mb-0.5">ACTIVE SHEET</span>
              <span className="text-foreground text-sm font-bold block">{activeSheet.name}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[10px] bg-accent/40 p-3 rounded-lg border border-border">
              <div>Total Rows: <span className="text-foreground">{activeSheet.rowCount.toLocaleString()}</span></div>
              <div>Columns: <span className="text-foreground">{activeSheet.columnCount}</span></div>
            </div>
          </div>
        </div>

        {/* Split Strategy Choice */}
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4 md:col-span-2 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-2 font-display font-bold text-sm text-foreground border-b border-border pb-2">
              <Columns className="h-4.5 w-4.5 text-primary shrink-0" />
              <span>Splitting Strategy</span>
            </div>

            {/* Strategy Selectors */}
            <div className="flex flex-wrap gap-2 text-[10px] font-bold">
              {[
                { id: "rowCount", name: "By Row Count" },
                { id: "percentage", name: "By Percentage (Train/Test)" },
                { id: "columnValue", name: "By Column Value Grouping" },
              ].map((strat) => (
                <button
                  key={strat.id}
                  onClick={() => { setStrategy(strat.id as any); setSplitResults([]); }}
                  className={`px-3 py-2 border rounded-lg transition-all ${
                    strategy === strat.id
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border bg-accent/20 text-muted-foreground hover:bg-accent"
                  }`}
                >
                  {strat.name}
                </button>
              ))}
            </div>

            {/* Inputs based on strategy */}
            <div className="font-semibold text-xs pt-1">
              {strategy === "rowCount" && (
                <div className="max-w-xs">
                  <label className="block text-muted-foreground mb-1">ROWS PER SHEET CHUNK</label>
                  <input
                    type="number"
                    value={rowCountVal}
                    onChange={(e) => setRowCountVal(Math.max(1, Number(e.target.value)))}
                    className="w-full bg-accent border border-border rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-primary/40 text-foreground"
                  />
                  <span className="text-[10px] text-muted-foreground font-medium block mt-1.5 leading-normal">
                    Splits the grid into multiple separate tables containing exactly {rowCountVal} rows each.
                  </span>
                </div>
              )}

              {strategy === "percentage" && (
                <div className="max-w-xs">
                  <label className="block text-muted-foreground mb-1">PARTITION PERCENTAGE</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      min="1"
                      max="99"
                      value={percentageVal}
                      onChange={(e) => setPercentageVal(Math.min(99, Math.max(1, Number(e.target.value))))}
                      className="w-20 bg-accent border border-border rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-primary/40 text-foreground text-center"
                    />
                    <div className="text-[10px] text-muted-foreground leading-relaxed font-semibold">
                      Split 1: <span className="text-foreground">{percentageVal}%</span> ({Math.round(activeSheet.rowCount * percentageVal / 100)} rows)<br/>
                      Split 2: <span className="text-foreground">{100 - percentageVal}%</span> ({Math.round(activeSheet.rowCount * (100 - percentageVal) / 100)} rows)
                    </div>
                  </div>
                </div>
              )}

              {strategy === "columnValue" && (
                <div className="max-w-xs">
                  <label className="block text-muted-foreground mb-1">GROUP BY COLUMN KEY</label>
                  <select
                    value={splitColumn}
                    onChange={(e) => setSplitColumn(e.target.value)}
                    className="w-full bg-accent border border-border rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-primary/40 text-foreground"
                  >
                    {headers.map((col) => (
                      <option key={col} value={col}>
                        {col}
                      </option>
                    ))}
                  </select>
                  <span className="text-[10px] text-muted-foreground font-medium block mt-1.5 leading-normal">
                    Splits table dynamically: generates a separate sheet/file for every unique value found in the selected column.
                  </span>
                </div>
              )}
            </div>
          </div>

          <Button className="w-full gap-2 mt-4" onClick={handleExecuteSplit}>
            <Scissors className="h-4 w-4" />
            <span>Generate Splits</span>
          </Button>
        </div>
      </div>

      {/* Results Workspace Grid */}
      {splitResults.length > 0 && (
        <div className="space-y-4 flex-1">
          <div className="flex items-center gap-2 border-b border-border pb-2 shrink-0">
            <Layers className="h-4.5 w-4.5 text-primary" />
            <h3 className="font-display font-semibold text-sm text-foreground">Generated Splits ({splitResults.length})</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pb-6">
            {splitResults.map((split, index) => (
              <div key={index} className="bg-card border border-border rounded-xl p-4 shadow-sm flex flex-col justify-between gap-3.5 hover:shadow-md transition-all">
                <div>
                  <h4 className="text-xs font-bold text-foreground truncate mb-1" title={split.name}>
                    {split.name}
                  </h4>
                  <div className="flex justify-between items-center text-[10px] text-muted-foreground font-semibold bg-accent/40 px-2.5 py-1 rounded-md border border-border/80">
                    <span>Rows: <span className="text-foreground">{split.rowCount}</span></span>
                    <span>Cols: <span className="text-foreground">{split.columnCount}</span></span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 h-8 text-[10px] gap-1 px-2"
                    onClick={() => handleLoadToWorkspace(split)}
                  >
                    <span>Load</span>
                    <ArrowRight className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="primary"
                    className="flex-1 h-8 text-[10px] gap-1 px-2"
                    onClick={() => handleDownloadExcel(split)}
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>Download</span>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
