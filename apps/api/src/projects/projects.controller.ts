import {
  Controller, Get, Post, Put, Patch, Delete, Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { ProjectRoleGuard } from './guards/project-role.guard';
import { CreateProjectDto, AddMemberDto, CreateMilestoneDto, CreateComponentDto } from './dto/projects.dto';

@Controller('projects')
export class ProjectsController {
  constructor(private readonly svc: ProjectsService) {}

  @Get()
  listProjects(@CurrentUser() user: any) {
    return this.svc.listProjectsForUser(user.id, user.globalRole);
  }

  @Post()
  createProject(@CurrentUser() user: any, @Body() dto: CreateProjectDto) {
    return this.svc.createProject(user.id, dto);
  }

  @Get(':id')
  @UseGuards(ProjectRoleGuard)
  getProject(@Param('id') id: string, @CurrentUser() user: any) {
    return this.svc.getProject(id, user.id);
  }

  @Put(':id')
  @UseGuards(ProjectRoleGuard)
  @Roles('LEAD', 'ADMIN')
  updateProject(@Param('id') id: string, @Body() dto: Partial<CreateProjectDto>) {
    return this.svc.updateProject(id, dto);
  }

  @Delete(':id')
  @UseGuards(ProjectRoleGuard)
  @Roles('ADMIN')
  deleteProject(@Param('id') id: string) {
    return this.svc.deleteProject(id);
  }

  // Members
  @Post(':id/members')
  @UseGuards(ProjectRoleGuard)
  @Roles('LEAD', 'ADMIN')
  addMember(@Param('id') projectId: string, @Body() dto: AddMemberDto) {
    return this.svc.addMember(projectId, dto);
  }

  @Get(':id/members')
  @UseGuards(ProjectRoleGuard)
  getMembers(@Param('id') projectId: string) {
    return this.svc.getMembers(projectId);
  }

  @Patch(':id/members/:userId')
  @UseGuards(ProjectRoleGuard)
  @Roles('LEAD', 'ADMIN')
  updateMemberRole(
    @Param('id') projectId: string,
    @Param('userId') userId: string,
    @Body() body: { projectRole: string },
  ) {
    return this.svc.updateMemberRole(projectId, userId, body.projectRole);
  }

  @Delete(':id/members/:userId')
  @UseGuards(ProjectRoleGuard)
  @Roles('LEAD', 'ADMIN')
  removeMember(@Param('id') projectId: string, @Param('userId') userId: string) {
    return this.svc.removeMember(projectId, userId);
  }

  // Milestones
  @Get(':id/milestones')
  @UseGuards(ProjectRoleGuard)
  getMilestones(@Param('id') projectId: string) {
    return this.svc.getMilestones(projectId);
  }

  @Post(':id/milestones')
  @UseGuards(ProjectRoleGuard)
  @Roles('LEAD', 'ADMIN')
  createMilestone(@Param('id') projectId: string, @Body() dto: CreateMilestoneDto) {
    return this.svc.createMilestone(projectId, dto);
  }

  // Components
  @Get(':id/components')
  @UseGuards(ProjectRoleGuard)
  getComponents(@Param('id') projectId: string) {
    return this.svc.getComponents(projectId);
  }

  @Post(':id/components')
  @UseGuards(ProjectRoleGuard)
  @Roles('LEAD', 'ADMIN')
  createComponent(@Param('id') projectId: string, @Body() dto: CreateComponentDto) {
    return this.svc.createComponent(projectId, dto);
  }

  // Stats
  @Get(':id/stats')
  @UseGuards(ProjectRoleGuard)
  getStats(@Param('id') projectId: string) {
    return this.svc.getProjectStats(projectId);
  }
}
