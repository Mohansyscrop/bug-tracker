import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ProjectsService } from '../projects.service';
import { ROLES_KEY } from '../../auth/decorators/roles.decorator';

@Injectable()
export class ProjectRoleGuard implements CanActivate {
  constructor(private reflector: Reflector, private projects: ProjectsService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Admins bypass project-level guards
    if (user.globalRole === 'ADMIN') return true;

    const projectId = request.params.id;
    if (!projectId) return true;

    const role = await this.projects.getUserProjectRole(projectId, user.id);
    if (!role) throw new ForbiddenException('Not a member of this project');

    // Attach role to request for downstream use
    request.projectRole = role;

    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) return true;

    // Check ADMIN global role or project role
    if (requiredRoles.includes('ADMIN') && user.globalRole === 'ADMIN') return true;

    return requiredRoles.includes(role);
  }
}
