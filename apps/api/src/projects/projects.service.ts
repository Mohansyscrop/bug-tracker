import {
  Injectable, NotFoundException, ConflictException, ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProjectDto, AddMemberDto, CreateMilestoneDto, CreateComponentDto } from './dto/projects.dto';

@Injectable()
export class ProjectsService {
  constructor(private prisma: PrismaService) {}

  async listProjectsForUser(userId: string, globalRole?: string) {
    if (globalRole === 'ADMIN') {
      const allProjects = await this.prisma.project.findMany({
        where: { deletedAt: null },
        include: {
          createdBy: { select: { id: true, name: true, email: true } },
          members: {
            where: { userId },
            select: { projectRole: true },
          },
          _count: { select: { bugs: true, members: true, testingCycles: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
      return {
        data: allProjects.map((p) => ({
          ...p,
          myRole: p.members[0]?.projectRole || 'LEAD',
        })),
      };
    }

    const members = await this.prisma.projectMember.findMany({
      where: { userId },
      include: {
        project: {
          include: {
            createdBy: { select: { id: true, name: true, email: true } },
            _count: { select: { bugs: true, members: true, testingCycles: true } },
          },
        },
      },
      orderBy: { project: { createdAt: 'desc' } },
    });
    return {
      data: members
        .filter((m) => !m.project.deletedAt)
        .map((m) => ({ ...m.project, myRole: m.projectRole })),
    };
  }

  async createProject(userId: string, dto: CreateProjectDto) {
    const existing = await this.prisma.project.findFirst({ where: { key: dto.key } });
    if (existing) throw new ConflictException(`Project key '${dto.key}' already exists`);

    const project = await this.prisma.$transaction(async (tx) => {
      const proj = await tx.project.create({
        data: { ...dto, createdById: userId },
      });
      // Creator becomes LEAD automatically
      await tx.projectMember.create({
        data: { projectId: proj.id, userId, projectRole: 'LEAD' },
      });
      // Initialize key sequence
      await tx.projectKeySequence.create({
        data: { projectKey: proj.key, lastSeq: 0 },
      });
      return proj;
    });
    return { data: project };
  }

  async getProject(projectId: string, userId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, deletedAt: null },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        members: {
          include: {
            user: { select: { id: true, name: true, email: true, globalRole: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
        milestones: { orderBy: { createdAt: 'desc' } },
        components: { include: { lead: { select: { id: true, name: true } } } },
        _count: { select: { bugs: true, members: true } },
      },
    });
    if (!project) throw new NotFoundException('Project not found');
    return { data: project };
  }

  async updateProject(id: string, dto: Partial<CreateProjectDto>) {
    const project = await this.prisma.project.update({
      where: { id },
      data: { ...dto, updatedAt: new Date() },
    });
    return { data: project };
  }

  async deleteProject(id: string) {
    await this.prisma.project.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return { message: 'Project deleted' };
  }

  async addMember(projectId: string, dto: AddMemberDto) {
    const existing = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: dto.userId } },
    });
    if (existing) throw new ConflictException('User is already a project member');

    const member = await this.prisma.projectMember.create({
      data: { projectId, userId: dto.userId, projectRole: dto.projectRole },
      include: { user: { select: { id: true, name: true, email: true } } },
    });
    return { data: member };
  }

  async getMembers(projectId: string) {
    const members = await this.prisma.projectMember.findMany({
      where: { projectId },
      include: { user: { select: { id: true, name: true, email: true, globalRole: true } } },
    });
    return { data: members };
  }

  async updateMemberRole(projectId: string, userId: string, projectRole: string) {
    const member = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId } },
    });
    if (!member) throw new NotFoundException('Project member not found');

    const updated = await this.prisma.projectMember.update({
      where: { projectId_userId: { projectId, userId } },
      data: { projectRole },
      include: { user: { select: { id: true, name: true, email: true, globalRole: true } } },
    });
    return { data: updated };
  }

  async removeMember(projectId: string, userId: string) {
    await this.prisma.projectMember.deleteMany({ where: { projectId, userId } });
    return { message: 'Member removed' };
  }

  async getMilestones(projectId: string) {
    const milestones = await this.prisma.milestone.findMany({
      where: { projectId },
      orderBy: { releaseDate: 'asc' },
    });
    return { data: milestones };
  }

  async createMilestone(projectId: string, dto: CreateMilestoneDto) {
    const milestone = await this.prisma.milestone.create({
      data: {
        projectId,
        name: dto.name,
        versionCode: dto.versionCode,
        releaseDate: dto.releaseDate ? new Date(dto.releaseDate) : undefined,
      },
    });
    return { data: milestone };
  }

  async getComponents(projectId: string) {
    const components = await this.prisma.component.findMany({
      where: { projectId },
      include: { lead: { select: { id: true, name: true } } },
    });
    return { data: components };
  }

  async createComponent(projectId: string, dto: CreateComponentDto) {
    const component = await this.prisma.component.create({
      data: { projectId, name: dto.name, leadId: dto.leadId },
    });
    return { data: component };
  }

  async getUserProjectRole(projectId: string, userId: string): Promise<string | null> {
    const member = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId } },
    });
    return member?.projectRole ?? null;
  }

  async getProjectStats(projectId: string) {
    const [bugs, slaBreaches] = await Promise.all([
      this.prisma.bug.findMany({
        where: { projectId, deletedAt: null },
        select: { status: true, severity: true, priority: true, createdAt: true, updatedAt: true },
      }),
      this.prisma.bug.count({
        where: {
          projectId,
          status: 'NEW',
          deletedAt: null,
          createdAt: { lte: new Date(Date.now() - 48 * 60 * 60 * 1000) },
        },
      }),
    ]);

    const byStatus: Record<string, number> = {};
    const bySeverity: Record<string, number> = {};
    const byPriority: Record<string, number> = {};

    for (const bug of bugs) {
      byStatus[bug.status] = (byStatus[bug.status] || 0) + 1;
      bySeverity[bug.severity] = (bySeverity[bug.severity] || 0) + 1;
      byPriority[bug.priority] = (byPriority[bug.priority] || 0) + 1;
    }

    return { data: { totalBugs: bugs.length, byStatus, bySeverity, byPriority, slaBreaches } };
  }
}
