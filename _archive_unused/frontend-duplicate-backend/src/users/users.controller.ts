import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  UseGuards,
} from '@nestjs/common';

import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
  ) {}

  @ApiBearerAuth()
  @Roles('admin')
  @UseGuards(
    JwtAuthGuard,
    RolesGuard,
  )
  @ApiOperation({
    summary: 'Get all users',
  })
  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @ApiBearerAuth()
  @Roles('admin')
  @UseGuards(
    JwtAuthGuard,
    RolesGuard,
  )
  @ApiOperation({
    summary: 'Get user by ID',
  })
  @Get(':id')
  findOne(
    @Param('id') id: string,
  ) {
    return this.usersService.findOne(
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
    summary: 'Update user role',
  })
  @Patch(':id/role')
  updateRole(
    @Param('id') id: string,
    @Body()
    body: {
      role: string;
    },
  ) {
    return this.usersService.updateRole(
      BigInt(id),
      body.role,
    );
  }

  @ApiBearerAuth()
  @Roles('admin')
  @UseGuards(
    JwtAuthGuard,
    RolesGuard,
  )
  @ApiOperation({
    summary: 'Delete user',
  })
  @Delete(':id')
  remove(
    @Param('id') id: string,
  ) {
    return this.usersService.remove(
      BigInt(id),
    );
  }
}