import ExcelJS from 'exceljs';
import { CellValue, parseCsv, tableToRows, RawRow } from './schedule';

function excelCell(v: ExcelJS.CellValue): CellValue {
  if (v === null || v === undefined) return null;
  if (v instanceof Date || typeof v === 'string' || typeof v === 'number') return v;
  if (typeof v === 'boolean') return String(v);
  if (typeof v === 'object') {
    if ('richText' in v) return v.richText.map((t) => t.text).join('');
    if ('result' in v) return excelCell((v as any).result);
    if ('text' in v) return String((v as any).text);
  }
  return String(v);
}

/** Read an uploaded CSV/XLSX schedule into rows keyed by column name. */
export async function readScheduleFile(
  fileName: string,
  buffer: Buffer
): Promise<{ rows: { rowNumber: number; data: RawRow }[]; missing: string[]; sheet?: string }> {
  const isXlsx = /\.xlsx$/i.test(fileName) || (buffer[0] === 0x50 && buffer[1] === 0x4b); // "PK" zip header
  if (!isXlsx) {
    return tableToRows(parseCsv(buffer.toString('utf8')));
  }

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer as any);
  let best: { rows: { rowNumber: number; data: RawRow }[]; missing: string[]; sheet?: string } = {
    rows: [],
    missing: ['SessionDate', 'CampusID', 'CourseID', 'CourseName', 'TimeSlots', 'RoomID'],
  };
  // Use the first sheet that has the schedule columns (workbooks may carry notes sheets).
  for (const ws of wb.worksheets) {
    const table: CellValue[][] = [];
    ws.eachRow({ includeEmpty: true }, (row, rowNumber) => {
      const values = row.values as ExcelJS.CellValue[]; // 1-based
      table[rowNumber - 1] = values.slice(1).map(excelCell);
    });
    for (let i = 0; i < table.length; i++) if (!table[i]) table[i] = [];
    const result = tableToRows(table);
    if (result.missing.length === 0) return { ...result, sheet: ws.name };
    if (result.missing.length < best.missing.length) best = { ...result, sheet: ws.name };
  }
  return best;
}
