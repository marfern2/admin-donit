import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AdminAuthService } from '../core/auth/auth.service';
import { authInterceptor } from '../core/auth/auth.interceptor';
import { RuntimeConfigService } from '../core/config/runtime-config.service';
import { PublicDemoApiService } from './public-demo-api.service';
import { Observable } from 'rxjs';

describe('PublicDemoApiService', () => {
  let api: PublicDemoApiService;
  let http: HttpTestingController;
  const base = 'https://api.example.test/api/public/demo';
  const admin = { getAccessToken: vi.fn().mockReturnValue('admin-token') };
  beforeEach(() => {
    admin.getAccessToken.mockClear();
    TestBed.configureTestingModule({ providers: [
      provideHttpClient(withInterceptors([authInterceptor])), provideHttpClientTesting(),
      { provide: RuntimeConfigService, useValue: { apiUrl: 'https://api.example.test' } },
      { provide: AdminAuthService, useValue: admin },
    ] });
    api = TestBed.inject(PublicDemoApiService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it.each([
    ['users', () => api.users({ page: 0, size: 20 }), { content: [], page: 0, size: 20, totalElements: 0, totalPages: 0, hasNext: false }],
    ['task-types', () => api.taskTypes({ page: 0, size: 20 }), { content: [], page: 0, size: 20, totalElements: 0, totalPages: 0, hasNext: false }],
    ['tasks', () => api.tasks({ page: 0, size: 20 }), { content: [], page: 0, size: 20, totalElements: 0, totalPages: 0, hasNext: false }],
  ])('calls %s without Authorization even with an admin session', (path, call, body) => {
    const request$: Observable<unknown> = call();
    request$.subscribe();
    const request = http.expectOne(req => req.url === `${base}/${path}`);
    expect(request.request.method).toBe('GET');
    expect(request.request.headers.has('Authorization')).toBe(false);
    expect(admin.getAccessToken).not.toHaveBeenCalled();
    request.flush(body);
  });

  it('sends only supported task filters and trims search', () => {
    api.tasks({ page: 2, size: 10, search: '  demo  ', userPublicId: 'u', taskTypePublicId: 't', completed: false, urgency: 0, sort: 'dueDate,asc' }).subscribe();
    const request = http.expectOne(req => req.url === `${base}/tasks`);
    expect(Object.fromEntries(request.request.params.keys().map(key => [key, request.request.params.get(key)]))).toEqual({ page: '2', size: '10', search: 'demo', sort: 'dueDate,asc', userPublicId: 'u', taskTypePublicId: 't', completed: 'false', urgency: '0' });
    request.flush({ content: [], page: 2, size: 10, totalElements: 0, totalPages: 0, hasNext: false });
  });

  it('does not send a one-character search', () => {
    api.users({ page: 0, size: 20, search: 'a' }).subscribe();
    const request = http.expectOne(req => req.url === `${base}/users`);
    expect(request.request.params.has('search')).toBe(false);
    request.flush({ content: [], page: 0, size: 20, totalElements: 0, totalPages: 0, hasNext: false });
  });

  it('uses public IDs for each detail and reads exact public stats', () => {
    api.user('user-id').subscribe(); api.taskType('type-id').subscribe(); api.task('task-id').subscribe(); api.stats().subscribe();
    for (const path of ['users/user-id', 'task-types/type-id', 'tasks/task-id', 'stats']) {
      const request = http.expectOne(`${base}/${path}`);
      expect(request.request.headers.has('Authorization')).toBe(false);
      request.flush(path === 'stats' ? { users: 0, taskTypes: 0, tasks: 0, completedTasks: 0 } : {});
    }
  });
});
