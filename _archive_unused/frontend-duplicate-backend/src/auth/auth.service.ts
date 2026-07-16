import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(data: {
    name: string;
    email: string;
    password: string;
    role: string;
  }) {
    const existingUser =
      await this.prisma.users.findUnique({
        where: {
          email: data.email,
        },
      });

    if (existingUser) {
      throw new BadRequestException(
        'Email already exists',
      );
    }

    const hashedPassword =
      await bcrypt.hash(data.password, 10);

    const user =
      await this.prisma.users.create({
        data: {
          name: data.name,
          email: data.email,
          password: hashedPassword,
          role: data.role,
        },
      });

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    };
  }

  async login(data: {
    email: string;
    password: string;
  }) {
    const user =
      await this.prisma.users.findUnique({
        where: {
          email: data.email,
        },
      });

    if (!user) {
      throw new UnauthorizedException(
        'Invalid credentials',
      );
    }

    const isMatch =
      await bcrypt.compare(
        data.password,
        user.password,
      );

    if (!isMatch) {
      throw new UnauthorizedException(
        'Invalid credentials',
      );
    }

    await this.prisma.users.update({
      where: {
        id: user.id,
      },
      data: {
        last_login: new Date(),
      },
    });

    const token =
      await this.jwtService.signAsync({
        sub: user.id.toString(),
        email: user.email,
        role: user.role,
      });

    return {
      access_token: token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  }
}