import { Injectable, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CompaniesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.companies.findMany({ orderBy: { id: 'asc' } });
  }

  /** Companies visible to the given user, based on role + granted access. */
  async findAccessibleTo(userId: number, role: string) {
    if (role === 'MAINTAINANCE') {
      return this.prisma.companies.findMany({ orderBy: { id: 'asc' } });
    }
    if (role === 'CUSTOMER') {
      return this.prisma.companies.findMany({ where: { partnership_status: 'active' }, orderBy: { id: 'asc' } });
    }
    // OWNER / MANAGER
    const access = await this.prisma.user_company_access.findMany({
      where: { user_id: userId },
      include: { companies: true },
    });
    return access.map((a) => a.companies).filter((c) => c.partnership_status === 'active');
  }

  /** Returns the set of company ids a user may act on (null = unrestricted, e.g. MAINTAINANCE). */
  async getAccessibleCompanyIds(userId: number, role: string): Promise<number[] | null> {
    if (role === 'MAINTAINANCE') return null;
    if (role === 'CUSTOMER') {
      const companies = await this.prisma.companies.findMany({ where: { partnership_status: 'active' }, select: { id: true } });
      return companies.map((c) => c.id);
    }
    const access = await this.prisma.user_company_access.findMany({ where: { user_id: userId }, select: { company_id: true } });
    return access.map((a) => a.company_id);
  }

  async assertAccess(userId: number, role: string, companyId: number) {
    const ids = await this.getAccessibleCompanyIds(userId, role);
    if (ids === null) return; // MAINTAINANCE - unrestricted
    if (!ids.includes(companyId)) {
      throw new ForbiddenException('You do not have access to this company');
    }
  }

  async setPartnershipStatus(companyId: number, status: 'active' | 'inactive') {
    return this.prisma.companies.update({ where: { id: companyId }, data: { partnership_status: status } });
  }

  /**
   * Grants a user access to a company. MAINTAINANCE can grant to OWNER users (any active company).
   * OWNER can grant to MANAGER users, but only for companies the OWNER themselves already has access to.
   */
  async grantAccess(granterId: number, granterRole: string, targetUserId: number, companyId: number) {
    const targetUser = await this.prisma.users.findUnique({ where: { id: targetUserId } });
    if (!targetUser) throw new BadRequestException('Target user not found');

    if (granterRole === 'MAINTAINANCE') {
      if (targetUser.role !== 'OWNER') {
        throw new ForbiddenException('MAINTAINANCE can only assign companies to OWNER accounts');
      }
    } else if (granterRole === 'OWNER') {
      if (targetUser.role !== 'MANAGER') {
        throw new ForbiddenException('OWNER can only assign companies to MANAGER accounts');
      }
      await this.assertAccess(granterId, granterRole, companyId);
    } else {
      throw new ForbiddenException('Only MAINTAINANCE or OWNER can grant company access');
    }

    return this.prisma.user_company_access.upsert({
      where: { user_id_company_id: { user_id: targetUserId, company_id: companyId } },
      update: { granted_by: granterId },
      create: { user_id: targetUserId, company_id: companyId, granted_by: granterId },
    });
  }

  async revokeAccess(granterId: number, granterRole: string, targetUserId: number, companyId: number) {
    const targetUser = await this.prisma.users.findUnique({ where: { id: targetUserId } });
    if (!targetUser) throw new BadRequestException('Target user not found');

    if (granterRole === 'OWNER' && targetUser.role === 'MANAGER') {
      await this.assertAccess(granterId, granterRole, companyId);
    } else if (granterRole !== 'MAINTAINANCE') {
      throw new ForbiddenException('Only MAINTAINANCE or OWNER can revoke company access');
    }

    return this.prisma.user_company_access.deleteMany({ where: { user_id: targetUserId, company_id: companyId } });
  }

  /** Users assignable by the given granter (OWNER users for MAINTAINANCE, MANAGER users for OWNER). */
  async getAssignableUsers(granterId: number, granterRole: string) {
    if (granterRole === 'MAINTAINANCE') {
      return this.prisma.users.findMany({ where: { role: 'OWNER' }, select: { id: true, name: true, email: true } });
    }
    if (granterRole === 'OWNER') {
      return this.prisma.users.findMany({ where: { role: 'MANAGER' }, select: { id: true, name: true, email: true } });
    }
    return [];
  }

  async getAccessGrants(companyId?: number) {
    return this.prisma.user_company_access.findMany({
      where: companyId ? { company_id: companyId } : undefined,
      include: { users: { select: { id: true, name: true, email: true, role: true } }, companies: true },
    });
  }
}
