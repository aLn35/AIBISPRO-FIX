import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

import * as fs from "fs";
import { Readable } from "stream";
import csv from "csv-parser";
import ExcelJS from "exceljs";
import { addRowsWorksheet, readExcelRows } from "../utils/excel";

function normalizeKey(k: string): string {
  return k.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function pick(row: Record<string, any>, aliases: string[]): any {
  const normKeys = Object.keys(row).map((k) => ({
    orig: k,
    norm: normalizeKey(k),
  }));
  for (const alias of aliases) {
    const match = normKeys.find((k) => k.norm === alias);
    if (match && row[match.orig] !== undefined && row[match.orig] !== "")
      return row[match.orig];
  }
  return undefined;
}

function parseMoney(v: any): number | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  let s = String(v).trim();
  if (!s) return undefined;

  const isIDR = /rp/i.test(s);
  s = s.replace(/[^0-9.,\-]/g, "");
  if (!s) return undefined;

  const thousandsGroupPattern = /^-?\d{1,3}(\.\d{3})+$/;

  if (isIDR) {
    s = s.replace(/\./g, "").replace(",", ".");
  } else if (thousandsGroupPattern.test(s) && !s.includes(",")) {
    s = s.replace(/\./g, "");
  } else {
    s = s.replace(/,/g, "");
  }

  const n = parseFloat(s);
  return isNaN(n) ? undefined : n;
}

function parseQty(v: any): number | undefined {
  const n = parseMoney(v);
  return n === undefined ? undefined : Math.round(n);
}

const PRODUCT_ALIASES = [
  "product",
  "productname",
  "item",
  "itemname",
  "ingredient",
];
const QTY_ALIASES = ["quantity", "qty", "qnty", "orderqty"];
const SUPPLIER_ALIASES = ["supplier", "suppliername", "vendor", "vendorname"];
const COST_ALIASES = ["estimatedcost", "totalcost", "cost", "price", "amount"];
const NOTES_ALIASES = ["notes", "note", "remarks", "description", "reason"];
const STATUS_ALIASES = ["status"];
const DATE_ALIASES = ["date", "requestdate", "submitteddate", "submittedon"];

@Injectable()
export class RestockRequestsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    company_id: number;
    product_size_id?: number;
    product_name: string;
    quantity: number;
    supplier_name?: string;
    estimated_cost?: number;
    notes?: string;
    initiated_by: number;
    initiated_by_role: string;
  }) {
    return this.prisma.restock_requests.create({ data });
  }

  async findAll(companyId?: number) {
    return this.prisma.restock_requests.findMany({
      where: companyId ? { company_id: companyId } : undefined,
      orderBy: { created_at: "desc" },
      include: {
        initiator: { select: { id: true, name: true, role: true } },
        reviewer: { select: { id: true, name: true } },
      },
    });
  }

  async findOne(id: number) {
    return this.prisma.restock_requests.findUnique({ where: { id } });
  }

  /** Bidirectional review: whoever did NOT initiate the request is the one who can review it
   * (Manager submits -> Owner reviews; Owner submits -> Manager reviews). MAINTAINANCE can
   * review anything for oversight/cleanup purposes. Approving a request with a resolved
   * product_size_id also bumps real stock, mirroring the existing instant "stock-in" endpoint. */
  async review(
    id: number,
    reviewerId: number,
    reviewerRole: string,
    approve: boolean,
    reviewNote?: string,
  ) {
    const request = await this.prisma.restock_requests.findUnique({
      where: { id },
    });
    if (!request) throw new NotFoundException("Restock request not found");
    if (request.status !== "pending")
      throw new BadRequestException("This request has already been reviewed");
    if (
      reviewerRole !== "MAINTAINANCE" &&
      request.initiated_by_role === reviewerRole
    ) {
      throw new ForbiddenException(
        "You cannot review your own restock request",
      );
    }

    if (approve && request.product_size_id) {
      const size = await this.prisma.product_sizes.findUnique({
        where: { id: request.product_size_id },
      });
      if (size) {
        await this.prisma.product_sizes.update({
          where: { id: request.product_size_id },
          data: { current_stock: (size.current_stock ?? 0) + request.quantity },
        });
        await this.prisma.inventory_logs.create({
          data: {
            product_size_id: request.product_size_id,
            movement_type: "IN",
            quantity: request.quantity,
            notes: `Restock request #${id} approved${request.supplier_name ? ` (supplier: ${request.supplier_name})` : ""}`,
          },
        });
      }
    }

    return this.prisma.restock_requests.update({
      where: { id },
      data: {
        status: approve ? "approved" : "rejected",
        reviewed_by: reviewerId,
        reviewed_at: new Date(),
        review_note: reviewNote,
      },
    });
  }

  async remove(id: number) {
    return this.prisma.restock_requests.delete({ where: { id } });
  }

  async parseCsv(filePath: string): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const results: any[] = [];
      let raw = fs.readFileSync(filePath, "utf8");
      if (raw.charCodeAt(0) === 0xfeff) raw = raw.slice(1);

      Readable.from(raw)
        .pipe(csv())
        .on("data", (data) => results.push(data))
        .on("end", () => resolve(results))
        .on("error", (error) => reject(error));
    });
  }

  async parseExcel(filePath: string): Promise<any[]> {
    return readExcelRows(filePath);
  }

  /** Parses each spreadsheet row into a real restock_requests record (source: 'import'),
   * honoring a status column if present (pending/approved/rejected) - this is meant for
   * bringing historical purchase-order records into the system, not for triggering live
   * approval side effects, so it never touches real stock even for rows marked "approved".
   * Rows that match an existing record (or another row earlier in the same file) on product +
   * quantity + supplier + date are skipped as duplicates rather than creating a second copy. */
  async importRows(
    rows: any[],
    companyId: number,
    importedBy: number,
    importedByRole: string,
  ) {
    const imported: any[] = [];
    const failed: { row: any; reason: string }[] = [];
    const duplicates: { row: any; reason: string }[] = [];

    const existing = await this.prisma.restock_requests.findMany({
      where: { company_id: companyId },
      select: {
        product_name: true,
        quantity: true,
        supplier_name: true,
        created_at: true,
      },
    });
    const seenSignatures = new Set(
      existing.map((e) =>
        this.buildDuplicateSignature(
          e.product_name,
          e.quantity,
          e.supplier_name,
          e.created_at,
        ),
      ),
    );

    for (const raw of rows) {
      const product = pick(raw, PRODUCT_ALIASES);
      const quantity = parseQty(pick(raw, QTY_ALIASES));

      if (!product) {
        failed.push({ row: raw, reason: "No product name column found" });
        continue;
      }
      if (!quantity || quantity <= 0) {
        failed.push({ row: raw, reason: "Missing or invalid quantity" });
        continue;
      }

      const statusRaw = String(pick(raw, STATUS_ALIASES) ?? "")
        .toLowerCase()
        .trim();
      const status = ["approved", "rejected", "pending"].includes(statusRaw)
        ? statusRaw
        : "pending";
      const dateRaw = pick(raw, DATE_ALIASES);
      const parsedDate = dateRaw ? new Date(dateRaw) : new Date();
      const effectiveDate = isNaN(parsedDate.getTime())
        ? new Date()
        : parsedDate;
      const supplier = pick(raw, SUPPLIER_ALIASES);
      const notes = pick(raw, NOTES_ALIASES);
      const productName = String(product).trim();
      const supplierName = supplier ? String(supplier).trim() : null;

      const signature = this.buildDuplicateSignature(
        productName,
        quantity,
        supplierName,
        effectiveDate,
      );
      if (seenSignatures.has(signature)) {
        duplicates.push({
          row: raw,
          reason: `Duplicate of an existing record - same product, quantity, supplier, and date (${productName})`,
        });
        continue;
      }
      seenSignatures.add(signature);

      const created = await this.prisma.restock_requests.create({
        data: {
          company_id: companyId,
          product_name: productName,
          quantity,
          supplier_name: supplierName ?? undefined,
          estimated_cost: parseMoney(pick(raw, COST_ALIASES)),
          notes: notes ? String(notes).trim() : undefined,
          status,
          initiated_by: importedBy,
          initiated_by_role: importedByRole,
          source: "import",
          created_at: effectiveDate,
          reviewed_by: status !== "pending" ? importedBy : undefined,
          reviewed_at: status !== "pending" ? new Date() : undefined,
        },
      });
      imported.push(created);
    }

    return { imported, failed, duplicates };
  }

  /** Same product + quantity + supplier + calendar date = the same real-world restock event,
   * regardless of which row/file it came from. Case/whitespace-insensitive on text fields. */
  private buildDuplicateSignature(
    productName: string,
    quantity: number,
    supplierName: string | null,
    date: Date | null,
  ): string {
    const dateKey =
      !date || isNaN(date.getTime()) ? "" : date.toISOString().split("T")[0];
    return `${productName.toLowerCase().trim()}|${quantity}|${(supplierName ?? "").toLowerCase().trim()}|${dateKey}`;
  }

  /** Full Approval Center export - one workbook, one sheet per approval type, each with its own
   * complete, type-specific column set (not squeezed into a shared generic schema) so every
   * detail visible in the unified history list is also present in the download. */
  async exportToWorkbook(companyId: number): Promise<Buffer> {
    const [restockRows, bundleRows, promoRows] = await Promise.all([
      this.prisma.restock_requests.findMany({
        where: { company_id: companyId },
        orderBy: { created_at: "desc" },
        include: {
          initiator: { select: { name: true } },
          reviewer: { select: { name: true } },
        },
      }),
      this.prisma.bundle_proposals.findMany({
        where: { company_id: companyId },
        orderBy: { created_at: "desc" },
        include: {
          creator: { select: { name: true } },
          reviewer: { select: { name: true } },
        },
      }),
      this.prisma.promotions.findMany({
        where: { company_id: companyId },
        orderBy: { created_at: "desc" },
        include: {
          users_promotions_created_byTousers: { select: { name: true } },
          users_promotions_approved_byTousers: { select: { name: true } },
        },
      }),
    ]);

    const restockData = restockRows.map((r) => ({
      ID: r.id,
      Product: r.product_name,
      Quantity: r.quantity,
      Supplier: r.supplier_name ?? "",
      "Estimated Cost": r.estimated_cost ?? "",
      Status: r.status,
      "Initiated By": r.initiator?.name ?? "",
      "Initiated Role": r.initiated_by_role,
      "Reviewed By": r.reviewer?.name ?? "",
      "Reviewed At": r.reviewed_at ? r.reviewed_at.toISOString() : "",
      "Review Note": r.review_note ?? "",
      Source: r.source,
      Notes: r.notes ?? "",
      Date: r.created_at ? r.created_at.toISOString() : "",
    }));

    const bundleData = bundleRows.map((b) => ({
      ID: b.id,
      Name: b.name,
      Products: Array.isArray(b.product_names)
        ? (b.product_names as string[]).join(", ")
        : "",
      "Regular Price": b.regular_price,
      "Bundle Price": b.bundle_price,
      "Discount %":
        b.regular_price > 0
          ? Math.round(
              ((b.regular_price - b.bundle_price) / b.regular_price) * 100,
            )
          : 0,
      Status: b.status,
      Strategy: b.strategy ?? "",
      "Created By": b.creator?.name ?? "",
      "Reviewed By": b.reviewer?.name ?? "",
      "Reviewed At": b.reviewed_at ? b.reviewed_at.toISOString() : "",
      "Review Note": b.review_note ?? "",
      Date: b.created_at ? b.created_at.toISOString() : "",
    }));

    const promoData = promoRows.map((p) => ({
      ID: p.id,
      Title: p.title,
      Description: p.description ?? "",
      "Discount %": p.discount_percent ?? "",
      Status: p.status ?? "",
      "Start Date": p.start_date
        ? p.start_date.toISOString().split("T")[0]
        : "",
      "End Date": p.end_date ? p.end_date.toISOString().split("T")[0] : "",
      "Created By": p.users_promotions_created_byTousers?.name ?? "",
      "Approved By": p.users_promotions_approved_byTousers?.name ?? "",
      Date: p.created_at ? p.created_at.toISOString() : "",
    }));

    const workbook = new ExcelJS.Workbook();
    addRowsWorksheet(workbook, "Restock Requests", restockData);
    addRowsWorksheet(workbook, "Combo Bundles", bundleData);
    addRowsWorksheet(workbook, "Promotions", promoData);
    return Buffer.from(await workbook.xlsx.writeBuffer());
  }
}
