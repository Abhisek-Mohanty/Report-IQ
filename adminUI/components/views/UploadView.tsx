import React, { useState, useRef } from "react";
import { useAnalyticsStore } from "@/store/useAnalyticsStore";
import { parseExcelFile, parseCsvFile } from "@/utils/excelParser";
import { formatBytes } from "@/lib/utils";
import { toast } from "@/components/ui/toast";
import { motion, AnimatePresence } from "framer-motion";
import { 
  UploadCloud, 
  FileSpreadsheet, 
  FileCheck, 
  Trash2, 
  Layers, 
  Database,
  ArrowRight,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";

export function UploadView() {
  const datasets = useAnalyticsStore((state) => state.datasets);
  const addDataset = useAnalyticsStore((state) => state.addDataset);
  const removeDataset = useAnalyticsStore((state) => state.removeDataset);
  const selectDataset = useAnalyticsStore((state) => state.selectDataset);
  const selectedDatasetId = useAnalyticsStore((state) => state.selectedDatasetId);
  const setActiveTab = useAnalyticsStore((state) => state.setActiveTab);

  const [isDragging, setIsDragging] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<Record<string, number>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = async (file: File) => {
    const fileId = Math.random().toString(36).substring(2, 9);
    
    // Check file extension
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext !== "xlsx" && ext !== "xls" && ext !== "csv") {
      toast.error(`Unsupported file type: .${ext}. Please upload .xlsx, .xls or .csv`);
      return;
    }

    // Set progress to 10%
    setUploadingFiles((prev) => ({ ...prev, [fileId]: 10 }));
    
    try {
      let parsedDataset;

      if (ext === "csv") {
        const text = await file.text();
        setUploadingFiles((prev) => ({ ...prev, [fileId]: 50 }));
        parsedDataset = await parseCsvFile(file, text);
      } else {
        const buffer = await file.arrayBuffer();
        setUploadingFiles((prev) => ({ ...prev, [fileId]: 50 }));
        parsedDataset = await parseExcelFile(file, buffer);
      }
      console.log(parsedDataset);
      

      setUploadingFiles((prev) => ({ ...prev, [fileId]: 90 }));
      
      // Delay slightly for visual feedback
      await new Promise((resolve) => setTimeout(resolve, 300));
      
      addDataset(parsedDataset);
      toast.success(`Successfully uploaded ${file.name}`);
    } catch (error: any) {
      console.error(error);
      toast.error(`Error parsing ${file.name}: ${error.message || "Invalid spreadsheet structure."}`);
    } finally {
      setUploadingFiles((prev) => {
        const copy = { ...prev };
        delete copy[fileId];
        return copy;
      });
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;

    for (const file of files) {
      await processFile(file);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length === 0) return;

    for (const file of files) {
      await processFile(file);
    }
  };

  return (
    <div className="flex-1 flex flex-col md:flex-row gap-6 min-h-0 overflow-y-auto">
      {/* Upload Zone & Guide */}
      <div className="flex-1 flex flex-col gap-5 min-w-0">
        <h2 className="font-display font-bold text-2xl text-foreground">Upload Datasets</h2>
        
        {/* Drag and Drop Box */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`flex-1 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center p-8 text-center cursor-pointer transition-all duration-300 relative overflow-hidden group min-h-[300px] ${
            isDragging
              ? "border-primary bg-primary/5 ring-4 ring-primary/10"
              : "border-border bg-card/45 hover:border-primary/50 hover:bg-card"
          }`}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            multiple
            accept=".xlsx,.xls,.csv"
            className="hidden"
          />

          <motion.div
            animate={isDragging ? { y: -5 } : { y: 0 }}
            className={`h-16 w-16 rounded-2xl flex items-center justify-center mb-4 transition-all duration-300 ${
              isDragging ? "bg-primary text-primary-foreground" : "bg-accent text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
            }`}
          >
            <UploadCloud className="h-8 w-8" />
          </motion.div>

          <h3 className="font-display font-semibold text-base text-foreground mb-1">
            Drag & Drop Spreadsheets Here
          </h3>
          <p className="text-xs text-muted-foreground max-w-sm mb-4 leading-normal font-medium">
            Drag Excel (.xlsx, .xls) or CSV files directly onto this zone, or click to browse files from your computer.
          </p>

          <div className="flex items-center gap-4 text-[10px] text-muted-foreground font-semibold bg-accent/40 px-3.5 py-1.5 rounded-full border border-border">
            <span>MAX SIZE: 50MB</span>
            <span className="w-1.5 h-1.5 rounded-full bg-border" />
            <span>100% PRIVATE</span>
          </div>

          {/* Animated uploading state overlays */}
          {Object.keys(uploadingFiles).length > 0 && (
            <div className="absolute inset-0 bg-background/90 backdrop-blur-sm flex flex-col items-center justify-center p-6 z-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
              <div className="text-sm font-semibold">Parsing Spreadsheet Data...</div>
              <div className="text-xs text-muted-foreground mt-1">This runs locally in your browser memory.</div>
            </div>
          )}
        </div>
      </div>

      {/* Uploaded Files Sidebar List */}
      <div className="w-full md:w-80 shrink-0 flex flex-col min-h-0 bg-card border border-border rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between border-b border-border pb-4 mb-4">
          <h3 className="font-display font-semibold text-sm text-foreground flex items-center gap-2">
            <Database className="h-4 w-4 text-primary" />
            <span>Loaded Datasets</span>
          </h3>
          <span className="text-xs text-muted-foreground font-semibold bg-accent px-2 py-0.5 rounded-full">
            {datasets.length}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          <AnimatePresence initial={false}>
            {datasets.length === 0 ? (
              <div className="h-40 flex flex-col items-center justify-center text-center text-muted-foreground p-4">
                <FileSpreadsheet className="h-8 w-8 opacity-45 mb-2" />
                <span className="text-xs font-medium">No files uploaded yet. Drop a file to get started.</span>
              </div>
            ) : (
              datasets.map((dataset) => {
                const isSelected = selectedDatasetId === dataset.id;
                const activeSheet = dataset.sheets[0]; // Primary Preview

                return (
                  <motion.div
                    key={dataset.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className={`p-3.5 rounded-xl border transition-all duration-200 relative group cursor-pointer ${
                      isSelected
                        ? "border-primary/45 bg-primary/5"
                        : "border-border bg-accent/20 hover:bg-accent/40"
                    }`}
                    onClick={() => selectDataset(dataset.id)}
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <FileCheck className={`h-4 w-4 shrink-0 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                        <span className="text-xs font-semibold truncate text-foreground">{dataset.name}</span>
                      </div>
                      
                      {/* Delete */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeDataset(dataset.id);
                          toast.info(`Removed ${dataset.name}`);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-accent text-danger hover:text-danger/90 transition-all shrink-0"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {/* Meta stats */}
                    <div className="grid grid-cols-2 gap-2 text-[10px] text-muted-foreground font-semibold">
                      <div>Size: <span className="text-foreground">{formatBytes(dataset.size)}</span></div>
                      <div className="flex items-center gap-1">
                        <Layers className="h-3 w-3 shrink-0" />
                        <span>Sheets: <span className="text-foreground">{dataset.sheets.length}</span></span>
                      </div>
                      {activeSheet && (
                        <>
                          <div>Rows: <span className="text-foreground">{activeSheet.rowCount.toLocaleString()}</span></div>
                          <div>Cols: <span className="text-foreground">{activeSheet.columnCount}</span></div>
                        </>
                      )}
                    </div>

                    {/* Quick Link to Preview */}
                    {isSelected && (
                      <Button
                        size="sm"
                        className="w-full mt-3 h-7 text-[10px] gap-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveTab("datasets");
                        }}
                      >
                        <span>Analyze Dataset</span>
                        <ArrowRight className="h-3 w-3" />
                      </Button>
                    )}
                  </motion.div>
                );
              })
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
