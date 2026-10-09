import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse, HttpHeaders, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AdminAuthService } from '../../core/auth/auth.service';
import { authInterceptor } from '../../core/auth/auth.interceptor';
import { RuntimeConfigService } from '../../core/config/runtime-config.service';
import { DemoAdminApiService } from './demo-admin-api.service';
import { demoError } from './demo-error';
import { DemoUser } from './demo-admin.model';

describe('DemoAdminApiService', () => {
  let api: DemoAdminApiService;
  let http: HttpTestingController;
  const base = 'https://api.example.test/api/admin/demo';
  const user: DemoUser = { id: 1, publicId: 'uuid', handle: 'demo', displayName: 'Demo', bio: null, publicationStatus: 'DRAFT', publishedAt: null, version: 2, createdAt: '', updatedAt: '' };
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [
      provideHttpClient(withInterceptors([authInterceptor])), provideHttpClientTesting(),
      { provide: RuntimeConfigService, useValue: { apiUrl: 'https://api.example.test' } },
      { provide: AdminAuthService, useValue: { getAccessToken: () => 'private-token' } },
    ] });
    api = TestBed.inject(DemoAdminApiService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('uses private Authorization and captures the exact ETag header', () => {
    let etag = '';
    api.get<DemoUser>('users', 1).subscribe(value => etag = value.etag);
    const request = http.expectOne(`${base}/users/1`);
    expect(request.request.headers.get('Authorization')).toBe('Bearer private-token');
    request.flush(user, { headers: { ETag: '"v2"' } });
    expect(etag).toBe('"v2"');
  });

  it('keeps POST ETag when supplied and accepts a successful POST without one', () => {
    let etag: string | null = null;
    api.create('users', { handle: 'demo', displayName: 'Demo', bio: null }).subscribe(value => etag = value.etag);
    http.expectOne(`${base}/users`).flush(user, { headers: { ETag: 'W/"opaque-42"' } });
    expect(etag).toBe('W/"opaque-42"');
    api.create('users', { handle: 'other', displayName: 'Other', bio: null }).subscribe(value => etag = value.etag);
    http.expectOne(`${base}/users`).flush(user);
    expect(etag).toBeNull();
  });

  it.each(['users', 'task-types', 'tasks'] as const)('supports %s create, patch and publication with If-Match', kind => {
    api.create(kind, { handle: 'demo', displayName: 'Demo', bio: null }).subscribe();
    let request = http.expectOne(`${base}/${kind}`);
    expect(request.request.method).toBe('POST');
    request.flush(user, { headers: { ETag: '"v2"' } });

    api.update(kind, 1, { bio: 'Edited' }, '"v2"').subscribe();
    request = http.expectOne(`${base}/${kind}/1`);
    expect(request.request.headers.get('If-Match')).toBe('"v2"');
    request.flush(user, { headers: { ETag: '"v3"' } });

    api.publish(kind, 1, 'PUBLISHED', '"v3"').subscribe();
    request = http.expectOne(`${base}/${kind}/1/publication`);
    expect(request.request.headers.get('If-Match')).toBe('"v3"');
    expect(request.request.body).toEqual({ publicationStatus: 'PUBLISHED' });
    request.flush(user, { headers: { ETag: '"v4"' } });
  });

  it.each(['task-types', 'tasks'] as const)('deletes %s only with an exact ETag', kind => {
    api.delete(kind, 4, '"v9"').subscribe();
    const request = http.expectOne(`${base}/${kind}/4`);
    expect(request.request.headers.get('If-Match')).toBe('"v9"');
    request.flush(null);
  });

  it('sends list filters only to the private endpoint', () => {
    api.list('tasks', { page: 2, size: 10, search: 'demo', demoUserId: 1, demoTaskTypeId: 2, completed: false, urgency: 0, publicationStatus: 'DRAFT', sort: 'title,asc' }).subscribe();
    const request = http.expectOne(req => req.url === `${base}/tasks`);
    expect(request.request.headers.get('Authorization')).toBe('Bearer private-token');
    expect(request.request.params.get('completed')).toBe('false');
    expect(request.request.params.get('urgency')).toBe('0');
    expect(request.request.params.get('publicationStatus')).toBe('DRAFT');
    request.flush({ content: [], number: 2, size: 10, totalElements: 0, totalPages: 0, first: false, last: true });
  });

  it('keeps the opaque preview ETag for restore', () => {
    let etag = '';
    api.preview().subscribe(value => etag = value.etag);
    const preview = http.expectOne(`${base}/fixtures/restore-preview`);
    expect(preview.request.method).toBe('GET');
    preview.flush({ currentRevision: 1 }, { headers: { ETag: '"v1-opaque-hash"' } });
    api.restore(etag).subscribe();
    const restore = http.expectOne(`${base}/fixtures/restore`);
    expect(restore.request.headers.get('If-Match')).toBe('"v1-opaque-hash"');
    restore.flush({ newRevision: 2 }, { headers: { ETag: '"v2-new-hash"' } });
  });

  it.each([412, 428, 429])('maps status %s without leaking server internals', status => {
    const response = new HttpErrorResponse({ status, headers: status === 429 ? new HttpHeaders({ 'Retry-After': '23' }) : undefined });
    const issue = demoError(response);
    expect(issue.message).toBeTruthy();
    expect(issue.reload).toBe(status === 412 || status === 428);
    if (status === 429) expect(issue.retryAfter).toBe(23);
  });
});
