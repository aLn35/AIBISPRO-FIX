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

import { PromotionsService } from './promotions.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';

@ApiTags('Promotions')
@Controller('promotions')
export class PromotionsController {
  constructor(
    private readonly promotionsService: PromotionsService,
  ) {}

  @ApiOperation({
    summary: 'Get all promotions',
  })
  @Get()
  findAll() {
    return this.promotionsService.findAll();
  }

  @ApiOperation({
    summary: 'Get promotion by ID',
  })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.promotionsService.findOne(
      BigInt(id),
    );
  }

  @ApiBearerAuth()
  @Roles('admin')
  @UseGuards(
    JwtAuthGuard,
    RolesGuard,
  )
  @ApiOperation({
    summary: 'Create promotion',
  })
  @Post()
  create(
    @Body()
    body: {
      title: string;
      description?: string;
      discount_percent?: number;
      start_date?: string;
      end_date?: string;
      status?: string;
    },
  ) {
    return this.promotionsService.create(body);
  }

  @ApiBearerAuth()
  @Roles('admin')
  @UseGuards(
    JwtAuthGuard,
    RolesGuard,
  )
  @ApiOperation({
    summary: 'Update promotion',
  })
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body()
    body: {
      title?: string;
      description?: string;
      discount_percent?: number;
      status?: string;
    },
  ) {
    return this.promotionsService.update(
      BigInt(id),
      body,
    );
  }

  @ApiBearerAuth()
  @Roles('admin')
  @UseGuards(
    JwtAuthGuard,
    RolesGuard,
  )
  @ApiOperation({
    summary: 'Delete promotion',
  })
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.promotionsService.remove(
      BigInt(id),
    );
  }
}