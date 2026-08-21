import { jsPDF } from "jspdf";
import "jspdf-autotable";
import { SheetData, DatasetStats } from "@/types";

interface PdfReportConfig {
  sheet: SheetData;
  stats: DatasetStats;
  datasetName: string;
  chartImages?: string[]; // Array of base64 data URIs of the charts
}

export function exportToPdf(config: PdfReportConfig): void {
  const { sheet, stats, datasetName, chartImages = [] } = config;
  const doc = new jsPDF();
  
  const primaryColor = [79, 70, 229]; // Indigo
  const darkColor = [15, 23, 42]; // Slate 900
  const lightGrey = [248, 250, 252]; // Slate 50

  // 1. PAGE TITLE & HEADER
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(0, 0, 210, 40, "F");
  
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text("REPORT IQ - ANALYTICS REPORT", 14, 25);
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 33);
  
  // 2. DATASET SUMMARY
  let currentY = 50;
  
  doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("1. Dataset Overview", 14, currentY);
  currentY += 8;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Dataset Name: ${datasetName}`, 14, currentY);
  currentY += 6;
  doc.text(`Sheet Name: ${sheet.name}`, 14, currentY);
  currentY += 6;
  doc.text(`Total Rows: ${stats.totalRows.toLocaleString()}`, 14, currentY);
  doc.text(`Total Columns: ${stats.totalCols}`, 100, currentY);
  currentY += 6;
  doc.text(`Duplicate Rows: ${stats.duplicateRows}`, 14, currentY);
  doc.text(`Data Completeness Score: ${stats.completenessScore}%`, 100, currentY);
  currentY += 12;

  // 3. COLUMN STATS TABLE
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("2. Data Quality & Column Details", 14, currentY);
  currentY += 6;

  const columnHeaders = [["Column Name", "Data Type", "Missing Values Count", "Missing Percentage"]];
  const columnData = stats.nullSummaries.map((col) => [
    col.columnName,
    col.type.toUpperCase(),
    col.missingCount.toString(),
    `${col.missingPercentage}%`,
  ]);

  (doc as any).autoTable({
    startY: currentY,
    head: columnHeaders,
    body: columnData,
    theme: "striped",
    headStyles: { fillColor: primaryColor },
    margin: { left: 14, right: 14 },
    didDrawPage: (data: any) => {
      currentY = data.cursor.y + 15;
    },
  });

  // Check if we need to add a page break before charts
  if (chartImages.length > 0) {
    if (currentY > 150) {
      doc.addPage();
      currentY = 20;
    }

    doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("3. Visual Charts", 14, currentY);
    currentY += 8;

    chartImages.forEach((imgUri, index) => {
      if (currentY > 200) {
        doc.addPage();
        currentY = 20;
      }
      
      try {
        // Embed the Recharts base64 image (fits within A4 dimensions 210mm x 297mm)
        doc.addImage(imgUri, "PNG", 14, currentY, 180, 90);
        currentY += 98;
      } catch (err) {
        console.error("Failed to add chart to PDF:", err);
      }
    });
  }

  // 4. DATA PREVIEW TABLE
  if (currentY > 180) {
    doc.addPage();
    currentY = 20;
  } else {
    currentY += 5;
  }

  doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("4. Data Preview (First 15 Rows)", 14, currentY);
  currentY += 6;

  // Render headers and first 15 rows
  const previewHeaders = [sheet.headers.slice(0, 6)]; // Limit to first 6 columns to fit page width
  const previewRows = sheet.rows.slice(0, 15).map((row) =>
    sheet.headers.slice(0, 6).map((h) => {
      const val = row[h];
      if (val === null || val === undefined) return "NULL";
      if (val instanceof Date) return val.toLocaleDateString();
      if (typeof val === "object") return JSON.stringify(val);
      return String(val);
    })
  );

  (doc as any).autoTable({
    startY: currentY,
    head: previewHeaders,
    body: previewRows,
    theme: "grid",
    headStyles: { fillColor: [79, 70, 229] },
    styles: { fontSize: 8 },
    margin: { left: 14, right: 14 },
  });

  // Save the PDF file in browser
  const fileName = `${datasetName.replace(/\.[^/.]+$/, "")}_analytics_report.pdf`;
  doc.save(fileName);
}
