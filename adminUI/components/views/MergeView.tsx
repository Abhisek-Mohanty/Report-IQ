import React, { useState, useMemo } from "react";
import { useAnalyticsStore } from "@/store/useAnalyticsStore";
import { mergeMultipleDatasets } from "@/utils/dataOperations";
import { toast } from "@/components/ui/toast";
import { 
  GitMerge, 
  Database, 
  HelpCircle,
  Plus,
  Play,
  Download,
  AlertCircle,
  Trash2,
  Layers,
  Youtube,
  PlayCircle,
  ExternalLink
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { SheetData, JoinType } from "@/types";

interface SourceConfigItem {
  id: string;
  datasetId: string;
  sheetName: string;
  leftKey: string;   // Key from accumulated result for step i
  rightKey: string;  // Key from this sheet
}

export function MergeView() {
  const datasets = useAnalyticsStore((state) => state.datasets);
  const addDataset = useAnalyticsStore((state) => state.addDataset);
  const selectDataset = useAnalyticsStore((state) => state.selectDataset);
  const setActiveTab = useAnalyticsStore((state) => state.setActiveTab);

  // Form State: Starts with 2 sources (Source A and Source B), supports N sources
  const [sources, setSources] = useState<SourceConfigItem[]>([
    { id: "source-1", datasetId: "", sheetName: "", leftKey: "", rightKey: "" },
    { id: "source-2", datasetId: "", sheetName: "", leftKey: "", rightKey: "" },
  ]);

  const [joinType, setJoinType] = useState<JoinType>("left");
  const [previewResult, setPreviewResult] = useState<SheetData | null>(null);
  const [isMerging, setIsMerging] = useState(false);
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);

  // Helper to retrieve sheets for a given source index
  const getSourceSheets = (index: number) => {
    const src = sources[index];
    if (!src?.datasetId) return [];
    const ds = datasets.find((d) => d.id === src.datasetId);
    return ds?.sheets || [];
  };

  // Helper to retrieve column headers for a given source index
  const getSourceHeaders = (index: number) => {
    const src = sources[index];
    if (!src?.datasetId || !src?.sheetName) return [];
    const ds = datasets.find((d) => d.id === src.datasetId);
    const sheet = ds?.sheets.find((s) => s.name === src.sheetName);
    return sheet?.headers || [];
  };

  // Helper to get all accumulated headers available up to a given source index
  const getAccumulatedHeaders = (targetIndex: number): string[] => {
    if (targetIndex <= 0) return [];
    const headerSet = new Set<string>();
    for (let i = 0; i < targetIndex; i++) {
      getSourceHeaders(i).forEach((h) => headerSet.add(h));
    }
    return Array.from(headerSet);
  };

  // Source updates handler
  const handleUpdateSource = (index: number, updates: Partial<SourceConfigItem>) => {
    setSources((prev) => {
      const next = [...prev];
      const current = { ...next[index], ...updates };

      if ("datasetId" in updates) {
        const ds = datasets.find((d) => d.id === updates.datasetId);
        const firstSheet = ds?.sheets[0];
        current.sheetName = firstSheet?.name || "";
        current.rightKey = firstSheet?.headers[0] || "";

        // If updating Source A, ensure Source B's leftKey gets initialized
        if (index === 0 && next[1]) {
          next[1] = { ...next[1], leftKey: firstSheet?.headers[0] || "" };
        } else if (index > 0 && !current.leftKey) {
          const accHeaders = getAccumulatedHeaders(index);
          current.leftKey = accHeaders[0] || "";
        }
      }

      if ("sheetName" in updates) {
        const ds = datasets.find((d) => d.id === current.datasetId);
        const sheet = ds?.sheets.find((s) => s.name === updates.sheetName);
        current.rightKey = sheet?.headers[0] || "";

        if (index === 0 && next[1]) {
          next[1] = { ...next[1], leftKey: sheet?.headers[0] || "" };
        }
      }

      next[index] = current;
      return next;
    });
    setPreviewResult(null);
  };

  // Add another table (Source C, D, ...)
  const handleAddSource = () => {
    setSources((prev) => {
      const newIndex = prev.length;
      const accHeaders = getAccumulatedHeaders(newIndex);
      return [
        ...prev,
        {
          id: crypto.randomUUID(),
          datasetId: "",
          sheetName: "",
          leftKey: accHeaders[0] || "",
          rightKey: "",
        },
      ];
    });
    setPreviewResult(null);
  };

  // Remove table (keeping at least 2 sources)
  const handleRemoveSource = (index: number) => {
    if (sources.length <= 2) return;
    setSources((prev) => prev.filter((_, i) => i !== index));
    setPreviewResult(null);
  };

  // Convenient shortcuts for Source A & B
  const sheetsA = useMemo(() => getSourceSheets(0), [sources[0]?.datasetId, datasets]);
  const sheetsB = useMemo(() => getSourceSheets(1), [sources[1]?.datasetId, datasets]);
  const headersA = useMemo(() => getSourceHeaders(0), [sources[0]?.datasetId, sources[0]?.sheetName, datasets]);
  const headersB = useMemo(() => getSourceHeaders(1), [sources[1]?.datasetId, sources[1]?.sheetName, datasets]);

  // Execute Merge across all sources
  const handleRunMerge = () => {
    for (let i = 0; i < sources.length; i++) {
      if (!sources[i].datasetId || !sources[i].sheetName) {
        toast.error(`Please select dataset and sheet for Table ${i + 1}`);
        return;
      }
    }

    if (joinType !== "append") {
      for (let i = 1; i < sources.length; i++) {
        if (!sources[i].leftKey || !sources[i].rightKey) {
          toast.error(`Please select join keys for Table ${i + 1}`);
          return;
        }
      }
    }

    setIsMerging(true);

    setTimeout(() => {
      try {
        const resolvedSources = sources.map((s, idx) => {
          const ds = datasets.find((d) => d.id === s.datasetId);
          const sheet = ds?.sheets.find((sh) => sh.name === s.sheetName)!;
          return {
            sheet,
            name: ds?.name.replace(/\.[^/.]+$/, "") || `Table_${idx + 1}`,
            leftKey: s.leftKey,
            rightKey: s.rightKey,
            joinType,
          };
        });

        const result = mergeMultipleDatasets(resolvedSources, joinType);
        setPreviewResult(result);
        toast.success(
          sources.length > 2
            ? `Successfully merged ${sources.length} tables!`
            : "Merge computed successfully!"
        );
      } catch (err: any) {
        console.error(err);
        toast.error(`Merge failed: ${err.message || "Invalid columns configuration"}`);
      } finally {
        setIsMerging(false);
      }
    }, 300);
  };

  // Save merged result into workspace store
  const handleSaveMergedDataset = () => {
    if (!previewResult) return;

    const sourceNames = sources
      .map((s) => {
        const d = datasets.find((x) => x.id === s.datasetId);
        return d?.name.replace(/\.[^/.]+$/, "") || "Dataset";
      })
      .join("_");

    const mergedDatasetName = `Merged_${joinType.toUpperCase()}_${sourceNames}.xlsx`;

    const nextDataset = {
      id: crypto.randomUUID(),
      name: mergedDatasetName,
      size: JSON.stringify(previewResult.rows).length,
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display font-bold text-2xl text-foreground flex items-center gap-2">
            <GitMerge className="h-6 w-6 text-primary" />
            <span>Merge Wizard</span>
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Combine multiple sheets or datasets using SQL-like joins or row appending.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {sources.length > 2 && (
            <div className="flex items-center gap-2 bg-primary/10 text-primary border border-primary/20 px-3 py-1 rounded-full text-xs font-semibold">
              <Layers className="h-3.5 w-3.5" />
              <span>{sources.length} Tables Multi-Merge Active</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Form config: 3-column layout for Primary Sources and Join Config */}
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
                value={sources[0].datasetId}
                onChange={(e) => handleUpdateSource(0, { datasetId: e.target.value })}
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
                  value={sources[0].sheetName}
                  onChange={(e) => handleUpdateSource(0, { sheetName: e.target.value })}
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
                  value={sources[1]?.leftKey || ""}
                  onChange={(e) => handleUpdateSource(1, { leftKey: e.target.value })}
                  className="w-full bg-accent border border-border rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-primary/40 text-foreground"
                >
                  {headersA.map((h) => (
                    <option key={h} value={h}>
                      {h} ({sheetsA.find((s) => s.name === sources[0].sheetName)?.columnTypes[h]})
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
                      type="button"
                      onClick={() => {
                        setJoinType(jt.id as any);
                        setPreviewResult(null);
                      }}
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
                  type="button"
                  onClick={() => {
                    setJoinType("append");
                    setPreviewResult(null);
                  }}
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

              {/* Add More Sources Button */}
              <button
                type="button"
                onClick={handleAddSource}
                className="w-full p-2 border border-dashed border-primary/40 rounded-lg text-primary hover:bg-primary/5 transition-all flex items-center justify-center gap-1.5 text-xs font-semibold"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Another Table / Source ({sources.length + 1})</span>
              </button>

              {joinType !== "append" && (
                <div className="p-3 bg-accent/40 rounded-lg text-[10px] text-muted-foreground leading-relaxed flex gap-2">
                  <AlertCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <p>
                    {joinType === "left" && "Returns all records from the left table, and the matched records from the right table. Empty matches pad with NULL."}
                    {joinType === "inner" && "Returns records that have matching values in both tables. Unmatched keys are discarded."}
                    {joinType === "right" && "Returns all records from the right table, and the matched records from the left table. Empty matches pad with NULL."}
                    {joinType === "full" && "Returns all records when there is a match in either left or right table. Combines everything."}
                    {sources.length > 2 && " Additional tables are joined sequentially to the accumulated result."}
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsTutorialOpen(true)}
                    className="flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
                  >
                    <PlayCircle className="h-3.5 w-3.5" />
                    <span>Watch</span>
                  </button>
                </div>
              )}

              {joinType === "append" && (
                <div className="p-3 bg-accent/40 rounded-lg text-[10px] text-muted-foreground leading-relaxed flex gap-2">
                  <AlertCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <p>
                    Append mode stacks rows from all {sources.length} selected tables vertically. Columns are matched by name; missing values are padded with NULL.
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
            <span>{isMerging ? "Computing Merge..." : `Execute Merge (${sources.length} Tables)`}</span>
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
                value={sources[1].datasetId}
                onChange={(e) => handleUpdateSource(1, { datasetId: e.target.value })}
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
                  value={sources[1].sheetName}
                  onChange={(e) => handleUpdateSource(1, { sheetName: e.target.value })}
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
                  value={sources[1].rightKey}
                  onChange={(e) => handleUpdateSource(1, { rightKey: e.target.value })}
                  className="w-full bg-accent border border-border rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-primary/40 text-foreground"
                >
                  {headersB.map((h) => (
                    <option key={h} value={h}>
                      {h} ({sheetsB.find((s) => s.name === sources[1].sheetName)?.columnTypes[h]})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Additional Sources (Table 3, Table 4, ...) when sources.length > 2 */}
      {sources.length > 2 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between border-b border-border pb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Additional Tables ({sources.length - 2} added)
            </span>
            <span className="text-[11px] text-muted-foreground">
              Each table is joined sequentially with the result of preceding tables
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {sources.slice(2).map((source, sliceIdx) => {
              const actualIdx = sliceIdx + 2;
              const letter = String.fromCharCode(65 + actualIdx);
              const sheets = getSourceSheets(actualIdx);
              const headers = getSourceHeaders(actualIdx);
              const accumulatedHeaders = getAccumulatedHeaders(actualIdx);

              return (
                <div
                  key={source.id}
                  className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4"
                >
                  <div className="flex items-center justify-between border-b border-border pb-2">
                    <div className="flex items-center gap-2 font-display font-bold text-sm text-foreground">
                      <span className="h-5 w-5 rounded bg-primary/10 text-primary flex items-center justify-center text-xs">
                        {actualIdx + 2}
                      </span>
                      <span>Table {actualIdx + 1} (Source {letter})</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveSource(actualIdx)}
                      className="text-muted-foreground hover:text-danger p-1 rounded transition-colors text-xs flex items-center gap-1"
                      title="Remove Table"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span className="text-[10px]">Remove</span>
                    </button>
                  </div>

                  <div className="space-y-3 font-semibold text-xs">
                    <div>
                      <label className="block text-muted-foreground mb-1">DATASET</label>
                      <select
                        value={source.datasetId}
                        onChange={(e) => handleUpdateSource(actualIdx, { datasetId: e.target.value })}
                        className="w-full bg-accent border border-border rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-primary/40 text-foreground"
                      >
                        <option value="">-- Select Dataset {letter} --</option>
                        {datasets.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {sheets.length > 0 && (
                      <div>
                        <label className="block text-muted-foreground mb-1">SHEET</label>
                        <select
                          value={source.sheetName}
                          onChange={(e) => handleUpdateSource(actualIdx, { sheetName: e.target.value })}
                          className="w-full bg-accent border border-border rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-primary/40 text-foreground"
                        >
                          {sheets.map((s) => (
                            <option key={s.name} value={s.name}>
                              {s.name} ({s.rowCount} rows)
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {joinType !== "append" && (
                      <>
                        {accumulatedHeaders.length > 0 && (
                          <div>
                            <label className="block text-muted-foreground mb-1">
                              LEFT KEY (FROM PRECEDING TABLES)
                            </label>
                            <select
                              value={source.leftKey}
                              onChange={(e) => handleUpdateSource(actualIdx, { leftKey: e.target.value })}
                              className="w-full bg-accent border border-border rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-primary/40 text-foreground"
                            >
                              <option value="">-- Select Left Key --</option>
                              {accumulatedHeaders.map((h) => (
                                <option key={h} value={h}>
                                  {h}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}

                        {headers.length > 0 && (
                          <div>
                            <label className="block text-muted-foreground mb-1">
                              RIGHT KEY (FROM SOURCE {letter})
                            </label>
                            <select
                              value={source.rightKey}
                              onChange={(e) => handleUpdateSource(actualIdx, { rightKey: e.target.value })}
                              className="w-full bg-accent border border-border rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-primary/40 text-foreground"
                            >
                              <option value="">-- Select Right Key --</option>
                              {headers.map((h) => (
                                <option key={h} value={h}>
                                  {h} ({sheets.find((s) => s.name === source.sheetName)?.columnTypes[h]})
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Preview Output */}
      {previewResult && (
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm flex-1 flex flex-col min-h-0 space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3 shrink-0">
            <div>
              <h3 className="font-display font-bold text-sm text-foreground">Merge Preview & Diagnostics</h3>
              <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mt-0.5">
                Rows: <span className="text-foreground">{previewResult.rowCount}</span> | Columns: <span className="text-foreground">{previewResult.columnCount}</span> | Mode: <span className="text-primary uppercase">{joinType}</span>
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

          {/* Inline Table Preview */}
          <div className="flex-1 overflow-auto border border-border rounded-lg bg-accent/10">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-accent/40 border-b border-border sticky top-0">
                <tr>
                  {previewResult.headers.slice(0, 10).map((h: string) => (
                    <th key={h} className="px-3 py-2 font-bold text-foreground border-r border-border min-w-[100px] truncate">
                      {h}
                    </th>
                  ))}
                  {previewResult.headers.length > 10 && (
                    <th className="px-3 py-2 text-muted-foreground italic">
                      +{previewResult.headers.length - 10} more cols
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {previewResult.rows.slice(0, 8).map((row: any, rIdx: number) => (
                  <tr key={rIdx} className="hover:bg-accent/20">
                    {previewResult.headers.slice(0, 10).map((h: string) => {
                      const val = row[h];
                      const isNull = val === null || val === undefined;
                      return (
                        <td
                          key={h}
                          className={`px-3 py-2 border-r border-border truncate max-w-[150px] font-medium ${
                            isNull ? "text-danger/60 italic" : "text-foreground/80"
                          }`}
                        >
                          {isNull ? "NULL" : String(val)}
                        </td>
                      );
                    })}
                    {previewResult.headers.length > 10 && (
                      <td className="px-3 py-2 text-muted-foreground font-semibold">...</td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* YouTube Short Tutorial Dialog */}
      <Dialog
        isOpen={isTutorialOpen}
        onClose={() => setIsTutorialOpen(false)}
        title="Joins Visual Tutorial"
        className="max-w-sm sm:max-w-md"
      >
        <div className="flex flex-col items-center gap-3">
          <p className="text-xs text-muted-foreground text-center">
            A quick visual guide explaining how joins connect datasets together.
          </p>

          {/* Vertical Video Embed Container (9:16 aspect ratio) */}
          <div className="w-full max-w-[280px] sm:max-w-[315px] aspect-[9/16] rounded-xl overflow-hidden border border-border bg-black shadow-xl">
            <iframe
              src="https://www.youtube.com/embed/7_JNpi-phTg?rel=0"
              title="SQL Joins Tutorial (YouTube Short)"
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          </div>

          <div className="flex items-center justify-between w-full pt-3 border-t border-border text-xs">
            <a
              href="https://www.youtube.com/shorts/7_JNpi-phTg"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-primary hover:underline font-medium"
            >
              <Youtube className="h-4 w-4 text-danger" />
              <span>Watch on YouTube</span>
              <ExternalLink className="h-3 w-3" />
            </a>

            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsTutorialOpen(false)}
              className="text-xs h-7"
            >
              Close
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
