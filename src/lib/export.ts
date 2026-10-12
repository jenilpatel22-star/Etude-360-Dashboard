/** Client-side export helpers (CSV + PDF). Heavy PDF libs are loaded on demand. */

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const escapeCsv = (v: unknown) => {
  const s = v === null || v === undefined ? '' : String(v);
  // Neutralise spreadsheet formula injection, then quote.
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};

export function exportCsv(filename: string, rows: Record<string, unknown>[], columns?: string[]) {
  const cols = columns ?? Object.keys(rows[0] ?? {});
  const lines = [cols.map(escapeCsv).join(','), ...rows.map((r) => cols.map((c) => escapeCsv(r[c])).join(','))];
  download(new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8' }), filename);
}

/**
 * Render a DOM element to a multi-page A4 PDF. Elements marked
 * `data-export-ignore` (buttons, filters) are hidden in the capture.
 */
export async function exportElementToPdf(el: HTMLElement, filename: string, title?: string) {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import('html2canvas'), import('jspdf')]);
  const bg = getComputedStyle(document.body).backgroundColor || '#ffffff';
  const canvas = await html2canvas(el, {
    scale: 1.6,
    backgroundColor: bg,
    useCORS: true,
    ignoreElements: (node) => node instanceof HTMLElement && node.dataset.exportIgnore !== undefined,
  });
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const margin = 28;
  const headerH = title ? 28 : 0;
  const imgW = pageW - margin * 2;
  const scale = imgW / canvas.width;
  const sliceHpx = Math.floor((pageH - margin * 2 - headerH) / scale);

  let y = 0;
  let page = 0;
  while (y < canvas.height) {
    const h = Math.min(sliceHpx, canvas.height - y);
    const slice = document.createElement('canvas');
    slice.width = canvas.width;
    slice.height = h;
    slice.getContext('2d')!.drawImage(canvas, 0, y, canvas.width, h, 0, 0, canvas.width, h);
    if (page > 0) pdf.addPage();
    pdf.setFillColor(bg);
    if (title) {
      pdf.setFontSize(10);
      pdf.setTextColor(120);
      pdf.text(`${title} · page ${page + 1}`, margin, margin);
    }
    pdf.addImage(slice.toDataURL('image/jpeg', 0.88), 'JPEG', margin, margin + headerH, imgW, h * scale, undefined, 'FAST');
    y += h;
    page += 1;
  }
  pdf.save(filename);
}

export const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
