import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { AdminAuthService } from './auth.service';
import { environment } from '../../../environments/environment';

describe('AdminAuthService', () => {
  let service: AdminAuthService;
  let httpMock: HttpTestingController;
  let router: Router;

  const mockLoginResponse = {
    token: 'access-token-123',
    refreshToken: 'refresh-token-456',
    id: 1,
    username: 'admin',
    email: 'admin@test.com',
    type: 'Bearer',
  };

  const mockRefreshResponse = {
    token: 'new-access-token',
    refreshToken: 'new-refresh-token',
  };

  beforeEach(() => {
    sessionStorage.clear();

    TestBed.configureTestingModule({
      providers: [AdminAuthService, provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(AdminAuthService);
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate');
  });

  afterEach(() => {
    httpMock.verify();
    sessionStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should not be authenticated initially', () => {
    expect(service.isAuthenticated()).toBeFalsy();
    expect(service.currentUser()).toBeNull();
  });

  describe('login', () => {
    it('should login and set session', () => {
      service.login({ email: 'admin@test.com', password: 'pass' }).subscribe();

      const req = httpMock.expectOne(`${environment.apiUrl}/api/admin/auth/login`);
      expect(req.request.method).toBe('POST');
      req.flush(mockLoginResponse);

      expect(service.isAuthenticated()).toBeTruthy();
      expect(service.currentUser()?.email).toBe('admin@test.com');
      expect(service.getAccessToken()).toBe('access-token-123');
    });

    it('should persist session without accessToken', () => {
      service.login({ email: 'admin@test.com', password: 'pass' }).subscribe();

      const req = httpMock.expectOne(`${environment.apiUrl}/api/admin/auth/login`);
      req.flush(mockLoginResponse);

      const stored = sessionStorage.getItem('admin_session');
      expect(stored).toBeTruthy();
      const parsed = JSON.parse(stored!);
      expect(parsed.email).toBe('admin@test.com');
      expect(parsed.refreshToken).toBe('refresh-token-456');
      expect(parsed.accessToken).toBeUndefined();
    });

    it('should not set session on error', () => {
      service.login({ email: 'admin@test.com', password: 'wrong' }).subscribe({
        error: () => {},
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/api/admin/auth/login`);
      req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });

      expect(service.isAuthenticated()).toBeFalsy();
    });
  });

  describe('refresh', () => {
    beforeEach(() => {
      service.login({ email: 'admin@test.com', password: 'pass' }).subscribe();
      const req = httpMock.expectOne(`${environment.apiUrl}/api/admin/auth/login`);
      req.flush(mockLoginResponse);
    });

    it('should refresh tokens and rotate refreshToken', () => {
      service.refresh().subscribe();

      const req = httpMock.expectOne(`${environment.apiUrl}/api/admin/auth/refresh`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ refreshToken: 'refresh-token-456' });
      req.flush(mockRefreshResponse);

      expect(service.getAccessToken()).toBe('new-access-token');
      expect(service.session()?.refreshToken).toBe('new-refresh-token');

      const stored = JSON.parse(sessionStorage.getItem('admin_session')!);
      expect(stored.refreshToken).toBe('new-refresh-token');
    });

    it('should return error if no refresh token', () => {
      sessionStorage.clear();
      const freshService = new AdminAuthService(httpMock as any, router);
      freshService.refresh().subscribe({
        error: (err: Error) => {
          expect(err.message).toBe('No refresh token available');
        },
      });
    });
  });

  describe('logout', () => {
    it('should clear session and navigate to login', () => {
      service.login({ email: 'admin@test.com', password: 'pass' }).subscribe();
      const req = httpMock.expectOne(`${environment.apiUrl}/api/admin/auth/login`);
      req.flush(mockLoginResponse);

      expect(service.isAuthenticated()).toBeTruthy();

      service.logout();

      const logoutReq = httpMock.expectOne(`${environment.apiUrl}/api/admin/auth/logout`);
      expect(logoutReq.request.method).toBe('POST');
      logoutReq.flush({});

      expect(service.isAuthenticated()).toBeFalsy();
      expect(service.getAccessToken()).toBeNull();
      expect(sessionStorage.getItem('admin_session')).toBeNull();
      expect(router.navigate).toHaveBeenCalledWith(['/login']);
    });

    it('should clear session even if logout request fails', () => {
      service.login({ email: 'admin@test.com', password: 'pass' }).subscribe();
      const req = httpMock.expectOne(`${environment.apiUrl}/api/admin/auth/login`);
      req.flush(mockLoginResponse);

      service.logout();

      const logoutReq = httpMock.expectOne(`${environment.apiUrl}/api/admin/auth/logout`);
      logoutReq.flush('Error', { status: 500, statusText: 'Server Error' });

      expect(service.isAuthenticated()).toBeFalsy();
      expect(sessionStorage.getItem('admin_session')).toBeNull();
    });
  });

  describe('initialize / bootstrap', () => {
    it('should mark as initialized with no session', async () => {
      await service.initialize();
      expect(service.initialized()).toBeTruthy();
      expect(service.isAuthenticated()).toBeFalsy();
    });

    it('should silent refresh when refreshToken exists in sessionStorage', async () => {
      sessionStorage.setItem(
        'admin_session',
        JSON.stringify({
          id: 1,
          username: 'admin',
          email: 'admin@test.com',
          refreshToken: 'stored-refresh',
        }),
      );

      const initPromise = service.initialize();

      const req = httpMock.expectOne(`${environment.apiUrl}/api/admin/auth/refresh`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ refreshToken: 'stored-refresh' });
      req.flush(mockRefreshResponse);

      await initPromise;

      expect(service.initialized()).toBeTruthy();
      expect(service.isAuthenticated()).toBeTruthy();
      expect(service.getAccessToken()).toBe('new-access-token');
      expect(service.currentUser()?.email).toBe('admin@test.com');
    });

    it('should clear session when refresh fails during bootstrap', async () => {
      sessionStorage.setItem(
        'admin_session',
        JSON.stringify({
          id: 1,
          username: 'admin',
          email: 'admin@test.com',
          refreshToken: 'expired-refresh',
        }),
      );

      const initPromise = service.initialize();

      const req = httpMock.expectOne(`${environment.apiUrl}/api/admin/auth/refresh`);
      req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });

      await initPromise;

      expect(service.initialized()).toBeTruthy();
      expect(service.isAuthenticated()).toBeFalsy();
      expect(service.session()).toBeNull();
      expect(sessionStorage.getItem('admin_session')).toBeNull();
    });

    it('should handle corrupted sessionStorage gracefully', async () => {
      sessionStorage.setItem('admin_session', 'invalid-json');

      await service.initialize();

      expect(service.initialized()).toBeTruthy();
      expect(service.isAuthenticated()).toBeFalsy();
      expect(sessionStorage.getItem('admin_session')).toBeNull();
    });

    it('should NOT persist accessToken in sessionStorage after login', async () => {
      service.login({ email: 'admin@test.com', password: 'pass' }).subscribe();
      const req = httpMock.expectOne(`${environment.apiUrl}/api/admin/auth/login`);
      req.flush(mockLoginResponse);

      const stored = JSON.parse(sessionStorage.getItem('admin_session')!);
      expect(stored.accessToken).toBeUndefined();
      expect(stored.refreshToken).toBe('refresh-token-456');
    });
  });
});
