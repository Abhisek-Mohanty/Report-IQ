import React, { useState, useMemo } from "react";
import { useAnalyticsStore } from "@/store/useAnalyticsStore";
import { 
  analyzeDataset, 
  replaceNullValues, 
  cleanTextColumn, 
  cleanFindReplace, 
  cleanRemoveDuplicates, 
  cleanRemoveEmptyRows, 
  cleanRemoveEmptyColumns, 
  cleanRenameColumn, 
  cleanChangeType 
} from "@/utils/dataOperations";
import { toast } from "@/components/ui/toast";
import { 
  Sparkles, 
  Table, 
  Database, 
  RefreshCw, 
  Trash2, 
  CaseSensitive, 
  Replace, 
  Braces, 
  CheckCircle, 
  ShieldAlert,
  Edit2
} from "lucide-react";
import { Button } from "@/components/ui/button";

export function CleaningView() {
  const datasets = useAnalyticsStore((state) => state.datasets);
  const selectedDatasetId = useAnalyticsStore((state) => state.selectedDatasetId);
  const selectedSheetName = useAnalyticsStore((state) => state.selectedSheetName);
  const updateActiveSheetData = useAnalyticsStore((state) => state.updateActiveSheetData);
  const setActiveTab = useAnalyticsStore((state) => state.setActiveTab);

  // Active dataset & sheet
  const activeDataset = useMemo(() => {
    return datasets.find((d) => d.id === selectedDatasetId) || null;
  }, [datasets, selectedDatasetId]);

  const activeSheet = useMemo(() => {
    if (!activeDataset || !selectedSheetName) return null;
    return activeDataset.sheets.find((s) => s.name === selectedSheetName) || activeDataset.sheets[0] || null;
  }, [activeDataset, selectedSheetName]);

  // Compute Profiler statistics
  const stats = useMemo(() => {
    if (!activeSheet) return null;
    return analyzeDataset(activeSheet);
  }, [activeSheet]);

  // Form states for cleaning actions
  const [selectedCol, setSelectedCol] = useState("");
  
  // Fill nulls config
  const [nullStrategy, setNullStrategy] = useState<"mean" | "median" | "mode" | "custom">("mean");
  const [customNullValue, setCustomNullValue] = useState("");

  // Case config
  const [textOp, setTextOp] = useState<"trim" | "uppercase" | "lowercase" | "titlecase">("trim");

  // Find & Replace config
  const [findStr, setFindStr] = useState("");
  const [replaceStr, setReplaceStr] = useState("");

  // Rename config
  const [newColName, setNewColName] = useState("");

  // Type Cast config
  const [targetType, setTargetType] = useState<"string" | "number" | "date" | "boolean">("string");

  // Reset states when columns change
  React.useEffect(() => {
    if (activeSheet && activeSheet.headers.length > 0) {
      const firstCol = activeSheet.headers[0];
      setSelectedCol(firstCol);
      setNewColName(firstCol);
      setTargetType(activeSheet.columnTypes[firstCol] || "string");
    }
  }, [activeSheet]);

  const handleColSelectionChange = (colName: string) => {
    setSelectedCol(colName);
    setNewColName(colName);
    if (activeSheet) {
      setTargetType(activeSheet.columnTypes[colName] || "string");
    }
  };

  const handleNullReplacement = () => {
    if (!activeSheet || !selectedCol) return;
    const cleaned = replaceNullValues(activeSheet, selectedCol, nullStrategy, customNullValue);
    updateActiveSheetData(cleaned);
    toast.success(`Filled missing values in column "${selectedCol}" using ${nullStrategy.toUpperCase()}`);
  };

  const handleTextOperation = () => {
    if (!activeSheet || !selectedCol) return;
    const cleaned = cleanTextColumn(activeSheet, selectedCol, textOp);
    updateActiveSheetData(cleaned);
    toast.success(`Completed text operation (${textOp.toUpperCase()}) on column "${selectedCol}"`);
  };

  const handleFindReplace = () => {
    if (!activeSheet || !selectedCol || !findStr) {
      toast.error("Please enter a string to find");
      return;
    }
    const cleaned = cleanFindReplace(activeSheet, selectedCol, findStr, replaceStr);
    updateActiveSheetData(cleaned);
    toast.success(`Replaced "${findStr}" with "${replaceStr}" in column "${selectedCol}"`);
    setFindStr("");
    setReplaceStr("");
  };

  const handleRenameColumn = () => {
    if (!activeSheet || !selectedCol || !newColName.trim()) return;
    if (newColName.trim() === selectedCol) return;
    
    if (activeSheet.headers.includes(newColName.trim())) {
      toast.error(`Column "${newColName.trim()}" already exists!`);
      return;
    }

    const cleaned = cleanRenameColumn(activeSheet, selectedCol, newColName);
    updateActiveSheetData(cleaned);
    toast.success(`Renamed column "${selectedCol}" to "${newColName}"`);
    setSelectedCol(newColName);
  };

  const handleTypeCast = () => {
    if (!activeSheet || !selectedCol) return;
    const cleaned = cleanChangeType(activeSheet, selectedCol, targetType);
    updateActiveSheetData(cleaned);
    toast.success(`Cast column "${selectedCol}" type to ${targetType.toUpperCase()}`);
  };

  const handleRemoveDuplicates = () => {
    if (!activeSheet) return;
    const cleaned = cleanRemoveDuplicates(activeSheet);
    const deletedCount = activeSheet.rowCount - cleaned.rowCount;
    updateActiveSheetData(cleaned);
    toast.success(`Removed ${deletedCount} duplicate rows`);
  };

  const handleRemoveEmptyRows = () => {
    if (!activeSheet) return;
    const cleaned = cleanRemoveEmptyRows(activeSheet);
    const deletedCount = activeSheet.rowCount - cleaned.rowCount;
    updateActiveSheetData(cleaned);
    toast.success(`Removed ${deletedCount} empty rows`);
  };

  const handleRemoveEmptyColumns = () => {
    if (!activeSheet) return;
    const cleaned = cleanRemoveEmptyColumns(activeSheet);
    console.log(cleaned);
    console.log(activeSheet);
    
    const deletedCount = activeSheet.columnCount - cleaned.columnCount;
    updateActiveSheetData(cleaned);
    toast.success(`Removed ${deletedCount} empty columns`);
  };

  if (!activeDataset || !activeSheet || !stats) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-muted-foreground bg-card border border-border rounded-2xl">
        <Sparkles className="h-12 w-12 opacity-30 mb-3 animate-pulse-slow" />
        <h3 className="font-display font-semibold text-lg text-foreground mb-1">No Active Dataset</h3>
        <p className="text-xs max-w-sm mb-4">Please upload a spreadsheet file in the Upload tab before using the cleaning tools.</p>
        <Button size="sm" onClick={() => setActiveTab("upload")}>
          Go to Upload Tab
        </Button>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-y-auto gap-6">
      
      {/* Header section */}
      <div className="flex flex-wrap items-center justify-between gap-4 shrink-0">
        <h2 className="font-display font-bold text-2xl text-foreground flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-primary" />
          <span>Data Quality & Cleaning</span>
        </h2>
        
        {/* active status indicators */}
        <div className="flex gap-2 text-xs font-semibold">
          <div className="px-2.5 py-1 bg-accent border border-border rounded-lg text-muted-foreground flex items-center gap-1.5">
            <Database className="h-3.5 w-3.5" />
            <span className="text-foreground">{activeDataset.name}</span>
          </div>
          <div className="px-2.5 py-1 bg-accent border border-border rounded-lg text-muted-foreground flex items-center gap-1.5">
            <Table className="h-3.5 w-3.5" />
            <span className="text-foreground">{activeSheet.name}</span>
          </div>
        </div>
      </div>

      {/* Main Layout Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        
        {/* LEFT COLUMN: Data Quality Profiler (Spans 2 cols) */}
        <div className="xl:col-span-2 space-y-6">
          
          {/* Quality KPI Summary Cards */}
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="font-display font-bold text-sm text-foreground border-b border-border pb-2">
              Data Profiler Summary
            </h3>
            
            {/* Completeness Score Card */}
            <div className="flex items-center gap-4 bg-accent/20 p-4 rounded-xl border border-border">
              <div className="relative h-14 w-14 shrink-0 flex items-center justify-center font-display font-extrabold text-xs text-primary bg-card rounded-full border border-border shadow-inner">
                {stats.completenessScore}%
              </div>
              <div className="font-semibold">
                <span className="text-foreground text-sm block">Data Completeness</span>
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider block mt-0.5">
                  Cell Non-Null density index
                </span>
              </div>
            </div>

            {/* Quick Metrics grid */}
            <div className="grid grid-cols-2 gap-3.5">
              <div className="bg-accent/15 border border-border/80 rounded-xl p-3.5">
                <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider block mb-1">Duplicate Rows</span>
                <span className={`text-base font-bold font-display ${stats.duplicateRows > 0 ? "text-warning" : "text-success"}`}>
                  {stats.duplicateRows.toLocaleString()}
                </span>
              </div>
              <div className="bg-accent/15 border border-border/80 rounded-xl p-3.5">
                <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider block mb-1">Empty Rows</span>
                <span className={`text-base font-bold font-display ${stats.emptyRows > 0 ? "text-warning" : "text-success"}`}>
                  {stats.emptyRows.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Missing value counts per column table */}
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm flex flex-col max-h-[350px]">
            <h3 className="font-display font-bold text-sm text-foreground border-b border-border pb-2 shrink-0 mb-3">
              Null Value Analysis (Columns)
            </h3>
            
            <div className="flex-1 overflow-y-auto pr-1">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-accent/50 text-[10px] text-muted-foreground font-bold uppercase sticky top-0 border-b border-border select-none">
                  <tr>
                    <th className="px-2.5 py-1.5">Column</th>
                    <th className="px-2.5 py-1.5 text-center">Null Count</th>
                    <th className="px-2.5 py-1.5 text-right">Completeness</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {stats.nullSummaries.map((col) => {
                    const completeness = parseFloat((100 - col.missingPercentage).toFixed(1));
                    const isAlert = completeness < 90;

                    return (
                      <tr key={col.columnName} className="hover:bg-accent/20 font-medium">
                        <td className="px-2.5 py-2 truncate max-w-[120px] text-foreground" title={col.columnName}>
                          {col.columnName}
                        </td>
                        <td className="px-2.5 py-2 text-center text-muted-foreground">
                          {col.missingCount > 0 ? (
                            <span className="text-warning flex items-center justify-center gap-1">
                              <ShieldAlert className="h-3.5 w-3.5" />
                              <span>{col.missingCount}</span>
                            </span>
                          ) : (
                            <span className="text-success flex items-center justify-center gap-1">
                              <CheckCircle className="h-3.5 w-3.5" />
                              <span>0</span>
                            </span>
                          )}
                        </td>
                        <td className="px-2.5 py-2 text-right">
                          <span className={isAlert ? "text-warning font-bold" : "text-foreground/80"}>
                            {completeness}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Cleaning Actions (Spans 3 cols) */}
        <div className="xl:col-span-3 space-y-6">
          
          {/* Main settings bar to pick active column */}
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="font-display font-bold text-sm text-foreground border-b border-border pb-2">
              Select Column & Profile
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-semibold text-xs">
              <div>
                <label className="block text-muted-foreground mb-1">TARGET COLUMN</label>
                <select
                  value={selectedCol}
                  onChange={(e) => handleColSelectionChange(e.target.value)}
                  className="w-full bg-accent border border-border rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-primary/40 text-foreground"
                >
                  {activeSheet.headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-muted-foreground mb-1">COLUMN DATA TYPE</label>
                <div className="p-2 bg-accent/40 border border-border rounded-lg text-foreground text-sm font-bold truncate">
                  {(activeSheet.columnTypes[selectedCol] || "string").toUpperCase()}
                </div>
              </div>
            </div>
          </div>

          {/* Action boxes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Box 1: Null Value Handling */}
            <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-3.5 flex flex-col justify-between">
              <div>
                <h4 className="font-display font-bold text-xs text-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5 text-primary">
                  <RefreshCw className="h-4 w-4" />
                  <span>Null Value Solver</span>
                </h4>
                
                <div className="space-y-3 font-semibold text-xs">
                  <div>
                    <label className="block text-muted-foreground mb-1">REPLACEMENT STRATEGY</label>
                    <select
                      value={nullStrategy}
                      onChange={(e) => setNullStrategy(e.target.value as any)}
                      className="w-full bg-accent border border-border rounded-lg p-2 focus:outline-none text-foreground"
                    >
                      <option value="mean">Replace with Mean (Numeric only)</option>
                      <option value="median">Replace with Median (Numeric only)</option>
                      <option value="mode">Replace with Mode (Strings/Numbers)</option>
                      <option value="custom">Replace with Custom Static Value</option>
                    </select>
                  </div>

                  {nullStrategy === "custom" && (
                    <div>
                      <label className="block text-muted-foreground mb-1">CUSTOM STATIC VALUE</label>
                      <input
                        type="text"
                        value={customNullValue}
                        onChange={(e) => setCustomNullValue(e.target.value)}
                        placeholder="e.g. N/A or 0"
                        className="w-full bg-accent border border-border rounded-lg p-2 focus:outline-none text-foreground font-medium"
                      />
                    </div>
                  )}
                </div>
              </div>

              <Button size="sm" className="w-full mt-4 h-9" onClick={handleNullReplacement}>
                Fill Null Cells
              </Button>
            </div>

            {/* Box 2: Column Management (Cast type / Rename) */}
            <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4 flex flex-col justify-between">
              <div>
                <h4 className="font-display font-bold text-xs text-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5 text-primary">
                  <Edit2 className="h-4 w-4" />
                  <span>Column Schemas & Rename</span>
                </h4>

                <div className="space-y-3.5 font-semibold text-xs">
                  {/* Rename Column */}
                  <div>
                    <label className="block text-muted-foreground mb-1">RENAME COLUMN</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newColName}
                        onChange={(e) => setNewColName(e.target.value)}
                        className="flex-1 bg-accent border border-border rounded-lg p-2 focus:outline-none text-foreground font-medium"
                      />
                      <Button size="sm" variant="outline" className="h-9 px-3 shrink-0" onClick={handleRenameColumn}>
                        Rename
                      </Button>
                    </div>
                  </div>

                  {/* Cast Type */}
                  <div>
                    <label className="block text-muted-foreground mb-1">CONVERT DATA TYPE (CAST)</label>
                    <div className="flex gap-2">
                      <select
                        value={targetType}
                        onChange={(e) => setTargetType(e.target.value as any)}
                        className="flex-1 bg-accent border border-border rounded-lg p-2 focus:outline-none text-foreground"
                      >
                        <option value="string">STRING</option>
                        <option value="number">NUMBER</option>
                        <option value="date">DATE</option>
                        <option value="boolean">BOOLEAN</option>
                      </select>
                      <Button size="sm" variant="outline" className="h-9 px-3 shrink-0" onClick={handleTypeCast}>
                        Convert
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Box 3: Text Formatter */}
            <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-3.5 flex flex-col justify-between">
              <div>
                <h4 className="font-display font-bold text-xs text-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5 text-primary">
                  <CaseSensitive className="h-4 w-4" />
                  <span>Text Formatters</span>
                </h4>

                <div className="space-y-3 font-semibold text-xs">
                  <div>
                    <label className="block text-muted-foreground mb-1">TEXT OPERATION</label>
                    <select
                      value={textOp}
                      onChange={(e) => setTextOp(e.target.value as any)}
                      className="w-full bg-accent border border-border rounded-lg p-2 focus:outline-none text-foreground"
                    >
                      <option value="trim">Trim Spaces (Remove leading/trailing)</option>
                      <option value="uppercase">UPPERCASE (all caps)</option>
                      <option value="lowercase">lowercase (small letters)</option>
                      <option value="titlecase">Title Case (Capitalize Words)</option>
                    </select>
                  </div>
                </div>
              </div>

              <Button size="sm" className="w-full mt-4 h-9" onClick={handleTextOperation}>
                Format String Data
              </Button>
            </div>

            {/* Box 4: Find & Replace */}
            <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-3.5 flex flex-col justify-between">
              <div>
                <h4 className="font-display font-bold text-xs text-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5 text-primary">
                  <Replace className="h-4 w-4" />
                  <span>Find & Replace String</span>
                </h4>

                <div className="grid grid-cols-2 gap-2 font-semibold text-xs">
                  <div>
                    <label className="block text-muted-foreground mb-1">FIND TEXT</label>
                    <input
                      type="text"
                      value={findStr}
                      onChange={(e) => setFindStr(e.target.value)}
                      placeholder="e.g. USA"
                      className="w-full bg-accent border border-border rounded-lg p-2 focus:outline-none text-foreground font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-muted-foreground mb-1">REPLACE WITH</label>
                    <input
                      type="text"
                      value={replaceStr}
                      onChange={(e) => setReplaceStr(e.target.value)}
                      placeholder="e.g. United States"
                      className="w-full bg-accent border border-border rounded-lg p-2 focus:outline-none text-foreground font-medium"
                    />
                  </div>
                </div>
              </div>

              <Button size="sm" className="w-full mt-4 h-9" onClick={handleFindReplace}>
                Execute Replace
              </Button>
            </div>
          </div>

          {/* Box 5: Row & Table Cleaners (Full table actions) */}
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
            <h4 className="font-display font-bold text-xs text-foreground uppercase tracking-wider border-b border-border pb-1.5 flex items-center gap-1.5 text-primary">
              <Braces className="h-4 w-4" />
              <span>Full-Table Cleansing</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Button
                variant="outline"
                size="sm"
                className="text-foreground/90 font-semibold gap-1.5 text-xs h-9 justify-center"
                onClick={handleRemoveDuplicates}
              >
                <Trash2 className="h-3.5 w-3.5 text-danger shrink-0" />
                <span>Remove Duplicates</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-foreground/90 font-semibold gap-1.5 text-xs h-9 justify-center"
                onClick={handleRemoveEmptyRows}
              >
                <Trash2 className="h-3.5 w-3.5 text-danger shrink-0" />
                <span>Remove Empty Rows</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-foreground/90 font-semibold gap-1.5 text-xs h-9 justify-center"
                onClick={handleRemoveEmptyColumns}
              >
                <Trash2 className="h-3.5 w-3.5 text-danger shrink-0" />
                <span>Remove Empty Cols</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
