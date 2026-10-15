# Report IQ - Advanced Client-Side Excel Analytics Suite

Report IQ is a high-performance, browser-only, offline-first data engineering and business intelligence workspace built with **Next.js 15**, **React 19**, and **Tailwind CSS**. 

It mirrors capabilities found in desktop software like Microsoft Power BI, Tableau, and Looker Studio—performing all data operations, parsing, cleansing, joins, partitions, and document compilation **directly in the client-side JavaScript runtime**. Zero bytes of your spreadsheets ever leave your computer.

---

## ⚡ Tech Stack

*   **Framework**: Next.js 15 (App Router), React 19, TypeScript
*   **Styling**: Tailwind CSS, Outfit & Inter typography
*   **State Management**: Zustand
*   **File Parser**: SheetJS (`xlsx`) & PapaParse
*   **Visualizations**: Recharts
*   **PDF Generator**: jsPDF & jspdf-autotable
*   **Animations**: Framer Motion

---

## 🚀 Getting Started & Local Installation

Since the local development sandbox has strict system command restrictions on Windows host machines, you should execute these setup commands directly in your **system terminal** at the workspace root folder:

### 1. Install Dependencies
Run the installation with the peer-dependency bypass flag. This is required because React 19 is newly released and third-party libraries (e.g. Recharts) are resolving their peer-deps checks:
```bash
npm install --legacy-peer-deps
```

### 2. Start the Development Server
Launch the local Next.js client compiler:
```bash
npm run dev
```

### 3. Open in Browser
Open your browser and navigate to:
```
http://localhost:3000
```

---

## 🛠️ Main Features & Workspaces

### 1. Workspace Core
*   **Dashboard View**: Displays high-level data profiling KPIs (Total Records, Quality Index, memory occupancy), catalog trees of loaded datasets, and a Quick Start checklist.
*   **Upload Zone**: Beautiful Framer-Motion drag & drop interface for `.xlsx`, `.xls`, and `.csv` files. Reads buffers asynchronously.
*   **Datasets spreadsheet**: Custom virtualized grid with column-level search, pagination, column-hiding toggles, sorting, cell double-click copy trigger, and first-column freezing.

### 2. Data Preparation Suite
*   **Merge Wizard**: Connects two datasets using Unions (Append rows) or Joins (Left Outer, Right Outer, Inner, Full Outer) matching selected key columns. Outputs can be loaded back as new spreadsheets.
*   **Split Wizard**: Partitions tables into chunks by Row count thresholds, Train/Test percentages, or Categorical value groups. Includes instant previews and Excel downloads.
*   **Data Quality & Cleaning**: Profiles columns for missing cell counts. Features tools to replace null values with Mean, Median, Mode, or custom text. Includes string converters, find & replace, and duplicate/empty rows removal.
*   **Query Builder**: Simple, powerful boolean builder matching compound queries (conjunctions: AND/OR) across multiple columns instantly.
*   **Visualizations Panel**: Integrates Recharts to render Bar, Line, Pie, Doughnut, Area, and Scatter plots. Supports SVG & PNG vector image exports.
*   **Universal Export & Report Hub**: Converts and downloads cleaned sheets into 27 industry-standard formats entirely client-side with interactive live previews before download:
    *   **Spreadsheets**: Excel Workbook (`.xlsx`), Legacy Excel (`.xls`), Excel Binary (`.xlsb`), OpenDocument (`.ods`)
    *   **Documents**: Executive PDF (`.pdf`), Microsoft Word (`.docx`), Standalone HTML (`.html`)
    *   **Flat Delimited**: CSV (`.csv`), TSV (`.tsv`), ASCII Boxed Plain Text (`.txt`)
    *   **Data & Code**: JSON (`.json`), JSON Lines (`.jsonl`), XML (`.xml`), YAML (`.yaml`), Markdown (`.md`), LaTeX Table (`.tex`)
    *   **Databases & SQL**: Dialect-Aware SQL Scripts (`.sql`), Binary SQLite 3 Database (`.sqlite`)
    *   **Big Data & Columnar**: Apache Parquet (`.parquet`), Apache Arrow (`.arrow`), Feather (`.feather`), Apache Avro (`.avro`), Apache ORC (`.orc`)
    *   **Images**: High-DPI PNG (`.png`), JPEG (`.jpg`), Scalable Vector SVG (`.svg`), Modern WebP (`.webp`)
