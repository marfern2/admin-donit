import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { of, throwError } from 'rxjs';
import { PublicDetailComponent } from './public-detail.component';
import { PublicDemoApiService } from './public-demo-api.service';

describe('PublicDetailComponent', () => {
  const id = '00000000-0000-0000-0000-000000000001';
  const user = { publicId: id, handle: 'demo', displayName: 'Demo', bio: null };
  const type = { publicId: id, userPublicId: id, name: 'Trabajo', description: null, color: '#abcdef' };
  const task = { publicId: id, userPublicId: id, taskTypePublicId: id, title: 'Revisar', description: null, dueDate: null, completed: true, urgency: 2 };
  const api = { user: vi.fn(), taskType: vi.fn(), task: vi.fn(), tasks: vi.fn() };
  let harness: RouterTestingHarness;
  beforeEach(async () => {
    api.user.mockReset().mockReturnValue(of(user));
    api.taskType.mockReset().mockReturnValue(of(type));
    api.task.mockReset().mockReturnValue(of(task));
    api.tasks.mockReset().mockReturnValue(of({ content: [task], page: 0, size: 20, totalElements: 1, totalPages: 1, hasNext: false }));
    TestBed.configureTestingModule({ providers: [
      provideRouter([
        { path: 'demo/users/:publicId', component: PublicDetailComponent, data: { kind: 'users' } },
        { path: 'demo/task-types/:publicId', component: PublicDetailComponent, data: { kind: 'task-types' } },
        { path: 'demo/tasks/:publicId', component: PublicDetailComponent, data: { kind: 'tasks' } },
      ]),
      { provide: PublicDemoApiService, useValue: api },
    ] });
    harness = await RouterTestingHarness.create();
  });

  it('shows only public user fields and related catalog links', async () => {
    await harness.navigateByUrl(`/demo/users/${id}`, PublicDetailComponent); harness.detectChanges();
    expect(harness.routeNativeElement?.textContent).toContain('Demo');
    expect(harness.routeNativeElement?.querySelectorAll('.demo-detail-links a').length).toBe(2);
    expect(api.tasks).not.toHaveBeenCalled();
    expect(harness.routeNativeElement?.textContent).not.toMatch(/email|fixtureKey|permisos/i);
  });

  it('shows type details and only public related tasks', async () => {
    await harness.navigateByUrl(`/demo/task-types/${id}`, PublicDetailComponent); harness.detectChanges();
    expect(api.tasks).toHaveBeenCalledWith({ page: 0, size: 20, taskTypePublicId: id });
    expect(harness.routeNativeElement?.textContent).toContain('Trabajo');
    expect(harness.routeNativeElement?.textContent).toContain('Revisar');
  });

  it('shows task, user, type and status from public endpoints', async () => {
    await harness.navigateByUrl(`/demo/tasks/${id}`, PublicDetailComponent); harness.detectChanges();
    expect(api.user).toHaveBeenCalledWith(id);
    expect(api.taskType).toHaveBeenCalledWith(id);
    expect(harness.routeNativeElement?.textContent).toContain('Completada');
    expect(harness.routeNativeElement?.textContent).toContain('Trabajo');
  });

  it.each(['users', 'task-types', 'tasks'] as const)('handles public %s 404 without admin login', async kind => {
    const method = kind === 'users' ? api.user : kind === 'task-types' ? api.taskType : api.task;
    method.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 404 })));
    await harness.navigateByUrl(`/demo/${kind}/${id}`, PublicDetailComponent); harness.detectChanges();
    expect(harness.routeNativeElement?.querySelector('[role="alert"]')?.textContent).toContain('no existe');
  });
});
