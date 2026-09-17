import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateTestingCycleDto,
  UpdateTestingCycleDto,
  CreateRequirementDto,
  CreateTestSuiteDto,
  CreateTestCaseDto,
  ExecuteTestCaseDto,
} from './dto/testing-cycles.dto';

@Injectable()
export class TestingCyclesService {
  constructor(private prisma: PrismaService) {}

  // ── Testing Cycles ───────────────────────────────────────────

  async listCycles(projectId?: string) {
    const where: any = {};
    if (projectId) where.projectId = projectId;

    const cycles = await this.prisma.testingCycle.findMany({
      where,
      include: {
        project: { select: { id: true, key: true, name: true } },
        createdBy: { select: { id: true, name: true, email: true } },
        testExecutions: { select: { id: true, status: true } },
        bugs: {
          select: {
            id: true,
            status: true,
            severity: true,
            bugArea: true,
          },
        },
      },
      orderBy: [{ cycleNumber: 'desc' }, { createdAt: 'desc' }],
    });

    return cycles.map((c) => {
      const executions = c.testExecutions;
      const totalTests = executions.length;
      const passed = executions.filter((e) => e.status === 'PASSED').length;
      const failed = executions.filter((e) => e.status === 'FAILED').length;
      const blocked = executions.filter((e) => e.status === 'BLOCKED').length;
      const notRun = executions.filter((e) => e.status === 'NOT_RUN').length;

      const bugsByArea: Record<string, number> = {};
      c.bugs.forEach((b) => {
        const area = b.bugArea || 'FRONTEND';
        bugsByArea[area] = (bugsByArea[area] || 0) + 1;
      });

      return {
        id: c.id,
        projectId: c.projectId,
        project: c.project,
        name: c.name,
        cycleNumber: c.cycleNumber,
        description: c.description,
        scope: c.scope,
        type: c.type,
        status: c.status,
        environment: c.environment,
        startDate: c.startDate,
        plannedEndDate: c.plannedEndDate,
        completedAt: c.completedAt,
        createdAt: c.createdAt,
        createdBy: c.createdBy,
        metrics: {
          totalTests,
          passed,
          failed,
          blocked,
          notRun,
          passRate: totalTests > 0 ? Math.round((passed / totalTests) * 100) : 0,
          totalBugs: c.bugs.length,
          openBugs: c.bugs.filter((b) => !['FIXED', 'CLOSED'].includes(b.status)).length,
          bugsByArea,
        },
      };
    });
  }

  async getCycle(id: string) {
    const cycle = await this.prisma.testingCycle.findUnique({
      where: { id },
      include: {
        project: { select: { id: true, key: true, name: true } },
        createdBy: { select: { id: true, name: true, email: true } },
        testSuites: {
          include: {
            testCases: {
              include: {
                requirement: { select: { id: true, reqKey: true, title: true } },
                executions: {
                  where: { testingCycleId: id },
                  include: { executedBy: { select: { id: true, name: true } } },
                },
              },
            },
          },
        },
        testExecutions: {
          include: {
            testCase: { select: { id: true, testCaseKey: true, title: true } },
            executedBy: { select: { id: true, name: true } },
          },
        },
        bugs: {
          include: {
            assignedTo: { select: { id: true, name: true, email: true } },
            reportedBy: { select: { id: true, name: true } },
            requirement: { select: { id: true, reqKey: true, title: true } },
            testCase: { select: { id: true, testCaseKey: true, title: true } },
          },
        },
      },
    });

    if (!cycle) throw new NotFoundException('Testing Cycle not found');

    const totalTests = cycle.testExecutions.length;
    const passed = cycle.testExecutions.filter((e) => e.status === 'PASSED').length;
    const failed = cycle.testExecutions.filter((e) => e.status === 'FAILED').length;
    const blocked = cycle.testExecutions.filter((e) => e.status === 'BLOCKED').length;
    const notRun = cycle.testExecutions.filter((e) => e.status === 'NOT_RUN').length;

    const bugsByArea: Record<string, number> = {};
    cycle.bugs.forEach((b) => {
      const area = b.bugArea || 'FRONTEND';
      bugsByArea[area] = (bugsByArea[area] || 0) + 1;
    });

    return {
      ...cycle,
      metrics: {
        totalTests,
        passed,
        failed,
        blocked,
        notRun,
        passRate: totalTests > 0 ? Math.round((passed / totalTests) * 100) : 0,
        totalBugs: cycle.bugs.length,
        openBugs: cycle.bugs.filter((b) => !['FIXED', 'CLOSED'].includes(b.status)).length,
        bugsByArea,
      },
    };
  }

  async createCycle(dto: CreateTestingCycleDto, userId: string) {
    const project = await this.prisma.project.findUnique({ where: { id: dto.projectId } });
    if (!project) throw new NotFoundException('Project not found');

    const lastCycle = await this.prisma.testingCycle.findFirst({
      where: { projectId: dto.projectId },
      orderBy: { cycleNumber: 'desc' },
      select: { cycleNumber: true },
    });
    const cycleNumber = (lastCycle?.cycleNumber ?? 0) + 1;

    return this.prisma.testingCycle.create({
      data: {
        projectId: dto.projectId,
        name: dto.name,
        cycleNumber,
        description: dto.description,
        scope: dto.scope,
        type: dto.type ?? 'FUNCTIONAL',
        environment: dto.environment ?? 'QA',
        status: 'PLANNED',
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        plannedEndDate: dto.plannedEndDate ? new Date(dto.plannedEndDate) : undefined,
        createdById: userId,
      },
      include: {
        project: { select: { id: true, key: true, name: true } },
      },
    });
  }

  async updateCycle(id: string, dto: UpdateTestingCycleDto) {
    const cycle = await this.prisma.testingCycle.findUnique({ where: { id } });
    if (!cycle) throw new NotFoundException('Testing cycle not found');

    const data: any = { ...dto };
    if (dto.startDate) data.startDate = new Date(dto.startDate);
    if (dto.plannedEndDate) data.plannedEndDate = new Date(dto.plannedEndDate);
    if (dto.completedAt) data.completedAt = new Date(dto.completedAt);
    if (dto.status === 'COMPLETED' && !dto.completedAt) {
      data.completedAt = new Date();
    }

    return this.prisma.testingCycle.update({
      where: { id },
      data,
      include: {
        project: { select: { id: true, key: true, name: true } },
      },
    });
  }

  async deleteCycle(id: string) {
    const cycle = await this.prisma.testingCycle.findUnique({ where: { id } });
    if (!cycle) throw new NotFoundException('Testing cycle not found');
    await this.prisma.testingCycle.delete({ where: { id } });
    return { message: 'Testing cycle deleted' };
  }

  // ── Requirements ─────────────────────────────────────────────

  async listRequirements(projectId: string) {
    return this.prisma.requirement.findMany({
      where: { projectId },
      include: {
        testCases: { select: { id: true, testCaseKey: true, title: true, status: true } },
        bugs: { select: { id: true, issueKey: true, title: true, status: true, severity: true, bugArea: true } },
      },
      orderBy: { reqKey: 'asc' },
    });
  }

  async createRequirement(dto: CreateRequirementDto) {
    const totalCount = await this.prisma.requirement.count();
    let candidateIndex = totalCount + 1;
    let reqKey = `REQ-${String(candidateIndex).padStart(3, '0')}`;
    while (await this.prisma.requirement.findUnique({ where: { reqKey } })) {
      candidateIndex++;
      reqKey = `REQ-${String(candidateIndex).padStart(3, '0')}`;
    }

    return this.prisma.requirement.create({
      data: {
        reqKey,
        projectId: dto.projectId,
        title: dto.title,
        description: dto.description,
        status: dto.status ?? 'ACTIVE',
        priority: dto.priority ?? 'MEDIUM',
      },
      include: {
        testCases: true,
        bugs: true,
      },
    });
  }

  async updateRequirement(id: string, data: any) {
    return this.prisma.requirement.update({ where: { id }, data });
  }

  async deleteRequirement(id: string) {
    await this.prisma.requirement.delete({ where: { id } });
    return { message: 'Requirement deleted' };
  }

  // ── Test Suites & Test Cases ─────────────────────────────────

  async createTestSuite(dto: CreateTestSuiteDto) {
    const cycle = await this.prisma.testingCycle.findUnique({ where: { id: dto.testingCycleId } });
    if (!cycle) throw new NotFoundException('Testing cycle not found');

    return this.prisma.testSuite.create({
      data: {
        testingCycleId: dto.testingCycleId,
        name: dto.name,
        description: dto.description,
      },
      include: { testCases: true },
    });
  }

  async createTestCase(dto: CreateTestCaseDto) {
    const suite = await this.prisma.testSuite.findUnique({
      where: { id: dto.suiteId },
      include: { testingCycle: true },
    });
    if (!suite) throw new NotFoundException('Test suite not found');

    const count = await this.prisma.testCase.count();
    const testCaseKey = `TC-${String(count + 1).padStart(3, '0')}`;

    const testCase = await this.prisma.testCase.create({
      data: {
        testCaseKey,
        suiteId: dto.suiteId,
        requirementId: dto.requirementId,
        title: dto.title,
        preconditions: dto.preconditions,
        steps: dto.steps,
        expectedResult: dto.expectedResult,
        type: dto.type ?? 'FUNCTIONAL',
        priority: dto.priority ?? 'P2',
        status: 'ACTIVE',
      },
      include: {
        requirement: true,
      },
    });

    // Auto-create initial NOT_RUN execution for this cycle
    await this.prisma.testExecution.create({
      data: {
        testingCycleId: suite.testingCycleId,
        testCaseId: testCase.id,
        status: 'NOT_RUN',
      },
    });

    return testCase;
  }

  async recordExecution(dto: ExecuteTestCaseDto, userId: string) {
    const existing = await this.prisma.testExecution.findFirst({
      where: {
        testingCycleId: dto.testingCycleId,
        testCaseId: dto.testCaseId,
      },
    });

    if (existing) {
      return this.prisma.testExecution.update({
        where: { id: existing.id },
        data: {
          status: dto.status,
          actualResult: dto.actualResult,
          notes: dto.notes,
          executedById: userId,
          executedAt: new Date(),
        },
        include: {
          testCase: true,
          executedBy: { select: { id: true, name: true } },
        },
      });
    }

    return this.prisma.testExecution.create({
      data: {
        testingCycleId: dto.testingCycleId,
        testCaseId: dto.testCaseId,
        status: dto.status,
        actualResult: dto.actualResult,
        notes: dto.notes,
        executedById: userId,
        executedAt: new Date(),
      },
      include: {
        testCase: true,
        executedBy: { select: { id: true, name: true } },
      },
    });
  }

  // ── High-Level QA Dashboard Overview ─────────────────────────

  async getQAOverview(projectId?: string) {
    const where: any = {};
    if (projectId) where.projectId = projectId;

    // Active cycle
    const activeCycle = await this.prisma.testingCycle.findFirst({
      where: { ...where, status: 'IN_PROGRESS' },
      orderBy: { cycleNumber: 'desc' },
      include: {
        project: { select: { id: true, key: true, name: true } },
        testExecutions: true,
        bugs: true,
      },
    });

    // All test executions in the project
    const executions = await this.prisma.testExecution.findMany({
      where: projectId ? { testingCycle: { projectId } } : {},
      select: { status: true },
    });

    const totalTests = executions.length;
    const passed = executions.filter((e) => e.status === 'PASSED').length;
    const failed = executions.filter((e) => e.status === 'FAILED').length;
    const blocked = executions.filter((e) => e.status === 'BLOCKED').length;
    const notRun = executions.filter((e) => e.status === 'NOT_RUN').length;

    // Defect breakdown by area
    const bugs = await this.prisma.bug.findMany({
      where: { ...(projectId ? { projectId } : {}), deletedAt: null },
      select: {
        id: true,
        status: true,
        severity: true,
        bugArea: true,
        isRegression: true,
      },
    });

    const bugsByArea: Record<string, number> = {
      FRONTEND: 0,
      BACKEND: 0,
      DATABASE: 0,
      API: 0,
      INTEGRATION: 0,
      UI_UX: 0,
      PERFORMANCE: 0,
      SECURITY: 0,
      REGRESSION: 0,
    };

    bugs.forEach((b) => {
      const area = b.bugArea || 'FRONTEND';
      bugsByArea[area] = (bugsByArea[area] || 0) + 1;
    });

    const pendingRetest = bugs.filter((b) => b.status === 'RETEST').length;
    const reopened = bugs.filter((b) => b.status === 'REOPENED').length;
    const fixed = bugs.filter((b) => b.status === 'FIXED').length;

    return {
      activeCycle: activeCycle
        ? {
            id: activeCycle.id,
            name: activeCycle.name,
            cycleNumber: activeCycle.cycleNumber,
            status: activeCycle.status,
            environment: activeCycle.environment,
            startDate: activeCycle.startDate,
            plannedEndDate: activeCycle.plannedEndDate,
            project: activeCycle.project,
            testCount: activeCycle.testExecutions.length,
            bugCount: activeCycle.bugs.length,
          }
        : null,
      testStats: {
        total: totalTests,
        passed,
        failed,
        blocked,
        notRun,
        passRate: totalTests > 0 ? Math.round((passed / totalTests) * 100) : 0,
      },
      bugsByArea,
      qualityAlerts: {
        pendingRetest,
        reopened,
        fixed,
        regressionCount: bugs.filter((b) => b.isRegression || b.bugArea === 'REGRESSION').length,
      },
    };
  }
}
