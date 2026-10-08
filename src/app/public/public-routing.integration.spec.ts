import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { routes } from '../app.routes';
import { authInterceptor } from '../core/auth/auth.interceptor';
import { AdminAuthService } from '../core/auth/auth.service';
import { RuntimeConfigService } from '../core/config/runtime-config.service';

describe('anonymous public routing', () => {
  it('opens /demo directly without restoring admin session or calling admin API', async () => {
    const admin = { initialize: vi.fn(), initialized: vi.fn().mockReturnValue(false), isAuthenticated: vi.fn().mockReturnValue(false), getAccessToken: vi.fn().mockReturnValue(null) };
    TestBed.configureTestingModule({ providers: [
      provideRouter(routes), provideHttpClient(withInterceptors([authInterceptor])), provideHttpClientTesting(),
      { provide: RuntimeConfigService, useValue: { apiUrl: 'https://api.example.test' } },
      { provide: AdminAuthService, useValue: admin },
    ] });
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/demo');
    const http = TestBed.inject(HttpTestingController);
    const stats = http.expectOne('https://api.example.test/api/public/demo/stats');
    expect(stats.request.headers.has('Authorization')).toBe(false);
    stats.flush({ users: 0, taskTypes: 0, tasks: 0, completedTasks: 0 });
    harness.detectChanges();
    expect(harness.routeNativeElement?.textContent).toContain('Aún no hay elementos publicados');
    expect(admin.initialize).not.toHaveBeenCalled();
    expect(admin.getAccessToken).not.toHaveBeenCalled();
    http.expectNone(req => req.url.includes('/api/admin/'));
    http.verify();
  });
});
