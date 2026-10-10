import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { canOpenPrivateUrl, capabilityGuard, landingGuard, privateLanding } from './capability.guard';
import { DemoPermissionsService } from './demo-permissions.service';
import { AdminAuthService } from './auth.service';
import { firstValueFrom, Observable, of } from 'rxjs';

describe('private capability routing', () => {
  let permissions: DemoPermissionsService;
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter([]), { provide: AdminAuthService, useValue: { revalidatePermissions: () => of(undefined) } }] });
    permissions = TestBed.inject(DemoPermissionsService);
    router = TestBed.inject(Router);
  });

  const run = (guard: ReturnType<typeof capabilityGuard>) => TestBed.runInInjectionContext(() => guard({} as never, {} as never));

  it.each([
    [['ADMIN_READ'], '/dashboard'],
    [['DEMO_READ', 'DEMO_WRITE', 'DEMO_PUBLISH', 'DEMO_RESTORE'], '/demo-content'],
    [[], '/'],
  ] as const)('selects a safe landing for %j', (values, destination) => {
    permissions.setPermissions(values);
    expect(privateLanding(permissions)).toBe(destination);
    const result = TestBed.runInInjectionContext(() => landingGuard({} as never, {} as never));
    expect(result === true ? '/' : router.serializeUrl(result as never)).toBe(destination);
  });

  it('blocks real routes before loading them and keeps demo routes available', () => {
    permissions.setPermissions(['DEMO_READ', 'DEMO_RESTORE']);
    expect(router.serializeUrl(run(capabilityGuard('ADMIN_READ', false)) as never)).toBe('/demo-content');
    expect(run(capabilityGuard('DEMO_READ', false))).toBe(true);
    expect(run(capabilityGuard('DEMO_RESTORE', false))).toBe(true);
    expect(canOpenPrivateUrl('/users/1?tab=tasks', permissions)).toBe(false);
    expect(canOpenPrivateUrl('/demo-content/users/1', permissions)).toBe(true);
    expect(canOpenPrivateUrl('/demo-content/fixtures', permissions)).toBe(true);
  });

  it('does not infer DEMO_READ from write or restore', () => {
    permissions.setPermissions(['DEMO_WRITE', 'DEMO_RESTORE']);
    expect(run(capabilityGuard('DEMO_ANY', false))).toBe(true);
    expect(router.serializeUrl(run(capabilityGuard('DEMO_READ', false)) as never)).toBe('/demo-content');
    expect(canOpenPrivateUrl('/demo-content/users', permissions)).toBe(false);
    expect(canOpenPrivateUrl('/demo-content/fixtures', permissions)).toBe(true);
  });

  it('routes an admin-only account away from demo without a loop', () => {
    permissions.setPermissions(['ADMIN_READ', 'USER_WRITE', 'USER_DELETE', 'TASK_WRITE']);
    expect(router.serializeUrl(run(capabilityGuard('DEMO_ANY', false)) as never)).toBe('/dashboard');
    expect(run(capabilityGuard('ADMIN_READ', false))).toBe(true);
  });

  it('uses the new /me permissions before activating a real admin route', async () => {
    permissions.setPermissions(['ADMIN_READ']);
    const auth = TestBed.inject(AdminAuthService);
    vi.spyOn(auth, 'revalidatePermissions').mockImplementation(() => {
      permissions.setPermissions(['DEMO_READ']);
      return of(undefined);
    });
    const result = await firstValueFrom(run(capabilityGuard('ADMIN_READ')) as Observable<boolean>);
    expect(router.serializeUrl(result as never)).toBe('/demo-content');
    expect(auth.revalidatePermissions).toHaveBeenCalledOnce();
  });
});
