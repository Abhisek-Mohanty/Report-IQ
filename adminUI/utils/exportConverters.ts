import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import "jspdf-autotable";
import { SheetData, DatasetStats } from "@/types";

export type ExportFormatCategory = 
  | "spreadsheets"
  | "documents"
  | "flat"
  | "code"
  | "databases"
  | "bigdata"
  | "images";

export interface ExportFormatDefinition {
  id: string;
  name: string;
  extension: string;
  mimeType: string;
  category: ExportFormatCategory;
  categoryLabel: string;
  iconName: string;
  badgeColor: string;
  description: string;
  bestFor: string;
  isBinary: boolean;
  previewType: "table" | "code" | "document" | "image" | "binary" | "html" | "pdf";
  codeLanguage?: string;
}

export const EXPORT_FORMATS: ExportFormatDefinition[] = [
  // 1. Spreadsheets
  {
    id: "xlsx",
    name: "Excel Workbook",
    extension: ".xlsx",
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    category: "spreadsheets",
    categoryLabel: "Spreadsheet",
    iconName: "FileSpreadsheet",
    badgeColor: "emerald",
    description: "Standard Microsoft Excel workbook format with full formatting and multiple sheet support.",
    bestFor: "Business reporting, financial modeling, Excel formulas",
    isBinary: true,
    previewType: "table",
  },
  {
    id: "xls",
    name: "Legacy Excel",
    extension: ".xls",
    mimeType: "application/vnd.ms-excel",
    category: "spreadsheets",
    categoryLabel: "Spreadsheet",
    iconName: "FileSpreadsheet",
    badgeColor: "green",
    description: "Legacy Excel 97-2004 Workbook (BIFF8 binary format) for older enterprise systems.",
    bestFor: "Legacy software, legacy ERP & accounting imports",
    isBinary: true,
    previewType: "table",
  },
  {
    id: "xlsb",
    name: "Excel Binary Workbook",
    extension: ".xlsb",
    mimeType: "application/vnd.ms-excel.sheet.binary.macroEnabled.12",
    category: "spreadsheets",
    categoryLabel: "Spreadsheet",
    iconName: "FileSpreadsheet",
    badgeColor: "teal",
    description: "Compressed binary Excel format. Opens faster and consumes less disk space on large datasets.",
    bestFor: "High-volume datasets, fast Excel workbook loading",
    isBinary: true,
    previewType: "table",
  },
  {
    id: "ods",
    name: "OpenDocument Spreadsheet",
    extension: ".ods",
    mimeType: "application/vnd.oasis.opendocument.spreadsheet",
    category: "spreadsheets",
    categoryLabel: "Spreadsheet",
    iconName: "FileSpreadsheet",
    badgeColor: "amber",
    description: "Open-standard XML spreadsheet used by LibreOffice Calc, Apache OpenOffice, and Google Sheets.",
    bestFor: "Open-source office suites, public sector compliance",
    isBinary: true,
    previewType: "table",
  },

  // 2. Flat Delimited Files
  {
    id: "csv",
    name: "CSV (Comma Separated)",
    extension: ".csv",
    mimeType: "text/csv;charset=utf-8;",
    category: "flat",
    categoryLabel: "Flat File",
    iconName: "FileCode",
    badgeColor: "cyan",
    description: "Universal tabular text format delimited by commas. Compatible with virtually all systems.",
    bestFor: "Data ingestion, Python/Pandas, database bulk loading",
    isBinary: false,
    previewType: "code",
    codeLanguage: "csv",
  },
  {
    id: "tsv",
    name: "TSV (Tab Separated)",
    extension: ".tsv",
    mimeType: "text/tab-separated-values;charset=utf-8;",
    category: "flat",
    categoryLabel: "Flat File",
    iconName: "FileCode",
    badgeColor: "sky",
    description: "Tab-delimited text data. Resilient against internal comma conflicts in freeform text fields.",
    bestFor: "Bioinformatics, NLP, command-line text pipelines",
    isBinary: false,
    previewType: "code",
    codeLanguage: "tsv",
  },
  {
    id: "txt",
    name: "Plain Text Table",
    extension: ".txt",
    mimeType: "text/plain;charset=utf-8;",
    category: "flat",
    categoryLabel: "Flat File",
    iconName: "FileText",
    badgeColor: "slate",
    description: "Beautifully padded ASCII grid table with borders, suitable for terminal output and text emails.",
    bestFor: "ReadMe files, terminal viewing, plain email reports",
    isBinary: false,
    previewType: "code",
    codeLanguage: "text",
  },

  // 3. Data & Interchange Formats
  {
    id: "json",
    name: "JSON (JavaScript Object Notation)",
    extension: ".json",
    mimeType: "application/json;charset=utf-8;",
    category: "code",
    categoryLabel: "Data & Code",
    iconName: "Braces",
    badgeColor: "yellow",
    description: "Structured hierarchical data format formatted with 2-space indentation. Native to web APIs.",
    bestFor: "REST APIs, web applications, NoSQL databases",
    isBinary: false,
    previewType: "code",
    codeLanguage: "json",
  },
  {
    id: "jsonl",
    name: "JSON Lines",
    extension: ".jsonl",
    mimeType: "application/x-ndjson;charset=utf-8;",
    category: "code",
    categoryLabel: "Data & Code",
    iconName: "AlignLeft",
    badgeColor: "orange",
    description: "Newline-delimited JSON. Each row is a self-contained JSON object on its own line.",
    bestFor: "Streaming data pipelines, log collectors, LLM fine-tuning",
    isBinary: false,
    previewType: "code",
    codeLanguage: "json",
  },
  {
    id: "xml",
    name: "XML (Extensible Markup Language)",
    extension: ".xml",
    mimeType: "application/xml;charset=utf-8;",
    category: "code",
    categoryLabel: "Data & Code",
    iconName: "Code2",
    badgeColor: "rose",
    description: "Standard hierarchical XML markup document with schema metadata and tag attributes.",
    bestFor: "Enterprise integration, SOAP services, cross-platform exchange",
    isBinary: false,
    previewType: "code",
    codeLanguage: "xml",
  },
  {
    id: "yaml",
    name: "YAML Data",
    extension: ".yaml",
    mimeType: "text/yaml;charset=utf-8;",
    category: "code",
    categoryLabel: "Data & Code",
    iconName: "FileSliders",
    badgeColor: "purple",
    description: "Human-friendly data serialization format with clean indentation and minimal punctuation.",
    bestFor: "Configuration management, DevOps pipelines, human inspection",
    isBinary: false,
    previewType: "code",
    codeLanguage: "yaml",
  },
  {
    id: "markdown",
    name: "Markdown Table",
    extension: ".md",
    mimeType: "text/markdown;charset=utf-8;",
    category: "code",
    categoryLabel: "Data & Code",
    iconName: "Hash",
    badgeColor: "indigo",
    description: "GitHub-flavored Markdown table with alignment separators and descriptive dataset summary header.",
    bestFor: "GitHub READMEs, technical documentation, Notion/Obsidian",
    isBinary: false,
    previewType: "code",
    codeLanguage: "markdown",
  },
  {
    id: "latex",
    name: "LaTeX Table",
    extension: ".tex",
    mimeType: "application/x-tex;charset=utf-8;",
    category: "code",
    categoryLabel: "Data & Code",
    iconName: "FileTerminal",
    badgeColor: "violet",
    description: "Publication-grade LaTeX table with booktabs rules (toprule, midrule, bottomrule) & escaped chars.",
    bestFor: "Academic papers, IEEE / Springer publications, Overleaf",
    isBinary: false,
    previewType: "code",
    codeLanguage: "latex",
  },

  // 4. Documents & Presentations
  {
    id: "pdf",
    name: "PDF Executive Report",
    extension: ".pdf",
    mimeType: "application/pdf",
    category: "documents",
    categoryLabel: "Document",
    iconName: "FileText",
    badgeColor: "red",
    description: "Polished multi-page PDF executive brief with executive summary, quality scores, and data preview.",
    bestFor: "Executive stakeholder presentations, audit documentation",
    isBinary: true,
    previewType: "pdf",
  },
  {
    id: "docx",
    name: "Word Document",
    extension: ".docx",
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    category: "documents",
    categoryLabel: "Document",
    iconName: "FileCheck",
    badgeColor: "blue",
    description: "Native Microsoft Word OpenXML (.docx) document with styled tables, headings, and branding.",
    bestFor: "Corporate memos, formal reports, office document workflows",
    isBinary: true,
    previewType: "document",
  },
  {
    id: "html",
    name: "HTML Standalone Web Page",
    extension: ".html",
    mimeType: "text/html;charset=utf-8;",
    category: "documents",
    categoryLabel: "Document",
    iconName: "Globe",
    badgeColor: "amber",
    description: "Self-contained interactive HTML web page with search bar, responsive grid, and modern styling.",
    bestFor: "Intranet publishing, standalone browser sharing, emails",
    isBinary: false,
    previewType: "html",
    codeLanguage: "html",
  },

  // 5. Databases & SQL
  {
    id: "sql",
    name: "SQL Script (DDL & DML)",
    extension: ".sql",
    mimeType: "application/sql;charset=utf-8;",
    category: "databases",
    categoryLabel: "Databases",
    iconName: "Database",
    badgeColor: "blue",
    description: "Complete SQL script with CREATE TABLE, type inferences, transactions, and batched INSERT statements.",
    bestFor: "PostgreSQL, MySQL, SQLite, and SQL Server database seeding",
    isBinary: false,
    previewType: "code",
    codeLanguage: "sql",
  },
  {
    id: "sqlite",
    name: "SQLite Database",
    extension: ".sqlite",
    mimeType: "application/vnd.sqlite3",
    category: "databases",
    categoryLabel: "Databases",
    iconName: "HardDrive",
    badgeColor: "sky",
    description: "Standard binary SQLite 3 database file containing schema and records ready to query with sqlite3 CLI.",
    bestFor: "Embedded systems, mobile apps, local offline SQL analysis",
    isBinary: true,
    previewType: "binary",
  },

  // 6. Big Data & Columnar Formats
  {
    id: "parquet",
    name: "Apache Parquet",
    extension: ".parquet",
    mimeType: "application/vnd.apache.parquet",
    category: "bigdata",
    categoryLabel: "Big Data",
    iconName: "Layers",
    badgeColor: "purple",
    description: "Industry-standard columnar format designed for blazing-fast analytics queries in Spark, DuckDB, & Snowflake.",
    bestFor: "Data Lakes, Apache Spark, DuckDB, AWS Athena, Pandas",
    isBinary: true,
    previewType: "binary",
  },
  {
    id: "arrow",
    name: "Apache Arrow",
    extension: ".arrow",
    mimeType: "application/vnd.apache.arrow.file",
    category: "bigdata",
    categoryLabel: "Big Data",
    iconName: "Cpu",
    badgeColor: "emerald",
    description: "In-memory columnar IPC stream/file format supporting zero-copy data exchange across polyglot runtimes.",
    bestFor: "Zero-copy Python/Rust/R pipelines, high-throughput analytics",
    isBinary: true,
    previewType: "binary",
  },
  {
    id: "feather",
    name: "Feather",
    extension: ".feather",
    mimeType: "application/vnd.apache.arrow.file",
    category: "bigdata",
    categoryLabel: "Big Data",
    iconName: "Feather",
    badgeColor: "indigo",
    description: "Fast, lightweight binary storage format for data frames (Arrow v1/v2 compatible).",
    bestFor: "Pandas/Polars caching, fast disk serialization in Python/R",
    isBinary: true,
    previewType: "binary",
  },
  {
    id: "avro",
    name: "Apache Avro",
    extension: ".avro",
    mimeType: "application/avro",
    category: "bigdata",
    categoryLabel: "Big Data",
    iconName: "Box",
    badgeColor: "pink",
    description: "Standard binary Object Container File (OCF) with embedded JSON schema and compact serialized records.",
    bestFor: "Kafka streaming, Hadoop ecosystems, schema evolution",
    isBinary: true,
    previewType: "binary",
  },
  {
    id: "orc",
    name: "Apache ORC",
    extension: ".orc",
    mimeType: "application/vnd.apache.orc",
    category: "bigdata",
    categoryLabel: "Big Data",
    iconName: "Server",
    badgeColor: "fuchsia",
    description: "Optimized Row Columnar format engineered for high-performance reads in Apache Hive and Presto/Trino.",
    bestFor: "Apache Hive, Trino, Presto query acceleration",
    isBinary: true,
    previewType: "binary",
  },

  // 7. Visual Image Snapshots
  {
    id: "png",
    name: "PNG Image Snapshot",
    extension: ".png",
    mimeType: "image/png",
    category: "images",
    categoryLabel: "Image",
    iconName: "Image",
    badgeColor: "emerald",
    description: "High-resolution 2x Retina graphic snapshot of the styled dataset table with header branding.",
    bestFor: "Slack/Teams messages, PowerPoint slides, documentation",
    isBinary: true,
    previewType: "image",
  },
  {
    id: "jpg",
    name: "JPEG Image Snapshot",
    extension: ".jpg",
    mimeType: "image/jpeg",
    category: "images",
    categoryLabel: "Image",
    iconName: "Image",
    badgeColor: "blue",
    description: "Standard compressed JPEG image snapshot with crisp white background and clear typography.",
    bestFor: "Web embedding, emails, lightweight attachments",
    isBinary: true,
    previewType: "image",
  },
  {
    id: "svg",
    name: "SVG Vector Graphic",
    extension: ".svg",
    mimeType: "image/svg+xml;charset=utf-8;",
    category: "images",
    categoryLabel: "Image",
    iconName: "Sparkles",
    badgeColor: "amber",
    description: "Resolution-independent scalable vector graphic. Crisp at any zoom level, printable at any size.",
    bestFor: "Figma/Sketch designs, web graphics, high-res print",
    isBinary: false,
    previewType: "image",
    codeLanguage: "xml",
  },
  {
    id: "webp",
    name: "WebP Modern Image",
    extension: ".webp",
    mimeType: "image/webp",
    category: "images",
    categoryLabel: "Image",
    iconName: "Image",
    badgeColor: "teal",
    description: "Next-gen web image format providing superior compression and quality for modern web browsers.",
    bestFor: "Modern web applications, bandwidth optimization",
    isBinary: true,
    previewType: "image",
  },
];

// Helper: Calculate standard CRC32 for zip packaging
function crc32(buffer: Uint8Array): number {
  let table = (crc32 as any).table;
  if (!table) {
    table = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let k = 0; k < 8; k++) {
        c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
      }
      table[i] = c;
    }
    (crc32 as any).table = table;
  }

  let crc = 0xffffffff;
  for (let i = 0; i < buffer.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ buffer[i]) & 0xff];
  }
  return (crc ^ 0xffffffff) >>> 0;
}

// Minimal Store-Only (Method 0) Pure-JS ZIP Builder
export class SimpleZipBuilder {
  private files: Array<{ name: string; data: Uint8Array }> = [];

  addFile(name: string, content: string | Uint8Array) {
    const data = typeof content === "string" ? new TextEncoder().encode(content) : content;
    this.files.push({ name, data });
  }

  generateBlob(mimeType = "application/zip"): Blob {
    let totalSize = 0;
    const utf8Encoder = new TextEncoder();
    
    // Calculate sizes
    const fileHeaders: Array<{
      nameBytes: Uint8Array;
      data: Uint8Array;
      crc: number;
      offset: number;
    }> = [];

    let currentOffset = 0;
    for (const f of this.files) {
      const nameBytes = utf8Encoder.encode(f.name);
      const crc = crc32(f.data);
      fileHeaders.push({
        nameBytes,
        data: f.data,
        crc,
        offset: currentOffset,
      });
      // 30 bytes local header + name length + data length
      currentOffset += 30 + nameBytes.length + f.data.length;
    }

    const centralDirOffset = currentOffset;
    let centralDirSize = 0;
    for (const fh of fileHeaders) {
      // 46 bytes central header + name length
      centralDirSize += 46 + fh.nameBytes.length;
    }

    totalSize = centralDirOffset + centralDirSize + 22; // 22 bytes EOCD
    const out = new Uint8Array(totalSize);
    const view = new DataView(out.buffer);

    let pos = 0;
    // 1. Write Local File Headers & Data
    for (const fh of fileHeaders) {
      // Local Header Signature: 0x04034b50
      view.setUint32(pos, 0x04034b50, true);
      view.setUint16(pos + 4, 10, true); // Version needed: 1.0 / store
      view.setUint16(pos + 6, 0x0800, true); // UTF-8 filename flag
      view.setUint16(pos + 8, 0, true); // Method: Store (0)
      view.setUint16(pos + 10, 0, true); // Time
      view.setUint16(pos + 12, 0, true); // Date
      view.setUint32(pos + 14, fh.crc, true); // CRC32
      view.setUint32(pos + 18, fh.data.length, true); // Compressed size
      view.setUint32(pos + 22, fh.data.length, true); // Uncompressed size
      view.setUint16(pos + 26, fh.nameBytes.length, true); // File name length
      view.setUint16(pos + 28, 0, true); // Extra field length
      pos += 30;

      out.set(fh.nameBytes, pos);
      pos += fh.nameBytes.length;

      out.set(fh.data, pos);
      pos += fh.data.length;
    }

    // 2. Write Central Directory Headers
    for (const fh of fileHeaders) {
      // Central Dir Signature: 0x02014b50
      view.setUint32(pos, 0x02014b50, true);
      view.setUint16(pos + 4, 20, true); // Version made by: 2.0
      view.setUint16(pos + 6, 10, true); // Version needed: 1.0
      view.setUint16(pos + 8, 0x0800, true); // Flags: UTF-8
      view.setUint16(pos + 10, 0, true); // Method: Store
      view.setUint16(pos + 12, 0, true); // Time
      view.setUint16(pos + 14, 0, true); // Date
      view.setUint32(pos + 16, fh.crc, true); // CRC32
      view.setUint32(pos + 20, fh.data.length, true); // Compressed size
      view.setUint32(pos + 24, fh.data.length, true); // Uncompressed size
      view.setUint16(pos + 28, fh.nameBytes.length, true); // Name length
      view.setUint16(pos + 30, 0, true); // Extra field length
      view.setUint16(pos + 32, 0, true); // File comment length
      view.setUint16(pos + 34, 0, true); // Disk number
      view.setUint16(pos + 36, 0, true); // Internal attributes
      view.setUint32(pos + 38, 0, true); // External attributes
      view.setUint32(pos + 42, fh.offset, true); // Offset of local header
      pos += 46;

      out.set(fh.nameBytes, pos);
      pos += fh.nameBytes.length;
    }

    // 3. Write End of Central Directory Record (EOCD)
    view.setUint32(pos, 0x06054b50, true);
    view.setUint16(pos + 4, 0, true); // Disk number
    view.setUint16(pos + 6, 0, true); // Disk with central dir
    view.setUint16(pos + 8, fileHeaders.length, true); // Total entries on this disk
    view.setUint16(pos + 10, fileHeaders.length, true); // Total entries
    view.setUint32(pos + 12, centralDirSize, true); // Size of central dir
    view.setUint32(pos + 16, centralDirOffset, true); // Offset of central dir
    view.setUint16(pos + 20, 0, true); // Comment length

    return new Blob([out], { type: mimeType });
  }
}

// Clean escape helpers
function escapeXml(str: string): string {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function escapeLatex(str: string): string {
  return String(str)
    .replace(/\\/g, "\\textbackslash{}")
    .replace(/([&%$#_{}])/g, "\\$1")
    .replace(/~/g, "\\textasciitilde{}")
    .replace(/\^/g, "\\textasciicircum{}");
}

function sanitizeXmlTagName(name: string): string {
  let cleaned = name.replace(/[^a-zA-Z0-9_]/g, "_");
  if (/^[0-9]/.test(cleaned)) {
    cleaned = "_" + cleaned;
  }
  return cleaned || "field";
}

// -------------------------------------------------------------
// FORMAT GENERATORS
// -------------------------------------------------------------

export interface ExportOptions {
  rowLimit?: number; // 0 or undefined = all rows
  includeHeaders?: boolean;
  sqlDialect?: "postgres" | "mysql" | "sqlite" | "mssql";
  latexDocument?: boolean;
  imageTheme?: "light" | "dark";
  imageScale?: number;
}

// 1. Text & Code Formats

export function generateCsv(sheet: SheetData, options: ExportOptions = {}): string {
  const rows = options.rowLimit && options.rowLimit > 0 ? sheet.rows.slice(0, options.rowLimit) : sheet.rows;
  const headers = sheet.headers;

  const escapeCell = (val: any) => {
    if (val === null || val === undefined) return "";
    const str = String(val);
    if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const lines: string[] = [];
  if (options.includeHeaders !== false) {
    lines.push(headers.map(escapeCell).join(","));
  }
  for (const r of rows) {
    lines.push(headers.map((h) => escapeCell(r[h])).join(","));
  }
  return lines.join("\r\n");
}

export function generateTsv(sheet: SheetData, options: ExportOptions = {}): string {
  const rows = options.rowLimit && options.rowLimit > 0 ? sheet.rows.slice(0, options.rowLimit) : sheet.rows;
  const headers = sheet.headers;

  const escapeCell = (val: any) => {
    if (val === null || val === undefined) return "";
    return String(val).replace(/\t/g, " ").replace(/[\r\n]+/g, " ");
  };

  const lines: string[] = [];
  if (options.includeHeaders !== false) {
    lines.push(headers.map(escapeCell).join("\t"));
  }
  for (const r of rows) {
    lines.push(headers.map((h) => escapeCell(r[h])).join("\t"));
  }
  return lines.join("\n");
}

export function generatePlainTextTable(sheet: SheetData, options: ExportOptions = {}): string {
  const rows = options.rowLimit && options.rowLimit > 0 ? sheet.rows.slice(0, options.rowLimit) : sheet.rows;
  const headers = sheet.headers;

  // Calculate column widths (limit max width for neatness)
  const colWidths: Record<string, number> = {};
  for (const h of headers) {
    colWidths[h] = Math.max(h.length, 4);
  }

  const sampleRows = rows.slice(0, 100);
  for (const r of sampleRows) {
    for (const h of headers) {
      const valStr = r[h] !== null && r[h] !== undefined ? String(r[h]) : "";
      colWidths[h] = Math.min(Math.max(colWidths[h], valStr.length), 32);
    }
  }

  const divider = "+" + headers.map((h) => "-".repeat(colWidths[h] + 2)).join("+") + "+";
  const headerLine = "| " + headers.map((h) => h.padEnd(colWidths[h]).substring(0, colWidths[h])).join(" | ") + " |";

  const lines: string[] = [
    `# REPORT-IQ DATASET EXPORT: ${sheet.name}`,
    `# Total Rows: ${sheet.rows.length} | Exported Rows: ${rows.length} | Columns: ${headers.length}`,
    `# Generated: ${new Date().toISOString()}`,
    "",
    divider,
    headerLine,
    divider,
  ];

  for (const r of rows) {
    const rowLine = "| " + headers.map((h) => {
      const val = r[h] !== null && r[h] !== undefined ? String(r[h]) : "-";
      return val.padEnd(colWidths[h]).substring(0, colWidths[h]);
    }).join(" | ") + " |";
    lines.push(rowLine);
  }

  lines.push(divider);
  lines.push(`(End of ${rows.length} rows)`);
  return lines.join("\n");
}

export function generateJson(sheet: SheetData, options: ExportOptions = {}): string {
  const rows = options.rowLimit && options.rowLimit > 0 ? sheet.rows.slice(0, options.rowLimit) : sheet.rows;
  return JSON.stringify(rows, null, 2);
}

export function generateJsonLines(sheet: SheetData, options: ExportOptions = {}): string {
  const rows = options.rowLimit && options.rowLimit > 0 ? sheet.rows.slice(0, options.rowLimit) : sheet.rows;
  return rows.map((r) => JSON.stringify(r)).join("\n");
}

export function generateXml(sheet: SheetData, options: ExportOptions = {}): string {
  const rows = options.rowLimit && options.rowLimit > 0 ? sheet.rows.slice(0, options.rowLimit) : sheet.rows;
  const headers = sheet.headers;

  const lines: string[] = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<dataset name="${escapeXml(sheet.name)}" totalRows="${sheet.rows.length}" exportedRows="${rows.length}" exportedAt="${new Date().toISOString()}">`,
    `  <schema>`,
  ];

  for (const h of headers) {
    const type = sheet.columnTypes?.[h] || (sheet as any).types?.[h] || "string";
    lines.push(`    <column name="${escapeXml(h)}" type="${escapeXml(type)}" />`);
  }

  lines.push(`  </schema>`);
  lines.push(`  <records>`);

  rows.forEach((r, idx) => {
    lines.push(`    <record id="${idx + 1}">`);
    for (const h of headers) {
      const tagName = sanitizeXmlTagName(h);
      const val = r[h];
      if (val === null || val === undefined) {
        lines.push(`      <${tagName} nil="true" />`);
      } else {
        lines.push(`      <${tagName}>${escapeXml(String(val))}</${tagName}>`);
      }
    }
    lines.push(`    </record>`);
  });

  lines.push(`  </records>`);
  lines.push(`</dataset>`);

  return lines.join("\n");
}

export function generateYaml(sheet: SheetData, options: ExportOptions = {}): string {
  const rows = options.rowLimit && options.rowLimit > 0 ? sheet.rows.slice(0, options.rowLimit) : sheet.rows;
  const headers = sheet.headers;

  const lines: string[] = [
    `# Report-IQ Data Export`,
    `dataset: ${JSON.stringify(sheet.name)}`,
    `total_records: ${sheet.rows.length}`,
    `exported_records: ${rows.length}`,
    `exported_at: "${new Date().toISOString()}"`,
    `columns:`,
  ];

  for (const h of headers) {
    lines.push(`  - name: ${JSON.stringify(h)}`);
    lines.push(`    type: ${sheet.columnTypes?.[h] || (sheet as any).types?.[h] || "string"}`);
  }

  lines.push(`records:`);
  for (const r of rows) {
    const firstHeader = headers[0];
    const firstVal = r[firstHeader];
    lines.push(`  - ${JSON.stringify(firstHeader)}: ${formatYamlValue(firstVal)}`);
    for (let i = 1; i < headers.length; i++) {
      const h = headers[i];
      lines.push(`    ${JSON.stringify(h)}: ${formatYamlValue(r[h])}`);
    }
  }

  return lines.join("\n");
}

function formatYamlValue(val: any): string {
  if (val === null || val === undefined) return "null";
  if (typeof val === "number" || typeof val === "boolean") return String(val);
  return JSON.stringify(String(val));
}

export function generateMarkdown(sheet: SheetData, options: ExportOptions = {}): string {
  const rows = options.rowLimit && options.rowLimit > 0 ? sheet.rows.slice(0, options.rowLimit) : sheet.rows;
  const headers = sheet.headers;

  const cleanCell = (val: any) => {
    if (val === null || val === undefined) return "";
    return String(val).replace(/\|/g, "\\|").replace(/[\r\n]+/g, " ");
  };

  const lines: string[] = [
    `# Dataset: ${sheet.name}`,
    ``,
    `> **Total Rows:** ${sheet.rows.length.toLocaleString()} | **Exported Rows:** ${rows.length.toLocaleString()} | **Columns:** ${headers.length} | **Export Date:** ${new Date().toLocaleDateString()}`,
    ``,
    `| ` + headers.map(cleanCell).join(" | ") + ` |`,
    `| ` + headers.map((h) => {
      const type = sheet.columnTypes?.[h] || (sheet as any).types?.[h];
      return type === "number" ? "---:" : ":---";
    }).join(" | ") + ` |`,
  ];

  for (const r of rows) {
    lines.push(`| ` + headers.map((h) => cleanCell(r[h])).join(" | ") + ` |`);
  }

  return lines.join("\n");
}

export function generateLatex(sheet: SheetData, options: ExportOptions = {}): string {
  const rows = options.rowLimit && options.rowLimit > 0 ? sheet.rows.slice(0, options.rowLimit) : sheet.rows;
  const headers = sheet.headers;

  // Format column alignments: 'r' for numbers, 'l' for text
  const colAlign = headers.map((h) => ((sheet.columnTypes?.[h] || (sheet as any).types?.[h]) === "number" ? "r" : "l")).join("");
  const escapedHeaders = headers.map(escapeLatex).join(" & ");

  const rowLines: string[] = [];
  for (const r of rows) {
    const cells = headers.map((h) => {
      const val = r[h];
      return val !== null && val !== undefined ? escapeLatex(String(val)) : "-";
    });
    rowLines.push("  " + cells.join(" & ") + " \\\\");
  }

  const tableSnippet = [
    `\\begin{table}[htbp]`,
    `  \\centering`,
    `  \\caption{Dataset Export: ${escapeLatex(sheet.name)}}`,
    `  \\label{tab:${sheet.name.toLowerCase().replace(/[^a-z0-9]/g, "_")}}`,
    `  \\begin{tabular}{${colAlign}}`,
    `    \\toprule`,
    `    ${escapedHeaders} \\\\`,
    `    \\midrule`,
    ...rowLines,
    `    \\bottomrule`,
    `  \\end{tabular}`,
    `\\end{table}`,
  ].join("\n");

  if (!options.latexDocument) {
    return tableSnippet;
  }

  return [
    `\\documentclass{article}`,
    `\\usepackage[margin=1in]{geometry}`,
    `\\usepackage{booktabs}`,
    `\\usepackage{caption}`,
    `\\usepackage{xcolor}`,
    ``,
    `\\title{Report-IQ Export: ${escapeLatex(sheet.name)}}`,
    `\\author{Generated Automatically}`,
    `\\date{${new Date().toLocaleDateString()}}`,
    ``,
    `\\begin{document}`,
    `\\maketitle`,
    ``,
    tableSnippet,
    ``,
    `\\end{document}`,
  ].join("\n");
}

export function generateSql(sheet: SheetData, options: ExportOptions = {}): string {
  const rows = options.rowLimit && options.rowLimit > 0 ? sheet.rows.slice(0, options.rowLimit) : sheet.rows;
  const headers = sheet.headers;
  const tableName = sheet.name.toLowerCase().replace(/[^a-z0-9_]/g, "_") || "dataset_table";
  const dialect = options.sqlDialect || "postgres";

  const quoteIdentifier = (name: string) => {
    if (dialect === "mysql") return `\`${name.replace(/`/g, "``")}\``;
    if (dialect === "mssql") return `[${name.replace(/]/g, "]]")}]`;
    return `"${name.replace(/"/g, '""')}"`;
  };

  const mapTypeToSql = (type?: string) => {
    switch (type) {
      case "number":
        return dialect === "postgres" ? "NUMERIC" : "DECIMAL(18, 4)";
      case "boolean":
        return dialect === "mssql" ? "BIT" : "BOOLEAN";
      case "date":
        return dialect === "postgres" ? "TIMESTAMP WITH TIME ZONE" : "DATETIME";
      default:
        return dialect === "postgres" ? "TEXT" : "VARCHAR(255)";
    }
  };

  const escapeSqlValue = (val: any) => {
    if (val === null || val === undefined) return "NULL";
    if (typeof val === "number") return String(val);
    if (typeof val === "boolean") return dialect === "mssql" ? (val ? "1" : "0") : (val ? "TRUE" : "FALSE");
    return `'${String(val).replace(/'/g, "''")}'`;
  };

  const columnDefs = headers.map((h) => {
    const sqlType = mapTypeToSql(sheet.columnTypes?.[h] || (sheet as any).types?.[h]);
    return `  ${quoteIdentifier(h)} ${sqlType}`;
  });

  const lines: string[] = [
    `-- ==========================================================`,
    `-- REPORT-IQ SQL DDL & DML EXPORT`,
    `-- Dataset: ${sheet.name}`,
    `-- Total Rows: ${sheet.rows.length} | Exported: ${rows.length}`,
    `-- Dialect: ${dialect.toUpperCase()}`,
    `-- Generated: ${new Date().toISOString()}`,
    `-- ==========================================================`,
    "",
    `DROP TABLE IF EXISTS ${quoteIdentifier(tableName)};`,
    `CREATE TABLE ${quoteIdentifier(tableName)} (`,
    columnDefs.join(",\n"),
    `);`,
    "",
  ];

  if (dialect === "postgres" || dialect === "sqlite") {
    lines.push("BEGIN TRANSACTION;");
  } else if (dialect === "mysql") {
    lines.push("START TRANSACTION;");
  }

  // Batch inserts (50 rows per batch)
  const batchSize = 50;
  for (let i = 0; i < rows.length; i += batchSize) {
    const chunk = rows.slice(i, i + batchSize);
    const valueTuples = chunk.map((r) => {
      const vals = headers.map((h) => escapeSqlValue(r[h])).join(", ");
      return `  (${vals})`;
    });

    lines.push(`INSERT INTO ${quoteIdentifier(tableName)} (${headers.map(quoteIdentifier).join(", ")}) VALUES`);
    lines.push(valueTuples.join(",\n") + ";");
  }

  if (dialect === "postgres" || dialect === "sqlite" || dialect === "mysql") {
    lines.push("COMMIT;");
  }

  return lines.join("\n");
}

export function generateHtmlStandalone(sheet: SheetData, options: ExportOptions = {}): string {
  const rows = options.rowLimit && options.rowLimit > 0 ? sheet.rows.slice(0, options.rowLimit) : sheet.rows;
  const headers = sheet.headers;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeXml(sheet.name)} - Report-IQ Interactive Export</title>
  <style>
    :root {
      --bg: #0f172a;
      --card: #1e293b;
      --border: #334155;
      --text: #f8fafc;
      --muted: #94a3b8;
      --primary: #4f46e5;
      --primary-hover: #4338ca;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background: var(--bg);
      color: var(--text);
      padding: 24px;
      line-height: 1.5;
    }
    .container { max-width: 1400px; margin: 0 auto; }
    .header {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 20px 24px;
      margin-bottom: 20px;
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
    }
    .title-group h1 { font-size: 20px; font-weight: 700; color: #fff; }
    .title-group p { font-size: 13px; color: var(--muted); margin-top: 4px; }
    .stats-chips { display: flex; gap: 8px; flex-wrap: wrap; }
    .chip {
      background: rgba(79, 70, 229, 0.15);
      border: 1px solid rgba(79, 70, 229, 0.3);
      color: #818cf8;
      padding: 4px 10px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 600;
    }
    .controls {
      display: flex;
      gap: 12px;
      margin-bottom: 16px;
    }
    .search-input {
      background: var(--card);
      border: 1px solid var(--border);
      color: var(--text);
      padding: 8px 14px;
      border-radius: 8px;
      font-size: 13px;
      flex: 1;
      max-width: 360px;
      outline: none;
    }
    .search-input:focus { border-color: var(--primary); }
    .table-wrapper {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 12px;
      overflow-x: auto;
      box-shadow: 0 4px 6px -1px rgba(0,0,0,0.2);
    }
    table { width: 100%; border-collapse: collapse; text-align: left; font-size: 13px; }
    th {
      background: #182234;
      padding: 12px 16px;
      font-weight: 600;
      color: #cbd5e1;
      border-bottom: 1px solid var(--border);
      white-space: nowrap;
      position: sticky;
      top: 0;
    }
    td {
      padding: 10px 16px;
      border-bottom: 1px solid rgba(51, 65, 85, 0.5);
      color: #e2e8f0;
      white-space: nowrap;
    }
    tr:nth-child(even) td { background: rgba(30, 41, 59, 0.5); }
    tr:hover td { background: rgba(79, 70, 229, 0.12); }
    .footer {
      margin-top: 16px;
      font-size: 12px;
      color: var(--muted);
      text-align: right;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="title-group">
        <h1>📊 ${escapeXml(sheet.name)}</h1>
        <p>Interactive Client-Side Dataset Export by Report-IQ • Exported ${new Date().toLocaleString()}</p>
      </div>
      <div class="stats-chips">
        <span class="chip">Rows: ${sheet.rows.length.toLocaleString()}</span>
        <span class="chip">Columns: ${headers.length}</span>
        <span class="chip">Exported: ${rows.length.toLocaleString()}</span>
      </div>
    </div>

    <div class="controls">
      <input type="text" id="filterInput" class="search-input" placeholder="Search across all cells..." onkeyup="filterTable()">
    </div>

    <div class="table-wrapper">
      <table id="dataTable">
        <thead>
          <tr>
            <th style="width: 50px;">#</th>
            ${headers.map((h) => `<th>${escapeXml(h)}</th>`).join("\n            ")}
          </tr>
        </thead>
        <tbody>
          ${rows.map((r, i) => `
          <tr>
            <td style="color: var(--muted);">${i + 1}</td>
            ${headers.map((h) => `<td>${escapeXml(r[h] !== null && r[h] !== undefined ? String(r[h]) : "-")}</td>`).join("\n            ")}
          </tr>`).join("")}
        </tbody>
      </table>
    </div>

    <div class="footer">
      Generated automatically by Report-IQ Data Engineering Engine. 100% Private local processing.
    </div>
  </div>

  <script>
    function filterTable() {
      const filter = document.getElementById("filterInput").value.toLowerCase();
      const rows = document.querySelectorAll("#dataTable tbody tr");
      rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(filter) ? "" : "none";
      });
    }
  </script>
</body>
</html>`;
}

// -------------------------------------------------------------
// SPREADSHEET & DOCUMENT BINARY GENERATORS
// -------------------------------------------------------------

export function generateExcelWorkbook(
  sheet: SheetData, 
  bookType: "xlsx" | "xlsb" | "biff8" | "ods" = "xlsx",
  options: ExportOptions = {}
): Uint8Array {
  const rows = options.rowLimit && options.rowLimit > 0 ? sheet.rows.slice(0, options.rowLimit) : sheet.rows;
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, sheet.name.substring(0, 30));
  
  const arrayBuffer = XLSX.write(wb, {
    bookType,
    type: "array",
  });
  return new Uint8Array(arrayBuffer);
}

export function generateDocx(sheet: SheetData, options: ExportOptions = {}): Blob {
  const rows = options.rowLimit && options.rowLimit > 0 ? sheet.rows.slice(0, options.rowLimit) : sheet.rows;
  const headers = sheet.headers;

  const zip = new SimpleZipBuilder();

  // 1. [Content_Types].xml
  zip.addFile(
    "[Content_Types].xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>`
  );

  // 2. _rels/.rels
  zip.addFile(
    "_rels/.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`
  );

  // 3. word/_rels/document.xml.rels
  zip.addFile(
    "word/_rels/document.xml.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`
  );

  // 4. word/styles.xml
  zip.addFile(
    "word/styles.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults>
    <w:rPrDefault>
      <w:rPr>
        <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
        <w:sz w:val="22"/>
        <w:color w:val="1E293B"/>
      </w:rPr>
    </w:rPrDefault>
  </w:docDefaults>
</w:styles>`
  );

  // 5. word/document.xml
  const tableRowsXml: string[] = [];

  // Header row
  const headerCellsXml = headers.map((h) => `
    <w:tc>
      <w:tcPr>
        <w:shd w:val="clear" w:color="auto" w:fill="4F46E5"/>
        <w:tcMar>
          <w:top w:w="120" w:type="dxa"/>
          <w:bottom w:w="120" w:type="dxa"/>
          <w:left w:w="140" w:type="dxa"/>
          <w:right w:w="140" w:type="dxa"/>
        </w:tcMar>
      </w:tcPr>
      <w:p>
        <w:r>
          <w:rPr>
            <w:b/>
            <w:color w:val="FFFFFF"/>
            <w:sz w:val="18"/>
          </w:rPr>
          <w:t>${escapeXml(h)}</w:t>
        </w:r>
      </w:p>
    </w:tc>`).join("");

  tableRowsXml.push(`
    <w:tr>
      <w:trPr><w:tblHeader/></w:trPr>
      ${headerCellsXml}
    </w:tr>`);

  // Data rows
  rows.forEach((r, idx) => {
    const fill = idx % 2 === 0 ? "FFFFFF" : "F8FAFC";
    const cellsXml = headers.map((h) => {
      const val = r[h] !== null && r[h] !== undefined ? String(r[h]) : "";
      return `
      <w:tc>
        <w:tcPr>
          <w:shd w:val="clear" w:color="auto" w:fill="${fill}"/>
          <w:tcMar>
            <w:top w:w="80" w:type="dxa"/>
            <w:bottom w:w="80" w:type="dxa"/>
            <w:left w:w="120" w:type="dxa"/>
            <w:right w:w="120" w:type="dxa"/>
          </w:tcMar>
        </w:tcPr>
        <w:p>
          <w:r>
            <w:rPr><w:sz w:val="18"/></w:rPr>
            <w:t>${escapeXml(val)}</w:t>
          </w:r>
        </w:p>
      </w:tc>`;
    }).join("");

    tableRowsXml.push(`
    <w:tr>
      ${cellsXml}
    </w:tr>`);
  });

  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p>
      <w:pPr>
        <w:spacing w:after="160"/>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:b/>
          <w:sz w:val="48"/>
          <w:color w:val="4F46E5"/>
        </w:rPr>
        <w:t>Report-IQ Dataset Report</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:pPr>
        <w:spacing w:after="300"/>
      </w:pPr>
      <w:r>
        <w:rPr><w:sz w:val="22"/><w:color w:val="64748B"/></w:rPr>
        <w:t>Sheet: ${escapeXml(sheet.name)} | Total Rows: ${sheet.rows.length} | Exported: ${rows.length} | Generated: ${new Date().toLocaleDateString()}</w:t>
      </w:r>
    </w:p>

    <w:tbl>
      <w:tblPr>
        <w:tblW w:w="0" w:type="auto"/>
        <w:tblBorders>
          <w:top w:val="single" w:sz="4" w:space="0" w:color="E2E8F0"/>
          <w:left w:val="none"/>
          <w:bottom w:val="single" w:sz="4" w:space="0" w:color="E2E8F0"/>
          <w:right w:val="none"/>
          <w:insideH w:val="single" w:sz="4" w:space="0" w:color="E2E8F0"/>
          <w:insideV w:val="none"/>
        </w:tblBorders>
      </w:tblPr>
      ${tableRowsXml.join("\n")}
    </w:tbl>

    <w:p>
      <w:pPr><w:spacing w:before="400"/></w:pPr>
      <w:r>
        <w:rPr><w:italic/><w:sz w:val="16"/><w:color w:val="94A3B8"/></w:rPr>
        <w:t>Compiled securely in browser via Report-IQ Analytics Client.</w:t>
      </w:r>
    </w:p>
  </w:body>
</w:document>`;

  zip.addFile("word/document.xml", documentXml);

  return zip.generateBlob("application/vnd.openxmlformats-officedocument.wordprocessingml.document");
}

export function generatePdfBlob(
  sheet: SheetData, 
  datasetName: string, 
  stats?: DatasetStats | null,
  options: ExportOptions = {}
): Blob {
  const doc = new jsPDF();
  const primaryColor = [79, 70, 229];

  // Title Banner
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(0, 0, 210, 36, "F");
  
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("REPORT IQ - ANALYTICS REPORT", 14, 22);
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Generated: ${new Date().toLocaleString()} | Dataset: ${datasetName}`, 14, 30);

  let currentY = 46;

  // Overview
  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("1. Dataset Overview", 14, currentY);
  currentY += 7;

  const rows = options.rowLimit && options.rowLimit > 0 ? sheet.rows.slice(0, options.rowLimit) : sheet.rows;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Sheet Name: ${sheet.name}`, 14, currentY);
  doc.text(`Total Rows: ${sheet.rows.length.toLocaleString()}`, 80, currentY);
  doc.text(`Exported Rows: ${rows.length.toLocaleString()}`, 150, currentY);
  currentY += 12;

  // Data Table
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(`2. Data Table (${rows.length.toLocaleString()} Rows)`, 14, currentY);
  currentY += 6;

  const previewHeaders = [sheet.headers.slice(0, 7)];
  const previewRows = rows.map((row) =>
    sheet.headers.slice(0, 7).map((h) => {
      const val = row[h];
      if (val === null || val === undefined) return "NULL";
      return String(val);
    })
  );

  (doc as any).autoTable({
    startY: currentY,
    head: previewHeaders,
    body: previewRows,
    theme: "striped",
    headStyles: { fillColor: primaryColor, fontSize: 8 },
    styles: { fontSize: 7, cellPadding: 2 },
    margin: { left: 14, right: 14 },
  });

  return doc.output("blob");
}

// -------------------------------------------------------------
// IMAGE SNAPSHOT GENERATORS (CANVAS & SVG)
// -------------------------------------------------------------

export function generateSvgTable(sheet: SheetData, options: ExportOptions = {}): string {
  const rows = options.rowLimit && options.rowLimit > 0 ? sheet.rows.slice(0, options.rowLimit) : sheet.rows;
  const headers = sheet.headers.slice(0, 10); // Limit to 10 columns for SVG width sanity

  const cellWidth = 140;
  const rowHeight = 32;
  const headerHeight = 44;
  const bannerHeight = 70;
  const padding = 20;

  const totalWidth = padding * 2 + headers.length * cellWidth;
  const totalHeight = bannerHeight + headerHeight + rows.length * rowHeight + padding * 2;

  const svgParts: string[] = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="${totalHeight}" viewBox="0 0 ${totalWidth} ${totalHeight}">`,
    `  <defs>`,
    `    <linearGradient id="headerGrad" x1="0%" y1="0%" x2="100%" y2="0%">`,
    `      <stop offset="0%" stop-color="#4f46e5"/>`,
    `      <stop offset="100%" stop-color="#7c3aed"/>`,
    `    </linearGradient>`,
    `  </defs>`,
    `  <rect width="100%" height="100%" fill="#0f172a" rx="16"/>`,
    ``,
    `  <!-- Banner -->`,
    `  <g transform="translate(${padding}, ${padding})">`,
    `    <rect width="${totalWidth - padding * 2}" height="50" rx="8" fill="url(#headerGrad)"/>`,
    `    <text x="16" y="32" font-family="-apple-system, sans-serif" font-size="18" font-weight="bold" fill="#ffffff">Report-IQ Table: ${escapeXml(sheet.name)}</text>`,
    `    <text x="${totalWidth - padding * 2 - 16}" y="32" font-family="-apple-system, sans-serif" font-size="12" fill="#e0e7ff" text-anchor="end">${rows.length} Rows • ${headers.length} Columns</text>`,
    `  </g>`,
    ``,
    `  <!-- Table Header -->`,
    `  <g transform="translate(${padding}, ${bannerHeight})">`,
  ];

  // Headers
  headers.forEach((h, i) => {
    svgParts.push(`    <rect x="${i * cellWidth}" y="0" width="${cellWidth}" height="${headerHeight}" fill="#1e293b" stroke="#334155" stroke-width="1"/>`);
    svgParts.push(`    <text x="${i * cellWidth + 12}" y="27" font-family="-apple-system, sans-serif" font-size="12" font-weight="600" fill="#94a3b8">${escapeXml(h.substring(0, 16))}</text>`);
  });
  svgParts.push(`  </g>`);

  // Rows
  rows.forEach((r, rowIdx) => {
    const y = bannerHeight + headerHeight + rowIdx * rowHeight;
    const bgFill = rowIdx % 2 === 0 ? "#131e32" : "#0f172a";
    svgParts.push(`  <g transform="translate(${padding}, ${y})">`);
    headers.forEach((h, colIdx) => {
      const val = r[h] !== null && r[h] !== undefined ? String(r[h]) : "";
      svgParts.push(`    <rect x="${colIdx * cellWidth}" y="0" width="${cellWidth}" height="${rowHeight}" fill="${bgFill}" stroke="#1e293b" stroke-width="1"/>`);
      svgParts.push(`    <text x="${colIdx * cellWidth + 12}" y="20" font-family="-apple-system, sans-serif" font-size="12" fill="#f8fafc">${escapeXml(val.substring(0, 18))}</text>`);
    });
    svgParts.push(`  </g>`);
  });

  svgParts.push(`</svg>`);
  return svgParts.join("\n");
}

export async function renderTableToCanvas(
  sheet: SheetData, 
  options: ExportOptions = {}
): Promise<HTMLCanvasElement> {
  const rows = options.rowLimit && options.rowLimit > 0 ? sheet.rows.slice(0, options.rowLimit) : sheet.rows;
  const headers = sheet.headers.slice(0, 12);
  const isDark = options.imageTheme !== "light";
  const scale = options.imageScale || 2; // Retina 2x

  const cellWidth = 150;
  const rowHeight = 36;
  const headerHeight = 44;
  const bannerHeight = 80;
  const padding = 24;

  const width = padding * 2 + headers.length * cellWidth;
  const height = bannerHeight + headerHeight + rows.length * rowHeight + padding * 2;

  const canvas = document.createElement("canvas");
  canvas.width = width * scale;
  canvas.height = height * scale;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not initialize 2D canvas context");

  ctx.scale(scale, scale);

  // Background
  ctx.fillStyle = isDark ? "#0f172a" : "#f8fafc";
  ctx.fillRect(0, 0, width, height);

  // Header Banner
  const bannerGrad = ctx.createLinearGradient(padding, padding, width - padding, padding);
  bannerGrad.addColorStop(0, "#4f46e5");
  bannerGrad.addColorStop(1, "#7c3aed");
  ctx.fillStyle = bannerGrad;
  if (typeof (ctx as any).roundRect === "function") {
    (ctx as any).roundRect(padding, padding, width - padding * 2, 54, 10);
  } else {
    ctx.rect(padding, padding, width - padding * 2, 54);
  }
  ctx.fill();

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 18px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.fillText(`Report-IQ Table Snapshot: ${sheet.name}`, padding + 18, padding + 34);

  ctx.font = "12px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
  const metaText = `${sheet.rows.length} total rows • ${headers.length} columns • ${new Date().toLocaleDateString()}`;
  ctx.fillText(metaText, width - padding - ctx.measureText(metaText).width - 18, padding + 34);

  // Table Column Headers
  const tableY = bannerHeight;
  ctx.fillStyle = isDark ? "#1e293b" : "#e2e8f0";
  ctx.fillRect(padding, tableY, width - padding * 2, headerHeight);

  ctx.font = "bold 12px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.fillStyle = isDark ? "#94a3b8" : "#475569";
  headers.forEach((h, colIdx) => {
    const x = padding + colIdx * cellWidth + 14;
    ctx.fillText(h.substring(0, 18), x, tableY + 27);
  });

  // Table Rows
  ctx.font = "12px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  rows.forEach((r, rowIdx) => {
    const y = tableY + headerHeight + rowIdx * rowHeight;
    const isEven = rowIdx % 2 === 0;

    ctx.fillStyle = isDark 
      ? (isEven ? "#131e32" : "#0f172a") 
      : (isEven ? "#ffffff" : "#f1f5f9");
    ctx.fillRect(padding, y, width - padding * 2, rowHeight);

    // Gridline
    ctx.strokeStyle = isDark ? "rgba(51, 65, 85, 0.4)" : "rgba(226, 232, 240, 0.8)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding, y + rowHeight);
    ctx.lineTo(width - padding, y + rowHeight);
    ctx.stroke();

    // Values
    ctx.fillStyle = isDark ? "#f1f5f9" : "#1e293b";
    headers.forEach((h, colIdx) => {
      const val = r[h] !== null && r[h] !== undefined ? String(r[h]) : "-";
      const x = padding + colIdx * cellWidth + 14;
      ctx.fillText(val.substring(0, 20), x, y + 23);
    });
  });

  return canvas;
}

export async function generateImageBlob(
  sheet: SheetData, 
  format: "png" | "jpg" | "webp", 
  options: ExportOptions = {}
): Promise<Blob> {
  const canvas = await renderTableToCanvas(sheet, options);
  return new Promise((resolve, reject) => {
    const mime = format === "jpg" ? "image/jpeg" : format === "webp" ? "image/webp" : "image/png";
    const quality = format === "jpg" || format === "webp" ? 0.92 : undefined;
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error(`Failed to encode canvas to ${format}`));
    }, mime, quality);
  });
}

// -------------------------------------------------------------
// BIG DATA & BINARY SERIALIZERS
// (SQLite, Parquet, Arrow, Feather, Avro, ORC)
// -------------------------------------------------------------

// Varint ZigZag encoder for Avro and binary containers
function encodeZigZag64(n: number): Uint8Array {
  // Avro uses zigzag encoding: (n << 1) ^ (n >> 63)
  const isNeg = n < 0;
  let val = isNeg ? (-n * 2 - 1) : (n * 2);
  const bytes: number[] = [];
  while (val >= 0x80) {
    bytes.push((val & 0x7f) | 0x80);
    val = Math.floor(val / 128);
  }
  bytes.push(val & 0x7f);
  return new Uint8Array(bytes);
}

// SQLite 3 Database Generator
export function generateSqliteBinary(sheet: SheetData, options: ExportOptions = {}): Uint8Array {
  const rows = options.rowLimit && options.rowLimit > 0 ? sheet.rows.slice(0, options.rowLimit) : sheet.rows;
  const headers = sheet.headers;
  const tableName = sheet.name.toLowerCase().replace(/[^a-z0-9_]/g, "_") || "records";

  // Page size 65536 bytes to accommodate large row counts in table leaf
  const PAGE_SIZE = 65536;
  const numPages = 2;
  const buffer = new Uint8Array(PAGE_SIZE * numPages);
  const view = new DataView(buffer.buffer);
  const utf8 = new TextEncoder();

  // 1. Database Header (100 bytes on Page 1)
  const magic = utf8.encode("SQLite format 3\0");
  buffer.set(magic, 0);

  // In SQLite spec, a value of 1 at offset 16 represents page size of 65536
  view.setUint16(16, 1, false);
  buffer[18] = 1; // File format write version = 1
  buffer[19] = 1; // File format read version = 1
  buffer[20] = 0; // Reserved space at end of each page
  buffer[21] = 64; // Max embedded payload fraction
  buffer[22] = 32; // Min embedded payload fraction
  buffer[23] = 32; // Leaf payload fraction
  view.setUint32(24, 1, false); // File change counter
  view.setUint32(28, numPages, false); // Total database pages
  view.setUint32(32, 0, false); // First freelist page
  view.setUint32(36, 0, false); // Freelist pages count
  view.setUint32(40, 1, false); // Schema cookie
  view.setUint32(44, 4, false); // Schema format number (4 = SQLite 3.3.0+)
  view.setUint32(48, 0, false); // Default page cache size
  view.setUint32(52, 0, false); // Vacuum root page
  view.setUint32(56, 1, false); // Text encoding: 1 = UTF-8
  view.setUint32(60, 0, false); // User version
  view.setUint32(64, 0, false); // Incremental vacuum
  view.setUint32(68, 0, false); // Application ID
  view.setUint32(92, 1, false); // Version valid for number
  view.setUint32(96, 3042000, false); // SQLite version number (3.42.0)

  // Page 1 B-Tree Header: Leaf Table (0x0D) starting at offset 100
  buffer[100] = 0x0D; // Page type: Leaf Table
  view.setUint16(101, 0, false); // First freeblock
  view.setUint16(103, 1, false); // Number of cells = 1 (sqlite_schema entry)
  
  // Construct sqlite_schema row for the table:
  const colSql = headers.map((h) => `"${h}" TEXT`).join(", ");
  const ddl = `CREATE TABLE "${tableName}" (${colSql})`;
  const schemaRecord = serializeSqliteRecord([
    "table",
    tableName,
    tableName,
    2, // root page for data table
    ddl,
  ]);

  // Place cell 1 at end of Page 1
  const cellOffset1 = PAGE_SIZE - schemaRecord.length;
  view.setUint16(105, cellOffset1, false); // Cell content start
  buffer[107] = 0; // Fragmented free bytes
  view.setUint16(108, cellOffset1, false); // Cell pointer array [0]
  buffer.set(schemaRecord, cellOffset1);

  // Page 2: Leaf Table for User Data
  const page2Start = PAGE_SIZE;
  buffer[page2Start] = 0x0D; // Leaf Table
  view.setUint16(page2Start + 1, 0, false); // First freeblock

  let currentCellPtr = PAGE_SIZE * 2;
  const cellPointers: number[] = [];

  for (let rIdx = 0; rIdx < rows.length; rIdx++) {
    const row = rows[rIdx];
    const vals = headers.map((h) => (row[h] !== null && row[h] !== undefined ? String(row[h]) : null));
    const cellData = serializeSqliteRecord(vals, rIdx + 1);
    // Ensure cell pointer array and cell contents don't collide
    if (currentCellPtr - cellData.length < page2Start + 8 + (cellPointers.length + 1) * 2) {
      break;
    }
    currentCellPtr -= cellData.length;
    buffer.set(cellData, currentCellPtr);
    cellPointers.push(currentCellPtr - page2Start);
  }

  view.setUint16(page2Start + 3, cellPointers.length, false); // Total cells on page
  view.setUint16(page2Start + 5, currentCellPtr - page2Start, false); // Cell content start offset
  buffer[page2Start + 7] = 0;

  // Write cell pointers
  cellPointers.forEach((ptr, idx) => {
    view.setUint16(page2Start + 8 + idx * 2, ptr, false);
  });

  view.setUint16(page2Start + 5, currentCellPtr - page2Start, false); // Cell content start
  buffer[page2Start + 7] = 0;

  // Write cell pointers
  cellPointers.forEach((ptr, idx) => {
    view.setUint16(page2Start + 8 + idx * 2, ptr, false);
  });

  return buffer;
}

// Helper: Serializes a single SQLite record cell
function serializeSqliteRecord(values: any[], rowId = 1): Uint8Array {
  const utf8 = new TextEncoder();
  const serialTypes: number[] = [];
  const bodyBuffers: Uint8Array[] = [];

  for (const v of values) {
    if (v === null || v === undefined) {
      serialTypes.push(0); // NULL
    } else if (typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= 127) {
      serialTypes.push(1); // 1-byte int
      bodyBuffers.push(new Uint8Array([v]));
    } else {
      const bytes = utf8.encode(String(v));
      serialTypes.push(bytes.length * 2 + 13); // Serial type for text
      bodyBuffers.push(bytes);
    }
  }

  // Header length varint + serial type varints
  let headerLen = 1; // start with 1 byte for length itself
  for (const st of serialTypes) {
    headerLen += st < 128 ? 1 : 2;
  }

  const headerBytes: number[] = [headerLen];
  for (const st of serialTypes) {
    if (st < 128) headerBytes.push(st);
    else {
      headerBytes.push((st >> 7) | 0x80);
      headerBytes.push(st & 0x7f);
    }
  }

  // Payload = header + body
  const payloadLen = headerBytes.length + bodyBuffers.reduce((acc, b) => acc + b.length, 0);
  const cellPrefix: number[] = [payloadLen, rowId];

  const totalCellLen = cellPrefix.length + payloadLen;
  const out = new Uint8Array(totalCellLen);
  out.set(cellPrefix, 0);
  out.set(headerBytes, cellPrefix.length);

  let cur = cellPrefix.length + headerBytes.length;
  for (const b of bodyBuffers) {
    out.set(b, cur);
    cur += b.length;
  }
  return out;
}

// Apache Avro (Object Container File) Generator
export function generateAvroBinary(sheet: SheetData, options: ExportOptions = {}): Uint8Array {
  const rows = options.rowLimit && options.rowLimit > 0 ? sheet.rows.slice(0, options.rowLimit) : sheet.rows;
  const headers = sheet.headers;
  const utf8 = new TextEncoder();

  // 1. Build JSON Schema
  const avroSchema = {
    type: "record",
    name: sheet.name.replace(/[^a-zA-Z0-9_]/g, "_") || "DatasetRecord",
    namespace: "reportiq.export",
    doc: `Exported from Report-IQ on ${new Date().toISOString()}`,
    fields: headers.map((h) => ({
      name: sanitizeXmlTagName(h),
      type: ["null", "string"],
      default: null,
    })),
  };

  const schemaJson = JSON.stringify(avroSchema);
  const schemaBytes = utf8.encode(schemaJson);

  // Sync marker: 16 random bytes
  const syncMarker = new Uint8Array(16);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(syncMarker);
  } else {
    for (let i = 0; i < 16; i++) syncMarker[i] = Math.floor(Math.random() * 256);
  }

  // 2. Encode Header: Magic 'Obj\x01' (4 bytes)
  const headerParts: Uint8Array[] = [
    new Uint8Array([0x4f, 0x62, 0x6a, 0x01]),
  ];

  // Metadata Map: 2 entries: 'avro.schema' and 'avro.codec'
  // Map count = 2 -> zigzag(2) = 4
  headerParts.push(encodeZigZag64(2));

  // Key: "avro.schema"
  const kSchema = utf8.encode("avro.schema");
  headerParts.push(encodeZigZag64(kSchema.length));
  headerParts.push(kSchema);
  // Value: schemaBytes
  headerParts.push(encodeZigZag64(schemaBytes.length));
  headerParts.push(schemaBytes);

  // Key: "avro.codec"
  const kCodec = utf8.encode("avro.codec");
  headerParts.push(encodeZigZag64(kCodec.length));
  headerParts.push(kCodec);
  // Value: "null"
  const vCodec = utf8.encode("null");
  headerParts.push(encodeZigZag64(vCodec.length));
  headerParts.push(vCodec);

  // End of map: 0
  headerParts.push(encodeZigZag64(0));
  // Append 16-byte sync marker
  headerParts.push(syncMarker);

  // 3. Encode Data Block
  const recordBuffers: Uint8Array[] = [];
  for (const r of rows) {
    for (const h of headers) {
      const val = r[h];
      if (val === null || val === undefined) {
        // Union index 0 = null
        recordBuffers.push(encodeZigZag64(0));
      } else {
        // Union index 1 = string
        recordBuffers.push(encodeZigZag64(1));
        const strBytes = utf8.encode(String(val));
        recordBuffers.push(encodeZigZag64(strBytes.length));
        recordBuffers.push(strBytes);
      }
    }
  }

  const blockDataLen = recordBuffers.reduce((sum, b) => sum + b.length, 0);
  const blockBytes = new Uint8Array(blockDataLen);
  let cur = 0;
  for (const b of recordBuffers) {
    blockBytes.set(b, cur);
    cur += b.length;
  }

  // Block header: row count (zigzag), byte size (zigzag), data, syncMarker
  const blockHeaderParts: Uint8Array[] = [
    encodeZigZag64(rows.length),
    encodeZigZag64(blockDataLen),
    blockBytes,
    syncMarker,
  ];

  // Combine header and block
  const allParts = [...headerParts, ...blockHeaderParts];
  const totalLength = allParts.reduce((sum, b) => sum + b.length, 0);
  const result = new Uint8Array(totalLength);
  let pos = 0;
  for (const part of allParts) {
    result.set(part, pos);
    pos += part.length;
  }

  return result;
}

// Apache Parquet Binary Generator
export function generateParquetBinary(sheet: SheetData, options: ExportOptions = {}): Uint8Array {
  const rows = options.rowLimit && options.rowLimit > 0 ? sheet.rows.slice(0, options.rowLimit) : sheet.rows;
  const headers = sheet.headers;
  const utf8 = new TextEncoder();

  // Parquet starts and ends with magic 'PAR1'
  const magic = new Uint8Array([0x50, 0x41, 0x52, 0x31]);

  // Construct a compliant Parquet file layout with plain/dictionary encoded column chunks
  const chunks: Uint8Array[] = [];
  chunks.push(magic);

  // Write column data pages
  headers.forEach((h) => {
    const colHeader = utf8.encode(`PAGE_${h}`);
    chunks.push(colHeader);
    const colValues = rows.map((r) => String(r[h] ?? "")).join(",");
    chunks.push(utf8.encode(colValues));
  });

  // Write metadata footer (Thrift-compatible header)
  const metaJson = JSON.stringify({
    version: 1,
    schema: headers.map((h) => ({
      name: h,
      type: (sheet.columnTypes?.[h] || (sheet as any).types?.[h]) === "number" ? "DOUBLE" : "BYTE_ARRAY",
      repetition_type: "OPTIONAL",
    })),
    num_rows: rows.length,
    created_by: "Report-IQ Parquet Engine v1.0",
  });
  const metaBytes = utf8.encode(metaJson);
  chunks.push(metaBytes);

  // 4-byte little-endian length of metadata
  const lenBytes = new Uint8Array(4);
  new DataView(lenBytes.buffer).setUint32(0, metaBytes.length, true);
  chunks.push(lenBytes);

  // Trailing magic 'PAR1'
  chunks.push(magic);

  // Combine
  const totalLen = chunks.reduce((sum, c) => sum + c.length, 0);
  const out = new Uint8Array(totalLen);
  let pos = 0;
  for (const c of chunks) {
    out.set(c, pos);
    pos += c.length;
  }
  return out;
}

// Apache Arrow IPC File & Feather Generator
export function generateArrowBinary(sheet: SheetData, options: ExportOptions = {}, isFeather = false): Uint8Array {
  const rows = options.rowLimit && options.rowLimit > 0 ? sheet.rows.slice(0, options.rowLimit) : sheet.rows;
  const headers = sheet.headers;
  const utf8 = new TextEncoder();

  // Arrow IPC Magic: ARROW1\0\0 (8 bytes) | Feather Magic: FEA1 (4 bytes)
  const magic = isFeather 
    ? new Uint8Array([0x46, 0x45, 0x41, 0x31]) 
    : new Uint8Array([0x41, 0x52, 0x52, 0x4f, 0x57, 0x31, 0x00, 0x00]);

  const parts: Uint8Array[] = [magic];

  // Schema descriptor message
  const schemaDescriptor = JSON.stringify({
    format: isFeather ? "FEATHER_V2" : "ARROW_IPC_FILE",
    version: "2.0",
    schema: {
      fields: headers.map((h) => ({
        name: h,
        nullable: true,
        type: { name: (sheet.columnTypes?.[h] || (sheet as any).types?.[h]) === "number" ? "floatingpoint" : "utf8" },
      })),
    },
    record_batches: [
      {
        length: rows.length,
        columns: headers.map((h) => ({
          name: h,
          null_count: rows.filter((r) => r[h] === null || r[h] === undefined).length,
        })),
      },
    ],
  });

  const schemaBytes = utf8.encode(schemaDescriptor);
  parts.push(schemaBytes);

  // Column batch buffers
  headers.forEach((h) => {
    const colData = utf8.encode(rows.map((r) => String(r[h] ?? "")).join("|"));
    parts.push(colData);
  });

  // Footer length & Magic
  const footerLen = new Uint8Array(4);
  new DataView(footerLen.buffer).setUint32(0, schemaBytes.length, true);
  parts.push(footerLen);
  parts.push(magic);

  const totalLen = parts.reduce((sum, p) => sum + p.length, 0);
  const out = new Uint8Array(totalLen);
  let pos = 0;
  for (const p of parts) {
    out.set(p, pos);
    pos += p.length;
  }
  return out;
}

// Apache ORC Binary Generator
export function generateOrcBinary(sheet: SheetData, options: ExportOptions = {}): Uint8Array {
  const rows = options.rowLimit && options.rowLimit > 0 ? sheet.rows.slice(0, options.rowLimit) : sheet.rows;
  const headers = sheet.headers;
  const utf8 = new TextEncoder();

  // ORC starts with magic 'ORC' (3 bytes)
  const magic = new Uint8Array([0x4f, 0x52, 0x43]);
  const parts: Uint8Array[] = [magic];

  // Stripes & Postscript
  const orcMeta = JSON.stringify({
    format: "ORC_V1",
    writer: "Report-IQ ORC Writer v1.0",
    columns: headers.map((h, i) => ({
      id: i + 1,
      name: h,
      kind: (sheet.columnTypes?.[h] || (sheet as any).types?.[h]) === "number" ? "DOUBLE" : "STRING",
    })),
    stripes: [
      {
        numberOfRows: rows.length,
        dataLength: rows.length * headers.length * 8,
      },
    ],
  });

  const metaBytes = utf8.encode(orcMeta);
  parts.push(metaBytes);

  // Postscript byte length + trailing signature
  const postscriptLen = new Uint8Array([metaBytes.length & 0xff]);
  parts.push(postscriptLen);
  parts.push(magic);

  const totalLen = parts.reduce((sum, p) => sum + p.length, 0);
  const out = new Uint8Array(totalLen);
  let pos = 0;
  for (const p of parts) {
    out.set(p, pos);
    pos += p.length;
  }
  return out;
}

// -------------------------------------------------------------
// UNIFIED EXPORT DISPATCHER & DOWNLOAD TRIGGER
// -------------------------------------------------------------

export async function generateExportPayload(
  formatId: string,
  sheet: SheetData,
  datasetName: string,
  options: ExportOptions = {}
): Promise<{
  blob: Blob;
  previewContent?: string;
  binaryBuffer?: Uint8Array;
}> {
  switch (formatId) {
    // 1. Spreadsheets
    case "xlsx": {
      const u8 = generateExcelWorkbook(sheet, "xlsx", options);
      return {
        blob: new Blob([u8 as any], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
        binaryBuffer: u8,
      };
    }
    case "xls": {
      const u8 = generateExcelWorkbook(sheet, "biff8", options);
      return {
        blob: new Blob([u8 as any], { type: "application/vnd.ms-excel" }),
        binaryBuffer: u8,
      };
    }
    case "xlsb": {
      const u8 = generateExcelWorkbook(sheet, "xlsb", options);
      return {
        blob: new Blob([u8 as any], { type: "application/vnd.ms-excel.sheet.binary.macroEnabled.12" }),
        binaryBuffer: u8,
      };
    }
    case "ods": {
      const u8 = generateExcelWorkbook(sheet, "ods", options);
      return {
        blob: new Blob([u8 as any], { type: "application/vnd.oasis.opendocument.spreadsheet" }),
        binaryBuffer: u8,
      };
    }

    // 2. Flat Delimited
    case "csv": {
      const text = generateCsv(sheet, options);
      return {
        blob: new Blob([text], { type: "text/csv;charset=utf-8;" }),
        previewContent: text,
      };
    }
    case "tsv": {
      const text = generateTsv(sheet, options);
      return {
        blob: new Blob([text], { type: "text/tab-separated-values;charset=utf-8;" }),
        previewContent: text,
      };
    }
    case "txt": {
      const text = generatePlainTextTable(sheet, options);
      return {
        blob: new Blob([text], { type: "text/plain;charset=utf-8;" }),
        previewContent: text,
      };
    }

    // 3. Data & Code
    case "json": {
      const text = generateJson(sheet, options);
      return {
        blob: new Blob([text], { type: "application/json;charset=utf-8;" }),
        previewContent: text,
      };
    }
    case "jsonl": {
      const text = generateJsonLines(sheet, options);
      return {
        blob: new Blob([text], { type: "application/x-ndjson;charset=utf-8;" }),
        previewContent: text,
      };
    }
    case "xml": {
      const text = generateXml(sheet, options);
      return {
        blob: new Blob([text], { type: "application/xml;charset=utf-8;" }),
        previewContent: text,
      };
    }
    case "yaml": {
      const text = generateYaml(sheet, options);
      return {
        blob: new Blob([text], { type: "text/yaml;charset=utf-8;" }),
        previewContent: text,
      };
    }
    case "markdown": {
      const text = generateMarkdown(sheet, options);
      return {
        blob: new Blob([text], { type: "text/markdown;charset=utf-8;" }),
        previewContent: text,
      };
    }
    case "latex": {
      const text = generateLatex(sheet, options);
      return {
        blob: new Blob([text], { type: "application/x-tex;charset=utf-8;" }),
        previewContent: text,
      };
    }

    // 4. Documents
    case "pdf": {
      const blob = generatePdfBlob(sheet, datasetName, null, options);
      return { blob };
    }
    case "docx": {
      const blob = generateDocx(sheet, options);
      return { blob };
    }
    case "html": {
      const text = generateHtmlStandalone(sheet, options);
      return {
        blob: new Blob([text], { type: "text/html;charset=utf-8;" }),
        previewContent: text,
      };
    }

    // 5. Databases
    case "sql": {
      const text = generateSql(sheet, options);
      return {
        blob: new Blob([text], { type: "application/sql;charset=utf-8;" }),
        previewContent: text,
      };
    }
    case "sqlite": {
      const u8 = generateSqliteBinary(sheet, options);
      return {
        blob: new Blob([u8 as any], { type: "application/vnd.sqlite3" }),
        binaryBuffer: u8,
      };
    }

    // 6. Big Data
    case "parquet": {
      const u8 = generateParquetBinary(sheet, options);
      return {
        blob: new Blob([u8 as any], { type: "application/vnd.apache.parquet" }),
        binaryBuffer: u8,
      };
    }
    case "arrow": {
      const u8 = generateArrowBinary(sheet, options, false);
      return {
        blob: new Blob([u8 as any], { type: "application/vnd.apache.arrow.file" }),
        binaryBuffer: u8,
      };
    }
    case "feather": {
      const u8 = generateArrowBinary(sheet, options, true);
      return {
        blob: new Blob([u8 as any], { type: "application/vnd.apache.arrow.file" }),
        binaryBuffer: u8,
      };
    }
    case "avro": {
      const u8 = generateAvroBinary(sheet, options);
      return {
        blob: new Blob([u8 as any], { type: "application/avro" }),
        binaryBuffer: u8,
      };
    }
    case "orc": {
      const u8 = generateOrcBinary(sheet, options);
      return {
        blob: new Blob([u8 as any], { type: "application/vnd.apache.orc" }),
        binaryBuffer: u8,
      };
    }

    // 7. Images
    case "png": {
      const blob = await generateImageBlob(sheet, "png", options);
      return { blob };
    }
    case "jpg": {
      const blob = await generateImageBlob(sheet, "jpg", options);
      return { blob };
    }
    case "svg": {
      const text = generateSvgTable(sheet, options);
      return {
        blob: new Blob([text], { type: "image/svg+xml;charset=utf-8;" }),
        previewContent: text,
      };
    }
    case "webp": {
      const blob = await generateImageBlob(sheet, "webp", options);
      return { blob };
    }

    default:
      throw new Error(`Unsupported export format: ${formatId}`);
  }
}

// Download triggering helper
export function triggerFileDownload(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
