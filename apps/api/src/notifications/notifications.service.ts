import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsGateway } from './notifications.gateway';

interface CreateNotificationDto {
  userId: string;
  type: string;
  title: string;
  body: string;
  bugId?: string;
  bugIssueKey?: string;
}

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService, private gateway: NotificationsGateway) {}

  async createNotification(dto: CreateNotificationDto) {
    const notification = await this.prisma.notification.create({
      data: {
        userId: dto.userId,
        type: dto.type,
        title: dto.title,
        body: dto.body,
        bugId: dto.bugId,
        bugIssueKey: dto.bugIssueKey,
      },
    });

    // Push via WebSocket
    this.gateway.sendToUser(dto.userId, notification);

    // Console log (acts as email stub)
    console.log(`[NOTIFICATION→${dto.userId}] [${dto.type}] ${dto.title}`);

    return notification;
  }

  async notifyProjectLeads(projectId: string, dto: Omit<CreateNotificationDto, 'userId'>) {
    const leads = await this.prisma.projectMember.findMany({
      where: { projectId, projectRole: 'LEAD' },
    });
    for (const lead of leads) {
      await this.createNotification({ ...dto, userId: lead.userId });
    }
  }

  async getForUser(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.notification.count({ where: { userId } }),
    ]);
    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async markAllRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
    return { message: 'All notifications marked as read' };
  }

  async markRead(id: string, userId: string) {
    await this.prisma.notification.updateMany({
      where: { id, userId },
      data: { isRead: true },
    });
    return { message: 'Notification marked as read' };
  }

  async getUnreadCount(userId: string) {
    const count = await this.prisma.notification.count({
      where: { userId, isRead: false },
    });
    return { data: { count } };
  }
}
