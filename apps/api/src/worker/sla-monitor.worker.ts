import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class SlaMonitorWorker {
  constructor(private prisma: PrismaService, private notifications: NotificationsService) {}

  // Run every 15 minutes
  @Cron('*/15 * * * *')
  async checkSlaBreaches() {
    const slaThreshold = parseInt(process.env.SLA_NEW_BREACH_HOURS ?? '48', 10);
    const cutoff = new Date(Date.now() - slaThreshold * 60 * 60 * 1000);

    const breachedBugs = await this.prisma.bug.findMany({
      where: {
        status: 'NEW',
        deletedAt: null,
        createdAt: { lte: cutoff },
      },
      include: {
        project: { select: { id: true, name: true, key: true } },
      },
    });

    for (const bug of breachedBugs) {
      // Notify project leads
      await this.notifications.notifyProjectLeads(bug.projectId, {
        type: 'SLA_BREACH',
        title: `SLA Breach: ${bug.issueKey} unassigned for >${slaThreshold}h`,
        body: `Bug "${bug.title}" has been in NEW state for over ${slaThreshold} hours without assignment.`,
        bugId: bug.id,
        bugIssueKey: bug.issueKey,
      });
    }

    if (breachedBugs.length > 0) {
      console.log(`[SLA Monitor] Found ${breachedBugs.length} SLA breaches`);
    }
  }
}
