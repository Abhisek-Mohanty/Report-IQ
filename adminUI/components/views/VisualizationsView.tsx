import React, { useState, useMemo, useRef } from "react";
import { useAnalyticsStore } from "@/store/useAnalyticsStore";
import { toast } from "@/components/ui/toast";
import { 
  BarChart3, 
  LineChart as LineIcon, 
  PieChart as PieIcon, 
  AreaChart as AreaIcon, 
  ScatterChart as ScatterIcon,
  Download, 
  Maximize2, 
  Minimize2,
  Table,
  Check,
  TrendingUp
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from "recharts";

const CHART_TYPES = [
  { id: "bar", name: "Bar Chart", icon: BarChart3 },
  { id: "line", name: "Line Chart", icon: LineIcon },
  { id: "pie", name: "Pie Chart", icon: PieIcon },
  { id: "doughnut", name: "Doughnut", icon: PieIcon },
  { id: "area", name: "Area Chart", icon: AreaIcon },
  { id: "scatter", name: "Scatter Plot", icon: ScatterIcon },
];

const COLORS = [
  "#6366f1", "#10b981", "#3b82f6", "#f59e0b", "#ef4444", 
  "#8b5cf6", "#ec4899", "#14b8a6", "#f97316", "#06b6d4"
];

export function VisualizationsView() {
  const datasets = useAnalyticsStore((state) => state.datasets);
  const selectedDatasetId = useAnalyticsStore((state) => state.selectedDatasetId);
  const selectedSheetName = useAnalyticsStore((state) => state.selectedSheetName);
  const setActiveTab = useAnalyticsStore((state) => state.setActiveTab);

  // Active dataset & sheet
  const activeDataset = useMemo(() => {
    return datasets.find((d) => d.id === selectedDatasetId) || null;
  }, [datasets, selectedDatasetId]);

  const activeSheet = useMemo(() => {
    if (!activeDataset || !selectedSheetName) return null;
    return activeDataset.sheets.find((s) => s.name === selectedSheetName) || activeDataset.sheets[0] || null;
  }, [activeDataset, selectedSheetName]);

  // Chart configuration state
  const [chartType, setChartType] = useState<"bar" | "line" | "pie" | "doughnut" | "area" | "scatter">("bar");
  const [xAxisCol, setXAxisCol] = useState("");
  const [yAxisCol, setYAxisCol] = useState("");
  const [aggregateFunc, setAggregateFunc] = useState<"sum" | "avg" | "count" | "none">("sum");
  const [chartTitle, setChartTitle] = useState("Analytics Visualization");

  const [isFullscreen, setIsFullscreen] = useState(false);
  const chartRef = useRef<HTMLDivElement>(null);

  // Auto-detect columns
  const columns = useMemo(() => {
    if (!activeSheet) return { numeric: [], category: [], all: [] };
    const numeric: string[] = [];
    const category: string[] = [];

    activeSheet.headers.forEach((h) => {
      const type = activeSheet.columnTypes[h];
      if (type === "number") {
        numeric.push(h);
      } else {
        category.push(h);
      }
    });

    return { numeric, category, all: activeSheet.headers };
  }, [activeSheet]);

  // Reset defaults when dataset/sheet changes
  React.useEffect(() => {
    if (activeSheet) {
      const cats = columns.category;
      const nums = columns.numeric;

      setXAxisCol(cats[0] || activeSheet.headers[0] || "");
      setYAxisCol(nums[0] || activeSheet.headers[0] || "");
      setChartTitle(`${activeSheet.name} - Analysis`);
    }
  }, [activeSheet, columns]);

  // Aggregate Data for Recharts
  const chartData = useMemo(() => {
    if (!activeSheet || !xAxisCol || !yAxisCol) return [];

    const rawRows = activeSheet.rows;

    if (aggregateFunc === "none" || chartType === "scatter") {
      // Direct raw preview of first 50 records
      return rawRows.slice(0, 50).map((row) => ({
        name: String(row[xAxisCol] ?? "NULL").substring(0, 15),
        value: Number(row[yAxisCol] ?? 0),
      }));
    }

    // Group & Aggregate
    const groups: Record<string, number[]> = {};
    rawRows.forEach((row) => {
      const key = String(row[xAxisCol] ?? "NULL");
      const val = Number(row[yAxisCol] ?? 0);
      if (!groups[key]) groups[key] = [];
      groups[key].push(val);
    });

    const aggregated = Object.entries(groups).map(([key, vals]) => {
      let finalVal = 0;
      if (aggregateFunc === "sum") {
        finalVal = vals.reduce((a, b) => a + b, 0);
      } else if (aggregateFunc === "avg") {
        finalVal = vals.reduce((a, b) => a + b, 0) / vals.length;
      } else if (aggregateFunc === "count") {
        finalVal = vals.length;
      }
      return {
        name: key.substring(0, 18),
        value: parseFloat(finalVal.toFixed(2)),
      };
    });

    // Sort by value descending and show top 10, group remainder under "Others"
    aggregated.sort((a, b) => b.value - a.value);
    
    if (aggregated.length > 10) {
      const top10 = aggregated.slice(0, 10);
      const remaining = aggregated.slice(10);
      const othersVal = remaining.reduce((sum, item) => sum + item.value, 0);
      
      top10.push({
        name: "Others",
        value: parseFloat(othersVal.toFixed(2)),
      });
      return top10;
    }

    return aggregated;
  }, [activeSheet, xAxisCol, yAxisCol, aggregateFunc, chartType]);

  // Export SVG handler
  const handleExportSvg = () => {
    if (!chartRef.current) return;
    try {
      const svgElement = chartRef.current.querySelector("svg");
      if (!svgElement) {
        toast.error("SVG chart elements not found");
        return;
      }

      // Clone and serialize
      const svgClone = svgElement.cloneNode(true) as SVGElement;
      svgClone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
      
      // Inject backgrounds for dark mode compatibility in standalone downloads
      const style = document.createElement("style");
      style.textContent = `
        svg { background-color: #111827; color: #f8fafc; font-family: sans-serif; }
        .recharts-text { fill: #9ca3af; }
        .recharts-cartesian-grid-horizontal line, .recharts-cartesian-grid-vertical line { stroke: #1f2937; }
      `;
      svgClone.appendChild(style);

      const serializer = new XMLSerializer();
      const svgString = serializer.serializeToString(svgClone);
      
      const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement("a");
      link.href = url;
      link.download = `${chartTitle.replace(/\s+/g, "_")}.svg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success("Chart exported as SVG!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to export SVG");
    }
  };

  // Export PNG handler
  const handleExportPng = () => {
    if (!chartRef.current) return;
    try {
      const svgElement = chartRef.current.querySelector("svg");
      if (!svgElement) {
        toast.error("SVG chart elements not found");
        return;
      }

      const svgClone = svgElement.cloneNode(true) as SVGElement;
      svgClone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
      
      const serializer = new XMLSerializer();
      const svgString = serializer.serializeToString(svgClone);
      
      const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
      const DOMURL = window.URL || window.webkitURL || window;
      const url = DOMURL.createObjectURL(svgBlob);
      
      const img = new Image();
      // Set width/height of standard canvas export
      img.width = 1000;
      img.height = 500;
      
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = 1000;
        canvas.height = 500;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          // Fill bg color
          ctx.fillStyle = "#111827"; // Dark background matching dark style
          ctx.fillRect(0, 0, 1000, 500);
          ctx.drawImage(img, 50, 25, 900, 450);
          
          const pngUrl = canvas.toDataURL("image/png");
          const link = document.createElement("a");
          link.href = pngUrl;
          link.download = `${chartTitle.replace(/\s+/g, "_")}.png`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
        DOMURL.revokeObjectURL(url);
      };
      img.src = url;
      toast.success("Chart rendering PNG export...");
    } catch (err) {
      console.error(err);
      toast.error("Failed to export PNG");
    }
  };

  if (!activeDataset || !activeSheet) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-muted-foreground bg-card border border-border rounded-2xl">
        <BarChart3 className="h-12 w-12 opacity-30 mb-3" />
        <h3 className="font-display font-semibold text-lg text-foreground mb-1">No Active Dataset</h3>
        <p className="text-xs max-w-sm mb-4">Please upload a spreadsheet file in the Upload tab before using the visualizations tool.</p>
        <Button size="sm" onClick={() => setActiveTab("upload")}>
          Go to Upload Tab
        </Button>
      </div>
    );
  }

  const renderChart = () => {
    if (chartData.length === 0) {
      return (
        <div className="h-full flex items-center justify-center text-xs text-muted-foreground font-semibold">
          Select X and Y Axis columns to generate chart.
        </div>
      );
    }

    const themeText = "#9ca3af"; // Slate 400
    const themeGrid = "rgba(75, 85, 99, 0.15)"; // borders

    switch (chartType) {
      case "bar":
        return (
          <BarChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={themeGrid} />
            <XAxis dataKey="name" stroke={themeText} tick={{ fontSize: 10 }} />
            <YAxis stroke={themeText} tick={{ fontSize: 10 }} />
            <Tooltip contentStyle={{ backgroundColor: "#111827", borderColor: "#374151", color: "#f8fafc" }} />
            <Legend />
            <Bar dataKey="value" name={yAxisCol} fill="#6366f1" radius={[4, 4, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        );
      case "line":
        return (
          <LineChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={themeGrid} />
            <XAxis dataKey="name" stroke={themeText} tick={{ fontSize: 10 }} />
            <YAxis stroke={themeText} tick={{ fontSize: 10 }} />
            <Tooltip contentStyle={{ backgroundColor: "#111827", borderColor: "#374151", color: "#f8fafc" }} />
            <Legend />
            <Line type="monotone" dataKey="value" name={yAxisCol} stroke="#6366f1" strokeWidth={2.5} activeDot={{ r: 6 }} />
          </LineChart>
        );
      case "area":
        return (
          <AreaChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={themeGrid} />
            <XAxis dataKey="name" stroke={themeText} tick={{ fontSize: 10 }} />
            <YAxis stroke={themeText} tick={{ fontSize: 10 }} />
            <Tooltip contentStyle={{ backgroundColor: "#111827", borderColor: "#374151", color: "#f8fafc" }} />
            <Legend />
            <defs>
              <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <Area type="monotone" dataKey="value" name={yAxisCol} stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#colorValue)" />
          </AreaChart>
        );
      case "pie":
      case "doughnut":
        return (
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={true}
              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              outerRadius={chartType === "doughnut" ? 110 : 120}
              innerRadius={chartType === "doughnut" ? 75 : 0}
              fill="#8884d8"
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={{ backgroundColor: "#111827", borderColor: "#374151", color: "#f8fafc" }} />
          </PieChart>
        );
      case "scatter":
        // Treat X-axis as raw numbers as well if scatter
        const scatterData = chartData.map((d) => ({
          x: isNaN(Number(d.name)) ? d.name : Number(d.name),
          y: Number(d.value),
        }));
        return (
          <ScatterChart margin={{ top: 10, right: 20, left: 10, bottom: 20 }}>
            <CartesianGrid stroke={themeGrid} />
            <XAxis type="category" dataKey="x" stroke={themeText} name={xAxisCol} tick={{ fontSize: 10 }} />
            <YAxis type="number" dataKey="y" stroke={themeText} name={yAxisCol} tick={{ fontSize: 10 }} />
            <Tooltip cursor={{ strokeDasharray: "3 3" }} />
            <Legend />
            <Scatter name={`${xAxisCol} vs ${yAxisCol}`} data={scatterData} fill="#6366f1" />
          </ScatterChart>
        );
      default:
        return null;
    }
  };

  return (
    <div className={`flex-1 flex flex-col min-h-0 gap-5 ${isFullscreen ? "fixed inset-0 bg-background z-50 p-6" : ""}`}>
      
      {/* Visualizations Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 shrink-0">
        <div>
          <h2 className="font-display font-bold text-2xl text-foreground flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary" />
            <span>Visualizations Workspace</span>
          </h2>
          <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider block mt-0.5">
            Render client-side chart widgets & export vector images
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* SVG Export */}
          <Button variant="outline" size="sm" className="h-8 gap-1 text-xs" onClick={handleExportSvg}>
            <Download className="h-3.5 w-3.5" />
            <span>Export SVG</span>
          </Button>

          {/* PNG Export */}
          <Button variant="outline" size="sm" className="h-8 gap-1 text-xs" onClick={handleExportPng}>
            <Download className="h-3.5 w-3.5" />
            <span>Export PNG</span>
          </Button>

          {/* Fullscreen toggle */}
          <Button
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => setIsFullscreen(!isFullscreen)}
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen View"}
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0">
        {/* Left config side panel */}
        {!isFullscreen && (
          <div className="w-full lg:w-72 shrink-0 bg-card border border-border rounded-xl p-5 shadow-sm space-y-4 font-semibold text-xs overflow-y-auto">
            <h3 className="font-display font-bold text-sm text-foreground border-b border-border pb-2">
              Chart Designer
            </h3>

            {/* Title */}
            <div>
              <label className="block text-muted-foreground mb-1">CHART HEADER TITLE</label>
              <input
                type="text"
                value={chartTitle}
                onChange={(e) => setChartTitle(e.target.value)}
                className="w-full bg-accent border border-border rounded-lg p-2 focus:outline-none text-foreground font-medium"
              />
            </div>

            {/* Type selector list */}
            <div>
              <label className="block text-muted-foreground mb-1.5">CHART TYPE</label>
              <div className="grid grid-cols-2 gap-2 text-[10px] font-bold">
                {CHART_TYPES.map((type) => {
                  const Icon = type.icon;
                  const isSelected = chartType === type.id;
                  return (
                    <button
                      key={type.id}
                      onClick={() => setChartType(type.id as any)}
                      className={`p-2 border rounded-lg flex flex-col items-center gap-1.5 transition-all ${
                        isSelected
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-border bg-accent/20 text-muted-foreground hover:bg-accent"
                      }`}
                    >
                      <Icon className="h-4.5 w-4.5 shrink-0" />
                      <span>{type.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Axes fields */}
            <div>
              <label className="block text-muted-foreground mb-1">X-AXIS (CATEGORIES)</label>
              <select
                value={xAxisCol}
                onChange={(e) => setXAxisCol(e.target.value)}
                className="w-full bg-accent border border-border rounded-lg p-2 focus:outline-none text-foreground font-medium"
              >
                {columns.all.map((c) => (
                  <option key={c} value={c}>
                    {c} ({columns.category.includes(c) ? "ABC" : "123"})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-muted-foreground mb-1">Y-AXIS (METRIC VALUES)</label>
              <select
                value={yAxisCol}
                onChange={(e) => setYAxisCol(e.target.value)}
                className="w-full bg-accent border border-border rounded-lg p-2 focus:outline-none text-foreground font-medium"
              >
                {columns.all.map((c) => (
                  <option key={c} value={c}>
                    {c} ({columns.numeric.includes(c) ? "123" : "ABC"})
                  </option>
                ))}
              </select>
            </div>

            {/* Group Aggregation Func */}
            {chartType !== "scatter" && (
              <div>
                <label className="block text-muted-foreground mb-1">AGGREGATION FORMULA</label>
                <select
                  value={aggregateFunc}
                  onChange={(e) => setAggregateFunc(e.target.value as any)}
                  className="w-full bg-accent border border-border rounded-lg p-2 focus:outline-none text-foreground"
                >
                  <option value="sum">SUM (Total values)</option>
                  <option value="avg">AVERAGE (Mean values)</option>
                  <option value="count">COUNT (Number of occurrences)</option>
                  <option value="none">NONE (Render first 50 rows)</option>
                </select>
              </div>
            )}

            <div className="p-3 bg-accent/40 rounded-lg text-[10px] text-muted-foreground leading-normal flex gap-1.5">
              <TrendingUp className="h-4.5 w-4.5 text-primary shrink-0" />
              <p>Top 10 values are automatically sorted and rendered. Rest are bucketed as 'Others'.</p>
            </div>
          </div>
        )}

        {/* Right chart display wrapper */}
        <div className="flex-1 bg-card border border-border rounded-xl p-5 shadow-sm flex flex-col min-h-0">
          <h3 className="font-display font-bold text-base text-foreground shrink-0 border-b border-border pb-3 mb-4 flex items-center justify-between">
            <span>{chartTitle}</span>
            <span className="text-[10px] font-semibold text-primary bg-primary/10 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              {chartType}
            </span>
          </h3>

          {/* Chart Rendering Container */}
          <div ref={chartRef} className="flex-1 w-full min-h-0 select-none">
            <ResponsiveContainer width="100%" height="100%">
              {renderChart() as React.ReactElement}
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
