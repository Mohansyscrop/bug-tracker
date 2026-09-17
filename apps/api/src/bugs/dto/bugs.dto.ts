import {
  IsString, IsUUID, IsOptional, IsEnum, MinLength, MaxLength, IsBoolean,
  IsNumber, IsIn, Min, Max,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class CreateBugDto {
  @IsUUID()
  projectId: string;

  @IsString()
  @MinLength(5)
  @MaxLength(255)
  title: string;

  @IsString()
  @MinLength(10)
  description: string;

  @IsString()
  @MinLength(10)
  stepsToReproduce: string;

  @IsString()
  @MinLength(5)
  expectedResult: string;

  @IsString()
  @MinLength(5)
  actualResult: string;

  @IsIn(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'])
  severity: string;

  @IsIn(['P1', 'P2', 'P3', 'P4'])
  @IsOptional()
  priority?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  environment?: string;

  @IsUUID()
  @IsOptional()
  componentId?: string;

  @IsUUID()
  @IsOptional()
  milestoneId?: string;

  @IsUUID()
  @IsOptional()
  assignedTo?: string;

  @IsString()
  @IsOptional()
  bugArea?: string;

  @IsUUID()
  @IsOptional()
  testingCycleId?: string;

  @IsUUID()
  @IsOptional()
  requirementId?: string;

  @IsUUID()
  @IsOptional()
  testCaseId?: string;

  @IsUUID()
  @IsOptional()
  testExecutionId?: string;
}

export class UpdateBugDto {
  @IsString()
  @IsOptional()
  @MinLength(5)
  @MaxLength(255)
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  stepsToReproduce?: string;

  @IsString()
  @IsOptional()
  expectedResult?: string;

  @IsString()
  @IsOptional()
  actualResult?: string;

  @IsIn(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'])
  @IsOptional()
  severity?: string;

  @IsIn(['P1', 'P2', 'P3', 'P4'])
  @IsOptional()
  priority?: string;

  @IsString()
  @IsOptional()
  environment?: string;

  @IsUUID()
  @IsOptional()
  componentId?: string;

  @IsUUID()
  @IsOptional()
  milestoneId?: string;

  @IsUUID()
  @IsOptional()
  assignedToId?: string;

  @IsString()
  @IsOptional()
  bugArea?: string;

  @IsUUID()
  @IsOptional()
  testingCycleId?: string;

  @IsUUID()
  @IsOptional()
  requirementId?: string;

  @IsUUID()
  @IsOptional()
  testCaseId?: string;
}

export class TransitionStatusDto {
  @IsString()
  status: string;

  @IsString()
  @IsOptional()
  resolution?: string;

  @IsString()
  @IsOptional()
  comment?: string;
}

export class BulkUpdateDto {
  @IsUUID('all', { each: true })
  bugIds: string[];

  update: {
    status?: string;
    priority?: string;
    assignedTo?: string | null;
    milestoneId?: string | null;
    bugArea?: string | null;
    testingCycleId?: string | null;
  };
}

export class BugFilterDto {
  @IsUUID()
  @IsOptional()
  projectId?: string;

  @IsString()
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  severity?: string;

  @IsString()
  @IsOptional()
  priority?: string;

  @IsUUID()
  @IsOptional()
  assignedTo?: string;

  @IsUUID()
  @IsOptional()
  milestoneId?: string;

  @IsUUID()
  @IsOptional()
  componentId?: string;

  @IsString()
  @IsOptional()
  bugArea?: string;

  @IsUUID()
  @IsOptional()
  testingCycleId?: string;

  @IsUUID()
  @IsOptional()
  requirementId?: string;

  @IsUUID()
  @IsOptional()
  testCaseId?: string;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  isRegression?: boolean;

  @IsString()
  @IsOptional()
  search?: string;

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  @Min(1)
  page: number = 1;

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(100)
  limit: number = 20;

  @IsString()
  @IsOptional()
  sortBy: string = 'createdAt';

  @IsIn(['asc', 'desc'])
  @IsOptional()
  sortOrder: 'asc' | 'desc' = 'desc';
}
