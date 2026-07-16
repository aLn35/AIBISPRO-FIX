import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';

import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { ProductsService } from './products.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';

@ApiTags('Products')
@Controller('products')
export class ProductsController {
  constructor(
    private readonly productsService: ProductsService,
  ) {}

  @ApiOperation({
    summary: 'Get all products',
  })
  @Get()
  findAll() {
    return this.productsService.findAll();
  }

  @ApiOperation({
    summary: 'Get product by ID',
  })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productsService.findOne(
      BigInt(id),
    );
  }

  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create product',
  })
  @Roles('admin')
  @UseGuards(
    JwtAuthGuard,
    RolesGuard,
  )
  @Post()
  create(
    @Body()
    body: {
      name: string;
      description?: string;
      category_id?: string;
    },
  ) {
    return this.productsService.create(body);
  }

  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update product',
  })
  @Roles('admin')
  @UseGuards(
    JwtAuthGuard,
    RolesGuard,
  )
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body()
    body: {
      name?: string;
      description?: string;
    },
  ) {
    return this.productsService.update(
      BigInt(id),
      body,
    );
  }

  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Delete product',
  })
  @Roles('admin')
  @UseGuards(
    JwtAuthGuard,
    RolesGuard,
  )
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.productsService.remove(
      BigInt(id),
    );
  }
}