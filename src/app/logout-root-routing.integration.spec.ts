import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, TestRequest, provideHttpClientTesting } from '@angular/common/http/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { firstValueFrom } from 'rxjs';
import { routes } from './app.routes';
import { AdminAuthService } from './core/auth/auth.service';
import { DemoPermissionsService } from './core/auth/demo-permissions.service';
import { authInterceptor } from './core/auth/auth.interceptor';
import { RuntimeConfigService } from './core/config/runtime-config.service';
import { LoginComponent } from './features/login/login.component';

const api = 'https://api.example.test';

function setup(): { harness: Promise<RouterTestingHarness>; http: HttpTestingController; auth: AdminAuthService; permissions: DemoPermissionsService; router: Router } {
  sessionStorage.clear();
  TestBed.configureTestingModule({ imports: [NoopAnimationsModule], providers: [
    provideRouter(routes), provideHttpClient(withInterceptors([authInterceptor])), provideHttpClientTesting(),
    { provide: RuntimeConfigService, useValue: { apiUrl: api } },
  ] });
  return {
    harness: RouterTestingHarness.create(),
    http: TestBed.inject(HttpTestingController),
    auth: TestBed.inject(AdminAuthService),
    permissions: TestBed.inject(DemoPermissionsService),
    router: TestBed.inject(Router),
  };
}

async function signIn(auth: AdminAuthService, http: HttpTestingController, permissions: string[]): Promise<void> {
  const login = firstValueFrom(auth.login({ email: 'admin@example.test', password: 'password' }));
  http.expectOne(`${api}/api/admin/auth/login`).flush({
    id: 1, username: 'admin', email: 'admin@example.test', token: 'access', refreshToken: 'refresh', type: 'Bearer',
  });
  const me = http.expectOne(`${api}/api/admin/me`);
  expect(me.request.headers.get('Authorization')).toBe('Bearer access');
  me.flush({ username: 'admin', permissions });
  await login;
}

describe('root routing after logout', () => {
  it.each([
    ['/', '/login'],
    ['/demo-content', '/login?redirectUrl=%2Fdemo-content'],
    ['/dashboard', '/login?redirectUrl=%2Fdashboard'],
  ])('sends an anonymous visit to %s to %s', async (path, destination) => {
    const { harness: creating, http, router, auth, permissions } = setup();
    const harness = await creating;
    await harness.navigateByUrl(path);
    harness.detectChanges();
    expect(router.url).toBe(destination);
    expect(harness.routeNativeElement?.textContent).not.toContain('Acceso insuficiente');
    expect(auth.session()).toBeNull();
    expect(permissions.permissions().size).toBe(0);
    http.expectNone(req => req.url.includes('/api/admin/'));
    http.verify();
  });

  it.each([
    [['ADMIN_READ'], '/dashboard'],
    [['DEMO_READ'], '/demo-content'],
  ] as const)('routes the authenticated root for %j and finishes logout at login', async (values, destination) => {
    const { harness: creating, http, router, auth, permissions } = setup();
    const harness = await creating;
    await signIn(auth, http, [...values]);

    const landing = harness.navigateByUrl('/');
    let me: TestRequest | undefined;
    await vi.waitFor(() => {
      me ??= http.match(`${api}/api/admin/me`)[0];
      expect(me).toBeDefined();
    });
    me!.flush({ username: 'admin', permissions: [...values] });
    await landing;
    harness.detectChanges();
    expect(router.url).toBe(destination);

    // Dashboard data is unrelated to logout; complete any in-flight view requests.
    for (const request of http.match(req => req.url.includes('/api/admin/') && !req.url.includes('/auth/'))) {
      request.flush('Unavailable', { status: 503, statusText: 'Unavailable' });
    }

    auth.logout();
    http.expectOne(`${api}/api/admin/auth/logout`).flush({});
    await vi.waitFor(() => expect(router.url).toBe('/login'));
    harness.detectChanges();
    expect(auth.session()).toBeNull();
    expect(auth.isAuthenticated()).toBe(false);
    expect(sessionStorage.getItem('admin_session')).toBeNull();
    expect(permissions.permissions().size).toBe(0);
    expect(harness.routeNativeElement?.textContent).not.toContain('Acceso insuficiente');

    await harness.navigateByUrl('/');
    harness.detectChanges();
    expect(router.url).toBe('/login');
    expect(harness.routeNativeElement?.textContent).not.toContain('Acceso insuficiente');
    http.verify();
  }, 20000);

  it.each([
    ['/dashboard', ['ADMIN_READ'], '/dashboard'],
    ['/dashboard', ['DEMO_READ'], '/demo-content'],
    ['/login?redirectUrl=https%3A%2F%2Fevil.example%2Fdashboard', ['ADMIN_READ'], '/dashboard'],
  ])('uses a requested private URL only when allowed: %s with %j', async (entry, values, destination) => {
    const { harness: creating, http, router } = setup();
    const harness = await creating;
    await harness.navigateByUrl(entry);
    expect(router.url.startsWith('/login')).toBe(true);
    const loginPage = harness.routeDebugElement?.componentInstance as LoginComponent;
    loginPage.loginForm.setValue({ email: 'admin@example.test', password: 'password' });
    loginPage.onSubmit();
    http.expectOne(`${api}/api/admin/auth/login`).flush({
      id: 1, username: 'admin', email: 'admin@example.test', token: 'access', refreshToken: 'refresh', type: 'Bearer',
    });
    http.expectOne(`${api}/api/admin/me`).flush({ username: 'admin', permissions: values });

    let routeMe: TestRequest | undefined;
    await vi.waitFor(() => {
      routeMe ??= http.match(`${api}/api/admin/me`)[0];
      expect(routeMe).toBeDefined();
    });
    routeMe!.flush({ username: 'admin', permissions: values });
    await vi.waitFor(() => expect(router.url).toBe(destination));
    harness.detectChanges();
    for (const request of http.match(req => req.url.includes('/api/admin/') && !req.url.includes('/auth/'))) {
      request.flush('Unavailable', { status: 503, statusText: 'Unavailable' });
    }
    http.verify();
  }, 20000);
});
