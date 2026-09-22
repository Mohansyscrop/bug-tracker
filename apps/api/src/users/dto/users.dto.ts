import {
  IsString,
  IsEmail,
  MinLength,
  MaxLength,
  IsOptional,
  IsEnum,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ProjectAssignmentDto {
  @IsString()
  projectId: string;

  @IsString()
  projectRole: string;
}

export class CreateUserDto {
  @IsString()
  @MinLength(2, { message: 'Name must be at least 2 characters long.' })
  @MaxLength(100, { message: 'Name cannot exceed 100 characters.' })
  name: string;

  @IsEmail({}, { message: 'Please provide a valid email address.' })
  email: string;

  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters long.' })
  password: string;

  @IsOptional()
  @IsString()
  globalRole?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProjectAssignmentDto)
  projectMembers?: ProjectAssignmentDto[];
}

export class UpdateUserRoleDto {
  @IsString()
  globalRole: string;
}

export class UpdateUserProjectsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProjectAssignmentDto)
  projectMembers: ProjectAssignmentDto[];
}

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @IsString()
  avatarUrl?: string;
}
