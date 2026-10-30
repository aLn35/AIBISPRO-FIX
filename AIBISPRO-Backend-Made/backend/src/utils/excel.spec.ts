import ExcelJS from "exceljs";
import { mkdtemp, rm } from "fs/promises";
import os from "os";
import path from "path";
import { readExcelRows } from "./excel";

describe("readExcelRows", () => {
  let tempDirectory: string;

  beforeEach(async () => {
    tempDirectory = await mkdtemp(path.join(os.tmpdir(), "aibispro-excel-"));
  });

  afterEach(async () => {
    await rm(tempDirectory, { recursive: true, force: true });
  });

  it("reads the first worksheet as header-keyed rows", async () => {
    const filePath = path.join(tempDirectory, "sample.xlsx");
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Sales");
    worksheet.addRow(["Product", "Quantity", "Price"]);
    worksheet.addRow(["Coffee", 3, 25000]);
    worksheet.addRow(["Tea", 2, 18000]);
    await workbook.xlsx.writeFile(filePath);

    await expect(readExcelRows(filePath)).resolves.toEqual([
      { Product: "Coffee", Quantity: 3, Price: 25000 },
      { Product: "Tea", Quantity: 2, Price: 18000 },
    ]);
  });
});
