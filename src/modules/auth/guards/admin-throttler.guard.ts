import { Injectable, ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerException } from '@nestjs/throttler';

/**
 * Rate limiting guard that gives admins unlimited requests.
 * Regular users: 60 req/min (default from AppModule).
 * Admins: unlimited — they need full access to manage the platform.
 */
@Injectable()
export class AdminThrottlerGuard extends ThrottlerGuard {
  protected async handleRequest(
    requestProps: any,
  ): Promise<boolean> {
    try {
      return await super.handleRequest(requestProps);
    } catch (error) {
      // If it's a ThrottlerException, check if user is admin
      if (error instanceof ThrottlerException) {
        const context = requestProps.context;
        if (context) {
          const request = context.switchToHttp().getRequest();
          const user = request?.user;
          if (user?.role === 'admin' || user?.role === 'superadmin') {
            return true; // Skip rate limit for admins
          }
        }
      }
      throw error;
    }
  }
}
