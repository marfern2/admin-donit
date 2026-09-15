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

  const apiUrl = `${environment.apiUrl}/api/admin/tasks`;

  const mockPageResponse = {
    content: [
      {
        id: 1,
        titulo: 'Task 1',
        descripcion: 'Desc1',
        fecha: '2024-01-01',
        completada: true,
        urgencia: 'alta',
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

  function flushTasksRequest(response = mockPageResponse) {
    const req = httpMock.expectOne((r) => r.url === apiUrl);
    req.flush(response);
    return req;
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
    fixture.detectChanges();
    flushTasksRequest();
    expect(component).toBeTruthy();
  });

  it('should load tasks on init with default sort', () => {
    fixture.detectChanges();
    const req = flushTasksRequest();
    expect(req.request.params.get('page')).toBe('0');
    expect(req.request.params.get('size')).toBe('20');
    expect(req.request.params.get('sort')).toBe('fecha,desc');
    expect(component.data()?.content.length).toBe(2);
  });

  it('should serialize completed=true correctly', () => {
    fixture.detectChanges();
    flushTasksRequest();

    component.completedCtrl.setValue('true');
    component.onFilterChange();

    const req = flushTasksRequest();
    expect(req.request.params.get('completed')).toBe('true');
  });

  it('should serialize completed=false correctly', () => {
    fixture.detectChanges();
    flushTasksRequest();

    component.completedCtrl.setValue('false');
    component.onFilterChange();

    const req = flushTasksRequest();
    expect(req.request.params.get('completed')).toBe('false');
  });

  it('should omit completed param when set to all', () => {
    fixture.detectChanges();
    flushTasksRequest();

    component.completedCtrl.setValue('all');
    component.onFilterChange();

    const req = flushTasksRequest();
    expect(req.request.params.has('completed')).toBeFalsy();
  });

  it('should reset page on filter change', () => {
    fixture.detectChanges();
    flushTasksRequest();

    component.page.set(3);
    component.onFilterChange();

    expect(component.page()).toBe(0);
    flushTasksRequest();
  });

  it('should send userId filter', () => {
    fixture.detectChanges();
    flushTasksRequest();

    component.userIdCtrl.setValue(5);
    component.onFilterChange();

    const req = flushTasksRequest();
    expect(req.request.params.get('userId')).toBe('5');
  });

  it('should send urgency filter', () => {
    fixture.detectChanges();
    flushTasksRequest();

    component.urgencyCtrl.setValue('alta');
    component.onFilterChange();

    const req = flushTasksRequest();
    expect(req.request.params.get('urgency')).toBe('alta');
  });

  it('should send taskTypeId filter', () => {
    fixture.detectChanges();
    flushTasksRequest();

    component.taskTypeIdCtrl.setValue(3);
    component.onFilterChange();

    const req = flushTasksRequest();
    expect(req.request.params.get('taskTypeId')).toBe('3');
  });

  it('should clear all filters', () => {
    fixture.detectChanges();
    flushTasksRequest();

    component.searchCtrl.setValue('test');
    component.userIdCtrl.setValue(5);
    component.completedCtrl.setValue('true');
    component.urgencyCtrl.setValue('alta');
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
    fixture.detectChanges();
    flushTasksRequest();

    component.onPageChange({ pageIndex: 1, pageSize: 10, length: 50 });

    expect(component.page()).toBe(1);
    expect(component.size()).toBe(10);

    const req = flushTasksRequest();
    expect(req.request.params.get('page')).toBe('1');
    expect(req.request.params.get('size')).toBe('10');
  });

  it('should handle sort on sortable columns', () => {
    fixture.detectChanges();
    flushTasksRequest();

    component.onSortChange({ active: 'titulo', direction: 'asc' });

    expect(component.sortActive()).toBe('titulo');
    expect(component.sortDirection()).toBe('asc');
    expect(component.page()).toBe(0);

    const req = flushTasksRequest();
    expect(req.request.params.get('sort')).toBe('titulo,asc');
  });

  it('should reset sort to default for non-sortable columns', () => {
    fixture.detectChanges();
    flushTasksRequest();

    component.onSortChange({ active: 'usuarioUsername', direction: 'asc' });

    expect(component.sortActive()).toBe('fecha');
    expect(component.sortDirection()).toBe('desc');

    flushTasksRequest();
  });

  it('should reset sort to default when direction is empty', () => {
    fixture.detectChanges();
    flushTasksRequest();

    component.onSortChange({ active: 'titulo', direction: '' });

    expect(component.sortActive()).toBe('fecha');
    expect(component.sortDirection()).toBe('desc');

    flushTasksRequest();
  });

  it('should show error on failure', () => {
    fixture.detectChanges();
    const req = httpMock.expectOne((r) => r.url === apiUrl);
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
    expect(component.formatUrgencia('alta')).toBe('alta');
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
