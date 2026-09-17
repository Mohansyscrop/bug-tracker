import { IsString, IsUUID, IsOptional, IsEnum, MinLength, MaxLength, IsDateString } from 'class-validator';

export enum ProjectRoleEnum {
  LEAD = 'LEAD',
  QA = 'QA',
  DEV = 'DEV',
  VIEWER = 'VIEWER',
}

export class CreateProjectDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @IsString()
  @MinLength(2)
  @MaxLength(10)
  key: string;

  @IsString()
  @IsOptional()
  description?: string;
}

export class AddMemberDto {
  @IsUUID()
  userId: string;

  @IsEnum(ProjectRoleEnum)
  projectRole: string;
}

export class CreateMilestoneDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @IsString()
  @MinLength(1)
  @MaxLength(50)
  versionCode: string;

  @IsDateString()
  @IsOptional()
  releaseDate?: string;
}

export class CreateComponentDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @IsUUID()
  @IsOptional()
  leadId?: string;
}
