import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  provideHttpClientTesting,
  HttpTestingController,
} from '@angular/common/http/testing';
import { HttpClient } from '@angular/common/http';
import { Subject } from 'rxjs';
import { authInterceptor } from './auth.interceptor';
import { AdminAuthService } from './auth.service';
import { environment } from '../../../environments/environment';

describe('authInterceptor', () => {
  let httpMock: HttpTestingController;
  let httpClient: HttpClient;
  let authService: {
    getAccessToken: ReturnType<typeof vi.fn>;
    refresh: ReturnType<typeof vi.fn>;
    logout: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    authService = {
      getAccessToken: vi.fn(),
      refresh: vi.fn(),
      logout: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: AdminAuthService, useValue: authService },
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });

    httpMock = TestBed.inject(HttpTestingController);
    httpClient = TestBed.inject(HttpClient);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should add Authorization header for admin API requests', () => {
    authService.getAccessToken.mockReturnValue('test-token');

    httpClient.get(`${environment.apiUrl}/api/admin/users`).subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/api/admin/users`);
    expect(req.request.headers.get('Authorization')).toBe('Bearer test-token');
    req.flush({});
  });

  it('should NOT add Authorization header for non-admin routes', () => {
    authService.getAccessToken.mockReturnValue('test-token');

    httpClient.get(`${environment.apiUrl}/api/public/data`).subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/api/public/data`);
    expect(req.request.headers.has('Authorization')).toBeFalsy();
    req.flush({});
  });

  it('should NOT add Authorization header for login endpoint', () => {
    authService.getAccessToken.mockReturnValue('test-token');

    httpClient
      .post(`${environment.apiUrl}/api/admin/auth/login`, {})
      .subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/api/admin/auth/login`);
    expect(req.request.headers.has('Authorization')).toBeFalsy();
    req.flush({});
  });

  it('should NOT add Authorization header for refresh endpoint', () => {
    authService.getAccessToken.mockReturnValue('test-token');

    httpClient
      .post(`${environment.apiUrl}/api/admin/auth/refresh`, {})
      .subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/api/admin/auth/refresh`);
    expect(req.request.headers.has('Authorization')).toBeFalsy();
    req.flush({});
  });

  it('should NOT add Authorization header for logout endpoint', () => {
    authService.getAccessToken.mockReturnValue('test-token');

    httpClient
      .post(`${environment.apiUrl}/api/admin/auth/logout`, {})
      .subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/api/admin/auth/logout`);
    expect(req.request.headers.has('Authorization')).toBeFalsy();
    req.flush({});
  });

  it('should NOT add Authorization header when no token', () => {
    authService.getAccessToken.mockReturnValue(null);

    httpClient.get(`${environment.apiUrl}/api/admin/users`).subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/api/admin/users`);
    expect(req.request.headers.has('Authorization')).toBeFalsy();
    req.flush({});
  });

  describe('concurrent 401 handling', () => {
    it('should make only 1 refresh for 5 concurrent 401s and retry all with new token', () => {
      const refreshSubject = new Subject<{ token: string; refreshToken: string }>();

      authService.getAccessToken.mockReturnValue('old-token');
      authService.refresh.mockReturnValue(refreshSubject.asObservable());

      for (let i = 0; i < 5; i++) {
        httpClient.get(`${environment.apiUrl}/api/admin/users`).subscribe();
      }

      const requests = httpMock.match(() => true);
      expect(requests.length).toBe(5);

      requests.forEach((req) =>
        req.flush(null, { status: 401, statusText: 'Unauthorized' }),
      );

      expect(authService.refresh).toHaveBeenCalledTimes(1);

      authService.getAccessToken.mockReturnValue('new-token');
      refreshSubject.next({ token: 'new-token', refreshToken: 'new-refresh' });
      refreshSubject.complete();

      const retriedRequests = httpMock.match(() => true);
      expect(retriedRequests.length).toBe(5);
      retriedRequests.forEach((req) => {
        expect(req.request.headers.get('Authorization')).toBe('Bearer new-token');
        req.flush({});
      });
    });

    it('should call logout once when refresh fails during concurrent 401s', () => {
      const refreshSubject = new Subject<{ token: string; refreshToken: string }>();

      authService.getAccessToken.mockReturnValue('old-token');
      authService.refresh.mockReturnValue(refreshSubject.asObservable());

      const errorHandlers: Array<ReturnType<typeof vi.fn>> = [];
      for (let i = 0; i < 3; i++) {
        const handler = vi.fn();
        errorHandlers.push(handler);
        httpClient
          .get(`${environment.apiUrl}/api/admin/users`)
          .subscribe({ error: () => handler() });
      }

      const requests = httpMock.match(() => true);
      requests.forEach((req) =>
        req.flush(null, { status: 401, statusText: 'Unauthorized' }),
      );

      expect(authService.refresh).toHaveBeenCalledTimes(1);

      refreshSubject.error(new Error('refresh failed'));

      expect(authService.logout).toHaveBeenCalledTimes(1);
    });
  });
});
