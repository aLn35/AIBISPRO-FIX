import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

import * as fs from 'fs';
import { Readable } from 'stream';
import csv from 'csv-parser';
import * as XLSX from 'xlsx';

function normalizeKey(k: string): string {
  return k.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/** Reads a field from a row using a list of normalized-header aliases, in priority order. */
function pick(row: Record<string, any>, aliases: string[]): any {
  const normKeys = Object.keys(row).map((k) => ({ orig: k, norm: normalizeKey(k) }));
  for (const alias of aliases) {
    const match = normKeys.find((k) => k.norm === alias);
    if (match && row[match.orig] !== undefined && row[match.orig] !== '') return row[match.orig];
  }
  return undefined;
}

/**
 * Parses money values in either US format ("$4.00" - dot decimal, comma thousands) or
 * Indonesian format ("Rp 64.000" - dot thousands, comma decimal - this app is IDR-denominated
 * throughout, so an explicit "Rp" prefix or a plain "12.345" / "1.250.000"-style value with no
 * decimal is assumed Indonesian rather than misread as 12.345 dollars).
 */
function parseMoney(v: any): number | undefined {
  if (v === undefined || v === null || v === '') return undefined;
  let s = String(v).trim();
  if (!s) return undefined;

  const isIDR = /rp/i.test(s);
  s = s.replace(/[^0-9.,\-]/g, '');
  if (!s) return undefined;

  const thousandsGroupPattern = /^-?\d{1,3}(\.\d{3})+$/;

  if (isIDR) {
    s = s.replace(/\./g, '').replace(',', '.');
  } else if (thousandsGroupPattern.test(s) && !s.includes(',')) {
    s = s.replace(/\./g, '');
  } else {
    s = s.replace(/,/g, '');
  }

  const n = parseFloat(s);
  return isNaN(n) ? undefined : n;
}

function parseQty(v: any): number | undefined {
  const n = parseMoney(v);
  return n === undefined ? undefined : Math.round(n);
}

interface ResolvedRow {
  raw: Record<string, any>;
  product: string;
  category?: string;
  size?: string;
  quantity: number;
  unitPrice?: number;
  cost?: number;
  discount?: number;
  total?: number;
  paymentMethod: string;
  transactionId?: string;
  date?: Date;
}

const PRODUCT_ALIASES = ['product', 'productname', 'item', 'itemname', 'menuitem', 'menu'];
const CATEGORY_ALIASES = ['category', 'cat'];
const SIZE_ALIASES = ['size', 'variant', 'sizename'];
const QTY_ALIASES = ['quantity', 'qty', 'qnty'];
const UNIT_PRICE_ALIASES = ['unitpriceidr', 'unitprice', 'price', 'unitcost'];
const COST_ALIASES = ['costidr', 'cost', 'cogs'];
const DISCOUNT_ALIASES = ['discountidr', 'discount'];
const TOTAL_ALIASES = ['totalidr', 'total', 'totalamount', 'grandtotal'];
const PAYMENT_ALIASES = ['paymentmethod', 'paymenttype', 'payment', 'paymentid'];
const TRANSACTION_ID_ALIASES = ['transactionid', 'transaction', 'trxid', 'orderid', 'receiptid'];
const DATE_ALIASES = ['date', 'transactiondate'];
const TIME_ALIASES = ['time'];

function resolveRow(raw: Record<string, any>): { row?: ResolvedRow; reason?: string } {
  const product = pick(raw, PRODUCT_ALIASES);
  const quantity = parseQty(pick(raw, QTY_ALIASES));

  if (!product) return { reason: 'No product name column found' };
  if (!quantity || quantity <= 0) return { reason: 'Missing or invalid quantity' };

  const dateStr = pick(raw, DATE_ALIASES);
  const timeStr = pick(raw, TIME_ALIASES);
  let date: Date | undefined;
  if (dateStr) {
    const combined = timeStr ? `${dateStr}T${timeStr}` : dateStr;
    const parsed = new Date(combined);
    if (!isNaN(parsed.getTime())) date = parsed;
  }

  return {
    row: {
      raw,
      product: String(product).trim(),
      category: pick(raw, CATEGORY_ALIASES) ? String(pick(raw, CATEGORY_ALIASES)).trim() : undefined,
      size: pick(raw, SIZE_ALIASES) ? String(pick(raw, SIZE_ALIASES)).trim() : undefined,
      quantity,
      unitPrice: parseMoney(pick(raw, UNIT_PRICE_ALIASES)),
      cost: parseMoney(pick(raw, COST_ALIASES)),
      discount: parseMoney(pick(raw, DISCOUNT_ALIASES)),
      total: parseMoney(pick(raw, TOTAL_ALIASES)),
      paymentMethod: pick(raw, PAYMENT_ALIASES) ? String(pick(raw, PAYMENT_ALIASES)).trim() : 'unknown',
      transactionId: pick(raw, TRANSACTION_ID_ALIASES) ? String(pick(raw, TRANSACTION_ID_ALIASES)).trim() : undefined,
      date,
    },
  };
}

const DEFAULT_SIZE_NAME = 'Standard';
const PLACEHOLDER_STOCK = 999;
const PLACEHOLDER_MIN_STOCK = 10;
const FALLBACK_CATEGORY_NAME = 'Imported';
const MAX_PREVIEW_ROWS = 500;

@Injectable()
export class UploadService {
  constructor(private readonly prisma: PrismaService) {}

  async createDataset(fileName: string, uploadedBy: number, companyId: number) {
    return this.prisma.datasets.create({
      data: {
        file_name: fileName,
        uploaded_by: uploadedBy,
        company_id: companyId,
        status: 'processing',
      },
    });
  }

  async updateDatasetStatus(id: number, status: string, rowCount?: number, rawData?: any[]) {
    return this.prisma.datasets.update({
      where: { id },
      data: {
        status,
        ...(rowCount !== undefined ? { row_count: rowCount } : {}),
        ...(rawData !== undefined ? { raw_data: rawData.slice(0, MAX_PREVIEW_ROWS) } : {}),
      },
    });
  }

  async getHistory(companyId?: number) {
    return this.prisma.datasets.findMany({
      where: companyId ? { company_id: companyId } : undefined,
      orderBy: { uploaded_at: 'desc' },
      select: {
        id: true,
        file_name: true,
        uploaded_at: true,
        row_count: true,
        status: true,
        company_id: true,
        users: { select: { name: true, email: true } },
      },
    });
  }

  async getDatasetDetail(id: number) {
    return this.prisma.datasets.findUnique({ where: { id } });
  }

  /**
   * Deletes an uploaded dataset AND the sales/sale_items it created, so an accidental
   * double-upload can be fully undone rather than just hiding the log entry. Sales made
   * through other flows (seed data, POS, manual entry) never have a dataset_id and are
   * untouched.
   */
  async deleteDataset(id: number) {
    const saleIds = (
      await this.prisma.sales.findMany({ where: { dataset_id: id }, select: { id: true } })
    ).map((s) => s.id);

    const [deletedItems, deletedSales] = await this.prisma.$transaction([
      this.prisma.sale_items.deleteMany({ where: { sale_id: { in: saleIds } } }),
      this.prisma.sales.deleteMany({ where: { dataset_id: id } }),
      this.prisma.datasets.delete({ where: { id } }),
    ] as const);

    return { salesDeleted: deletedSales.count, saleItemsDeleted: deletedItems.count };
  }

  async parseCsv(filePath: string): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const results: any[] = [];
      let raw = fs.readFileSync(filePath, 'utf8');
      if (raw.charCodeAt(0) === 0xfeff) raw = raw.slice(1);

      Readable.from(raw)
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', () => resolve(results))
        .on('error', (error) => reject(error));
    });
  }

  async parseExcel(filePath: string): Promise<any[]> {
    const workbook = XLSX.readFile(filePath);
    const firstSheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[firstSheetName];
    return XLSX.utils.sheet_to_json(sheet, { defval: '' });
  }

  /**
   * Flexible sales importer scoped to a single company: matches whatever column names/casing
   * the file uses, and auto-creates categories/products/sizes (within that company) that don't
   * already exist. Rows sharing the same transaction/order ID column are grouped into one sale
   * with multiple line items (so market-basket analysis has real multi-item baskets to work with).
   */
  async importSales(rows: any[], companyId: number, datasetId?: number) {
    const imported: any[] = [];
    const failed: { row: any; reason: string }[] = [];
    const newProductNames = new Set<string>();
    const newCategoryNames = new Set<string>();

    const categories = await this.prisma.categories.findMany({ where: { company_id: companyId } });
    const categoryByName = new Map<string, number>(categories.map((c) => [c.name.toLowerCase(), c.id]));

    const products = await this.prisma.products.findMany({ where: { company_id: companyId }, include: { product_sizes: true } });
    const productByName = new Map<
      string,
      { id: number; sizes: Map<string, { id: number; selling_price: number }> }
    >(
      products.map((p) => [
        p.name.toLowerCase(),
        { id: p.id, sizes: new Map(p.product_sizes.map((s) => [s.size_name.toLowerCase(), { id: s.id, selling_price: s.selling_price }])) },
      ]),
    );

    const groups = new Map<string, ResolvedRow[]>();
    let anonymousIndex = 0;
    for (const raw of rows) {
      const { row, reason } = resolveRow(raw);
      if (!row) {
        failed.push({ row: raw, reason: reason ?? 'Could not parse row' });
        continue;
      }
      const key = row.transactionId || `__row_${anonymousIndex++}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(row);
    }

    for (const [, groupRows] of groups) {
      try {
        const saleItemsData: {
          product_id: number;
          product_size_id: number;
          quantity: number;
          unit_price: number;
          subtotal: number;
        }[] = [];

        for (const row of groupRows) {
          const productKey = row.product.toLowerCase();
          let productEntry = productByName.get(productKey);

          if (!productEntry) {
            let categoryId: number | undefined;
            if (row.category) {
              const catKey = row.category.toLowerCase();
              categoryId = categoryByName.get(catKey);
              if (categoryId === undefined) {
                const newCat = await this.prisma.categories.create({ data: { name: row.category, company_id: companyId } });
                categoryByName.set(catKey, newCat.id);
                categoryId = newCat.id;
                newCategoryNames.add(row.category);
              }
            } else {
              const fallbackKey = FALLBACK_CATEGORY_NAME.toLowerCase();
              categoryId = categoryByName.get(fallbackKey);
              if (categoryId === undefined) {
                const newCat = await this.prisma.categories.create({ data: { name: FALLBACK_CATEGORY_NAME, company_id: companyId } });
                categoryByName.set(fallbackKey, newCat.id);
                categoryId = newCat.id;
              }
            }

            const newProduct = await this.prisma.products.create({
              data: { name: row.product, category_id: categoryId, company_id: companyId, is_active: true },
            });
            productEntry = { id: newProduct.id, sizes: new Map() };
            productByName.set(productKey, productEntry);
            newProductNames.add(row.product);
          }

          const sizeName = row.size || DEFAULT_SIZE_NAME;
          const sizeKey = sizeName.toLowerCase();
          let sizeEntry = productEntry.sizes.get(sizeKey);

          const unitPrice = row.unitPrice ?? (row.total ? row.total / row.quantity : undefined) ?? 0;

          if (!sizeEntry) {
            const newSize = await this.prisma.product_sizes.create({
              data: {
                product_id: productEntry.id,
                size_name: sizeName,
                selling_price: unitPrice,
                cost_price: row.cost,
                current_stock: PLACEHOLDER_STOCK,
                minimum_stock: PLACEHOLDER_MIN_STOCK,
              },
            });
            sizeEntry = { id: newSize.id, selling_price: newSize.selling_price };
            productEntry.sizes.set(sizeKey, sizeEntry);
          }

          const subtotal = row.total ?? unitPrice * row.quantity - (row.discount ?? 0);

          saleItemsData.push({
            product_id: productEntry.id,
            product_size_id: sizeEntry.id,
            quantity: row.quantity,
            unit_price: unitPrice,
            subtotal,
          });
        }

        const totalAmount = saleItemsData.reduce((s, i) => s + i.subtotal, 0);
        const totalItems = saleItemsData.reduce((s, i) => s + i.quantity, 0);
        const transactionDate = groupRows.find((r) => r.date)?.date ?? new Date();
        const paymentMethod = groupRows[0].paymentMethod;

        const sale = await this.prisma.sales.create({
          data: {
            transaction_date: transactionDate,
            total_amount: totalAmount,
            payment_method: paymentMethod,
            total_items: totalItems,
            source: 'upload',
            company_id: companyId,
            dataset_id: datasetId,
          },
        });

        await this.prisma.sale_items.createMany({
          data: saleItemsData.map((i) => ({ ...i, sale_id: sale.id })),
        });

        imported.push({
          saleId: sale.id,
          items: groupRows.map((r) => ({ product: r.product, size: r.size || DEFAULT_SIZE_NAME, quantity: r.quantity })),
        });
      } catch (error: any) {
        for (const row of groupRows) {
          failed.push({ row: row.raw, reason: error?.message ?? 'Unknown error' });
        }
      }
    }

    return {
      summary: {
        totalRows: rows.length,
        salesCreated: imported.length,
        failed: failed.length,
        newProductsCreated: Array.from(newProductNames),
        newCategoriesCreated: Array.from(newCategoryNames),
      },
      imported,
      failed,
    };
  }
}
