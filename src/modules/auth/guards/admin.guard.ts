import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';

export const ROLES_KEY = 'roles';

/**
 * @Roles('admin', 'superadmin') — Restrict endpoint to specific roles
 */
export const Roles = (...roles: UserRole[]) =>
  (target: any, key?: string, descriptor?: any) => {
    if (descriptor) {
      Reflect.defineMetadata(ROLES_KEY, roles, descriptor.value);
      return descriptor;
    }
    Reflect.defineMetadata(ROLES_KEY, roles, target);
    return target;
  };

/**
 * @Admin() — Shortcut for @Roles('admin', 'superadmin')
 */
export const Admin = () => Roles(UserRole.admin, UserRole.superadmin);

/**
 * @SuperAdmin() — Only superadmins
 */
export const SuperAdmin = () => Roles(UserRole.superadmin);

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true; // No roles required
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('No user in request — authentication required');
    }

    const userRole: UserRole = user.role;

    if (!userRole || !requiredRoles.includes(userRole)) {
      throw new ForbiddenException(
        `Access denied. Required role: ${requiredRoles.join(' or ')}. Your role: ${userRole || 'none'}`,
      );
    }

    return true;
  }
}
