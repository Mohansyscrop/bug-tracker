import {
  IsString, IsUUID, IsOptional, MinLength, MaxLength, IsIn, IsDateString,
} from 'class-validator';

export class CreateTestingCycleDto {
  @IsUUID()
  projectId: string;

  @IsString()
  @MinLength(3)
  @MaxLength(150)
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  scope?: string;

  @IsIn(['INITIAL', 'FEATURE', 'REGRESSION', 'UAT', 'HOTFIX'])
  @IsOptional()
  type?: string;

  @IsString()
  @IsOptional()
  environment?: string;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  plannedEndDate?: string;
}

export class UpdateTestingCycleDto {
  @IsString()
  @IsOptional()
  @MinLength(3)
  @MaxLength(150)
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  scope?: string;

  @IsIn(['INITIAL', 'FEATURE', 'REGRESSION', 'UAT', 'HOTFIX'])
  @IsOptional()
  type?: string;

  @IsIn(['PLANNED', 'IN_PROGRESS', 'BLOCKED', 'COMPLETED', 'CANCELLED'])
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  environment?: string;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  plannedEndDate?: string;

  @IsDateString()
  @IsOptional()
  completedAt?: string;
}

export class CreateRequirementDto {
  @IsUUID()
  projectId: string;

  @IsString()
  @MinLength(3)
  @MaxLength(255)
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsIn(['DRAFT', 'ACTIVE', 'IN_TESTING', 'COMPLETED'])
  @IsOptional()
  status?: string;

  @IsIn(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])
  @IsOptional()
  priority?: string;
}

export class CreateTestSuiteDto {
  @IsUUID()
  testingCycleId: string;

  @IsString()
  @MinLength(2)
  @MaxLength(150)
  name: string;

  @IsString()
  @IsOptional()
  description?: string;
}

export class CreateTestCaseDto {
  @IsUUID()
  suiteId: string;

  @IsUUID()
  @IsOptional()
  requirementId?: string;

  @IsString()
  @MinLength(5)
  @MaxLength(255)
  title: string;

  @IsString()
  @IsOptional()
  preconditions?: string;

  @IsString()
  @MinLength(5)
  steps: string;

  @IsString()
  @MinLength(3)
  expectedResult: string;

  @IsIn(['FUNCTIONAL', 'REGRESSION', 'UI_UX', 'SECURITY', 'PERFORMANCE', 'INTEGRATION'])
  @IsOptional()
  type?: string;

  @IsIn(['P1', 'P2', 'P3', 'P4'])
  @IsOptional()
  priority?: string;
}

export class ExecuteTestCaseDto {
  @IsUUID()
  testingCycleId: string;

  @IsUUID()
  testCaseId: string;

  @IsIn(['NOT_RUN', 'PASSED', 'FAILED', 'BLOCKED', 'SKIPPED'])
  status: string;

  @IsString()
  @IsOptional()
  actualResult?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
