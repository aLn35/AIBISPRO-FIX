import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';

import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { SalesService } from './sales.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Sales')
@Controller('sales')
export class SalesController {
  constructor(
    private readonly salesService: SalesService,
  ) {}

  @ApiOperation({
    summary: 'Get all sales transactions',
  })
  @Get()
  findAll() {
    return this.salesService.findAll();
  }

  @ApiOperation({
    summary: 'Get sale by ID',
  })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.salesService.findOne(
      BigInt(id),
    );
  }

  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create sales transaction',
  })
  @UseGuards(JwtAuthGuard)
  @Post()
  create(
    @Body()
    body: {
      product_size_id: number;
      quantity: number;
      payment_method: string;
    },
  ) {
    return this.salesService.create(body);
  }
}