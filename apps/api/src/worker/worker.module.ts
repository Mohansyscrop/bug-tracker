import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { SlaMonitorWorker } from './sla-monitor.worker';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [ScheduleModule.forRoot(), PrismaModule, NotificationsModule],
  providers: [SlaMonitorWorker],
})
export class WorkerModule {}
