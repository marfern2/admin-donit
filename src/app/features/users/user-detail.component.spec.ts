import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter, ActivatedRoute } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { UserDetailComponent } from './user-detail.component';
import { environment } from '../../../environments/environment';

describe('UserDetailComponent', () => {
  let component: UserDetailComponent;
  let fixture: ComponentFixture<UserDetailComponent>;
  let httpMock: HttpTestingController;

  const apiUrl = `${environment.apiUrl}/api/admin/users`;

  const mockUser = {
    id: 1,
    username: 'testuser',
    email: 'test@test.com',
    enabled: true,
    totalTasks: 5,
    completedTasks: 3,
    pendingTasks: 2,
    taskTypeCount: 2,
  };

  const mockTasksResponse = {
    content: [
      {
        id: 1,
        titulo: 'Task 1',
        descripcion: 'Desc1',
        fecha: '2024-01-01',
        completada: true,
        urgencia: 0,
        tipoTareaId: 1,
        tipoTareaNombre: 'Trabajo',
        tipoTareaColor: '#FF0000',
      },
      {
        id: 2,
        titulo: 'Task 2',
        descripcion: null,
        fecha: null,
        completada: null,
        urgencia: null,
        tipoTareaId: null,
        tipoTareaNombre: null,
        tipoTareaColor: null,
      },
    ],
    page: 0,
    size: 20,
    totalElements: 2,
    totalPages: 1,
    first: true,
    last: true,
  };

  const mockTaskTypesResponse = {
    content: [
      { id: 1, nombre: 'Trabajo', descripcion: 'Tipo trabajo', color: '#FF0000', taskCount: 3 },
      { id: 2, nombre: 'Personal', descripcion: null, color: '#00FF00', taskCount: 0 },
    ],
    page: 0,
    size: 20,
    totalElements: 2,
    totalPages: 1,
    first: true,
    last: true,
  };

  function createActivatedRoute(queryParams: Record<string, string> = {}) {
    return {
      snapshot: {
        paramMap: {
          get: (key: string) => (key === 'id' ? '1' : null),
        },
        queryParamMap: {
          get: (key: string) => queryParams[key] ?? null,
        },
      },
    };
  }

  function flushUserRequest() {
    const req = httpMock.expectOne(`${apiUrl}/1`);
    req.flush(mockUser);
    return req;
  }

  function flushTasksRequest(response = mockTasksResponse) {
    const req = httpMock.expectOne((r) => r.url === `${apiUrl}/1/tasks`);
    req.flush(response);
    return req;
  }

  function flushTaskTypesRequest(response = mockTaskTypesResponse) {
    const req = httpMock.expectOne((r) => r.url === `${apiUrl}/1/task-types`);
    req.flush(response);
    return req;
  }

  function flushAll() {
    fixture.detectChanges();
    flushUserRequest();
    fixture.detectChanges();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserDetailComponent, NoopAnimationsModule],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: ActivatedRoute, useValue: createActivatedRoute() },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(UserDetailComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should create', () => {
    flushAll();
    expect(component).toBeTruthy();
  });

  it('should load user on init', () => {
    flushAll();
    expect(component.user()?.username).toBe('testuser');
    expect(component.user()?.email).toBe('test@test.com');
    expect(component.user()?.enabled).toBeTruthy();
    expect(component.userLoading()).toBeFalsy();
  });

  it('should not load tasks on init by default', () => {
    fixture.detectChanges();
    httpMock.expectOne(`${apiUrl}/1`).flush(mockUser);
    httpMock.expectNone((r) => r.url === `${apiUrl}/1/tasks`);
  });

  it('should load tasks when tab tasks is selected', () => {
    flushAll();

    component.onTabChange(1);
    fixture.detectChanges();

    expect(component.tasksLoading()).toBeTruthy();
    flushTasksRequest();
    fixture.detectChanges();

    expect(component.tasks().length).toBe(2);
    expect(component.tasksTotal()).toBe(2);
    expect(component.tasksLoading()).toBeFalsy();
  });

  it('should load task types when tab types is selected', () => {
    flushAll();

    component.onTabChange(2);
    fixture.detectChanges();

    expect(component.taskTypesLoading()).toBeTruthy();
    flushTaskTypesRequest();
    fixture.detectChanges();

    expect(component.taskTypes().length).toBe(2);
    expect(component.taskTypesTotal()).toBe(2);
    expect(component.taskTypesLoading()).toBeFalsy();
  });

  it('should not reload tasks when tab is selected again', () => {
    flushAll();

    component.onTabChange(1);
    flushTasksRequest();
    fixture.detectChanges();

    component.onTabChange(0);
    component.onTabChange(1);
    fixture.detectChanges();

    httpMock.expectNone((r) => r.url === `${apiUrl}/1/tasks`);
  });

  it('should not reload task types when tab is selected again', () => {
    flushAll();

    component.onTabChange(2);
    flushTaskTypesRequest();
    fixture.detectChanges();

    component.onTabChange(0);
    component.onTabChange(2);
    fixture.detectChanges();

    httpMock.expectNone((r) => r.url === `${apiUrl}/1/task-types`);
  });

  it('should handle user error', () => {
    fixture.detectChanges();
    httpMock.expectOne(`${apiUrl}/1`).flush('Error', { status: 404, statusText: 'Not Found' });

    expect(component.userError()).toBe('No se pudo cargar el usuario.');
    expect(component.userLoading()).toBeFalsy();
  });

  it('should handle tasks error', () => {
    flushAll();

    component.onTabChange(1);
    fixture.detectChanges();

    httpMock
      .expectOne((r) => r.url === `${apiUrl}/1/tasks`)
      .flush('Error', { status: 500, statusText: 'Server Error' });

    expect(component.tasksError()).toBe('No se pudieron cargar las tareas.');
    expect(component.tasksLoading()).toBeFalsy();
  });

  it('should handle task types error', () => {
    flushAll();

    component.onTabChange(2);
    fixture.detectChanges();

    httpMock
      .expectOne((r) => r.url === `${apiUrl}/1/task-types`)
      .flush('Error', { status: 500, statusText: 'Server Error' });

    expect(component.taskTypesError()).toBe('No se pudieron cargar los tipos de tarea.');
    expect(component.taskTypesLoading()).toBeFalsy();
  });

  it('should format task status correctly', () => {
    expect(component.formatTaskStatus(true)).toBe('Completada');
    expect(component.formatTaskStatus(false)).toBe('Pendiente');
    expect(component.formatTaskStatus(null)).toBe('Pendiente');
  });

  it('should format task type correctly', () => {
    expect(component.formatTaskType('Trabajo')).toBe('Trabajo');
    expect(component.formatTaskType(null)).toBe('Sin tipo');
  });

  it('should format fecha correctly', () => {
    expect(component.formatFecha('2024-01-01')).toBe('2024-01-01');
    expect(component.formatFecha(null)).toBe('-');
  });

  it('should handle tasks pagination', () => {
    flushAll();

    component.onTabChange(1);
    flushTasksRequest();
    fixture.detectChanges();

    component.onTasksPageChange({ pageIndex: 1, pageSize: 10, length: 50 });

    expect(component.tasksPage()).toBe(1);
    expect(component.tasksSize()).toBe(10);

    const tasksReq2 = httpMock.expectOne((r) => r.url === `${apiUrl}/1/tasks`);
    expect(tasksReq2.request.params.get('page')).toBe('1');
    expect(tasksReq2.request.params.get('size')).toBe('10');
    tasksReq2.flush({ ...mockTasksResponse, content: [] });
  });

  it('should handle task types pagination', () => {
    flushAll();

    component.onTabChange(2);
    flushTaskTypesRequest();
    fixture.detectChanges();

    component.onTaskTypesPageChange({ pageIndex: 1, pageSize: 10, length: 50 });

    expect(component.taskTypesPage()).toBe(1);
    expect(component.taskTypesSize()).toBe(10);

    const typesReq2 = httpMock.expectOne((r) => r.url === `${apiUrl}/1/task-types`);
    expect(typesReq2.request.params.get('page')).toBe('1');
    expect(typesReq2.request.params.get('size')).toBe('10');
    typesReq2.flush({ ...mockTaskTypesResponse, content: [] });
  });

  it('should display user identification', () => {
    flushAll();
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('testuser');
    expect(el.textContent).toContain('test@test.com');
  });

  it('should display user enabled status', () => {
    flushAll();
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('Activo');
  });

  it('should display metrics', () => {
    flushAll();
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('Tareas totales');
    expect(el.textContent).toContain('Completadas');
    expect(el.textContent).toContain('Pendientes');
    expect(el.textContent).toContain('Tipos de tarea');
  });

  it('should show actions section in summary tab', () => {
    flushAll();
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('Acciones');
    expect(el.textContent).toContain('Editar usuario');
    expect(el.textContent).toContain('Deshabilitar');
    expect(el.textContent).toContain('Eliminar usuario');
  });

  it('should show create task button in tasks tab', () => {
    flushAll();

    component.onTabChange(1);
    fixture.detectChanges();
    flushTasksRequest();
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('Crear tarea');
  });

  it('should show create type button in task types tab', () => {
    flushAll();

    component.onTabChange(2);
    fixture.detectChanges();
    flushTaskTypesRequest();
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('Crear tipo');
  });

  it('should select initial tab from query param tasks', async () => {
    TestBed.resetTestingModule();

    await TestBed.configureTestingModule({
      imports: [UserDetailComponent, NoopAnimationsModule],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: ActivatedRoute, useValue: createActivatedRoute({ tab: 'tasks' }) },
      ],
    }).compileComponents();

    const newFixture = TestBed.createComponent(UserDetailComponent);
    const newHttpMock = TestBed.inject(HttpTestingController);

    newFixture.detectChanges();
    newHttpMock.expectOne(`${apiUrl}/1`).flush(mockUser);
    newFixture.detectChanges();

    expect(newFixture.componentInstance.selectedTab()).toBe(1);

    newHttpMock.expectOne((r) => r.url === `${apiUrl}/1/tasks`).flush(mockTasksResponse);
    newFixture.detectChanges();

    expect(newFixture.componentInstance.tasks().length).toBe(2);

    newHttpMock.verify();
  });

  it('should select initial tab from query param task-types', async () => {
    TestBed.resetTestingModule();

    await TestBed.configureTestingModule({
      imports: [UserDetailComponent, NoopAnimationsModule],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: ActivatedRoute, useValue: createActivatedRoute({ tab: 'task-types' }) },
      ],
    }).compileComponents();

    const newFixture = TestBed.createComponent(UserDetailComponent);
    const newHttpMock = TestBed.inject(HttpTestingController);

    newFixture.detectChanges();
    newHttpMock.expectOne(`${apiUrl}/1`).flush(mockUser);
    newFixture.detectChanges();

    expect(newFixture.componentInstance.selectedTab()).toBe(2);

    newHttpMock.expectOne((r) => r.url === `${apiUrl}/1/task-types`).flush(mockTaskTypesResponse);
    newFixture.detectChanges();

    expect(newFixture.componentInstance.taskTypes().length).toBe(2);

    newHttpMock.verify();
  });

  it('should handle complete/reopen task', () => {
    flushAll();

    component.onTabChange(1);
    fixture.detectChanges();
    flushTasksRequest();
    fixture.detectChanges();

    const task = component.tasks()[0];
    component.toggleTaskCompleted(task);

    const req = httpMock.expectOne(`${apiUrl}/1/tasks/1`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ completada: false });
    req.flush({ ...task, completada: false });

    const reloadReq = httpMock.expectOne((r) => r.url === `${apiUrl}/1/tasks`);
    reloadReq.flush(mockTasksResponse);
    const userReq = httpMock.expectOne(`${apiUrl}/1`);
    userReq.flush(mockUser);
  });
});
