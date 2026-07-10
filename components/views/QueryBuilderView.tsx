import React, { useState, useMemo } from "react";
import { useAnalyticsStore } from "@/store/useAnalyticsStore";
import { filterDataset } from "@/utils/dataOperations";
import { FilterOperator, FilterRule, FilterGroup } from "@/types";
import { toast } from "@/components/ui/toast";
import { 
  Filter, 
  Plus, 
  Trash2, 
  Database, 
  Table, 
  Play,
  ArrowRight,
  Download
} from "lucide-react";
import { Button } from "@/components/ui/button";

const OPERATORS: { value: FilterOperator; label: string }[] = [
  { value: "equals", label: "Equals" },
  { value: "not_equals", label: "Does Not Equal" },
  { value: "contains", label: "Contains" },
  { value: "not_contains", label: "Does Not Contain" },
  { value: "starts_with", label: "Starts With" },
  { value: "ends_with", label: "Ends With" },
  { value: "greater_than", label: "Greater Than (>)" },
  { value: "greater_than_or_equals", label: "Greater Than or Equal (>=)" },
  { value: "less_than", label: "Less Than (<)" },
  { value: "less_than_or_equals", label: "Less Than or Equal (<=)" },
  { value: "is_empty", label: "Is Empty" },
  { value: "is_not_empty", label: "Is Not Empty" },
];

export function QueryBuilderView() {
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

  // Query rules state
  const [conjunction, setConjunction] = useState<"AND" | "OR">("AND");
  const [rules, setRules] = useState<FilterRule[]>([]);
  const [filteredResult, setFilteredResult] = useState<any>(null);

  // Reset rules and results when sheet changes
  React.useEffect(() => {
    if (activeSheet && activeSheet.headers.length > 0) {
      setRules([
        {
          id: Math.random().toString(36).substring(2, 9),
          column: activeSheet.headers[0],
          operator: "contains",
          value: "",
        },
      ]);
      setFilteredResult(null);
    }
  }, [selectedDatasetId, selectedSheetName, activeSheet]);

  const handleAddRule = () => {
    if (!activeSheet) return;
    setRules((prev) => [
      ...prev,
      {
        id: Math.random().toString(36).substring(2, 9),
        column: activeSheet.headers[0],
        operator: "equals",
        value: "",
      },
    ]);
  };

  const handleRemoveRule = (id: string) => {
    setRules((prev) => prev.filter((r) => r.id !== id));
  };

  const handleRuleChange = (id: string, field: keyof FilterRule, val: any) => {
    setRules((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        return { ...r, [field]: val };
      })
    );
  };

  const handleExecuteQuery = () => {
    if (!activeSheet) return;

    try {
      const filterGroup: FilterGroup = {
        id: "root",
        conjunction,
        rules,
      };

      const result = filterDataset(activeSheet, filterGroup);
      
      setFilteredResult({
        ...result,
        name: `Filtered_${activeSheet.name}`,
      });
      
      toast.success(`Query executed! Found ${result.rowCount} matching rows.`);
    } catch (err: any) {
      console.error(err);
      toast.error(`Query Builder compilation error: ${err.message}`);
    }
  };

  const handleLoadFilteredToWorkspace = () => {
    if (!filteredResult) return;

    const newDataset = {
      id: crypto.randomUUID(),
      name: `${activeDataset?.name.replace(/\.[^/.]+$/, "")}_Filtered.xlsx`,
      size: JSON.stringify(filteredResult.rows).length,
      sheets: [filteredResult],
      createdAt: new Date().toISOString(),
    };

    addDataset(newDataset);
    selectDataset(newDataset.id);
    toast.success("Loaded query result as new active dataset!");
    setActiveTab("datasets");
  };

  if (!activeDataset || !activeSheet) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-muted-foreground bg-card border border-border rounded-2xl">
        <Filter className="h-12 w-12 opacity-30 mb-3" />
        <h3 className="font-display font-semibold text-lg text-foreground mb-1">No Active Dataset</h3>
        <p className="text-xs max-w-sm mb-4">Please upload a spreadsheet file in the Upload tab before using the query builder.</p>
        <Button size="sm" onClick={() => setActiveTab("upload")}>
          Go to Upload Tab
        </Button>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-y-auto gap-6">
      
      <div className="flex flex-wrap items-center justify-between gap-4 shrink-0">
        <div>
          <h2 className="font-display font-bold text-2xl text-foreground flex items-center gap-2">
            <Filter className="h-6 w-6 text-primary" />
            <span>Query Builder Workspace</span>
          </h2>
          <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider block mt-0.5">
            Construct localized compound logical filters using boolean parameters
          </span>
        </div>

        {/* Info indicators */}
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

      {/* Builder Console Card */}
      <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-5">
        <div className="flex flex-wrap items-center justify-between border-b border-border pb-3 gap-4">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-muted-foreground uppercase">MATCH CRITERIA:</span>
            <div className="flex bg-accent border border-border p-0.5 rounded-lg text-[10px] font-bold">
              <button
                onClick={() => setConjunction("AND")}
                className={`px-3 py-1 rounded-md transition-all ${
                  conjunction === "AND" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
                }`}
              >
                ALL (AND)
              </button>
              <button
                onClick={() => setConjunction("OR")}
                className={`px-3 py-1 rounded-md transition-all ${
                  conjunction === "OR" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
                }`}
              >
                ANY (OR)
              </button>
            </div>
          </div>

          <Button size="sm" variant="outline" className="h-8 gap-1 text-xs" onClick={handleAddRule}>
            <Plus className="h-3.5 w-3.5" />
            <span>Add Condition</span>
          </Button>
        </div>

        {/* Rules stack */}
        <div className="space-y-3 font-semibold text-xs">
          {rules.map((rule, idx) => (
            <div key={rule.id} className="flex flex-wrap sm:flex-nowrap items-center gap-3 bg-accent/25 border border-border p-3 rounded-lg relative">
              <span className="text-[10px] text-muted-foreground font-bold shrink-0">Rule #{idx + 1}</span>
              
              {/* Column Selection */}
              <select
                value={rule.column}
                onChange={(e) => handleRuleChange(rule.id, "column", e.target.value)}
                className="bg-card border border-border rounded-lg p-2 focus:outline-none text-foreground flex-1 min-w-[120px]"
              >
                {activeSheet.headers.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>

              {/* Operator */}
              <select
                value={rule.operator}
                onChange={(e) => handleRuleChange(rule.id, "operator", e.target.value)}
                className="bg-card border border-border rounded-lg p-2 focus:outline-none text-foreground flex-1 min-w-[120px]"
              >
                {OPERATORS.map((op) => (
                  <option key={op.value} value={op.value}>
                    {op.label}
                  </option>
                ))}
              </select>

              {/* Value Input (Disabled for empty checks) */}
              {!["is_empty", "is_not_empty"].includes(rule.operator) ? (
                <input
                  type="text"
                  value={rule.value}
                  onChange={(e) => handleRuleChange(rule.id, "value", e.target.value)}
                  placeholder="Filter value..."
                  className="bg-card border border-border rounded-lg p-2 focus:outline-none text-foreground flex-1 min-w-[140px] font-medium"
                />
              ) : (
                <div className="flex-1 bg-accent/40 rounded-lg p-2 border border-border/40 text-[10px] text-muted-foreground text-center select-none font-medium">
                  Null checking, no parameter required
                </div>
              )}

              {/* Delete trigger */}
              <button
                disabled={rules.length === 1}
                onClick={() => handleRemoveRule(rule.id)}
                className="p-2 rounded-lg hover:bg-accent text-danger disabled:opacity-40 disabled:pointer-events-none transition-colors"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>

        {/* run trigger */}
        <div className="flex justify-end border-t border-border pt-4">
          <Button className="gap-2 h-9 px-6 font-bold" onClick={handleExecuteQuery}>
            <Play className="h-4 w-4" />
            <span>Apply Query Filters</span>
          </Button>
        </div>
      </div>

      {/* Query Result Preview */}
      {filteredResult && (
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm flex-1 flex flex-col min-h-0 space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3 shrink-0">
            <div>
              <h3 className="font-display font-bold text-sm text-foreground">Query Result Set</h3>
              <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mt-0.5">
                Rows Found: <span className="text-foreground">{filteredResult.rowCount}</span> of <span className="text-foreground">{activeSheet.rowCount}</span> ({(filteredResult.rowCount / activeSheet.rowCount * 100).toFixed(1)}%)
              </p>
            </div>

            <Button
              size="sm"
              variant="success"
              className="gap-1.5 h-8 text-xs font-bold"
              onClick={handleLoadFilteredToWorkspace}
            >
              <Download className="h-3.5 w-3.5" />
              <span>Load into Workspace</span>
            </Button>
          </div>

          {/* Simple Inline Table Preview */}
          <div className="flex-1 overflow-auto border border-border rounded-lg bg-accent/10">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-accent/40 border-b border-border sticky top-0">
                <tr>
                  {filteredResult.headers.slice(0, 8).map((h: string) => (
                    <th key={h} className="px-3 py-2 font-bold text-foreground border-r border-border min-w-[100px] truncate">
                      {h}
                    </th>
                  ))}
                  {filteredResult.headers.length > 8 && <th className="px-3 py-2 text-muted-foreground italic">+{filteredResult.headers.length - 8} more cols</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredResult.rows.length === 0 ? (
                  <tr>
                    <td colSpan={filteredResult.headers.length} className="py-8 text-center text-muted-foreground font-semibold">
                      Query returned no matching rows.
                    </td>
                  </tr>
                ) : (
                  filteredResult.rows.slice(0, 8).map((row: any, rIdx: number) => (
                    <tr key={rIdx} className="hover:bg-accent/20">
                      {filteredResult.headers.slice(0, 8).map((h: string) => {
                        const val = row[h];
                        const isNull = val === null || val === undefined;
                        return (
                          <td key={h} className={`px-3 py-2 border-r border-border truncate max-w-[150px] font-medium ${isNull ? "text-danger/60 italic" : "text-foreground/80"}`}>
                            {isNull ? "NULL" : String(val)}
                          </td>
                        );
                      })}
                      {filteredResult.headers.length > 8 && <td className="px-3 py-2 text-muted-foreground font-semibold">...</td>}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
