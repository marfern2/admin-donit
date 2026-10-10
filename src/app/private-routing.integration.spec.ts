import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, TestRequest, provideHttpClientTesting } from '@angular/common/http/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { firstValueFrom } from 'rxjs';
import { routes } from './app.routes';
import { authInterceptor } from './core/auth/auth.interceptor';
import { AdminAuthService } from './core/auth/auth.service';
import { RuntimeConfigService } from './core/config/runtime-config.service';

async function flushCurrentMe(http: HttpTestingController, permissions: string[], step: string): Promise<void> {
  let request: TestRequest | undefined;
  await vi.waitFor(() => {
    request ??= http.match('https://api.example.test/api/admin/me')[0];
    expect(request, step).toBeDefined();
  });
  request!.flush({ username: 'demo', permissions });
}

describe('DEMO-only private navigation and network', () => {
  it('lands in demo and rejects direct real admin routes without requesting real data', async () => {
    sessionStorage.clear();
    TestBed.configureTestingModule({ imports: [NoopAnimationsModule], providers: [
      provideRouter(routes), provideHttpClient(withInterceptors([authInterceptor])), provideHttpClientTesting(),
      { provide: RuntimeConfigService, useValue: { apiUrl: 'https://api.example.test' } },
    ] });
    const harness = await RouterTestingHarness.create();
    const http = TestBed.inject(HttpTestingController);
    const auth = TestBed.inject(AdminAuthService);
    const login = firstValueFrom(auth.login({ email: 'demo@example.test', password: 'password' }));
    http.expectOne('https://api.example.test/api/admin/auth/login').flush({
      id: 7, username: 'demo', email: 'demo@example.test', token: 'token', refreshToken: 'refresh', type: 'Bearer',
    });
    const me = http.expectOne('https://api.example.test/api/admin/me');
    expect(me.request.headers.get('Authorization')).toBe('Bearer token');
    me.flush({ username: 'demo', permissions: ['DEMO_READ', 'DEMO_WRITE', 'DEMO_PUBLISH', 'DEMO_RESTORE'] });
    await login;

    const landing = harness.navigateByUrl('/');
    await flushCurrentMe(http, ['DEMO_READ', 'DEMO_WRITE', 'DEMO_PUBLISH', 'DEMO_RESTORE'], 'landing');
    await landing;
    harness.detectChanges();
    expect(TestBed.inject(Router).url).toBe('/demo-content');
    const sidebar = harness.routeNativeElement?.querySelector('mat-nav-list');
    expect(sidebar?.textContent).toContain('Contenido demo');
    expect(sidebar?.textContent).not.toContain('Usuarios');
    expect(sidebar?.textContent).not.toContain('Tareas');
    expect(sidebar?.textContent).not.toContain('Dashboard');

    const demoRequests = http.match(req => req.url.startsWith('https://api.example.test/api/admin/demo/'));
    expect(demoRequests.map(req => req.request.url).sort()).toEqual([
      'https://api.example.test/api/admin/demo/fixtures/restore-preview',
      'https://api.example.test/api/admin/demo/stats',
    ]);
    for (const req of demoRequests) {
      if (req.request.url.endsWith('/stats')) req.flush({ usersTotal: 0, usersPublished: 0, typesTotal: 0, typesPublished: 0, tasksTotal: 0, tasksPublished: 0, tasksCompleted: 0 });
      else req.flush({ manifestVersion: 1, currentRevision: 1, targetRevision: 1, catalogConflicts: [], users: { conflicts: [] }, types: { conflicts: [] }, tasks: { conflicts: [] } }, { headers: { ETag: '"v1"' } });
    }
    harness.detectChanges();

    const forbidden = harness.navigateByUrl('/users');
    await flushCurrentMe(http, ['DEMO_READ', 'DEMO_WRITE', 'DEMO_PUBLISH', 'DEMO_RESTORE'], 'forbidden route');
    await forbidden;
    expect(TestBed.inject(Router).url).toBe('/demo-content');
    http.expectNone(req => /^https:\/\/api\.example\.test\/api\/admin\/(users|tasks|task-types)(\/|$)/.test(req.url));
    http.verify();
    sessionStorage.clear();
  }, 20000);

  it('shows a safe empty state without useful permissions or administrative GETs', async () => {
    sessionStorage.clear();
    TestBed.configureTestingModule({ imports: [NoopAnimationsModule], providers: [
      provideRouter(routes), provideHttpClient(), provideHttpClientTesting(),
      { provide: RuntimeConfigService, useValue: { apiUrl: 'https://api.example.test' } },
    ] });
    const harness = await RouterTestingHarness.create();
    const http = TestBed.inject(HttpTestingController);
    const login = firstValueFrom(TestBed.inject(AdminAuthService).login({ email: 'empty@example.test', password: 'password' }));
    http.expectOne('https://api.example.test/api/admin/auth/login').flush({ id: 8, username: 'empty', email: 'empty@example.test', token: 'token', refreshToken: 'refresh', type: 'Bearer' });
    http.expectOne('https://api.example.test/api/admin/me').flush({ username: 'empty', permissions: [] });
    await login;
    await harness.navigateByUrl('/');
    harness.detectChanges();
    expect(TestBed.inject(Router).url).toBe('/');
    expect(harness.routeNativeElement?.textContent).toContain('Acceso insuficiente');
    http.expectNone(req => req.url.includes('/api/admin/') && !req.url.endsWith('/api/admin/me'));
    http.verify();
    sessionStorage.clear();
  }, 20000);
});
