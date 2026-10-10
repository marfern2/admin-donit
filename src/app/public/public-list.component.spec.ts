import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { Subject } from 'rxjs';
import { PublicListComponent } from './public-list.component';
import { PublicDemoApiService } from './public-demo-api.service';
import { PublicDemoPage, PublicDemoTask, PublicDemoTaskType, PublicDemoUser } from './public-demo.model';

describe('PublicListComponent', () => {
  const users: Subject<PublicDemoPage<PublicDemoUser>>[] = [];
  const types: Subject<PublicDemoPage<PublicDemoTaskType>>[] = [];
  const tasks: Subject<PublicDemoPage<PublicDemoTask>>[] = [];
  const api = {
    users: vi.fn(() => { const s = new Subject<PublicDemoPage<PublicDemoUser>>(); users.push(s); return s; }),
    taskTypes: vi.fn(() => { const s = new Subject<PublicDemoPage<PublicDemoTaskType>>(); types.push(s); return s; }),
    tasks: vi.fn(() => { const s = new Subject<PublicDemoPage<PublicDemoTask>>(); tasks.push(s); return s; }),
  };
  let harness: RouterTestingHarness;
  let router: Router;
  const page = <T>(content: T[], current = 0, hasNext = false): PublicDemoPage<T> => ({ content, page: current, size: 20, totalElements: content.length, totalPages: hasNext ? 2 : 1, hasNext });
  beforeEach(async () => {
    users.length = 0; types.length = 0; tasks.length = 0;
    Object.values(api).forEach(mock => mock.mockClear());
    TestBed.configureTestingModule({ providers: [
      provideRouter([
        { path: 'demo/users', component: PublicListComponent, data: { kind: 'users' } },
        { path: 'demo/task-types', component: PublicListComponent, data: { kind: 'task-types' } },
        { path: 'demo/tasks', component: PublicListComponent, data: { kind: 'tasks' } },
      ]),
      { provide: PublicDemoApiService, useValue: api },
    ] });
    router = TestBed.inject(Router);
    harness = await RouterTestingHarness.create();
  });

  it('shows user loading, empty, and a public user card', async () => {
    await harness.navigateByUrl('/demo/users', PublicListComponent); harness.detectChanges();
    expect(harness.routeNativeElement?.querySelector('[aria-busy="true"]')).toBeTruthy();
    users[0].next(page([])); harness.detectChanges();
    expect(harness.routeNativeElement?.textContent).toContain('Sin resultados');
    await router.navigateByUrl('/demo/users?page=1');
    users[1].next(page([{ publicId: 'u', handle: 'demo', displayName: 'Demo User', bio: null }])); harness.detectChanges();
    expect(harness.routeNativeElement?.querySelector('.demo-item-card')?.getAttribute('href')).toBe('/demo/users/u');
    expect(harness.routeNativeElement?.textContent).toContain('Demo User');
  });

  it('ignores an older response after a new search query', async () => {
    await harness.navigateByUrl('/demo/users?search=ana', PublicListComponent);
    await router.navigateByUrl('/demo/users?search=anabel');
    expect(users[0].observers.length).toBe(0);
    users[1].next(page([{ publicId: 'new', handle: 'ana', displayName: 'Anabel', bio: null }])); harness.detectChanges();
    users[0].next(page([{ publicId: 'old', handle: 'ana', displayName: 'Ana', bio: null }])); harness.detectChanges();
    expect(harness.routeNativeElement?.textContent).toContain('Anabel');
    expect(harness.routeNativeElement?.textContent).not.toContain('Ver detalle → Ver detalle');
  });

  it('debounces and trims search, and never sends one character', async () => {
    const component = await harness.navigateByUrl('/demo/users', PublicListComponent);
    users[0].next(page([]));
    component.search.setValue('a');
    await new Promise(resolve => setTimeout(resolve, 340));
    expect(api.users).toHaveBeenCalledTimes(1);
    component.search.setValue('  ana  ');
    await new Promise(resolve => setTimeout(resolve, 340));
    expect(router.url).toContain('search=ana');
    expect(api.users).toHaveBeenCalledWith(expect.objectContaining({ search: 'ana' }));
  });

  it('supports user sorting and pagination from the URL', async () => {
    await harness.navigateByUrl('/demo/users?page=2&size=10&sort=handle,desc', PublicListComponent);
    expect(api.users).toHaveBeenCalledWith(expect.objectContaining({ page: 2, size: 10, sort: 'handle,desc' }));
    users[0].next(page([], 2)); harness.detectChanges();
    expect(harness.routeNativeElement?.textContent).toContain('Página 3');
  });

  it('supports type user filter and task filters without admin calls', async () => {
    const id = '00000000-0000-0000-0000-000000000001';
    await harness.navigateByUrl(`/demo/task-types?userPublicId=${id}&sort=name,asc`, PublicListComponent);
    expect(api.taskTypes).toHaveBeenCalledWith(expect.objectContaining({ userPublicId: id, sort: 'name,asc' }));
    types[0].next(page([{ publicId: 't', userPublicId: id, name: 'Estudio', description: null, color: '#123456' }])); harness.detectChanges();
    expect(harness.routeNativeElement?.textContent).toContain('Estudio');
    await harness.navigateByUrl(`/demo/tasks?completed=false&urgency=2&taskTypePublicId=${id}&page=0`, PublicListComponent);
    expect(api.tasks).toHaveBeenCalledWith(expect.objectContaining({ completed: false, urgency: 2, taskTypePublicId: id }));
    tasks[0].next(page([{ publicId: 'task', userPublicId: id, taskTypePublicId: id, title: 'Leer', description: null, dueDate: null, completed: false, urgency: 2 }])); harness.detectChanges();
    expect(harness.routeNativeElement?.textContent).toContain('Leer');
  });

  it('loads public filter suggestions only on demand and only once', async () => {
    const component = await harness.navigateByUrl('/demo/tasks', PublicListComponent);
    expect(api.users).not.toHaveBeenCalled();
    expect(api.taskTypes).not.toHaveBeenCalled();
    component.loadUserSuggestions(); component.loadUserSuggestions();
    component.loadTypeSuggestions(); component.loadTypeSuggestions();
    expect(api.users).toHaveBeenCalledTimes(1);
    expect(api.taskTypes).toHaveBeenCalledTimes(1);
    users[0].next(page([{ publicId: 'u', handle: 'demo', displayName: 'Demo', bio: null }]));
    types[0].next(page([{ publicId: 't', userPublicId: 'u', name: 'Trabajo', description: null, color: null }]));
    harness.detectChanges();
    expect(harness.routeNativeElement?.querySelectorAll('datalist option').length).toBe(2);
  });

  it('sanitizes invalid URL parameters and shows API errors', async () => {
    await harness.navigateByUrl('/demo/tasks?page=999&size=100&urgency=3&sort=bad&completed=maybe', PublicListComponent);
    expect(api.tasks).toHaveBeenCalledWith({ page: 0, size: 20, search: undefined, sort: undefined, userPublicId: undefined, taskTypePublicId: undefined, completed: undefined, urgency: undefined });
    tasks[0].error({ status: 400 }); harness.detectChanges();
    expect(harness.routeNativeElement?.querySelector('[role="alert"]')).toBeTruthy();
  });
});
