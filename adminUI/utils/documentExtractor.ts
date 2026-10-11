import { DocumentExtractionResult, ExtractedDocumentSection } from "@/types/validator";

export const SUPPORTED_DOC_EXTENSIONS = [
  "txt",
  "md",
  "markdown",
  "json",
  "csv",
  "tsv",
  "html",
  "htm",
  "xml",
  "pdf",
];

export const MAX_DOCUMENT_CHAR_LIMIT = 50000;

/**
 * Extracts digital text from a PDF ArrayBuffer client-side
 * Detects page markers, text operators (Tj / TJ), and flags scanned PDFs
 */
function extractPdfTextClient(buffer: ArrayBuffer): {
  sections: ExtractedDocumentSection[];
  rawText: string;
} {
  const bytes = new Uint8Array(buffer);
  const textDecoder = new TextDecoder("latin1");
  const binaryString = textDecoder.decode(bytes);

  const pages: string[] = [];
  // Split roughly by page markers or find page streams
  const pageParts = binaryString.split(/\/Type\s*\/Page[^s]/g);
  const candidateChunks = pageParts.length > 1 ? pageParts.slice(1) : [binaryString];

  for (let p = 0; p < candidateChunks.length; p++) {
    const chunk = candidateChunks[p];
    const pageTextParts: string[] = [];

    // Find all BT ... ET (Begin Text ... End Text) blocks
    const btRegex = /BT([\s\S]*?)ET/g;
    let match: RegExpExecArray | null;

    while ((match = btRegex.exec(chunk)) !== null) {
      const textBlock = match[1];

      // Match (Text) Tj
      const tjRegex = /\(([^)]*)\)\s*Tj/g;
      let tjMatch: RegExpExecArray | null;
      while ((tjMatch = tjRegex.exec(textBlock)) !== null) {
        pageTextParts.push(cleanPdfString(tjMatch[1]));
      }

      // Match [(Array) -10 (of) 20 (Text)] TJ
      const tjArrayRegex = /\[([^\]]*)\]\s*TJ/g;
      let tjArrMatch: RegExpExecArray | null;
      while ((tjArrMatch = tjArrayRegex.exec(textBlock)) !== null) {
        const inner = tjArrMatch[1];
        const innerStrRegex = /\(([^)]*)\)/g;
        let strMatch: RegExpExecArray | null;
        const segment: string[] = [];
        while ((strMatch = innerStrRegex.exec(inner)) !== null) {
          segment.push(cleanPdfString(strMatch[1]));
        }
        if (segment.length > 0) {
          pageTextParts.push(segment.join(""));
        }
      }
    }

    const assembledPage = pageTextParts.join(" ").replace(/\s+/g, " ").trim();
    if (assembledPage) {
      pages.push(assembledPage);
    }
  }

  if (pages.length === 0) {
    return { sections: [], rawText: "" };
  }

  const sections: ExtractedDocumentSection[] = [];
  pages.forEach((pageContent, idx) => {
    sections.push({
      heading: `Page ${idx + 1}`,
      pageNumber: idx + 1,
      content: pageContent,
      characterCount: pageContent.length,
    });
  });

  const rawText = sections.map((s) => `### ${s.heading}\n\n${s.content}`).join("\n\n");
  return { sections, rawText };
}

function cleanPdfString(raw: string): string {
  return raw
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\t/g, "\t")
    .replace(/\\\(/g, "(")
    .replace(/\\\)/g, ")")
    .replace(/\\\\/g, "\\")
    .replace(/\\[0-7]{3}/g, (octal) => {
      const code = parseInt(octal.slice(1), 8);
      return String.fromCharCode(code);
    });
}

/**
 * Extracts structured headings and paragraphs from Markdown
 */
function extractMarkdown(text: string): {
  sections: ExtractedDocumentSection[];
  rawText: string;
} {
  const lines = text.split("\n");
  const sections: ExtractedDocumentSection[] = [];
  let currentHeading = "Preamble / General Rules";
  let currentBuffer: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("#")) {
      // New heading found
      if (currentBuffer.length > 0) {
        const content = currentBuffer.join("\n").trim();
        if (content) {
          sections.push({
            heading: currentHeading,
            content,
            characterCount: content.length,
          });
        }
        currentBuffer = [];
      }
      currentHeading = trimmed.replace(/^#+\s*/, "");
    } else {
      currentBuffer.push(line);
    }
  }

  if (currentBuffer.length > 0) {
    const content = currentBuffer.join("\n").trim();
    if (content) {
      sections.push({
        heading: currentHeading,
        content,
        characterCount: content.length,
      });
    }
  }

  return { sections, rawText: text };
}

/**
 * Extracts structured text from HTML using browser DOMParser
 */
function extractHtml(html: string): {
  sections: ExtractedDocumentSection[];
  rawText: string;
} {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");

    const sections: ExtractedDocumentSection[] = [];
    const headings = doc.querySelectorAll("h1, h2, h3, h4, p");

    let currentHeading = "Introduction";
    let currentBuffer: string[] = [];

    headings.forEach((el) => {
      const tag = el.tagName.toLowerCase();
      const text = el.textContent?.trim() || "";
      if (!text) return;

      if (tag.startsWith("h")) {
        if (currentBuffer.length > 0) {
          sections.push({
            heading: currentHeading,
            content: currentBuffer.join("\n\n"),
            characterCount: currentBuffer.join("\n\n").length,
          });
          currentBuffer = [];
        }
        currentHeading = text;
      } else {
        currentBuffer.push(text);
      }
    });

    if (currentBuffer.length > 0) {
      sections.push({
        heading: currentHeading,
        content: currentBuffer.join("\n\n"),
        characterCount: currentBuffer.join("\n\n").length,
      });
    }

    const rawText = sections.map((s) => `### ${s.heading}\n\n${s.content}`).join("\n\n");
    return { sections, rawText: rawText || (doc.body?.textContent || "") };
  } catch (err) {
    return { sections: [{ heading: "Document", content: html, characterCount: html.length }], rawText: html };
  }
}

/**
 * Main client-side document extraction function
 */
export async function extractDocumentContentLocally(file: File): Promise<DocumentExtractionResult> {
  const fileName = file.name;
  const fileSizeBytes = file.size;
  const ext = fileName.split(".").pop()?.toLowerCase() || "";

  if (!SUPPORTED_DOC_EXTENSIONS.includes(ext)) {
    return {
      success: false,
      fileName,
      fileSizeBytes,
      fileType: ext,
      sections: [],
      rawText: "",
      characterCount: 0,
      wordCount: 0,
      paragraphCount: 0,
      error: `Unsupported file type .${ext}. Supported formats: ${SUPPORTED_DOC_EXTENSIONS.map((e) => `.${e}`).join(", ")}`,
    };
  }

  try {
    let sections: ExtractedDocumentSection[] = [];
    let rawText = "";

    if (ext === "pdf") {
      const buffer = await file.arrayBuffer();
      const extracted = extractPdfTextClient(buffer);
      sections = extracted.sections;
      rawText = extracted.rawText;

      // Handle scanned or image-only PDF
      if (!rawText || rawText.trim().length === 0) {
        return {
          success: false,
          fileName,
          fileSizeBytes,
          fileType: ext,
          sections: [],
          rawText: "",
          characterCount: 0,
          wordCount: 0,
          paragraphCount: 0,
          isScannedOrEmpty: true,
          error:
            "Scanned or Image-only PDF detected: No digital text stream could be extracted from this document. Please upload a searchable PDF or a plain text/markdown rulebook.",
        };
      }
    } else if (ext === "md" || ext === "markdown") {
      const text = await file.text();
      const extracted = extractMarkdown(text);
      sections = extracted.sections;
      rawText = extracted.rawText;
    } else if (ext === "html" || ext === "htm") {
      const text = await file.text();
      const extracted = extractHtml(text);
      sections = extracted.sections;
      rawText = extracted.rawText;
    } else {
      // Plain text, JSON, CSV, XML
      const text = await file.text();
      rawText = text;

      // Split paragraphs by blank lines
      const paragraphs = text
        .split(/\n\s*\n/)
        .map((p) => p.trim())
        .filter(Boolean);

      sections = paragraphs.map((para, i) => ({
        heading: `Section ${i + 1}`,
        content: para,
        characterCount: para.length,
      }));
    }

    if (!rawText || rawText.trim().length === 0) {
      return {
        success: false,
        fileName,
        fileSizeBytes,
        fileType: ext,
        sections: [],
        rawText: "",
        characterCount: 0,
        wordCount: 0,
        paragraphCount: 0,
        isScannedOrEmpty: true,
        error: "Document appears to be empty or contains no readable characters.",
      };
    }

    const charCount = rawText.length;
    const wordCount = rawText.trim().split(/\s+/).filter(Boolean).length;
    const paragraphCount = sections.length;

    let warning: string | undefined = undefined;
    if (charCount > MAX_DOCUMENT_CHAR_LIMIT) {
      warning = `Document content (${charCount.toLocaleString()} chars) exceeds the preparation limit of ${MAX_DOCUMENT_CHAR_LIMIT.toLocaleString()} characters. Use the content selection tools below to choose specific sections.`;
    }

    return {
      success: true,
      fileName,
      fileSizeBytes,
      fileType: ext,
      sections,
      rawText,
      characterCount: charCount,
      wordCount,
      paragraphCount,
      warning,
    };
  } catch (error: any) {
    return {
      success: false,
      fileName,
      fileSizeBytes,
      fileType: ext,
      sections: [],
      rawText: "",
      characterCount: 0,
      wordCount: 0,
      paragraphCount: 0,
      error: `Error extracting text from ${fileName}: ${error.message || "Failed to parse document"}`,
    };
  }
}
