import {
  Body,
  Controller,
  Get,
  Post,
  UseGuards,
} from '@nestjs/common';

import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { InventoryService } from './inventory.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Inventory')
@Controller('inventory')
export class InventoryController {
  constructor(
    private readonly inventoryService: InventoryService,
  ) {}

  @ApiOperation({
    summary: 'Get inventory list',
  })
  @Get()
  findAll() {
    return this.inventoryService.findAll();
  }

  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Add stock',
  })
  @UseGuards(JwtAuthGuard)
  @Post('stock-in')
  stockIn(
    @Body()
    body: {
      product_size_id: number;
      quantity: number;
      notes?: string;
    },
  ) {
    return this.inventoryService.stockIn(body);
  }
}