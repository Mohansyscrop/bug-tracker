import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.user.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        name: true,
        email: true,
        globalRole: true,
        createdAt: true,
        projectMembers: {
          select: {
            id: true,
            projectId: true,
            projectRole: true,
            project: { select: { id: true, name: true, key: true } },
          },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findById(id: string) {
    return this.prisma.user.findFirst({
      where: { id, deletedAt: null },
      select: {
        id: true,
        name: true,
        email: true,
        globalRole: true,
        createdAt: true,
        projectMembers: {
          select: {
            id: true,
            projectId: true,
            projectRole: true,
            project: { select: { id: true, name: true, key: true } },
          },
        },
      },
    });
  }

  async updateProfile(id: string, data: { name?: string; avatarUrl?: string }) {
    return this.prisma.user.update({
      where: { id },
      data,
      select: { id: true, name: true, email: true, globalRole: true },
    });
  }

  async createUser(data: {
    name: string;
    email: string;
    password: string;
    globalRole?: string;
    projectMembers?: { projectId: string; projectRole: string }[];
  }) {
    const existing = await this.prisma.user.findFirst({
      where: { email: data.email, deletedAt: null },
    });
    if (existing) {
      throw new ConflictException('A user with this email already exists');
    }

    const passwordHash = await bcrypt.hash(data.password, 12);
    return this.prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        passwordHash,
        globalRole: data.globalRole === 'ADMIN' ? 'ADMIN' : 'STANDARD',
        ...(data.projectMembers && data.projectMembers.length > 0
          ? {
              projectMembers: {
                create: data.projectMembers.map((pm) => ({
                  projectId: pm.projectId,
                  projectRole: pm.projectRole,
                })),
              },
            }
          : {}),
      },
      select: {
        id: true,
        name: true,
        email: true,
        globalRole: true,
        createdAt: true,
        projectMembers: {
          select: {
            id: true,
            projectId: true,
            projectRole: true,
            project: { select: { id: true, name: true, key: true } },
          },
        },
      },
    });
  }

  async updateRole(id: string, globalRole: string) {
    const user = await this.prisma.user.findFirst({ where: { id, deletedAt: null } });
    if (!user) throw new NotFoundException('User not found');

    const role = globalRole === 'ADMIN' ? 'ADMIN' : 'STANDARD';
    return this.prisma.user.update({
      where: { id },
      data: { globalRole: role },
      select: { id: true, name: true, email: true, globalRole: true },
    });
  }

  async updateProjects(id: string, projectMembers: { projectId: string; projectRole: string }[]) {
    const user = await this.prisma.user.findFirst({ where: { id, deletedAt: null } });
    if (!user) throw new NotFoundException('User not found');

    await this.prisma.$transaction(async (tx) => {
      await tx.projectMember.deleteMany({ where: { userId: id } });
      if (projectMembers && projectMembers.length > 0) {
        await tx.projectMember.createMany({
          data: projectMembers.map((pm) => ({
            userId: id,
            projectId: pm.projectId,
            projectRole: pm.projectRole,
          })),
        });
      }
    });

    return this.findById(id);
  }

  async deleteUser(id: string) {
    const user = await this.prisma.user.findFirst({ where: { id, deletedAt: null } });
    if (!user) throw new NotFoundException('User not found');

    await this.prisma.user.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return { message: 'User deactivated' };
  }
}

