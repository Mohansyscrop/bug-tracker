import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AdminGuard } from '../auth/guards/admin.guard';

@Controller('users')
export class UsersController {
  constructor(private readonly svc: UsersService) {}

  @Get()
  findAll() {
    return this.svc.findAll();
  }

  @Get('me')
  getMe(@CurrentUser() user: any) {
    return { data: user };
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.svc.findById(id);
  }

  @Patch('me')
  updateProfile(@CurrentUser() user: any, @Body() body: { name?: string; avatarUrl?: string }) {
    return this.svc.updateProfile(user.id, body);
  }

  @Post()
  @UseGuards(AdminGuard)
  createUser(
    @Body()
    body: {
      name: string;
      email: string;
      password: string;
      globalRole?: string;
      projectMembers?: { projectId: string; projectRole: string }[];
    },
  ) {
    return this.svc.createUser(body);
  }

  @Patch(':id/role')
  @UseGuards(AdminGuard)
  updateRole(@Param('id') id: string, @Body() body: { globalRole: string }) {
    return this.svc.updateRole(id, body.globalRole);
  }

  @Patch(':id/projects')
  @UseGuards(AdminGuard)
  updateProjects(
    @Param('id') id: string,
    @Body() body: { projectMembers: { projectId: string; projectRole: string }[] },
  ) {
    return this.svc.updateProjects(id, body.projectMembers ?? []);
  }

  @Delete(':id')
  @UseGuards(AdminGuard)
  deleteUser(@Param('id') id: string) {
    return this.svc.deleteUser(id);
  }
}

