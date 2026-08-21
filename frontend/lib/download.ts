import { jsPDF } from "jspdf";
import JSZip from "jszip";
import type { ContactDetails, CoverLetterResult } from "./types";

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

/** Today in the letter's own language, for the dateline. */
function formatDate(language: string): string {
  const locale = language.startsWith("de") ? "de-DE" : "en-GB";
  const date = new Date().toLocaleDateString(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  // German letters conventionally read "Ulm, den 19. August 2026".
  return language.startsWith("de") ? `den ${date}` : date;
}

/**
 * Renders a formal letter in the DIN 5008 arrangement: sender block and
 * contact column at the top, a rule, then the recipient, dateline, subject,
 * and body.
 */
function renderPdf(result: CoverLetterResult, contact: ContactDetails | null): jsPDF {
  const doc = new jsPDF({ unit: "pt", format: "a4" });

  const marginX = 64;
  const marginBottom = 72;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const rightEdge = pageWidth - marginX;
  const usableWidth = pageWidth - marginX * 2;
  const lineHeight = 15;

  const language = result.language || "en";
  const name = contact?.full_name?.trim() || "";

  let y = 72;

  // Letterhead: name and headline left, contact details right.
  if (name) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.text(name.toUpperCase(), marginX, y);
  }

  const contactLines = [
    contact?.street,
    contact?.city,
    contact?.phone,
    contact?.email,
    contact?.linkedin?.replace(/^https?:\/\//, ""),
  ].filter((line): line is string => Boolean(line && line.trim()));

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  let contactY = y - 8;
  for (const line of contactLines) {
    doc.text(line, rightEdge, contactY, { align: "right" });
    contactY += 12;
  }

  if (contact?.headline) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.text(contact.headline, marginX, y + 18);
  }

  // The rule sits below whichever column runs longer.
  y = Math.max(y + (contact?.headline ? 34 : 20), contactY + 4);
  doc.setDrawColor(30, 30, 40);
  doc.setLineWidth(1);
  doc.line(marginX, y, rightEdge, y);

  // Recipient block on the left, dateline on the right.
  y += 34;
  const recipientTop = y;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  if (result.job_posting.company_name) {
    doc.text(result.job_posting.company_name, marginX, y);
    y += lineHeight;
  }
  doc.setFont("helvetica", "normal");
  if (result.job_posting.location) {
    for (const line of doc.splitTextToSize(result.job_posting.location, usableWidth * 0.5)) {
      doc.text(line, marginX, y);
      y += lineHeight;
    }
  }

  const city = contact?.city?.replace(/^\d{4,5}\s+/, "") ?? "";
  const dateline = city ? `${city}, ${formatDate(language)}` : formatDate(language);
  doc.text(dateline, rightEdge, recipientTop, { align: "right" });

  // Subject line.
  y = Math.max(y, recipientTop + lineHeight) + 30;
  if (result.subject) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11.5);
    for (const line of doc.splitTextToSize(result.subject, usableWidth)) {
      doc.text(line, marginX, y);
      y += lineHeight + 1;
    }
    y += 14;
  }

  // Body, in a serif face so the prose reads as a letter rather than a form.
  doc.setFont("times", "normal");
  doc.setFontSize(11);

  const writeParagraph = (text: string, gapAfter: number) => {
    for (const line of doc.splitTextToSize(text, usableWidth)) {
      if (y > pageHeight - marginBottom) {
        doc.addPage();
        y = 72;
      }
      doc.text(line, marginX, y);
      y += lineHeight + 2;
    }
    y += gapAfter;
  };

  if (result.salutation) writeParagraph(result.salutation, 12);

  for (const paragraph of result.cover_letter.split(/\n\s*\n/)) {
    const text = paragraph.trim();
    // The plain-text form already includes the salutation and closing, so skip
    // them here rather than printing either one twice.
    if (!text || text === result.salutation || text === result.closing) continue;
    writeParagraph(text, 12);
  }

  if (result.closing) {
    y += 6;
    writeParagraph(result.closing, 0);
    if (name) {
      y += 26;
      doc.text(name, marginX, y);
    }
  }

  return doc;
}

export function downloadLetterPdf(
  candidateName: string,
  result: CoverLetterResult,
  contact: ContactDetails | null
): void {
  renderPdf(result, contact).save(`${buildFileName(candidateName, result)}.pdf`);
}

export async function downloadAllAsZip(
  candidateName: string,
  results: CoverLetterResult[],
  contact: ContactDetails | null
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
    zip.file(`${name}.pdf`, renderPdf(result, contact).output("blob"));
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
