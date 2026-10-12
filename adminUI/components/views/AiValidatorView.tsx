"use client";

import React, { useState, useMemo, useRef } from "react";
import { useAnalyticsStore } from "@/store/useAnalyticsStore";
import { SheetData, Dataset } from "@/types";
import { parseExcelFile, parseCsvFile } from "@/utils/excelParser";
import { formatBytes } from "@/lib/utils";
import { toast } from "@/components/ui/toast";
import {
  ReferenceExcelScope,
  ReferenceExcelPayload,
  DocumentRulesPayload,
  DocumentExtractionResult,
} from "@/types/validator";
import {
  extractDocumentContentLocally,
  SUPPORTED_DOC_EXTENSIONS,
  MAX_DOCUMENT_CHAR_LIMIT,
} from "@/utils/documentExtractor";
import {
  buildReferenceExcelPayload,
  buildDocumentRulesPayload,
} from "@/utils/validatorPayloadBuilder";
import {
  MonitorCheck,
  FileSpreadsheet,
  FileText,
  CheckSquare,
  UploadCloud,
  Database,
  ArrowRight,
  Sparkles,
  Layers,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  RefreshCw,
  Copy,
  Download,
  ChevronDown,
  ChevronUp,
  Check,
  Code2,
  FileCode,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export function AiValidatorView() {
  const datasets = useAnalyticsStore((state) => state.datasets);
  const selectedDatasetId = useAnalyticsStore((state) => state.selectedDatasetId);
  const selectedSheetName = useAnalyticsStore((state) => state.selectedSheetName);
  const selectDataset = useAnalyticsStore((state) => state.selectDataset);
  const selectSheet = useAnalyticsStore((state) => state.selectSheet);
  const setActiveTab = useAnalyticsStore((state) => state.setActiveTab);

  // Active dataset and sheet resolution
  const activeDataset: Dataset | null = useMemo(() => {
    return datasets.find((d) => d.id === selectedDatasetId) || datasets[0] || null;
  }, [datasets, selectedDatasetId]);

  const activeSheet: SheetData | null = useMemo(() => {
    if (!activeDataset) return null;
    return (
      activeDataset.sheets.find((s) => s.name === selectedSheetName) ||
      activeDataset.sheets[0] ||
      null
    );
  }, [activeDataset, selectedSheetName]);

  // Working state key: isolates state by dataset and sheet
  const scopeKey = useMemo(() => {
    return `${activeDataset?.id || "none"}:${activeSheet?.name || "none"}`;
  }, [activeDataset, activeSheet]);

  // Mode selection: 1: Compare Excel | 2: Document Rules
  const [activeMode, setActiveMode] = useState<"compare-excel" | "document-rules">("compare-excel");

  // =========================================================================
  // MODE 1 STATE: REFERENCE EXCEL
  // =========================================================================
  const [refExcelFile, setRefExcelFile] = useState<File | null>(null);
  const [refDataset, setRefDataset] = useState<Dataset | null>(null);
  const [refSheetName, setRefSheetName] = useState<string>("");
  const [activeSelectedCols, setActiveSelectedCols] = useState<string[]>([]);
  const [refSelectedCols, setRefSelectedCols] = useState<string[]>([]);
  const [refRowScopeMode, setRefRowScopeMode] = useState<"all" | "range" | "filter">("all");
  const [refRangeStart, setRefRangeStart] = useState<number>(1);
  const [refRangeEnd, setRefRangeEnd] = useState<number>(100);
  const [refFilterCol, setRefFilterCol] = useState<string>("");
  const [refFilterVal, setRefFilterVal] = useState<string>("");
  const [refUserPrompt, setRefUserPrompt] = useState<string>(
    "Compare loan sanction amounts and co-lender interest rates between our active portfolio and the reference sheet to identify reconciliation discrepancies."
  );
  const [refPreparedPayload, setRefPreparedPayload] = useState<ReferenceExcelPayload | null>(null);
  const [refShowJson, setRefShowJson] = useState<boolean>(false);
  const [isParsingRefFile, setIsParsingRefFile] = useState<boolean>(false);
  const refFileInputRef = useRef<HTMLInputElement>(null);

  // Active reference sheet
  const activeRefSheet = useMemo(() => {
    if (!refDataset) return null;
    return refDataset.sheets.find((s) => s.name === refSheetName) || refDataset.sheets[0] || null;
  }, [refDataset, refSheetName]);

  // Auto-init reference sheet columns when reference sheet changes
  React.useEffect(() => {
    if (activeRefSheet && refSelectedCols.length === 0) {
      setRefSelectedCols(activeRefSheet.headers.slice(0, 4));
      setRefRangeEnd(activeRefSheet.rowCount);
      if (activeRefSheet.headers.length > 0) setRefFilterCol(activeRefSheet.headers[0]);
    }
  }, [activeRefSheet, refSelectedCols.length]);

  // Auto-init active sheet selected columns
  React.useEffect(() => {
    if (activeSheet && activeSelectedCols.length === 0) {
      setActiveSelectedCols(activeSheet.headers.slice(0, 4));
    }
  }, [activeSheet, activeSelectedCols.length]);

  // Parse Reference Excel/CSV file locally
  const handleUploadRefFile = async (file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!["xlsx", "xls", "csv"].includes(ext || "")) {
      toast.error("Unsupported reference file. Please upload .xlsx, .xls, or .csv");
      return;
    }

    try {
      setIsParsingRefFile(true);
      let parsed: Dataset;
      if (ext === "csv") {
        const text = await file.text();
        parsed = await parseCsvFile(file, text);
      } else {
        const buffer = await file.arrayBuffer();
        parsed = await parseExcelFile(file, buffer);
      }

      setRefExcelFile(file);
      setRefDataset(parsed);
      setRefSheetName(parsed.sheets[0]?.name || "");
      setRefSelectedCols(parsed.sheets[0]?.headers.slice(0, 4) || []);
      setRefRangeStart(1);
      setRefRangeEnd(parsed.sheets[0]?.rowCount || 100);
      setRefPreparedPayload(null);
      toast.success(`Parsed reference spreadsheet: ${file.name}`);
    } catch (err: any) {
      toast.error(`Failed to parse reference file: ${err.message || "Invalid structure"}`);
    } finally {
      setIsParsingRefFile(false);
    }
  };

  // Build Reference Excel Payload
  const handlePrepareRefPayload = () => {
    if (!activeDataset || !activeSheet) {
      toast.error("No active dataset selected.");
      return;
    }
    if (!refExcelFile || !activeRefSheet) {
      toast.error("Please upload and select a reference spreadsheet.");
      return;
    }

    const scope: ReferenceExcelScope = {
      sheetName: activeRefSheet.name,
      selectedColumns: refSelectedCols,
      rowScopeMode: refRowScopeMode,
      rangeStart: refRangeStart,
      rangeEnd: refRangeEnd,
      filterColumn: refFilterCol,
      filterOperator: "contains",
      filterValue: refFilterVal,
    };

    const payload = buildReferenceExcelPayload({
      activeDatasetId: activeDataset.id,
      activeDatasetName: activeDataset.name,
      activeSheet,
      activeSelectedColumns: activeSelectedCols,
      referenceFile: refExcelFile,
      referenceSheet: activeRefSheet,
      referenceScope: scope,
      userPrompt: refUserPrompt,
    });

    setRefPreparedPayload(payload);
    console.log(refPreparedPayload);
    toast.success("Request prepared successfully! Ready for AI validation pipeline.");
  };

  // =========================================================================
  // MODE 2 STATE: DOCUMENT RULES
  // =========================================================================
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docExtractResult, setDocExtractResult] = useState<DocumentExtractionResult | null>(null);
  const [docSelectedSections, setDocSelectedSections] = useState<number[]>([]);
  const [docUserPrompt, setDocUserPrompt] = useState<string>(
    "Extract business underwriting rules, eligibility criteria, and maximum interest rate thresholds to validate against loan applications."
  );
  const [docPreparedPayload, setDocPreparedPayload] = useState<DocumentRulesPayload | null>(null);
  const [docShowJson, setDocShowJson] = useState<boolean>(false);
  const [isExtractingDoc, setIsExtractingDoc] = useState<boolean>(false);
  const docFileInputRef = useRef<HTMLInputElement>(null);

  // Extract document text locally
  const handleUploadDocFile = async (file: File) => {
    try {
      setIsExtractingDoc(true);
      const res = await extractDocumentContentLocally(file);
      setDocFile(file);
      setDocExtractResult(res);
      setDocPreparedPayload(null);

      if (res.success) {
        // Select all sections by default
        setDocSelectedSections(res.sections.map((_, i) => i));
        toast.success(`Extracted ${res.wordCount.toLocaleString()} words from ${file.name}`);
      } else {
        toast.error(res.error || "Failed to extract text from document");
      }
    } catch (err: any) {
      toast.error(`Extraction failed: ${err.message || "Unknown error"}`);
    } finally {
      setIsExtractingDoc(false);
    }
  };

  // Build Document Rules Payload
  const handlePrepareDocPayload = () => {
    if (!activeDataset || !activeSheet) {
      toast.error("No active dataset selected.");
      return;
    }
    if (!docExtractResult || !docExtractResult.success) {
      toast.error("Please upload a readable document first.");
      return;
    }
    if (docSelectedSections.length === 0) {
      toast.error("Please select at least one section of extracted content.");
      return;
    }

    const chosenSections = docSelectedSections.map((idx) => docExtractResult.sections[idx]);

    const payload = buildDocumentRulesPayload({
      extractionResult: docExtractResult,
      selectedSections: chosenSections,
      activeDatasetId: activeDataset.id,
      activeDatasetName: activeDataset.name,
      activeSheet,
      userPrompt: docUserPrompt,
    });

    setDocPreparedPayload(payload);
    toast.success("Request prepared successfully! Ready for AI rule extraction.");
  };

  // Copy JSON to clipboard
  const handleCopyJson = (payload: any) => {
    navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
    toast.success("JSON copied to clipboard!");
  };

  // Download JSON spec
  const handleDownloadJson = (payload: any, filename: string) => {
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  // =========================================================================
  // ZERO-STATE: NO DATASET SELECTED
  // =========================================================================
  if (!activeDataset || !activeSheet) {
    return (
      <div className="min-h-[700px] flex flex-col items-center justify-center p-8 text-center space-y-6 max-w-2xl mx-auto">
        <div className="w-20 h-20 rounded-3xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shadow-xl shadow-indigo-500/5">
          <MonitorCheck className="w-10 h-10" />
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-extrabold text-white tracking-tight">
            AI Report Validator
          </h2>
          <p className="text-sm text-slate-400 leading-relaxed max-w-md mx-auto">
            Validate loan portfolios, financial records, and tabular sheets using counterparty Excel comparison or underwriting policy rulebooks.
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full text-left space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <Database className="w-4 h-4 text-indigo-400" />
            Get Started: Select or Upload a Dataset
          </h3>

          {datasets.length > 0 ? (
            <div className="space-y-3">
              <p className="text-xs text-slate-400">Choose one of your existing datasets to validate:</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {datasets.map((d) => (
                  <button
                    key={d.id}
                    onClick={() => selectDataset(d.id)}
                    className="p-3 rounded-xl border border-slate-800 bg-slate-800/50 hover:bg-slate-800 hover:border-indigo-500/50 text-left transition-all"
                  >
                    <div className="text-xs font-bold text-white truncate">{d.name}</div>
                    <div className="text-[11px] text-slate-400 mt-1">
                      {d.sheets.length} Sheet(s) &bull; {d.sheets[0]?.rowCount.toLocaleString()} rows
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-400">
              No datasets loaded yet. Upload your Excel or CSV file to start automated validation.
            </p>
          )}

          <div className="pt-2 flex items-center justify-end">
            <Button
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs gap-2"
              onClick={() => setActiveTab("upload")}
            >
              <UploadCloud className="w-4 h-4" />
              Upload New Dataset
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-8 pb-20 animate-in fade-in duration-200 overflow-y-auto">
      {/* =========================================================================
          TOP BANNER: SCOPE & OVERVIEW
         ========================================================================= */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-48 bg-gradient-to-bl from-indigo-500/10 via-purple-500/5 to-transparent pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <MonitorCheck className="w-3.5 h-3.5" />
                Frontend-Only AI Validator
              </span>

              {/* Dataset & Sheet Switcher */}
              <div className="flex items-center gap-1.5 bg-slate-800/90 px-3 py-1 rounded-lg border border-slate-700 text-xs text-slate-300">
                <Database className="w-3.5 h-3.5 text-slate-400" />
                <span>Dataset:</span>
                <select
                  value={activeDataset.id}
                  onChange={(e) => selectDataset(e.target.value)}
                  className="bg-transparent text-white font-semibold focus:outline-none cursor-pointer"
                >
                  {datasets.map((d) => (
                    <option key={d.id} value={d.id} className="bg-slate-900 text-white">
                      {d.name}
                    </option>
                  ))}
                </select>
                <span className="text-slate-600">&bull;</span>
                <span>Sheet:</span>
                <select
                  value={activeSheet.name}
                  onChange={(e) => selectSheet(e.target.value)}
                  className="bg-transparent text-white font-semibold focus:outline-none cursor-pointer"
                >
                  {activeDataset.sheets.map((s) => (
                    <option key={s.name} value={s.name} className="bg-slate-900 text-white">
                      {s.name} ({s.rowCount.toLocaleString()} rows)
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              AI Report Validator
            </h1>
            <p className="text-sm text-slate-400 max-w-3xl">
              Inspect dataset fidelity, compare against counterparty spreadsheets, or extract criteria from policy rulebooks to prepare AI validation payloads.
            </p>
          </div>

          <div className="flex items-center gap-2 pt-2 lg:pt-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActiveTab("upload")}
              className="border-slate-700 text-slate-300 hover:bg-slate-800 text-xs"
            >
              <UploadCloud className="w-3.5 h-3.5 mr-1.5" />
              Upload Dataset
            </Button>
          </div>
        </div>

        {/* TWO AI VALIDATION MODES */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-6 pt-5 border-t border-slate-800/80">
          <button
            onClick={() => setActiveMode("compare-excel")}
            className={`p-3.5 rounded-xl border text-left transition-all flex items-start gap-3 ${
              activeMode === "compare-excel"
                ? "bg-indigo-600/15 border-indigo-500/50 shadow-sm shadow-indigo-500/10"
                : "bg-slate-800/40 border-slate-700/60 hover:bg-slate-800"
            }`}
          >
            <div
              className={`p-2 rounded-lg shrink-0 mt-0.5 ${
                activeMode === "compare-excel"
                  ? "bg-indigo-500/20 text-indigo-400"
                  : "bg-slate-800 text-slate-400"
              }`}
            >
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div className="space-y-0.5">
              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                <span>1. Compare with another Excel</span>
                {refPreparedPayload && (
                  <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                )}
              </div>
              <p className="text-[11px] text-slate-400 leading-tight">
                Benchmark against a reference file; prepare comparison request.
              </p>
            </div>
          </button>

          <button
            onClick={() => setActiveMode("document-rules")}
            className={`p-3.5 rounded-xl border text-left transition-all flex items-start gap-3 ${
              activeMode === "document-rules"
                ? "bg-purple-600/15 border-purple-500/50 shadow-sm shadow-purple-500/10"
                : "bg-slate-800/40 border-slate-700/60 hover:bg-slate-800"
            }`}
          >
            <div
              className={`p-2 rounded-lg shrink-0 mt-0.5 ${
                activeMode === "document-rules"
                  ? "bg-purple-500/20 text-purple-400"
                  : "bg-slate-800 text-slate-400"
              }`}
            >
              <FileText className="w-5 h-5" />
            </div>
            <div className="space-y-0.5">
              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                <span>2. Check against document rules</span>
                {docPreparedPayload && (
                  <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                )}
              </div>
              <p className="text-[11px] text-slate-400 leading-tight">
                Extract text from PDF/markdown rulebooks; prepare rule request.
              </p>
            </div>
          </button>
        </div>

        {/* Shortcut Banner to Create a Check */}
        <div className="mt-4 p-3.5 rounded-xl bg-slate-800/40 border border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
              <CheckSquare className="w-4 h-4" />
            </div>
            <div className="space-y-0.5">
              <p className="text-xs font-semibold text-slate-200">
                Looking for client-side formula checks & rule verification?
              </p>
              <p className="text-[11px] text-slate-400">
                Create custom rules, run formula calculations, and view validation scoreboards locally in <span className="text-emerald-400 font-medium">Data Prep & Visuals → Create a Check</span>.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setActiveTab("manual-checks")}
            className="border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10 text-xs shrink-0 self-start sm:self-auto"
          >
            Open Create a Check
            <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </Button>
        </div>
      </div>

      {/* =========================================================================
          MODE 1: COMPARE WITH ANOTHER EXCEL (PREPARE REQUEST ONLY)
         ========================================================================= */}
      {activeMode === "compare-excel" && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
            <div className="space-y-1">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-indigo-400" />
                Step 1: Upload Reference Spreadsheet
              </h2>
              <p className="text-xs text-slate-400">
                Upload a secondary or counterparty spreadsheet (.xlsx, .xls, .csv). Parsing happens entirely on your machine.
              </p>
            </div>

            {/* Hidden File Input */}
            <input
              type="file"
              ref={refFileInputRef}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleUploadRefFile(f);
              }}
              accept=".xlsx,.xls,.csv"
              className="hidden"
            />

            {!refExcelFile ? (
              <div
                onClick={() => refFileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-700 hover:border-indigo-500/60 rounded-2xl p-8 text-center cursor-pointer transition-all bg-slate-950/40 hover:bg-slate-900/60 space-y-3"
              >
                <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <div className="text-sm font-semibold text-white">
                    Click to browse or drop reference spreadsheet
                  </div>
                  <p className="text-xs text-slate-400">
                    Supports Microsoft Excel (.xlsx, .xls) and Comma-Separated Values (.csv)
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white">{refExcelFile.name}</div>
                    <div className="text-xs text-slate-400">
                      {formatBytes(refExcelFile.size)} &bull; {refDataset?.sheets.length || 0} Sheet(s)
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => refFileInputRef.current?.click()}
                    className="text-xs text-slate-300 hover:text-white"
                  >
                    Change File
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setRefExcelFile(null);
                      setRefDataset(null);
                      setRefPreparedPayload(null);
                    }}
                    className="text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                  >
                    Remove
                  </Button>
                </div>
              </div>
            )}

            {/* Scope Selection */}
            {activeRefSheet && (
              <div className="space-y-6 pt-4 border-t border-slate-800/80">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Reference Sheet & Column Selection */}
                  <div className="space-y-3">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                      Reference Sheet & Columns
                    </label>

                    {refDataset && refDataset.sheets.length > 1 && (
                      <div className="space-y-1">
                        <span className="text-[11px] text-slate-400">Choose Sheet:</span>
                        <select
                          value={refSheetName}
                          onChange={(e) => {
                            setRefSheetName(e.target.value);
                            setRefSelectedCols([]);
                          }}
                          className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-xs text-white"
                        >
                          {refDataset.sheets.map((s) => (
                            <option key={s.name} value={s.name}>
                              {s.name} ({s.rowCount.toLocaleString()} rows)
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <span className="text-[11px] text-slate-400">Relevant Reference Columns:</span>
                      <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-2 rounded-lg bg-slate-950/60 border border-slate-800">
                        {activeRefSheet.headers.map((h) => {
                          const isSelected = refSelectedCols.includes(h);
                          return (
                            <button
                              key={h}
                              type="button"
                              onClick={() => {
                                setRefSelectedCols((prev) =>
                                  isSelected ? prev.filter((c) => c !== h) : [...prev, h]
                                );
                              }}
                              className={`px-2 py-1 rounded text-xs transition-colors font-mono ${
                                isSelected
                                  ? "bg-indigo-600 text-white font-medium"
                                  : "bg-slate-800 text-slate-400 hover:text-white"
                              }`}
                            >
                              {h}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Active Sheet Columns to Compare */}
                  <div className="space-y-3">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                      Active Portfolio Columns ({activeSheet.name})
                    </label>
                    <div className="space-y-1.5">
                      <span className="text-[11px] text-slate-400">Relevant Portfolio Columns:</span>
                      <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-2 rounded-lg bg-slate-950/60 border border-slate-800">
                        {activeSheet.headers.map((h) => {
                          const isSelected = activeSelectedCols.includes(h);
                          return (
                            <button
                              key={h}
                              type="button"
                              onClick={() => {
                                setActiveSelectedCols((prev) =>
                                  isSelected ? prev.filter((c) => c !== h) : [...prev, h]
                                );
                              }}
                              className={`px-2 py-1 rounded text-xs transition-colors font-mono ${
                                isSelected
                                  ? "bg-indigo-600 text-white font-medium"
                                  : "bg-slate-800 text-slate-400 hover:text-white"
                              }`}
                            >
                              {h}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Row Scope Controls */}
                <div className="space-y-3 bg-slate-950/40 p-4 rounded-xl border border-slate-800">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                      Reference Row Scope Settings
                    </label>
                    <span className="text-xs text-slate-400">
                      Total Reference Rows: <strong className="text-white">{activeRefSheet.rowCount.toLocaleString()}</strong>
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-xs">
                    <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                      <input
                        type="radio"
                        name="rowScope"
                        checked={refRowScopeMode === "all"}
                        onChange={() => setRefRowScopeMode("all")}
                        className="text-indigo-600"
                      />
                      <span>All Rows ({activeRefSheet.rowCount.toLocaleString()})</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                      <input
                        type="radio"
                        name="rowScope"
                        checked={refRowScopeMode === "range"}
                        onChange={() => setRefRowScopeMode("range")}
                        className="text-indigo-600"
                      />
                      <span>Row Range (Indices)</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                      <input
                        type="radio"
                        name="rowScope"
                        checked={refRowScopeMode === "filter"}
                        onChange={() => setRefRowScopeMode("filter")}
                        className="text-indigo-600"
                      />
                      <span>Filter Substring</span>
                    </label>
                  </div>

                  {refRowScopeMode === "range" && (
                    <div className="flex items-center gap-3 pt-2">
                      <div className="flex items-center gap-1.5 text-xs text-slate-400">
                        <span>From Row:</span>
                        <input
                          type="number"
                          min={1}
                          max={activeRefSheet.rowCount}
                          value={refRangeStart}
                          onChange={(e) => setRefRangeStart(Number(e.target.value))}
                          className="w-20 bg-slate-800 border border-slate-700 rounded p-1 text-white text-xs"
                        />
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-slate-400">
                        <span>To Row:</span>
                        <input
                          type="number"
                          min={1}
                          max={activeRefSheet.rowCount}
                          value={refRangeEnd}
                          onChange={(e) => setRefRangeEnd(Number(e.target.value))}
                          className="w-20 bg-slate-800 border border-slate-700 rounded p-1 text-white text-xs"
                        />
                      </div>
                    </div>
                  )}

                  {refRowScopeMode === "filter" && (
                    <div className="flex items-center gap-3 pt-2">
                      <select
                        value={refFilterCol}
                        onChange={(e) => setRefFilterCol(e.target.value)}
                        className="bg-slate-800 border border-slate-700 rounded p-1 text-white text-xs"
                      >
                        {activeRefSheet.headers.map((h) => (
                          <option key={h} value={h}>
                            {h}
                          </option>
                        ))}
                      </select>
                      <input
                        type="text"
                        placeholder="Contains text..."
                        value={refFilterVal}
                        onChange={(e) => setRefFilterVal(e.target.value)}
                        className="bg-slate-800 border border-slate-700 rounded p-1 text-white text-xs w-48"
                      />
                    </div>
                  )}
                </div>

                {/* 5-Row Data Preview */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Reference Data Preview (First 5 Rows)
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Actual values preserved with leading zeros
                    </span>
                  </div>

                  <div className="overflow-x-auto max-h-48 rounded-xl border border-slate-800">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-950 text-slate-400 sticky top-0">
                        <tr>
                          {refSelectedCols.map((col) => (
                            <th key={col} className="p-2 font-mono">
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/80 text-slate-300">
                        {activeRefSheet.rows.slice(0, 5).map((row, rIdx) => (
                          <tr key={rIdx} className="hover:bg-slate-900/50">
                            {refSelectedCols.map((col) => (
                              <td key={col} className="p-2 font-mono text-slate-200">
                                {row[col] !== null && row[col] !== undefined
                                  ? String(row[col])
                                  : "null"}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* User Prompt / Intent Description */}
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    Validation Request Description
                  </label>
                  <textarea
                    rows={3}
                    value={refUserPrompt}
                    onChange={(e) => setRefUserPrompt(e.target.value)}
                    placeholder="Describe what you want checked (e.g. Verify sanction amount equality, check for missing accounts, reconcile fees)..."
                    className="w-full bg-slate-950/80 border border-slate-700 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                {/* Action: Prepare Request */}
                <div className="flex items-center justify-end pt-2">
                  <Button
                    onClick={handlePrepareRefPayload}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs gap-2 px-5"
                  >
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    Prepare Request
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* REQUEST PREPARED SUMMARY CARD */}
          {refPreparedPayload && (
            <div className="bg-slate-900 border border-emerald-500/30 rounded-2xl p-6 shadow-sm space-y-4 animate-in fade-in duration-200">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <span>Request Prepared</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-400 border border-slate-700">
                        Ready for AI Pipeline
                      </span>
                    </h3>
                    <p className="text-xs text-slate-400">
                      Payload specification synthesized locally. No LLM request sent.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopyJson(refPreparedPayload)}
                    className="border-slate-700 text-xs text-slate-300 hover:bg-slate-800"
                  >
                    <Copy className="w-3.5 h-3.5 mr-1.5" />
                    Copy Payload
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      handleDownloadJson(
                        refPreparedPayload,
                        `Reference_Excel_Request_${refPreparedPayload.referenceDataset.fileName}.json`
                      )
                    }
                    className="border-slate-700 text-xs text-slate-300 hover:bg-slate-800"
                  >
                    <Download className="w-3.5 h-3.5 mr-1.5" />
                    Download JSON
                  </Button>
                </div>
              </div>

              {/* Summary Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-800/40 p-3 rounded-xl border border-slate-700/60">
                  <span className="text-[11px] text-slate-400">Operation</span>
                  <div className="text-xs font-mono font-bold text-indigo-400 mt-1">
                    reference_excel_comparison
                  </div>
                </div>
                <div className="bg-slate-800/40 p-3 rounded-xl border border-slate-700/60">
                  <span className="text-[11px] text-slate-400">Active Scope</span>
                  <div className="text-xs font-bold text-white mt-1">
                    {refPreparedPayload.activeDataset.sourceRowCount.toLocaleString()} rows &bull;{" "}
                    {refPreparedPayload.activeDataset.selectedColumns.length} cols
                  </div>
                </div>
                <div className="bg-slate-800/40 p-3 rounded-xl border border-slate-700/60">
                  <span className="text-[11px] text-slate-400">Reference Scope</span>
                  <div className="text-xs font-bold text-white mt-1">
                    {refPreparedPayload.referenceDataset.selectedRowCount.toLocaleString()} rows &bull;{" "}
                    {refPreparedPayload.referenceDataset.selectedColumns.length} cols
                  </div>
                </div>
                <div className="bg-slate-800/40 p-3 rounded-xl border border-slate-700/60">
                  <span className="text-[11px] text-slate-400">Example Rows</span>
                  <div className="text-xs font-bold text-emerald-400 mt-1">
                    5 rows per source
                  </div>
                </div>
              </div>

              {/* Collapsible JSON Preview */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setRefShowJson((prev) => !prev)}
                  className="text-xs font-semibold text-slate-400 hover:text-white flex items-center gap-1.5"
                >
                  <Code2 className="w-4 h-4 text-indigo-400" />
                  <span>{refShowJson ? "Hide JSON Payload Preview" : "View JSON Payload Preview"}</span>
                  {refShowJson ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>

                {refShowJson && (
                  <pre className="mt-3 p-4 bg-slate-950 border border-slate-800 rounded-xl text-[11px] font-mono text-slate-300 max-h-80 overflow-y-auto leading-relaxed">
                    {JSON.stringify(refPreparedPayload, null, 2)}
                  </pre>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          MODE 2: DOCUMENT RULES (PREPARE REQUEST ONLY)
         ========================================================================= */}
      {activeMode === "document-rules" && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
            <div className="space-y-1">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-purple-400" />
                Step 1: Upload Policy Document or Rulebook
              </h2>
              <p className="text-xs text-slate-400">
                Upload a credit policy, underwriting standard, or compliance document. Supported formats:
              </p>
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                {SUPPORTED_DOC_EXTENSIONS.map((ext) => (
                  <span
                    key={ext}
                    className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-700"
                  >
                    .{ext}
                  </span>
                ))}
              </div>
            </div>

            {/* Hidden Document File Input */}
            <input
              type="file"
              ref={docFileInputRef}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleUploadDocFile(f);
              }}
              accept=".txt,.md,.markdown,.json,.csv,.tsv,.html,.htm,.xml,.pdf"
              className="hidden"
            />

            {!docFile ? (
              <div
                onClick={() => docFileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-700 hover:border-purple-500/60 rounded-2xl p-8 text-center cursor-pointer transition-all bg-slate-950/40 hover:bg-slate-900/60 space-y-3"
              >
                <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center mx-auto">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <div className="text-sm font-semibold text-white">
                    Click to browse or drop policy document
                  </div>
                  <p className="text-xs text-slate-400">
                    Local text extraction preserves headings, sections, and page references
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white">{docFile.name}</div>
                    <div className="text-xs text-slate-400">
                      {formatBytes(docFile.size)} &bull; {docExtractResult?.wordCount?.toLocaleString() || 0} words
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => docFileInputRef.current?.click()}
                    className="text-xs text-slate-300 hover:text-white"
                  >
                    Change Document
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setDocFile(null);
                      setDocExtractResult(null);
                      setDocPreparedPayload(null);
                    }}
                    className="text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                  >
                    Remove
                  </Button>
                </div>
              </div>
            )}

            {/* Error or Scanned Document Warning */}
            {docExtractResult && !docExtractResult.success && (
              <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-4 flex items-start gap-3 text-rose-300 text-xs">
                <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-rose-400" />
                <div className="space-y-1">
                  <strong className="text-sm font-bold text-white">Extraction Blocked</strong>
                  <p className="leading-relaxed">{docExtractResult.error}</p>
                </div>
              </div>
            )}

            {/* Document Extraction Preview */}
            {docExtractResult && docExtractResult.success && (
              <div className="space-y-6 pt-4 border-t border-slate-800/80">
                {/* Warning if over character limit */}
                {docExtractResult.warning && (
                  <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex items-start gap-3 text-amber-300 text-xs">
                    <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-amber-400" />
                    <div className="space-y-1">
                      <strong className="text-sm font-bold text-white">Document Exceeds Preparation Limit</strong>
                      <p className="leading-relaxed">{docExtractResult.warning}</p>
                    </div>
                  </div>
                )}

                {/* Section Selection Checklist */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                      Extracted Document Sections ({docExtractResult.sections.length})
                    </label>
                    <span className="text-xs text-slate-400">
                      Selected: <strong className="text-white">{docSelectedSections.length}</strong> of {docExtractResult.sections.length} sections
                    </span>
                  </div>

                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {docExtractResult.sections.map((sec, idx) => {
                      const isSelected = docSelectedSections.includes(idx);
                      return (
                        <div
                          key={idx}
                          onClick={() => {
                            setDocSelectedSections((prev) =>
                              isSelected ? prev.filter((i) => i !== idx) : [...prev, idx]
                            );
                          }}
                          className={`p-3 rounded-xl border text-xs cursor-pointer transition-colors ${
                            isSelected
                              ? "bg-purple-950/30 border-purple-500/40 text-slate-200"
                              : "bg-slate-950/60 border-slate-800 text-slate-400 hover:bg-slate-900"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <strong className="text-white flex items-center gap-2">
                              <span
                                className={`w-4 h-4 rounded flex items-center justify-center text-[10px] ${
                                  isSelected ? "bg-purple-600 text-white" : "border border-slate-700"
                                }`}
                              >
                                {isSelected ? "✓" : ""}
                              </span>
                              {sec.heading || `Section ${idx + 1}`}
                            </strong>
                            <span className="text-[10px] text-slate-500">
                              {sec.characterCount.toLocaleString()} chars
                            </span>
                          </div>
                          <p className="line-clamp-2 text-slate-400 text-[11px] leading-relaxed">
                            {sec.content}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* User Prompt / Intent Description */}
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    Rule Extraction Request Description
                  </label>
                  <textarea
                    rows={3}
                    value={docUserPrompt}
                    onChange={(e) => setDocUserPrompt(e.target.value)}
                    placeholder="Describe the rules to extract (e.g. Find credit score minimums, max loan-to-value caps, branch approval thresholds)..."
                    className="w-full bg-slate-950/80 border border-slate-700 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </div>

                {/* Action: Prepare Request */}
                <div className="flex items-center justify-end pt-2">
                  <Button
                    onClick={handlePrepareDocPayload}
                    className="bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs gap-2 px-5"
                  >
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    Prepare Request
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* REQUEST PREPARED SUMMARY CARD */}
          {docPreparedPayload && (
            <div className="bg-slate-900 border border-emerald-500/30 rounded-2xl p-6 shadow-sm space-y-4 animate-in fade-in duration-200">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <span>Request Prepared</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-400 border border-slate-700">
                        Ready for Rule Extraction
                      </span>
                    </h3>
                    <p className="text-xs text-slate-400">
                      Document specification compiled locally. No LLM request sent.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopyJson(docPreparedPayload)}
                    className="border-slate-700 text-xs text-slate-300 hover:bg-slate-800"
                  >
                    <Copy className="w-3.5 h-3.5 mr-1.5" />
                    Copy Payload
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      handleDownloadJson(
                        docPreparedPayload,
                        `Document_Rules_Request_${docPreparedPayload.documentMetadata.fileName}.json`
                      )
                    }
                    className="border-slate-700 text-xs text-slate-300 hover:bg-slate-800"
                  >
                    <Download className="w-3.5 h-3.5 mr-1.5" />
                    Download JSON
                  </Button>
                </div>
              </div>

              {/* Summary Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-800/40 p-3 rounded-xl border border-slate-700/60">
                  <span className="text-[11px] text-slate-400">Operation</span>
                  <div className="text-xs font-mono font-bold text-purple-400 mt-1">
                    document_rules_extraction
                  </div>
                </div>
                <div className="bg-slate-800/40 p-3 rounded-xl border border-slate-700/60">
                  <span className="text-[11px] text-slate-400">Selected Sections</span>
                  <div className="text-xs font-bold text-white mt-1">
                    {docPreparedPayload.extractedContent.sections.length} sections
                  </div>
                </div>
                <div className="bg-slate-800/40 p-3 rounded-xl border border-slate-700/60">
                  <span className="text-[11px] text-slate-400">Words / Chars</span>
                  <div className="text-xs font-bold text-white mt-1">
                    {docPreparedPayload.documentMetadata.wordCount.toLocaleString()} words &bull;{" "}
                    {docPreparedPayload.documentMetadata.characterCount.toLocaleString()} chars
                  </div>
                </div>
                <div className="bg-slate-800/40 p-3 rounded-xl border border-slate-700/60">
                  <span className="text-[11px] text-slate-400">Target Schema</span>
                  <div className="text-xs font-bold text-emerald-400 mt-1">
                    {docPreparedPayload.targetDatasetContext.availableColumns.length} columns defined
                  </div>
                </div>
              </div>

              {/* Collapsible JSON Preview */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setDocShowJson((prev) => !prev)}
                  className="text-xs font-semibold text-slate-400 hover:text-white flex items-center gap-1.5"
                >
                  <Code2 className="w-4 h-4 text-purple-400" />
                  <span>{docShowJson ? "Hide JSON Payload Preview" : "View JSON Payload Preview"}</span>
                  {docShowJson ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>

                {docShowJson && (
                  <pre className="mt-3 p-4 bg-slate-950 border border-slate-800 rounded-xl text-[11px] font-mono text-slate-300 max-h-80 overflow-y-auto leading-relaxed">
                    {JSON.stringify(docPreparedPayload, null, 2)}
                  </pre>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
