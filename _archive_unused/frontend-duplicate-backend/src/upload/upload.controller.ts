import {
  Controller,
  Post,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Req,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';

import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { FileInterceptor } from '@nestjs/platform-express';

import { UploadService } from './upload.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';

@ApiTags('Upload')
@Controller('upload')
export class UploadController {
  constructor(
    private readonly uploadService: UploadService,
  ) {}

  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiOperation({
    summary: 'Upload sales CSV',
  })
  @Roles('admin', 'manager')
  @UseGuards(
    JwtAuthGuard,
    RolesGuard,
  )
  @Post('sales')
  @UseInterceptors(
    FileInterceptor('file', {
      dest: './uploads',
    }),
  )
  async uploadSales(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any,
  ) {
    if (!file) {
      throw new BadRequestException(
        'CSV file is required',
      );
    }

    if (!file.originalname.endsWith('.csv')) {
      throw new BadRequestException(
        'Only CSV files are allowed',
      );
    }

    try {
      const dataset =
        await this.uploadService.createDataset(
          file.originalname,
          BigInt(req.user.id),
        );

      const rows =
        await this.uploadService.parseCsv(
          file.path,
        );

      const result =
        await this.uploadService.importSales(
          rows,
        );

      return {
        message: 'Sales imported successfully',
        dataset,
        totalRows: rows.length,
        imported: result.imported.length,
        failed: result.failed,
      };
    } catch (error: any) {
      throw new InternalServerErrorException(
        error.message,
      );
    }
  }
}