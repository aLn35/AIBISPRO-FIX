import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
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
  @Roles('MAINTAINANCE')
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
  @Roles('MAINTAINANCE')
  @UseGuards(
    JwtAuthGuard,
    RolesGuard,
  )
  @ApiOperation({
    summary: 'List credential change requests (Maintainance approval queue)',
  })
  @Get('credential-requests')
  listCredentialRequests(
    @Query('status') status?: string,
  ) {
    return this.usersService.listCredentialRequests(status);
  }

  @ApiBearerAuth()
  @Roles('MAINTAINANCE')
  @UseGuards(
    JwtAuthGuard,
    RolesGuard,
  )
  @ApiOperation({
    summary: 'Maintainance: edit own email/password directly',
  })
  @Patch('me/credentials')
  selfUpdateCredentials(
    @Req() req: any,
    @Body()
    body: { currentPassword: string; newEmail?: string; newPassword?: string },
  ) {
    return this.usersService.selfUpdateCredentials(
      Number(req.user.id),
      body,
    );
  }

  @ApiBearerAuth()
  @Roles('OWNER')
  @UseGuards(
    JwtAuthGuard,
    RolesGuard,
  )
  @ApiOperation({
    summary: 'Owner: request an email/password change, pending Maintainance approval',
  })
  @Post('credential-requests')
  requestCredentialChange(
    @Req() req: any,
    @Body()
    body: { currentPassword: string; field: 'email' | 'password'; newEmail?: string; newPassword?: string },
  ) {
    return this.usersService.requestCredentialChange(
      Number(req.user.id),
      body,
    );
  }

  @ApiBearerAuth()
  @Roles('MAINTAINANCE')
  @UseGuards(
    JwtAuthGuard,
    RolesGuard,
  )
  @ApiOperation({
    summary: 'Maintainance: approve a pending credential change request',
  })
  @Patch('credential-requests/:id/approve')
  approveCredentialRequest(
    @Req() req: any,
    @Param('id') id: string,
  ) {
    return this.usersService.reviewCredentialRequest(
      Number(id),
      Number(req.user.id),
      true,
    );
  }

  @ApiBearerAuth()
  @Roles('MAINTAINANCE')
  @UseGuards(
    JwtAuthGuard,
    RolesGuard,
  )
  @ApiOperation({
    summary: 'Maintainance: reject a pending credential change request',
  })
  @Patch('credential-requests/:id/reject')
  rejectCredentialRequest(
    @Req() req: any,
    @Param('id') id: string,
  ) {
    return this.usersService.reviewCredentialRequest(
      Number(id),
      Number(req.user.id),
      false,
    );
  }

  @ApiBearerAuth()
  @Roles('OWNER')
  @UseGuards(
    JwtAuthGuard,
    RolesGuard,
  )
  @ApiOperation({
    summary: "Owner: set a Manager's email/password directly",
  })
  @Patch(':id/credentials')
  ownerSetManagerCredentials(
    @Req() req: any,
    @Param('id') id: string,
    @Body()
    body: { newEmail?: string; newPassword?: string },
  ) {
    return this.usersService.ownerSetManagerCredentials(
      Number(req.user.id),
      Number(id),
      body,
    );
  }

  @ApiBearerAuth()
  @Roles('MAINTAINANCE')
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
      Number(id),
    );
  }

  @ApiBearerAuth()
  @Roles('MAINTAINANCE')
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
      Number(id),
      body.role,
    );
  }

  @ApiBearerAuth()
  @Roles('MAINTAINANCE')
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
      Number(id),
    );
  }
}
