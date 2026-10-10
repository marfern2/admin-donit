import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { inject } from '@angular/core';
import { AdminAuthService } from './auth.service';

export const authGuard: CanActivateFn = async (_route, state) => {
  const authService = inject(AdminAuthService);
  const router = inject(Router);

  if (!authService.initialized() && !authService.isAuthenticated()) {
    await authService.initialize();
  }

  if (authService.isAuthenticated()) {
    return true;
  }

  return loginRedirect(router, state.url);
};

export function loginRedirect(router: Router, url: string): UrlTree {
  return router.createUrlTree(['/login'], { queryParams: url && url !== '/' ? { redirectUrl: url } : {} });
}
