import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class CommentsService {
  constructor(private prisma: PrismaService, private notifications: NotificationsService) {}

  async getComments(bugId: string) {
    const comments = await this.prisma.comment.findMany({
      where: { bugId, deletedAt: null },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: 'asc' },
    });
    return { data: comments };
  }

  async addComment(bugId: string, bodyMarkdown: string, userId: string) {
    const comment = await this.prisma.comment.create({
      data: { bugId, userId, bodyMarkdown },
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    // Parse @mentions — look for @name patterns and notify
    const mentions = bodyMarkdown.match(/@(\w+)/g) ?? [];
    if (mentions.length > 0) {
      const bug = await this.prisma.bug.findFirst({
        where: { id: bugId },
        select: { issueKey: true, title: true },
      });
      for (const mention of mentions) {
        const name = mention.slice(1);
        const mentionedUser = await this.prisma.user.findFirst({
          where: { name: { contains: name }, deletedAt: null },
        });
        if (mentionedUser && mentionedUser.id !== userId) {
          await this.notifications.createNotification({
            userId: mentionedUser.id,
            type: 'COMMENT_MENTION',
            title: `You were mentioned in ${bug?.issueKey}`,
            body: `${bodyMarkdown.slice(0, 100)}...`,
            bugId,
            bugIssueKey: bug?.issueKey,
          });
        }
      }
    }

    return { data: comment };
  }

  async updateComment(id: string, bodyMarkdown: string, userId: string) {
    const comment = await this.prisma.comment.findFirst({ where: { id, deletedAt: null } });
    if (!comment) throw new NotFoundException('Comment not found');
    if (comment.userId !== userId) throw new ForbiddenException('You can only edit your own comments');

    const updated = await this.prisma.comment.update({
      where: { id },
      data: { bodyMarkdown, updatedAt: new Date() },
    });
    return { data: updated };
  }

  async deleteComment(id: string, userId: string) {
    const comment = await this.prisma.comment.findFirst({ where: { id, deletedAt: null } });
    if (!comment) throw new NotFoundException('Comment not found');
    if (comment.userId !== userId) throw new ForbiddenException('You can only delete your own comments');

    await this.prisma.comment.update({ where: { id }, data: { deletedAt: new Date() } });
    return { message: 'Comment deleted' };
  }
}
