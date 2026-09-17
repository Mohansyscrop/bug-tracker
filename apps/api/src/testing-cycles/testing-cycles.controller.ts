import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
} from '@nestjs/common';
import { TestingCyclesService } from './testing-cycles.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import {
  CreateTestingCycleDto,
  UpdateTestingCycleDto,
  CreateRequirementDto,
  CreateTestSuiteDto,
  CreateTestCaseDto,
  ExecuteTestCaseDto,
} from './dto/testing-cycles.dto';

@Controller('testing-cycles')
export class TestingCyclesController {
  constructor(private readonly svc: TestingCyclesService) {}

  @Get()
  listCycles(@Query('projectId') projectId?: string) {
    return this.svc.listCycles(projectId);
  }

  @Get('overview')
  getQAOverview(@Query('projectId') projectId?: string) {
    return this.svc.getQAOverview(projectId);
  }

  @Get(':id')
  getCycle(@Param('id') id: string) {
    return this.svc.getCycle(id);
  }

  @Post()
  createCycle(@Body() dto: CreateTestingCycleDto, @CurrentUser() user: any) {
    return this.svc.createCycle(dto, user.id);
  }

  @Put(':id')
  updateCycle(@Param('id') id: string, @Body() dto: UpdateTestingCycleDto) {
    return this.svc.updateCycle(id, dto);
  }

  @Delete(':id')
  deleteCycle(@Param('id') id: string) {
    return this.svc.deleteCycle(id);
  }

  // ── Requirements ─────────────────────────────────────────────

  @Get('requirements/:projectId')
  listRequirements(@Param('projectId') projectId: string) {
    return this.svc.listRequirements(projectId);
  }

  @Post('requirements')
  createRequirement(@Body() dto: CreateRequirementDto) {
    return this.svc.createRequirement(dto);
  }

  @Put('requirements/:id')
  updateRequirement(@Param('id') id: string, @Body() body: any) {
    return this.svc.updateRequirement(id, body);
  }

  @Delete('requirements/:id')
  deleteRequirement(@Param('id') id: string) {
    return this.svc.deleteRequirement(id);
  }

  // ── Suites & Cases ───────────────────────────────────────────

  @Post('suites')
  createSuite(@Body() dto: CreateTestSuiteDto) {
    return this.svc.createTestSuite(dto);
  }

  @Post('test-cases')
  createTestCase(@Body() dto: CreateTestCaseDto) {
    return this.svc.createTestCase(dto);
  }

  @Post('executions')
  recordExecution(@Body() dto: ExecuteTestCaseDto, @CurrentUser() user: any) {
    return this.svc.recordExecution(dto, user.id);
  }
}
