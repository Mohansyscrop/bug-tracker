import {
  Injectable, NotFoundException, BadRequestException, ForbiddenException, ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ActivityLogService } from '../activity-log/activity-log.service';
import { CreateBugDto, UpdateBugDto, TransitionStatusDto, BulkUpdateDto, BugFilterDto } from './dto/bugs.dto';
import { BUG_STATE_TRANSITIONS, BugStatus, RESOLUTION_REQUIRED_STATUSES } from './state-machine';

const BUG_INCLUDE = {
  project: {
    select: {
      id: true,
      key: true,
      name: true,
      members: {
        select: {
          userId: true,
          projectRole: true,
        },
      },
    },
  },
  component: { select: { id: true, name: true } },
  milestone: { select: { id: true, name: true, versionCode: true } },
  fixedInMilestone: { select: { id: true, name: true, versionCode: true } },
  reportedBy: { select: { id: true, name: true, email: true } },
  assignedTo: { select: { id: true, name: true, email: true } },
  watchers: { include: { user: { select: { id: true, name: true } } } },
  testingCycle: { select: { id: true, name: true, cycleNumber: true, status: true } },
  requirement: { select: { id: true, reqKey: true, title: true } },
  testCase: { select: { id: true, testCaseKey: true, title: true } },
};

@Injectable()
export class BugsService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
    private activityLog: ActivityLogService,
  ) {}

  async listBugs(filter: BugFilterDto, userId: string) {
    const {
      projectId, status, severity, priority, assignedTo, milestoneId, componentId,
      isRegression, search, page, limit, sortBy, sortOrder,
      bugArea, testingCycleId, requirementId, testCaseId,
    } = filter;

    const where: any = { deletedAt: null };
    if (projectId) where.projectId = projectId;
    if (status) where.status = status;
    if (severity) where.severity = severity;
    if (priority) where.priority = priority;
    if (assignedTo) where.assignedToId = assignedTo;
    if (milestoneId) where.milestoneId = milestoneId;
    if (componentId) where.componentId = componentId;
    if (isRegression !== undefined) where.isRegression = isRegression;
    if (bugArea) where.bugArea = bugArea;
    if (testingCycleId) where.testingCycleId = testingCycleId;
    if (requirementId) where.requirementId = requirementId;
    if (testCaseId) where.testCaseId = testCaseId;

    // MySQL FULLTEXT search
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { description: { contains: search } },
        { stepsToReproduce: { contains: search } },
        { issueKey: { contains: search } },
      ];
    }

    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.bug.findMany({
        where,
        include: BUG_INCLUDE,
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      }),
      this.prisma.bug.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async createBug(dto: CreateBugDto, reportedById: string) {
    // Generate issue key atomically
    const issueKey = await this.generateIssueKey(dto.projectId);

    const bug = await this.prisma.bug.create({
      data: {
        issueKey,
        projectId: dto.projectId,
        componentId: dto.componentId,
        milestoneId: dto.milestoneId,
        title: dto.title,
        description: dto.description,
        stepsToReproduce: dto.stepsToReproduce,
        expectedResult: dto.expectedResult,
        actualResult: dto.actualResult,
        severity: dto.severity,
        priority: dto.priority ?? 'P3',
        environment: dto.environment,
        assignedToId: dto.assignedTo,
        reportedById,
        bugArea: dto.bugArea ?? 'FRONTEND',
        testingCycleId: dto.testingCycleId,
        requirementId: dto.requirementId,
        testCaseId: dto.testCaseId,
        testExecutionId: dto.testExecutionId,
      },
      include: BUG_INCLUDE,
    });

    // Notify assignee if set
    if (dto.assignedTo) {
      await this.notifications.createNotification({
        userId: dto.assignedTo,
        type: 'BUG_ASSIGNED',
        title: `Bug assigned: ${issueKey}`,
        body: `You have been assigned bug ${issueKey}: "${dto.title}"`,
        bugId: bug.id,
        bugIssueKey: issueKey,
      });
    }

    // Alert leads for critical bugs
    if (dto.severity === 'CRITICAL') {
      await this.notifications.notifyProjectLeads(dto.projectId, {
        type: 'CRITICAL_LOGGED',
        title: `⚠️ Critical bug logged: ${issueKey}`,
        body: `A CRITICAL severity bug was logged: "${dto.title}"`,
        bugId: bug.id,
        bugIssueKey: issueKey,
      });
    }

    return { data: bug };
  }

  async getBug(id: string, userId: string) {
    const bug = await this.prisma.bug.findFirst({
      where: { id, deletedAt: null },
      include: {
        ...BUG_INCLUDE,
        comments: {
          where: { deletedAt: null },
          include: { user: { select: { id: true, name: true, email: true } } },
          orderBy: { createdAt: 'asc' },
        },
        attachments: {
          include: { uploadedBy: { select: { id: true, name: true } } },
        },
        activityLogs: {
          include: { user: { select: { id: true, name: true } } },
          orderBy: { changedAt: 'desc' },
          take: 50,
        },
        sourceLinks: {
          include: { targetBug: { select: { id: true, issueKey: true, title: true, status: true } } },
        },
        targetLinks: {
          include: { sourceBug: { select: { id: true, issueKey: true, title: true, status: true } } },
        },
      },
    });
    if (!bug) throw new NotFoundException('Bug not found');
    return { data: bug };
  }

  async updateBug(id: string, dto: UpdateBugDto, userId: string) {
    const bug = await this.prisma.bug.findFirst({ where: { id, deletedAt: null } });
    if (!bug) throw new NotFoundException('Bug not found');

    const updated = await this.prisma.bug.update({
      where: { id },
      data: { ...dto, updatedAt: new Date() },
      include: BUG_INCLUDE,
    });

    // Log each changed field
    for (const [field, newVal] of Object.entries(dto)) {
      if ((bug as any)[field] !== newVal) {
        await this.activityLog.log({
          bugId: id, userId,
          fieldChanged: field,
          oldValue: String((bug as any)[field] ?? ''),
          newValue: String(newVal ?? ''),
        });
      }
    }

    return { data: updated };
  }

  async transitionStatus(id: string, dto: TransitionStatusDto, userId: string, roleOrGlobal: string) {
    const bug = await this.prisma.bug.findFirst({ where: { id, deletedAt: null } });
    if (!bug) throw new NotFoundException('Bug not found');

    // Determine effective role
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { globalRole: true },
    });
    let role: string = 'VIEWER';
    if (user?.globalRole === 'ADMIN') {
      role = 'ADMIN';
    } else {
      const member = await this.prisma.projectMember.findUnique({
        where: { projectId_userId: { projectId: bug.projectId, userId } },
      });
      if (!member) {
        throw new ForbiddenException('You are not a member of this project');
      }
      role = member.projectRole;
      if (role.endsWith('_DEV') || role === 'DEVELOPER') role = 'DEV';
      if (role === 'PROJECT_LEAD') role = 'LEAD';
    }

    // Validate transition
    const currentStatus = bug.status as BugStatus;
    const newStatus = dto.status as BugStatus;
    const allowedTransitions = BUG_STATE_TRANSITIONS[currentStatus];

    if (!allowedTransitions) {
      throw new BadRequestException(`No transitions allowed from status: ${currentStatus}`);
    }

    const rolesAllowed = Object.entries(allowedTransitions)
      .filter(([r, targets]) => (targets as BugStatus[]).includes(newStatus))
      .map(([r]) => r);

    if (!rolesAllowed.includes(role)) {
      throw new ForbiddenException(
        `Role '${role}' cannot transition from '${currentStatus}' to '${newStatus}'`,
      );
    }

    // Resolution required when closing
    if (newStatus === BugStatus.CLOSED && !dto.resolution) {
      throw new BadRequestException('Resolution type is required when closing a bug');
    }

    // Optimistic locking check
    const updateData: any = {
      status: newStatus,
      updatedAt: new Date(),
      version: { increment: 1 },
    };
    if (dto.resolution) updateData.resolution = dto.resolution;
    if (newStatus === BugStatus.REOPENED) {
      updateData.reopenCount = { increment: 1 };
      updateData.isRegression = true;
    }

    const updated = await this.prisma.bug.update({ where: { id }, data: updateData });

    // Activity log
    await this.activityLog.log({
      bugId: id, userId,
      fieldChanged: 'status',
      oldValue: currentStatus,
      newValue: newStatus,
    });

    // Add transition comment if provided
    if (dto.comment) {
      await this.prisma.comment.create({
        data: { bugId: id, userId, bodyMarkdown: dto.comment },
      });
    }

    // Notifications
    await this.triggerStatusChangeNotifications(bug, newStatus, userId);

    return { data: updated };
  }

  async bulkUpdate(dto: BulkUpdateDto, userId: string) {
    const results = await Promise.allSettled(
      dto.bugIds.map(async (bugId) => {
        const updates: any = {};
        if (dto.update.priority) updates.priority = dto.update.priority;
        if (dto.update.assignedTo !== undefined) updates.assignedToId = dto.update.assignedTo;
        if (dto.update.milestoneId !== undefined) updates.milestoneId = dto.update.milestoneId;

        if (Object.keys(updates).length > 0) {
          await this.prisma.bug.update({ where: { id: bugId }, data: updates });
        }

        if (dto.update.status) {
          // Use transition logic (simplified for bulk)
          await this.prisma.bug.update({
            where: { id: bugId },
            data: { status: dto.update.status, updatedAt: new Date() },
          });
        }
        return bugId;
      }),
    );

    const succeeded = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;

    return { data: { succeeded, failed, total: dto.bugIds.length } };
  }

  async softDelete(id: string, userId: string, globalRole: string) {
    if (globalRole !== 'ADMIN') {
      const member = await this.prisma.projectMember.findFirst({
        where: { userId, projectRole: { in: ['LEAD'] } },
      });
      if (!member) throw new ForbiddenException('Only Admins and Leads can delete bugs');
    }
    await this.prisma.bug.update({ where: { id }, data: { deletedAt: new Date() } });
    return { message: 'Bug deleted (soft)' };
  }

  async toggleWatch(bugId: string, userId: string) {
    const existing = await this.prisma.bugWatcher.findUnique({
      where: { bugId_userId: { bugId, userId } },
    });
    if (existing) {
      await this.prisma.bugWatcher.delete({ where: { bugId_userId: { bugId, userId } } });
      return { data: { watching: false } };
    } else {
      await this.prisma.bugWatcher.create({ data: { bugId, userId } });
      return { data: { watching: true } };
    }
  }

  async getActivityLog(bugId: string) {
    const logs = await this.prisma.activityLog.findMany({
      where: { bugId },
      include: { user: { select: { id: true, name: true } } },
      orderBy: { changedAt: 'desc' },
    });
    return { data: logs };
  }

  async createLink(sourceBugId: string, targetBugId: string, linkType: string) {
    if (sourceBugId === targetBugId) {
      throw new BadRequestException('A bug cannot be linked to itself');
    }
    const link = await this.prisma.bugLink.create({
      data: { sourceBugId, targetBugId, linkType },
    });
    return { data: link };
  }

  async exportBugs(filter: BugFilterDto) {
    const result = await this.listBugs({ ...filter, limit: 10000, page: 1 }, '');
    return { data: result.data };
  }

  private async generateIssueKey(projectId: string): Promise<string> {
    const project = await this.prisma.project.findFirst({ where: { id: projectId } });
    if (!project) throw new NotFoundException('Project not found');

    const seq = await this.prisma.projectKeySequence.update({
      where: { projectKey: project.key },
      data: { lastSeq: { increment: 1 } },
    });
    return `${project.key}-${seq.lastSeq}`;
  }

  private async triggerStatusChangeNotifications(bug: any, newStatus: string, actorId: string) {
    const watchers = await this.prisma.bugWatcher.findMany({
      where: { bugId: bug.id },
    });

    const notifyUsers = new Set<string>();

    if (newStatus === 'FIXED' && bug.reportedById !== actorId) {
      notifyUsers.add(bug.reportedById);
    }
    if (newStatus === 'REOPENED') {
      if (bug.assignedToId) notifyUsers.add(bug.assignedToId);
      watchers.forEach((w: any) => notifyUsers.add(w.userId));
    }
    if (newStatus === 'ASSIGNED' && bug.assignedToId) {
      notifyUsers.add(bug.assignedToId);
    }

    for (const userId of notifyUsers) {
      if (userId === actorId) continue;
      await this.notifications.createNotification({
        userId,
        type: 'STATUS_CHANGED',
        title: `${bug.issueKey} status changed to ${newStatus}`,
        body: `Bug "${bug.title}" (${bug.issueKey}) is now ${newStatus}`,
        bugId: bug.id,
        bugIssueKey: bug.issueKey,
      });
    }
  }
}
