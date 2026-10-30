import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CompaniesService } from "./companies.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";

@ApiTags("Companies")
@Controller("companies")
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @ApiOperation({
    summary: "List every company (for MAINTAINANCE curation view)",
  })
  @Get()
  findAll() {
    return this.companiesService.findAll();
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: "Companies accessible to the current user" })
  @UseGuards(JwtAuthGuard)
  @Get("my")
  findAccessibleToMe(@Req() req: any) {
    return this.companiesService.findAccessibleTo(
      Number(req.user.id),
      req.user.role,
    );
  }

  @ApiBearerAuth()
  @ApiOperation({
    summary:
      "Users this account can assign company access to (OWNER for MAINTAINANCE, MANAGER for OWNER)",
  })
  @UseGuards(JwtAuthGuard)
  @Get("assignable-users")
  getAssignableUsers(@Req() req: any) {
    return this.companiesService.getAssignableUsers(
      Number(req.user.id),
      req.user.role,
    );
  }

  @ApiBearerAuth()
  @ApiOperation({
    summary: "Current access grants (optionally filtered by company)",
  })
  @UseGuards(JwtAuthGuard)
  @Get("access")
  getAccessGrants(@Req() req: any) {
    return this.companiesService.getAccessGrants();
  }

  @ApiBearerAuth()
  @Roles("MAINTAINANCE")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({
    summary: "Toggle whether a company is an active partnership",
  })
  @Patch(":id/partnership")
  setPartnership(
    @Param("id") id: string,
    @Body() body: { status: "active" | "inactive" },
  ) {
    return this.companiesService.setPartnershipStatus(Number(id), body.status);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary:
      "Grant a user access to this company (MAINTAINANCE->OWNER or OWNER->MANAGER)",
  })
  @Post(":id/grant")
  grant(
    @Param("id") id: string,
    @Body() body: { userId: number },
    @Req() req: any,
  ) {
    return this.companiesService.grantAccess(
      Number(req.user.id),
      req.user.role,
      Number(body.userId),
      Number(id),
    );
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Revoke a user access grant for this company" })
  @Delete(":id/grant/:userId")
  revoke(
    @Param("id") id: string,
    @Param("userId") userId: string,
    @Req() req: any,
  ) {
    return this.companiesService.revokeAccess(
      Number(req.user.id),
      req.user.role,
      Number(userId),
      Number(id),
    );
  }
}
