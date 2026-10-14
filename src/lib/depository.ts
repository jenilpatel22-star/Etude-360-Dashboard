/**
 * Activity Depository: Excel import parsing, merge planning, and checklist
 * export (Excel + PDF). Parsing works on plain row arrays so it is testable
 * without a file; the spreadsheet libraries are loaded on demand.
 */
import type { DepositoryActivity, DepositoryItem, ID } from '@/types';
import { download } from './export';
import { formatDate, toISODate, today } from './dates';

// ------------------------------------------------------------------ columns
export const COLUMNS = ['code', 'name', 'category', 'description', 'item', 'quantity', 'unit', 'responsible', 'notes'] as const;
export type ColumnKey = (typeof COLUMNS)[number];

/** Header used in the template, followed by accepted alternatives (matched case-insensitively). */
export const COLUMN_HEADERS: Record<ColumnKey, string[]> = {
  code: ['Activity Code', 'Code', 'Activity ID', 'ID', 'Ref', 'Reference'],
  name: ['Activity', 'Activity Name', 'Activity Title', 'Name', 'Title'],
  category: ['Category', 'Type', 'Activity Type'],
  description: ['Description', 'Activity Description', 'Details'],
  item: ['Item', 'Items', 'Item Name', 'Checklist Item', 'Material', 'Materials', 'Requirement', 'Requirements'],
  quantity: ['Quantity', 'Qty', 'No.', 'Number', 'Count'],
  unit: ['Unit', 'Units', 'UOM'],
  responsible: ['Responsible', 'Owner', 'Assigned To', 'Person Responsible', 'Responsibility'],
  notes: ['Notes', 'Note', 'Remarks', 'Comments'],
};

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const HEADER_LOOKUP = new Map<string, ColumnKey>(
  (Object.entries(COLUMN_HEADERS) as [ColumnKey, string[]][]).flatMap(([k, names]) => names.map((n) => [norm(n), k] as const)),
);

export type Cell = string | number | boolean | Date | null | undefined;

const text = (c: Cell): string => {
  if (c === null || c === undefined) return '';
  if (c instanceof Date) return toISODate(c);
  return String(c).replace(/\s+$/g, '').replace(/^\s+/g, '');
};

// ------------------------------------------------------------------ parsing
export interface ImportIssue {
  row?: number; // 1-based spreadsheet row
  message: string;
}

export interface ParsedActivity {
  code: string;
  name: string;
  category: string;
  description: string;
  items: Omit<DepositoryItem, 'id'>[];
  firstRow: number;
}

export interface ParsedImport {
  sheetName: string;
  headerRow: number;
  columnsFound: ColumnKey[];
  activities: ParsedActivity[];
  errors: ImportIssue[];
  warnings: ImportIssue[];
  itemCount: number;
}

export const MAX_ROWS = 5000;

/** Find the header row (within the first 15 rows) that has both an activity and an item column. */
function findHeader(rows: Cell[][]): { index: number; map: Map<number, ColumnKey> } | null {
  for (let r = 0; r < Math.min(rows.length, 15); r++) {
    const map = new Map<number, ColumnKey>();
    rows[r].forEach((c, i) => {
      const key = HEADER_LOOKUP.get(norm(text(c)));
      if (key && ![...map.values()].includes(key)) map.set(i, key);
    });
    const keys = [...map.values()];
    if (keys.includes('name') && keys.includes('item')) return { index: r, map };
  }
  return null;
}

/**
 * Turn sheet rows into activities. One row per item; consecutive rows with a blank
 * activity cell belong to the activity above (the usual merged-cell layout). Rows with
 * the same code (or, without codes, the same name) are combined.
 */
export function parseRows(rows: Cell[][], sheetName = 'Sheet1'): ParsedImport {
  const result: ParsedImport = { sheetName, headerRow: 0, columnsFound: [], activities: [], errors: [], warnings: [], itemCount: 0 };
  const header = findHeader(rows);
  if (!header) {
    result.errors.push({
      message: 'Couldn’t find a header row with “Activity” and “Item” columns in the first 15 rows. Download the template to see the expected layout.',
    });
    return result;
  }
  result.headerRow = header.index + 1;
  result.columnsFound = [...header.map.values()];
  if (rows.length - header.index - 1 > MAX_ROWS) {
    result.errors.push({ message: `The sheet has more than ${MAX_ROWS.toLocaleString()} rows. Split it into smaller files.` });
    return result;
  }

  const byKey = new Map<string, ParsedActivity>();
  let current: ParsedActivity | null = null;

  for (let r = header.index + 1; r < rows.length; r++) {
    const rowNo = r + 1;
    const v = {} as Record<ColumnKey, string>;
    for (const k of COLUMNS) v[k] = '';
    header.map.forEach((key, col) => (v[key] = text(rows[r][col])));
    if (COLUMNS.every((k) => !v[k])) continue; // blank row

    if (v.name || v.code) {
      const key = v.code ? `code:${v.code.toLowerCase()}` : `name:${v.name.toLowerCase()}`;
      let act = byKey.get(key);
      if (!act) {
        if (!v.name) {
          result.errors.push({ row: rowNo, message: `Activity code “${v.code}” has no activity name.` });
          current = null;
          continue;
        }
        act = { code: v.code, name: v.name, category: v.category, description: v.description, items: [], firstRow: rowNo };
        byKey.set(key, act);
        result.activities.push(act);
      } else {
        if (v.name && act.name.toLowerCase() !== v.name.toLowerCase()) {
          result.warnings.push({ row: rowNo, message: `Code “${v.code}” is used for both “${act.name}” and “${v.name}”; rows were combined under “${act.name}”.` });
        }
        act.category ||= v.category;
        act.description ||= v.description;
      }
      current = act;
    } else if (!current) {
      result.errors.push({ row: rowNo, message: `Item “${v.item || '(blank)'}” has no activity above it. Fill in the Activity column.` });
      continue;
    }

    if (!v.item) {
      if (v.quantity || v.unit || v.responsible || v.notes) {
        result.warnings.push({ row: rowNo, message: 'Row has details but no item name; it was skipped.' });
      }
      continue;
    }
    const names = v.item
      .split(/\r?\n|;/)
      .map((s) => s.trim().replace(/^[-•*]\s*/, ''))
      .filter(Boolean);
    const single = names.length === 1;
    for (const name of names) {
      current!.items.push({
        name: name.slice(0, 300),
        quantity: single ? v.quantity : '',
        unit: single ? v.unit : '',
        responsible: v.responsible,
        notes: v.notes,
      });
      result.itemCount++;
    }
  }

  for (const a of result.activities) {
    if (!a.items.length) result.warnings.push({ row: a.firstRow, message: `“${a.name}” has no items.` });
  }
  if (!result.activities.length && !result.errors.length) result.errors.push({ message: 'No activities found below the header row.' });
  return result;
}

/** Read an .xlsx file. Uses a sheet named like “Activities”/“Depository” if present, else the first sheet. */
export async function parseExcelFile(file: File): Promise<ParsedImport> {
  if (!/\.xlsx$/i.test(file.name)) {
    throw new Error('Choose an Excel .xlsx file. Older .xls files: open in Excel and “Save As” .xlsx first.');
  }
  if (file.size > 10 * 1024 * 1024) throw new Error('The file is larger than 10 MB.');
  const { default: readXlsxFile } = await import('read-excel-file/browser');
  let sheets;
  try {
    sheets = await readXlsxFile(file);
  } catch {
    throw new Error('This file couldn’t be read as an Excel workbook. Check it opens in Excel and try again.');
  }
  if (!sheets.length) throw new Error('The workbook has no sheets.');
  const preferred = sheets.find((s) => /activit|depositor|checklist/i.test(s.sheet)) ?? sheets[0];
  return parseRows(preferred.data as Cell[][], preferred.sheet);
}

// ------------------------------------------------------------------ merge plan
export type ImportMode = 'merge' | 'replace';

export interface ImportPlan {
  create: Omit<DepositoryActivity, 'id'>[];
  update: { id: ID; patch: Partial<DepositoryActivity> }[];
  remove: ID[];
}

const newItemId = () => `ITM-${Math.random().toString(36).slice(2, 10)}`;
const matchKey = (a: { code: string; name: string }) => (a.code ? `code:${a.code.toLowerCase()}` : `name:${a.name.toLowerCase()}`);

/**
 * merge: activities with the same code (or name, when there's no code) are replaced by the
 * imported version; others are added; existing ones not in the file are kept.
 * replace: the whole depository is swapped for the file's contents.
 */
export function planImport(
  existing: DepositoryActivity[],
  parsed: ParsedActivity[],
  mode: ImportMode,
  meta: { sourceFile: string; importedBy: string },
): ImportPlan {
  const importedAt = new Date().toISOString();
  const toRecord = (p: ParsedActivity): Omit<DepositoryActivity, 'id'> => ({
    code: p.code,
    name: p.name,
    category: p.category,
    description: p.description,
    items: p.items.map((i) => ({ ...i, id: newItemId() })),
    sourceFile: meta.sourceFile,
    importedAt,
    importedBy: meta.importedBy,
  });
  if (mode === 'replace') return { create: parsed.map(toRecord), update: [], remove: existing.map((e) => e.id) };
  const byKey = new Map(existing.map((e) => [matchKey(e), e]));
  const plan: ImportPlan = { create: [], update: [], remove: [] };
  for (const p of parsed) {
    const match = byKey.get(matchKey(p));
    if (match) plan.update.push({ id: match.id, patch: toRecord(p) });
    else plan.create.push(toRecord(p));
  }
  return plan;
}

// ------------------------------------------------------------------ exports
type XCell = { value?: string | number; fontWeight?: 'bold'; backgroundColor?: string; textColor?: string; wrap?: boolean; align?: 'left' | 'center' | 'right'; alignVertical?: 'top' | 'center' | 'bottom'; fontSize?: number; borderColor?: string; borderStyle?: 'thin' } | null;

const headCell = (value: string): XCell => ({ value, fontWeight: 'bold', backgroundColor: '#1C5CAB', textColor: '#FFFFFF', alignVertical: 'center' });

async function xlsxBlob(sheets: { sheet: string; data: XCell[][]; columns: { width: number }[]; stickyRowsCount?: number }[]): Promise<Blob> {
  const { default: writeXlsxFile } = await import('write-excel-file/browser');
  // The library's overloads don't narrow well for a multi-sheet array; the shape matches its Sheet type.
  return (writeXlsxFile as unknown as (s: typeof sheets) => { toBlob(): Promise<Blob> })(sheets).toBlob();
}

/** The import template, with two clearly-marked example activities. */
export async function downloadTemplate() {
  const headers = COLUMNS.map((k) => COLUMN_HEADERS[k][0]);
  const ex = (...v: string[]): XCell[] => v.map((x) => (x ? { value: x, wrap: true, alignVertical: 'top' } : null));
  const data: XCell[][] = [
    headers.map(headCell),
    ex('EX-01', 'Example: Welcome & registration', 'Session', 'Delete these example rows before importing.', 'Name badges', '1 per participant', 'pcs', 'Programme office', ''),
    ex('', '', '', '', 'Attendance sheet', '2', 'copies', 'Programme office', 'Print the day before'),
    ex('', '', '', '', 'Welcome pack', '1 per participant', 'pack', 'Programme office', ''),
    ex('EX-02', 'Example: Outdoor team challenge', 'Workshop', 'Half-day outdoor exercise.', 'First aid kit', '1', 'kit', 'Facilitator', ''),
    ex('', '', '', '', 'Stopwatch; Whistle; Cones', '', '', 'Facilitator', 'One item per line or separated by ; also works'),
  ];
  const guide: XCell[][] = [
    [headCell('Column'), headCell('Required'), headCell('What to enter')],
    ...(
      [
        ['Activity Code', 'No', 'Short unique reference (e.g. ACT-014). Re-importing a code updates that activity.'],
        ['Activity', 'Yes', 'Activity name. Leave blank on following rows to add more items to the same activity.'],
        ['Category', 'No', 'e.g. Session, Workshop, Assessment, Field visit, Networking.'],
        ['Description', 'No', 'What the activity is.'],
        ['Item', 'Yes', 'One item per row (or several separated by ; or line breaks).'],
        ['Quantity / Unit', 'No', 'e.g. 20 / pcs, or “1 per participant”.'],
        ['Responsible', 'No', 'Who arranges the item.'],
        ['Notes', 'No', 'Anything else.'],
      ] as string[][]
    ).map((r) => r.map((v) => ({ value: v, wrap: true, alignVertical: 'top' as const }))),
  ];
  const blob = await xlsxBlob([
    { sheet: 'Activities', data, columns: [12, 30, 14, 34, 30, 16, 10, 20, 32].map((width) => ({ width })), stickyRowsCount: 1 },
    { sheet: 'How to fill', data: guide, columns: [{ width: 18 }, { width: 10 }, { width: 80 }] },
  ]);
  await download(blob, 'activity-depository-template.xlsx');
}

export interface ChecklistContext {
  preparedFor: string; // user display name + role
  ticked: Set<ID>; // item ids already ticked by this user
}

const checklistName = (acts: DepositoryActivity[], ext: string) =>
  `${acts.length === 1 ? `checklist-${(acts[0].code || acts[0].name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}` : 'activity-checklist'}-${toISODate(today())}.${ext}`;

/** Excel checklist: one row per item with Done / Checked by / Date columns to fill in. */
export async function downloadChecklistXlsx(acts: DepositoryActivity[], ctx: ChecklistContext) {
  const border = { borderColor: '#B7B6B0', borderStyle: 'thin' as const };
  const cell = (value: string, extra: Partial<NonNullable<XCell>> = {}): XCell => ({ value, wrap: true, alignVertical: 'top', ...border, ...extra });
  const data: XCell[][] = [
    [{ value: 'Activity checklist', fontWeight: 'bold', fontSize: 14 }],
    [{ value: `Prepared for ${ctx.preparedFor} · ${formatDate(today())} · ${acts.length} activit${acts.length === 1 ? 'y' : 'ies'}, ${acts.reduce((s, a) => s + a.items.length, 0)} items` }],
    [],
    ['Done', 'Activity Code', 'Activity', 'Category', 'Item', 'Quantity', 'Unit', 'Responsible', 'Notes', 'Checked by', 'Date'].map(headCell),
  ];
  for (const a of acts) {
    a.items.forEach((it, i) => {
      data.push([
        cell(ctx.ticked.has(it.id) ? '☑' : '☐', { align: 'center', fontSize: 13 }),
        cell(i === 0 ? a.code : ''),
        cell(i === 0 ? a.name : '', i === 0 ? { fontWeight: 'bold' } : {}),
        cell(i === 0 ? a.category : ''),
        cell(it.name),
        cell(it.quantity),
        cell(it.unit),
        cell(it.responsible),
        cell(it.notes),
        cell(''),
        cell(''),
      ]);
    });
    if (!a.items.length) data.push([cell(''), cell(a.code), cell(a.name, { fontWeight: 'bold' }), cell(a.category), cell('(no items)'), cell(''), cell(''), cell(''), cell(''), cell(''), cell('')]);
  }
  const blob = await xlsxBlob([
    { sheet: 'Checklist', data, columns: [7, 12, 28, 14, 32, 12, 9, 18, 28, 16, 12].map((width) => ({ width })), stickyRowsCount: 4 },
  ]);
  await download(blob, checklistName(acts, 'xlsx'));
}

/** Printable PDF checklist with tick boxes and a sign-off line per activity. */
export async function downloadChecklistPdf(acts: DepositoryActivity[], ctx: ChecklistContext) {
  const { jsPDF } = await import('jspdf');
  const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
  const W = pdf.internal.pageSize.getWidth();
  const H = pdf.internal.pageSize.getHeight();
  const M = 40;
  // column x positions: box, item, qty, unit, responsible, notes
  const cols = { box: M, item: M + 28, qty: M + 232, unit: M + 282, resp: M + 322, notes: M + 412 };
  const colW = { item: 194, qty: 46, unit: 36, resp: 86, notes: W - M - (M + 412) };
  let y = M;

  const footer = () => {
    const pages = pdf.getNumberOfPages();
    for (let p = 1; p <= pages; p++) {
      pdf.setPage(p);
      pdf.setFontSize(8);
      pdf.setTextColor(130);
      pdf.text(`Activity checklist · ${formatDate(today())}`, M, H - 20);
      pdf.text(`Page ${p} of ${pages}`, W - M, H - 20, { align: 'right' });
    }
  };
  const ensure = (h: number) => {
    if (y + h > H - 40) {
      pdf.addPage();
      y = M;
      return true;
    }
    return false;
  };
  const tableHead = () => {
    pdf.setFillColor(28, 92, 171);
    pdf.rect(M, y, W - 2 * M, 18, 'F');
    pdf.setTextColor(255);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8.5);
    pdf.text('Done', cols.box + 1, y + 12);
    pdf.text('Item', cols.item + 4, y + 12);
    pdf.text('Qty', cols.qty, y + 12);
    pdf.text('Unit', cols.unit, y + 12);
    pdf.text('Responsible', cols.resp, y + 12);
    pdf.text('Notes', cols.notes, y + 12);
    y += 18;
  };

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(18);
  pdf.setTextColor(20);
  pdf.text('Activity checklist', M, y + 8);
  y += 24;
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9.5);
  pdf.setTextColor(90);
  pdf.text(`Prepared for ${ctx.preparedFor} · ${formatDate(today())} · ${acts.length} activit${acts.length === 1 ? 'y' : 'ies'}`, M, y);
  y += 22;

  for (const a of acts) {
    const descLines = a.description ? pdf.splitTextToSize(a.description, W - 2 * M) : [];
    ensure(60 + descLines.length * 11);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(12);
    pdf.setTextColor(20);
    pdf.text(`${a.code ? `${a.code} · ` : ''}${a.name}`, M, y + 10);
    y += 16;
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.setTextColor(100);
    const meta = [a.category, `${a.items.length} item${a.items.length === 1 ? '' : 's'}`].filter(Boolean).join(' · ');
    pdf.text(meta, M, y + 8);
    y += 13;
    if (descLines.length) {
      pdf.setTextColor(60);
      pdf.text(descLines, M, y + 8);
      y += descLines.length * 11;
    }
    y += 6;
    tableHead();
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    a.items.forEach((it, i) => {
      const lines = {
        item: pdf.splitTextToSize(it.name, colW.item - 6),
        qty: pdf.splitTextToSize(it.quantity, colW.qty - 4),
        unit: pdf.splitTextToSize(it.unit, colW.unit - 2),
        resp: pdf.splitTextToSize(it.responsible, colW.resp - 4),
        notes: pdf.splitTextToSize(it.notes, colW.notes - 2),
      };
      const rowH = Math.max(18, 7 + 11 * Math.max(...Object.values(lines).map((l: string[]) => l.length || 1)));
      if (ensure(rowH)) tableHead();
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      if (i % 2 === 1) {
        pdf.setFillColor(245, 245, 243);
        pdf.rect(M, y, W - 2 * M, rowH, 'F');
      }
      // tick box
      pdf.setDrawColor(90);
      pdf.setLineWidth(0.8);
      pdf.rect(cols.box + 4, y + 4, 10, 10);
      if (ctx.ticked.has(it.id)) {
        pdf.setLineWidth(1.4);
        pdf.line(cols.box + 6, y + 9, cols.box + 8.5, y + 12);
        pdf.line(cols.box + 8.5, y + 12, cols.box + 13, y + 6);
      }
      pdf.setTextColor(25);
      pdf.text(lines.item, cols.item + 4, y + 12);
      pdf.setTextColor(70);
      pdf.text(lines.qty, cols.qty, y + 12);
      pdf.text(lines.unit, cols.unit, y + 12);
      pdf.text(lines.resp, cols.resp, y + 12);
      pdf.text(lines.notes, cols.notes, y + 12);
      pdf.setDrawColor(225);
      pdf.setLineWidth(0.5);
      pdf.line(M, y + rowH, W - M, y + rowH);
      y += rowH;
    });
    if (!a.items.length) {
      pdf.setTextColor(120);
      pdf.text('No items listed.', cols.item + 4, y + 12);
      y += 18;
    }
    ensure(34);
    y += 18;
    pdf.setTextColor(110);
    pdf.setFontSize(8.5);
    pdf.text('Checked by: ______________________________      Date: ______________      Signature: ______________________', M, y);
    y += 26;
  }
  footer();
  await download(pdf.output('blob'), checklistName(acts, 'pdf'));
}
