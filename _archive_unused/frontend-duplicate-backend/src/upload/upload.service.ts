import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SalesService } from '../sales/sales.service';

import * as fs from 'fs';
import csv from 'csv-parser';

@Injectable()
export class UploadService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly salesService: SalesService,
  ) {}

  async createDataset(
    fileName: string,
    uploadedBy: bigint,
  ) {
    return this.prisma.datasets.create({
      data: {
        file_name: fileName,
        uploaded_by: uploadedBy,
      },
    });
  }

  async parseCsv(filePath: string): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const results: any[] = [];

      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (data) => {
          results.push(data);
        })
        .on('end', () => {
          resolve(results);
        })
        .on('error', (error) => {
          reject(error);
        });
    });
  }

  async importSales(rows: any[]) {
    const imported: any[] = [];
    const failed: any[] = [];

    for (const row of rows) {
      try {
        // Validate required fields
        if (
          !row.product ||
          !row.size ||
          !row.quantity ||
          !row.payment_method
        ) {
          failed.push({
            row,
            reason: 'Missing required columns',
          });
          continue;
        }

        const productName = row.product.trim();

        // Convert size from CSV to database format
        const sizeMap: Record<string, string> = {
          regular: 'R',
          r: 'R',

          large: 'L',
          l: 'L',
        };

        const size =
          sizeMap[
            row.size
              .trim()
              .toLowerCase()
          ] ??
          row.size
            .trim()
            .toUpperCase();

        // Find product
        const product =
          await this.prisma.products.findFirst({
            where: {
              name: productName,
            },
          });

        if (!product) {
          failed.push({
            row,
            reason: `Product "${productName}" not found`,
          });
          continue;
        }

        // Find product size
        const productSize =
          await this.prisma.product_sizes.findFirst({
            where: {
              product_id: product.id,
              size_name: size,
            },
          });

        if (!productSize) {
          failed.push({
            row,
            reason: `Size "${row.size}" not found for "${productName}"`,
          });
          continue;
        }

        // Create sale using existing SalesService
        const sale =
          await this.salesService.create({
            product_size_id: Number(productSize.id),
            quantity: Number(row.quantity),
            payment_method:
              row.payment_method.trim(),
          });

        imported.push({
          saleId: sale.id,
          product: productName,
          size,
          quantity: Number(row.quantity),
        });
      } catch (error: any) {
        failed.push({
          row,
          reason:
            error?.message ??
            'Unknown error',
        });
      }
    }

    return {
      summary: {
        totalRows: rows.length,
        imported: imported.length,
        failed: failed.length,
      },
      imported,
      failed,
    };
  }
}