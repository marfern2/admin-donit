import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { AdminCapability, DemoPermissionsService } from './demo-permissions.service';
import { AdminAuthService } from './auth.service';
import { loginRedirect } from './auth.guard';

export function privateLanding(permissions: DemoPermissionsService): string {
  if (permissions.canReadAdmin()) return '/dashboard';
  if (permissions.any()) return '/demo-content';
  return '/';
}

export function canOpenPrivateUrl(url: string, permissions: DemoPermissionsService): boolean {
  const path = url.split(/[?#]/, 1)[0];
  if (!path.startsWith('/') || path.startsWith('//')) return false;
  const segments = path.split('/').filter(Boolean);
  switch (segments[0]) {
    case 'dashboard':
    case 'users':
    case 'tasks':
    case 'task-types': return permissions.canReadAdmin();
    case 'demo-content':
      if (!permissions.any()) return false;
      if (segments[1] === 'fixtures') return permissions.has('DEMO_RESTORE');
      if (['users', 'tasks', 'task-types'].includes(segments[1] ?? '')) return permissions.has('DEMO_READ');
      return segments.length === 1;
    case 'settings': return true;
    default: return false;
  }
}

export const landingGuard: CanActivateFn = (_route, state) => {
  const router = inject(Router);
  if (!inject(AdminAuthService).isAuthenticated()) return loginRedirect(router, state.url);
  const permissions = inject(DemoPermissionsService);
  const landing = privateLanding(permissions);
  return landing === '/' ? true : router.parseUrl(landing);
};

export function capabilityGuard(required: AdminCapability | 'DEMO_ANY', revalidate = true): CanActivateFn {
  return (_route, state) => {
    const permissions = inject(DemoPermissionsService);
    const router = inject(Router);
    const auth = inject(AdminAuthService);
    const result = () => {
      if (!auth.isAuthenticated()) return loginRedirect(router, state.url);
      const allowed = required === 'DEMO_ANY' ? permissions.any() : permissions.has(required);
      return allowed ? true : router.parseUrl(privateLanding(permissions));
    };
    return revalidate ? auth.revalidatePermissions().pipe(map(result)) : result();
  };
}
