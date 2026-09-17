import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface LogActivityDto {
  bugId: string;
  userId: string;
  fieldChanged: string;
  oldValue?: string;
  newValue?: string;
}

@Injectable()
export class ActivityLogService {
  constructor(private prisma: PrismaService) {}

  async log(dto: LogActivityDto) {
    return this.prisma.activityLog.create({
      data: {
        bugId: dto.bugId,
        userId: dto.userId,
        fieldChanged: dto.fieldChanged,
        oldValue: dto.oldValue,
        newValue: dto.newValue,
      },
    });
  }

  async getForBug(bugId: string) {
    return this.prisma.activityLog.findMany({
      where: { bugId },
      include: { user: { select: { id: true, name: true } } },
      orderBy: { changedAt: 'desc' },
    });
  }
}
