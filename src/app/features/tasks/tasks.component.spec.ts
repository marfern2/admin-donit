import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { TasksComponent } from './tasks.component';
import { environment } from '../../../environments/environment';

describe('TasksComponent', () => {
  let component: TasksComponent;
  let fixture: ComponentFixture<TasksComponent>;
  let httpMock: HttpTestingController;

  const tasksApiUrl = `${environment.apiUrl}/api/admin/tasks`;
  const taskTypesApiUrl = `${environment.apiUrl}/api/admin/task-types`;

  const mockPageResponse = {
    content: [
      {
        id: 1,
        titulo: 'Task 1',
        descripcion: 'Desc1',
        fecha: '2024-01-01',
        completada: true,
        urgencia: 0,
        usuarioId: 1,
        usuarioUsername: 'user1',
        usuarioEmail: 'user1@test.com',
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
        usuarioId: 2,
        usuarioUsername: 'user2',
        usuarioEmail: 'user2@test.com',
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

  const mockTaskTypesPageResponse = {
    content: [
      {
        id: 1,
        nombre: 'Trabajo',
        descripcion: 'Tareas de trabajo',
        color: '#FF0000',
        usuarioId: 1,
        usuarioUsername: 'admin',
        taskCount: 5,
      },
      {
        id: 2,
        nombre: 'Personal',
        descripcion: null,
        color: null,
        usuarioId: 2,
        usuarioUsername: 'user1',
        taskCount: 3,
      },
    ],
    page: 0,
    size: 100,
    totalElements: 2,
    totalPages: 1,
    first: true,
    last: true,
  };

  function flushTasksRequest(response = mockPageResponse) {
    const req = httpMock.expectOne((r) => r.url === tasksApiUrl);
    req.flush(response);
    return req;
  }

  function flushTaskTypesRequest(response = mockTaskTypesPageResponse) {
    const req = httpMock.expectOne((r) => r.url === taskTypesApiUrl);
    req.flush(response);
    return req;
  }

  function flushAllOnInit() {
    fixture.detectChanges();
    flushTaskTypesRequest();
    flushTasksRequest();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TasksComponent, NoopAnimationsModule],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(TasksComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should create', () => {
    flushAllOnInit();
    expect(component).toBeTruthy();
  });

  it('should load tasks on init with default sort', () => {
    flushAllOnInit();
    expect(component.data()?.content.length).toBe(2);
  });

  it('should load task types on init', () => {
    flushAllOnInit();
    expect(component.taskTypes().length).toBe(2);
    expect(component.taskTypes()[0].nombre).toBe('Trabajo');
    expect(component.taskTypes()[1].nombre).toBe('Personal');
  });

  it('should request task types with nombre,asc sort', () => {
    fixture.detectChanges();
    const req = flushTaskTypesRequest();
    expect(req.request.params.get('sort')).toBe('nombre,asc');
    expect(req.request.params.get('size')).toBe('100');
    expect(req.request.params.get('page')).toBe('0');
    flushTasksRequest();
  });

  it('should select task type sends correct taskTypeId', () => {
    flushAllOnInit();

    component.taskTypeIdCtrl.setValue(1);
    component.onFilterChange();

    const req = flushTasksRequest();
    expect(req.request.params.get('taskTypeId')).toBe('1');
  });

  it('should omit taskTypeId when "Todos los tipos" is selected', () => {
    flushAllOnInit();

    component.taskTypeIdCtrl.setValue(null);
    component.onFilterChange();

    const req = flushTasksRequest();
    expect(req.request.params.has('taskTypeId')).toBeFalsy();
  });

  it('should reset page to 0 when task type changes', () => {
    flushAllOnInit();

    component.page.set(3);
    component.taskTypeIdCtrl.setValue(1);
    component.onFilterChange();

    expect(component.page()).toBe(0);
    flushTasksRequest();
  });

  it('should clear taskTypeId in clearFilters', () => {
    flushAllOnInit();

    component.taskTypeIdCtrl.setValue(1);
    component.clearFilters();

    expect(component.taskTypeIdCtrl.value).toBeNull();
    expect(component.page()).toBe(0);

    flushTasksRequest();
  });

  it('should not break tasks loading when task types fail', () => {
    fixture.detectChanges();
    const typesReq = httpMock.expectOne((r) => r.url === taskTypesApiUrl);
    typesReq.flush('Error', { status: 500, statusText: 'Server Error' });

    expect(component.typesError()).toBe('No se pudieron cargar los tipos de tarea.');
    expect(component.loadingTypes()).toBeFalsy();

    flushTasksRequest();
    expect(component.data()).toBeTruthy();
    expect(component.data()?.content.length).toBe(2);
  });

  it('should load remaining pages when totalPages > 1', () => {
    fixture.detectChanges();

    const firstPageTypesResponse = {
      content: [
        { id: 1, nombre: 'Trabajo', descripcion: null, color: '#FF0000', usuarioId: 1, usuarioUsername: 'admin', taskCount: 5 },
      ],
      page: 0,
      size: 100,
      totalElements: 150,
      totalPages: 2,
      first: true,
      last: false,
    };

    const typesReq1 = httpMock.expectOne((r) => r.url === taskTypesApiUrl);
    typesReq1.flush(firstPageTypesResponse);

    const typesReq2 = httpMock.expectOne((r) => r.url === taskTypesApiUrl);
    typesReq2.flush({
      content: [
        { id: 2, nombre: 'Personal', descripcion: null, color: null, usuarioId: 2, usuarioUsername: 'user1', taskCount: 3 },
      ],
      page: 1,
      size: 100,
      totalElements: 150,
      totalPages: 2,
      first: false,
      last: true,
    });

    flushTasksRequest();

    expect(component.taskTypes().length).toBe(2);
    expect(component.taskTypes()[0].nombre).toBe('Trabajo');
    expect(component.taskTypes()[1].nombre).toBe('Personal');
    expect(component.loadingTypes()).toBeFalsy();
  });

  it('should handle error on remaining pages gracefully', () => {
    fixture.detectChanges();

    const firstPageTypesResponse = {
      content: [
        { id: 1, nombre: 'Trabajo', descripcion: null, color: '#FF0000', usuarioId: 1, usuarioUsername: 'admin', taskCount: 5 },
      ],
      page: 0,
      size: 100,
      totalElements: 150,
      totalPages: 2,
      first: true,
      last: false,
    };

    const typesReq1 = httpMock.expectOne((r) => r.url === taskTypesApiUrl);
    typesReq1.flush(firstPageTypesResponse);

    const typesReq2 = httpMock.expectOne((r) => r.url === taskTypesApiUrl);
    typesReq2.flush('Error', { status: 500, statusText: 'Server Error' });

    flushTasksRequest();

    expect(component.taskTypes().length).toBe(1);
    expect(component.typesError()).toBe('No se pudieron cargar todos los tipos de tarea.');
    expect(component.loadingTypes()).toBeFalsy();
  });

  it('should serialize completed=true correctly', () => {
    flushAllOnInit();

    component.completedCtrl.setValue('true');
    component.onFilterChange();

    const req = flushTasksRequest();
    expect(req.request.params.get('completed')).toBe('true');
  });

  it('should serialize completed=false correctly', () => {
    flushAllOnInit();

    component.completedCtrl.setValue('false');
    component.onFilterChange();

    const req = flushTasksRequest();
    expect(req.request.params.get('completed')).toBe('false');
  });

  it('should omit completed param when set to all', () => {
    flushAllOnInit();

    component.completedCtrl.setValue('all');
    component.onFilterChange();

    const req = flushTasksRequest();
    expect(req.request.params.has('completed')).toBeFalsy();
  });

  it('should reset page on filter change', () => {
    flushAllOnInit();

    component.page.set(3);
    component.onFilterChange();

    expect(component.page()).toBe(0);
    flushTasksRequest();
  });

  it('should send userId filter', () => {
    flushAllOnInit();

    component.userIdCtrl.setValue(5);
    component.onFilterChange();

    const req = flushTasksRequest();
    expect(req.request.params.get('userId')).toBe('5');
  });

  it('should send urgency filter', () => {
    flushAllOnInit();

    component.urgencyCtrl.setValue('0');
    component.onFilterChange();

    const req = flushTasksRequest();
    expect(req.request.params.get('urgency')).toBe('0');
  });

  it('should send taskTypeId filter', () => {
    flushAllOnInit();

    component.taskTypeIdCtrl.setValue(3);
    component.onFilterChange();

    const req = flushTasksRequest();
    expect(req.request.params.get('taskTypeId')).toBe('3');
  });

  it('should clear all filters', () => {
    flushAllOnInit();

    component.searchCtrl.setValue('test');
    component.userIdCtrl.setValue(5);
    component.completedCtrl.setValue('true');
    component.urgencyCtrl.setValue('0');
    component.taskTypeIdCtrl.setValue(3);

    component.clearFilters();

    expect(component.searchCtrl.value).toBe('');
    expect(component.userIdCtrl.value).toBeNull();
    expect(component.completedCtrl.value).toBe('all');
    expect(component.urgencyCtrl.value).toBe('');
    expect(component.taskTypeIdCtrl.value).toBeNull();
    expect(component.page()).toBe(0);

    flushTasksRequest();
  });

  it('should handle pagination', () => {
    flushAllOnInit();

    component.onPageChange({ pageIndex: 1, pageSize: 10, length: 50 });

    expect(component.page()).toBe(1);
    expect(component.size()).toBe(10);

    const req = flushTasksRequest();
    expect(req.request.params.get('page')).toBe('1');
    expect(req.request.params.get('size')).toBe('10');
  });

  it('should handle sort on sortable columns', () => {
    flushAllOnInit();

    component.onSortChange({ active: 'titulo', direction: 'asc' });

    expect(component.sortActive()).toBe('titulo');
    expect(component.sortDirection()).toBe('asc');
    expect(component.page()).toBe(0);

    const req = flushTasksRequest();
    expect(req.request.params.get('sort')).toBe('titulo,asc');
  });

  it('should reset sort to default for non-sortable columns', () => {
    flushAllOnInit();

    component.onSortChange({ active: 'usuarioUsername', direction: 'asc' });

    expect(component.sortActive()).toBe('fecha');
    expect(component.sortDirection()).toBe('desc');

    flushTasksRequest();
  });

  it('should reset sort to default when direction is empty', () => {
    flushAllOnInit();

    component.onSortChange({ active: 'titulo', direction: '' });

    expect(component.sortActive()).toBe('fecha');
    expect(component.sortDirection()).toBe('desc');

    flushTasksRequest();
  });

  it('should show error on failure', () => {
    fixture.detectChanges();
    flushTaskTypesRequest();

    const req = httpMock.expectOne((r) => r.url === tasksApiUrl);
    req.flush('Error', { status: 500, statusText: 'Server Error' });

    expect(component.error()).toBe('No se pudieron cargar las tareas.');
    expect(component.loading()).toBeFalsy();
  });

  it('should format status correctly', () => {
    expect(component.formatStatus(true)).toBe('Completada');
    expect(component.formatStatus(false)).toBe('Pendiente');
    expect(component.formatStatus(null)).toBe('Pendiente');
  });

  it('should format tipo correctly', () => {
    expect(component.formatTipo('Trabajo')).toBe('Trabajo');
    expect(component.formatTipo(null)).toBe('Sin tipo');
  });

  it('should format fecha correctly', () => {
    expect(component.formatFecha('2024-01-01')).toBe('2024-01-01');
    expect(component.formatFecha(null)).toBe('-');
  });

  it('should format urgencia correctly', () => {
    expect(component.formatUrgencia(0)).toBe('0');
    expect(component.formatUrgencia(null)).toBe('-');
  });

  it('should detect active filters', () => {
    expect(component.hasActiveFilters()).toBeFalsy();

    component.searchCtrl.setValue('test');
    expect(component.hasActiveFilters()).toBeTruthy();

    component.searchCtrl.setValue('');
    component.userIdCtrl.setValue(1);
    expect(component.hasActiveFilters()).toBeTruthy();
  });
});
