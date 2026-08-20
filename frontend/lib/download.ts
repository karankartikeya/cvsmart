import { jsPDF } from "jspdf";
import JSZip from "jszip";
import type { CoverLetterResult } from "./types";

/** Strip anything that would be awkward in a filename, and collapse the rest
 *  into a single CamelCase-ish token. "Director of Engineering, Safety"
 *  becomes "DirectorofEngineeringSafety". */
function sanitize(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .split(/[\s-]+/)
    .join("");
}

/**
 * firstNamelastName_anschreiben_companyName_position
 *
 * Missing pieces are dropped rather than left as empty segments, so a scrape
 * that only recovered the role still yields a sensible name.
 */
export function buildFileName(candidateName: string, result: CoverLetterResult): string {
  const person = sanitize(candidateName) || "CoverLetter";
  const company = sanitize(result.job_posting.company_name ?? "");
  const position = sanitize(result.job_posting.role_title ?? "");

  return [person, "anschreiben", company, position].filter(Boolean).join("_");
}

/** Lay the letter out on A4 with margins, wrapping text and paginating. */
function renderPdf(letter: string): jsPDF {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const marginX = 64;
  const marginTop = 72;
  const marginBottom = 64;
  const lineHeight = 16;
  const pageHeight = doc.internal.pageSize.getHeight();
  const usableWidth = doc.internal.pageSize.getWidth() - marginX * 2;

  doc.setFont("times", "normal");
  doc.setFontSize(11);

  let y = marginTop;
  // Keep the author's paragraph breaks instead of reflowing the whole letter.
  for (const paragraph of letter.split(/\n\s*\n/)) {
    const lines = doc.splitTextToSize(paragraph.trim(), usableWidth);
    for (const line of lines) {
      if (y > pageHeight - marginBottom) {
        doc.addPage();
        y = marginTop;
      }
      doc.text(line, marginX, y);
      y += lineHeight;
    }
    y += lineHeight * 0.75;
  }

  return doc;
}

export function downloadLetterPdf(candidateName: string, result: CoverLetterResult): void {
  renderPdf(result.cover_letter).save(`${buildFileName(candidateName, result)}.pdf`);
}

export async function downloadAllAsZip(
  candidateName: string,
  results: CoverLetterResult[]
): Promise<void> {
  const zip = new JSZip();
  const used = new Set<string>();

  for (const result of results) {
    let name = buildFileName(candidateName, result);
    // Two postings at the same company with the same title would otherwise
    // overwrite each other inside the archive.
    if (used.has(name)) {
      let suffix = 2;
      while (used.has(`${name}_${suffix}`)) suffix += 1;
      name = `${name}_${suffix}`;
    }
    used.add(name);
    zip.file(`${name}.pdf`, renderPdf(result.cover_letter).output("blob"));
  }

  const blob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${sanitize(candidateName) || "CoverLetters"}_anschreiben.zip`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
