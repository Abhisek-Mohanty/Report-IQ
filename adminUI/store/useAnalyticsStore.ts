import { create } from "zustand";
import { Dataset, SheetData, ChartConfig, FilterGroup } from "@/types";

interface AnalyticsState {
  datasets: Dataset[];
  selectedDatasetId: string | null;
  selectedSheetName: string | null;
  activeTab: string;
  theme: "light" | "dark";
  charts: ChartConfig[];
  queryGroup: FilterGroup;

  // Actions
  setDatasets: (datasets: Dataset[]) => void;
  addDataset: (dataset: Dataset) => void;
  removeDataset: (id: string) => void;
  selectDataset: (id: string | null) => void;
  selectSheet: (name: string | null) => void;
  setActiveTab: (tab: string) => void;
  toggleTheme: () => void;
  setTheme: (theme: "light" | "dark") => void;

  // Sheet updates (for Cleaning operations)
  updateActiveSheetData: (updatedSheet: SheetData) => void;

  // Charts
  addChart: (chart: ChartConfig) => void;
  removeChart: (id: string) => void;
  updateCharts: (charts: ChartConfig[]) => void;

  // Query Builder
  setQueryGroup: (group: FilterGroup) => void;
  resetQueryGroup: () => void;
}

const initialQueryGroup = (): FilterGroup => ({
  id: "root",
  conjunction: "AND",
  rules: [],
});

export const useAnalyticsStore = create<AnalyticsState>((set) => ({
  datasets: [],
  selectedDatasetId: null,
  selectedSheetName: null,
  activeTab: "upload",
  theme: "dark", // default to dark theme for premium styling
  charts: [],
  queryGroup: initialQueryGroup(),

  setDatasets: (datasets) => set({ datasets }),

  addDataset: (dataset) => set((state) => {
    const updated = [...state.datasets, dataset];
    const nextDatasetId = state.selectedDatasetId || dataset.id;
    const nextSheetName = state.selectedDatasetId
      ? state.selectedSheetName
      : (dataset.sheets[0]?.name || null);

    return {
      datasets: updated,
      selectedDatasetId: nextDatasetId,
      selectedSheetName: nextSheetName,
    };
  }),

  removeDataset: (id) => set((state) => {
    const updated = state.datasets.filter((d) => d.id !== id);
    const wasSelected = state.selectedDatasetId === id;
    const nextDataset = wasSelected ? (updated[0] || null) : null;
    return {
      datasets: updated,
      selectedDatasetId: nextDataset ? nextDataset.id : null,
      selectedSheetName: nextDataset ? (nextDataset.sheets[0]?.name || null) : null,
    };
  }),

  selectDataset: (id) => set((state) => {
    const dataset = state.datasets.find((d) => d.id === id);
    return {
      selectedDatasetId: id,
      selectedSheetName: dataset ? (dataset.sheets[0]?.name || null) : null,
    };
  }),

  selectSheet: (name) => set({ selectedSheetName: name }),

  setActiveTab: (tab) => set({ activeTab: tab }),

  toggleTheme: () => set((state) => {
    const nextTheme = state.theme === "light" ? "dark" : "light";
    if (typeof window !== "undefined") {
      const root = window.document.documentElement;
      root.classList.remove("light", "dark");
      root.classList.add(nextTheme);
    }
    return { theme: nextTheme };
  }),

  setTheme: (theme) => set(() => {
    if (typeof window !== "undefined") {
      const root = window.document.documentElement;
      root.classList.remove("light", "dark");
      root.classList.add(theme);
    }
    return { theme };
  }),

  updateActiveSheetData: (updatedSheet) => set((state) => {
    if (!state.selectedDatasetId) return {};

    const updatedDatasets = state.datasets.map((dataset) => {
      if (dataset.id !== state.selectedDatasetId) return dataset;

      const targetSheetName = state.selectedSheetName || updatedSheet.name || dataset.sheets[0]?.name;

      const updatedSheets = dataset.sheets.map((sheet) => {
        if (sheet.name !== targetSheetName) return sheet;
        return updatedSheet;
      });

      return {
        ...dataset,
        sheets: updatedSheets,
      };
    });

    return { datasets: updatedDatasets };
  }),

  addChart: (chart) => set((state) => ({ charts: [...state.charts, chart] })),
  removeChart: (id) => set((state) => ({ charts: state.charts.filter((c) => c.id !== id) })),
  updateCharts: (charts) => set({ charts }),

  setQueryGroup: (queryGroup) => set({ queryGroup }),
  resetQueryGroup: () => set({ queryGroup: initialQueryGroup() }),
}));
