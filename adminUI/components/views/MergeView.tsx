import React, { useState, useMemo } from "react";
import { useAnalyticsStore } from "@/store/useAnalyticsStore";
import { mergeDatasets } from "@/utils/dataOperations";
import { toast } from "@/components/ui/toast";
import { 
  GitMerge, 
  Database, 
  HelpCircle,
  Plus,
  Play,
  Download,
  AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";

export function MergeView() {
  const datasets = useAnalyticsStore((state) => state.datasets);
  const addDataset = useAnalyticsStore((state) => state.addDataset);
  const selectDataset = useAnalyticsStore((state) => state.selectDataset);
  const setActiveTab = useAnalyticsStore((state) => state.setActiveTab);

  // Form State
  const [datasetAId, setDatasetAId] = useState("");
  const [sheetAName, setSheetAName] = useState("");
  
  const [datasetBId, setDatasetBId] = useState("");
  const [sheetBName, setSheetBName] = useState("");
  
  const [joinType, setJoinType] = useState<"inner" | "left" | "right" | "full" | "append">("left");
  const [keyA, setKeyA] = useState("");
  const [keyB, setKeyB] = useState("");

  const [previewResult, setPreviewResult] = useState<any>(null);
  const [isMerging, setIsMerging] = useState(false);

  // Sheets mapping for Dataset A
  const sheetsA = useMemo(() => {
    const d = datasets.find((x) => x.id === datasetAId);
    return d ? d.sheets : [];
  }, [datasets, datasetAId]);

  // Sheets mapping for Dataset B
  const sheetsB = useMemo(() => {
    const d = datasets.find((x) => x.id === datasetBId);
    return d ? d.sheets : [];
  }, [datasets, datasetBId]);

  // Headers mapping
  const headersA = useMemo(() => {
    const s = sheetsA.find((x) => x.name === sheetAName);
    return s ? s.headers : [];
  }, [sheetsA, sheetAName]);

  const headersB = useMemo(() => {
    const s = sheetsB.find((x) => x.name === sheetBName);
    return s ? s.headers : [];
  }, [sheetsB, sheetBName]);

  // Reset sheets & keys when dataset changes
  React.useEffect(() => {
    if (sheetsA.length > 0) {
      setSheetAName(sheetsA[0].name);
    } else {
      setSheetAName("");
    }
  }, [datasetAId, sheetsA]);

  React.useEffect(() => {
    if (sheetsB.length > 0) {
      setSheetBName(sheetsB[0].name);
    } else {
      setSheetBName("");
    }
  }, [datasetBId, sheetsB]);

  React.useEffect(() => {
    if (headersA.length > 0) setKeyA(headersA[0]);
  }, [headersA]);

  React.useEffect(() => {
    if (headersB.length > 0) setKeyB(headersB[0]);
  }, [headersB]);

  const handleRunMerge = () => {
    if (!datasetAId || !sheetAName || !datasetBId || !sheetBName) {
      toast.error("Please select datasets and sheets for both sources");
      return;
    }

    if (joinType !== "append" && (!keyA || !keyB)) {
      toast.error("Please select join keys for column-based merge");
      return;
    }

    setIsMerging(true);
    
    setTimeout(() => {
      try {
        const sheetA = sheetsA.find((s) => s.name === sheetAName)!;
        const sheetB = sheetsB.find((s) => s.name === sheetBName)!;

        const result = mergeDatasets(sheetA, sheetB, joinType, keyA, keyB);
        setPreviewResult(result);
        toast.success("Merge computed successfully!");
      } catch (err: any) {
        console.error(err);
        toast.error(`Merge failed: ${err.message || "Invalid columns configuration"}`);
      } finally {
        setIsMerging(false);
      }
    }, 400);
  };

  const handleSaveMergedDataset = () => {
    if (!previewResult) return;

    const fileA = datasets.find((x) => x.id === datasetAId);
    const fileB = datasets.find((x) => x.id === datasetBId);

    const mergedDatasetName = `Merged_${joinType.toUpperCase()}_${fileA?.name.replace(/\.[^/.]+$/, "")}_${fileB?.name.replace(/\.[^/.]+$/, "")}.xlsx`;

    const nextDataset = {
      id: crypto.randomUUID(),
      name: mergedDatasetName,
      size: JSON.stringify(previewResult.rows).length, // approximate size in bytes
      sheets: [previewResult],
      createdAt: new Date().toISOString(),
    };

    addDataset(nextDataset);
    selectDataset(nextDataset.id);
    
    toast.success("Saved as new active dataset!");
    setActiveTab("datasets");
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-y-auto gap-5">
      <h2 className="font-display font-bold text-2xl text-foreground flex items-center gap-2">
        <GitMerge className="h-6 w-6 text-primary" />
        <span>Merge Wizard</span>
      </h2>

      {/* Main Form config */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Source A config */}
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2 font-display font-bold text-sm text-foreground border-b border-border pb-2">
            <span className="h-5 w-5 rounded bg-primary/10 text-primary flex items-center justify-center text-xs">1</span>
            <span>Left Table (Source A)</span>
          </div>

          <div className="space-y-3 font-semibold text-xs">
            <div>
              <label className="block text-muted-foreground mb-1">DATASET</label>
              <select
                value={datasetAId}
                onChange={(e) => setDatasetAId(e.target.value)}
                className="w-full bg-accent border border-border rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-primary/40 text-foreground"
              >
                <option value="">-- Select Dataset A --</option>
                {datasets.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            {sheetsA.length > 0 && (
              <div>
                <label className="block text-muted-foreground mb-1">SHEET</label>
                <select
                  value={sheetAName}
                  onChange={(e) => setSheetAName(e.target.value)}
                  className="w-full bg-accent border border-border rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-primary/40 text-foreground"
                >
                  {sheetsA.map((s) => (
                    <option key={s.name} value={s.name}>
                      {s.name} ({s.rowCount} rows)
                    </option>
                  ))}
                </select>
              </div>
            )}

            {joinType !== "append" && headersA.length > 0 && (
              <div>
                <label className="block text-muted-foreground mb-1">JOIN KEY COLUMN</label>
                <select
                  value={keyA}
                  onChange={(e) => setKeyA(e.target.value)}
                  className="w-full bg-accent border border-border rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-primary/40 text-foreground"
                >
                  {headersA.map((h) => (
                    <option key={h} value={h}>
                      {h} ({sheetsA.find(s => s.name === sheetAName)?.columnTypes[h]})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Merge Operations Config */}
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm flex flex-col justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 font-display font-bold text-sm text-foreground border-b border-border pb-2 mb-4">
              <span className="h-5 w-5 rounded bg-primary/10 text-primary flex items-center justify-center text-xs">2</span>
              <span>Merge & Join Configuration</span>
            </div>

            <div className="space-y-4 font-semibold text-xs">
              <div>
                <label className="block text-muted-foreground mb-1.5">JOIN TYPE</label>
                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  {[
                    { id: "left", name: "Left Outer Join" },
                    { id: "inner", name: "Inner Join" },
                    { id: "right", name: "Right Outer Join" },
                    { id: "full", name: "Full Outer Join" },
                  ].map((jt) => (
                    <button
                      key={jt.id}
                      onClick={() => setJoinType(jt.id as any)}
                      className={`p-2 border rounded-lg transition-all ${
                        joinType === jt.id
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-border bg-accent/20 text-muted-foreground hover:bg-accent"
                      }`}
                    >
                      {jt.name}
                    </button>
                  ))}
                </div>
                
                {/* Append Row Option */}
                <button
                  onClick={() => setJoinType("append")}
                  className={`w-full mt-3 p-2.5 border rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                    joinType === "append"
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border bg-accent/20 text-muted-foreground hover:bg-accent"
                  }`}
                >
                  <Plus className="h-4 w-4" />
                  <span>Append Rows (Union Tables)</span>
                </button>
              </div>

              {joinType !== "append" && (
                <div className="p-3 bg-accent/40 rounded-lg text-[10px] text-muted-foreground leading-relaxed flex gap-2">
                  <AlertCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <p>
                    {joinType === "left" && "Returns all records from the left table, and the matched records from the right table. Empty matches pad with NULL."}
                    {joinType === "inner" && "Returns records that have matching values in both tables. Unmatched keys are discarded."}
                    {joinType === "right" && "Returns all records from the right table, and the matched records from the left table. Empty matches pad with NULL."}
                    {joinType === "full" && "Returns all records when there is a match in either left or right table. Combines everything."}
                  </p>
                </div>
              )}
            </div>
          </div>

          <Button
            className="w-full gap-2 mt-4"
            disabled={isMerging}
            onClick={handleRunMerge}
          >
            <Play className="h-4 w-4" />
            <span>{isMerging ? "Computing Merge..." : "Execute Merge"}</span>
          </Button>
        </div>

        {/* Source B config */}
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2 font-display font-bold text-sm text-foreground border-b border-border pb-2">
            <span className="h-5 w-5 rounded bg-primary/10 text-primary flex items-center justify-center text-xs">3</span>
            <span>Right Table (Source B)</span>
          </div>

          <div className="space-y-3 font-semibold text-xs">
            <div>
              <label className="block text-muted-foreground mb-1">DATASET</label>
              <select
                value={datasetBId}
                onChange={(e) => setDatasetBId(e.target.value)}
                className="w-full bg-accent border border-border rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-primary/40 text-foreground"
              >
                <option value="">-- Select Dataset B --</option>
                {datasets.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            {sheetsB.length > 0 && (
              <div>
                <label className="block text-muted-foreground mb-1">SHEET</label>
                <select
                  value={sheetBName}
                  onChange={(e) => setSheetBName(e.target.value)}
                  className="w-full bg-accent border border-border rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-primary/40 text-foreground"
                >
                  {sheetsB.map((s) => (
                    <option key={s.name} value={s.name}>
                      {s.name} ({s.rowCount} rows)
                    </option>
                  ))}
                </select>
              </div>
            )}

            {joinType !== "append" && headersB.length > 0 && (
              <div>
                <label className="block text-muted-foreground mb-1">JOIN KEY COLUMN</label>
                <select
                  value={keyB}
                  onChange={(e) => setKeyB(e.target.value)}
                  className="w-full bg-accent border border-border rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-primary/40 text-foreground"
                >
                  {headersB.map((h) => (
                    <option key={h} value={h}>
                      {h} ({sheetsB.find(s => s.name === sheetBName)?.columnTypes[h]})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Preview Output */}
      {previewResult && (
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm flex-1 flex flex-col min-h-0 space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3 shrink-0">
            <div>
              <h3 className="font-display font-bold text-sm text-foreground">Merge Preview & Diagnostics</h3>
              <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mt-0.5">
                Rows: <span className="text-foreground">{previewResult.rowCount}</span> | Columns: <span className="text-foreground">{previewResult.columnCount}</span>
              </p>
            </div>

            <Button
              size="sm"
              variant="success"
              className="gap-1.5 h-8 text-xs font-bold"
              onClick={handleSaveMergedDataset}
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
                  {previewResult.headers.slice(0, 8).map((h: string) => (
                    <th key={h} className="px-3 py-2 font-bold text-foreground border-r border-border min-w-[100px] truncate">
                      {h}
                    </th>
                  ))}
                  {previewResult.headers.length > 8 && <th className="px-3 py-2 text-muted-foreground italic">+{previewResult.headers.length - 8} more cols</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {previewResult.rows.slice(0, 5).map((row: any, rIdx: number) => (
                  <tr key={rIdx} className="hover:bg-accent/20">
                    {previewResult.headers.slice(0, 8).map((h: string) => {
                      const val = row[h];
                      const isNull = val === null || val === undefined;
                      return (
                        <td key={h} className={`px-3 py-2 border-r border-border truncate max-w-[150px] font-medium ${isNull ? "text-danger/60 italic" : "text-foreground/80"}`}>
                          {isNull ? "NULL" : String(val)}
                        </td>
                      );
                    })}
                    {previewResult.headers.length > 8 && <td className="px-3 py-2 text-muted-foreground font-semibold">...</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
