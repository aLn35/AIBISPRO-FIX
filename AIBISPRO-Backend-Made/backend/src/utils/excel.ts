import ExcelJS from "exceljs";

function normalizeCellValue(value: unknown): unknown {
  if (value === null || value === undefined) return "";
  if (value instanceof Date || typeof value !== "object") return value;

  const cellValue = value as Record<string, unknown>;
  if ("result" in cellValue) return cellValue.result ?? "";
  if (typeof cellValue.text === "string") return cellValue.text;
  if (Array.isArray(cellValue.richText)) {
    return cellValue.richText
      .map((part) => (part as { text?: string }).text ?? "")
      .join("");
  }
  return value;
}

export async function readExcelRows(filePath: string): Promise<Record<string, unknown>[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);

  const worksheet = workbook.worksheets[0];
  if (!worksheet) return [];

  const headerRow = worksheet.getRow(1);
  const rows: Record<string, unknown>[] = [];

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;

    const data: Record<string, unknown> = {};
    headerRow.eachCell((headerCell, columnNumber) => {
      const header = String(normalizeCellValue(headerCell.value)).trim();
      if (header) data[header] = normalizeCellValue(row.getCell(columnNumber).value);
    });

    if (Object.values(data).some((value) => value !== "")) rows.push(data);
  });

  return rows;
}

export function addRowsWorksheet(
  workbook: ExcelJS.Workbook,
  name: string,
  rows: Record<string, unknown>[],
): void {
  const worksheet = workbook.addWorksheet(name);
  const headers = [...new Set(rows.flatMap((row) => Object.keys(row)))];
  if (headers.length === 0) return;

  worksheet.columns = headers.map((header) => ({ header, key: header }));
  worksheet.addRows(rows);
}
