import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import * as bcrypt from "bcrypt";

const USER_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  created_at: true,
  last_login: true,
};

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.users.findMany({
      select: USER_SELECT,
      orderBy: {
        id: "asc",
      },
    });
  }

  async findOne(id: number) {
    const user = await this.prisma.users.findUnique({
      where: { id },
      select: USER_SELECT,
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    return user;
  }

  async updateRole(id: number, role: string) {
    return this.prisma.users.update({
      where: { id },
      data: { role },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });
  }

  async remove(id: number) {
    return this.prisma.users.delete({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });
  }

  private async verifyPassword(userId: number, currentPassword: string) {
    const user = await this.prisma.users.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException("User not found");
    const matches = await bcrypt.compare(currentPassword, user.password);
    if (!matches)
      throw new UnauthorizedException("Current password is incorrect");
    return user;
  }

  /**
   * MAINTAINANCE-only: edit your own email/password directly, no approval needed since
   * there's no one above MAINTAINANCE in the hierarchy.
   */
  async selfUpdateCredentials(
    userId: number,
    data: { currentPassword: string; newEmail?: string; newPassword?: string },
  ) {
    await this.verifyPassword(userId, data.currentPassword);
    if (!data.newEmail && !data.newPassword) {
      throw new BadRequestException("Provide a new email or new password");
    }
    if (data.newEmail) {
      const existing = await this.prisma.users.findUnique({
        where: { email: data.newEmail },
      });
      if (existing && existing.id !== userId)
        throw new BadRequestException("Email already in use");
    }
    const newPasswordHash = data.newPassword
      ? await bcrypt.hash(data.newPassword, 10)
      : undefined;
    return this.prisma.users.update({
      where: { id: userId },
      data: {
        ...(data.newEmail ? { email: data.newEmail } : {}),
        ...(newPasswordHash ? { password: newPasswordHash } : {}),
      },
      select: USER_SELECT,
    });
  }

  /**
   * OWNER: request a change to their own email/password. Password changes are hashed
   * immediately and stored as new_password_hash - MAINTAINANCE (the approver) never sees the
   * plaintext, and the hash itself is never returned by any read endpoint below.
   */
  async requestCredentialChange(
    ownerId: number,
    data: {
      currentPassword: string;
      field: "email" | "password";
      newEmail?: string;
      newPassword?: string;
    },
  ) {
    await this.verifyPassword(ownerId, data.currentPassword);

    if (data.field === "email") {
      if (!data.newEmail) throw new BadRequestException("newEmail is required");
      const existing = await this.prisma.users.findUnique({
        where: { email: data.newEmail },
      });
      if (existing && existing.id !== ownerId)
        throw new BadRequestException("Email already in use");
    } else if (data.field === "password") {
      if (!data.newPassword)
        throw new BadRequestException("newPassword is required");
    } else {
      throw new BadRequestException('field must be "email" or "password"');
    }

    const newPasswordHash =
      data.field === "password"
        ? await bcrypt.hash(data.newPassword!, 10)
        : undefined;

    return this.prisma.credential_change_requests.create({
      data: {
        user_id: ownerId,
        requested_by: ownerId,
        field: data.field,
        new_email: data.field === "email" ? data.newEmail : undefined,
        new_password_hash: newPasswordHash,
      },
      select: {
        id: true,
        field: true,
        new_email: true,
        status: true,
        created_at: true,
      },
    });
  }

  /** MAINTAINANCE view of pending/all requests - new_password_hash is never selected. */
  async listCredentialRequests(status?: string) {
    return this.prisma.credential_change_requests.findMany({
      where: status ? { status } : undefined,
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        field: true,
        new_email: true,
        status: true,
        created_at: true,
        reviewed_at: true,
        target: { select: { id: true, name: true, email: true, role: true } },
        requester: { select: { id: true, name: true } },
        reviewer: { select: { id: true, name: true } },
      },
    });
  }

  async reviewCredentialRequest(
    requestId: number,
    reviewerId: number,
    approve: boolean,
  ) {
    const request = await this.prisma.credential_change_requests.findUnique({
      where: { id: requestId },
    });
    if (!request) throw new NotFoundException("Request not found");
    if (request.status !== "pending")
      throw new BadRequestException("This request has already been reviewed");

    if (approve) {
      await this.prisma.users.update({
        where: { id: request.user_id },
        data: {
          ...(request.field === "email" ? { email: request.new_email! } : {}),
          ...(request.field === "password"
            ? { password: request.new_password_hash! }
            : {}),
        },
      });
    }

    return this.prisma.credential_change_requests.update({
      where: { id: requestId },
      data: {
        status: approve ? "approved" : "rejected",
        reviewed_by: reviewerId,
        reviewed_at: new Date(),
      },
      select: { id: true, field: true, status: true, reviewed_at: true },
    });
  }

  /**
   * OWNER: set a MANAGER's email/password directly - no approval flow, since OWNER already
   * has full authority over the managers they granted company access to.
   */
  async ownerSetManagerCredentials(
    ownerId: number,
    managerId: number,
    data: { newEmail?: string; newPassword?: string },
  ) {
    const manager = await this.prisma.users.findUnique({
      where: { id: managerId },
    });
    if (!manager || manager.role !== "MANAGER")
      throw new BadRequestException("Target user is not a Manager account");

    const grant = await this.prisma.user_company_access.findFirst({
      where: { user_id: managerId, granted_by: ownerId },
    });
    if (!grant)
      throw new ForbiddenException(
        "You can only manage credentials for Managers you granted company access to",
      );

    if (!data.newEmail && !data.newPassword) {
      throw new BadRequestException("Provide a new email or new password");
    }
    if (data.newEmail) {
      const existing = await this.prisma.users.findUnique({
        where: { email: data.newEmail },
      });
      if (existing && existing.id !== managerId)
        throw new BadRequestException("Email already in use");
    }
    const newPasswordHash = data.newPassword
      ? await bcrypt.hash(data.newPassword, 10)
      : undefined;

    return this.prisma.users.update({
      where: { id: managerId },
      data: {
        ...(data.newEmail ? { email: data.newEmail } : {}),
        ...(newPasswordHash ? { password: newPasswordHash } : {}),
      },
      select: USER_SELECT,
    });
  }
}
