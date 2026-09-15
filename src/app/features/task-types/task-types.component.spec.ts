import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { TaskTypesComponent } from './task-types.component';
import { environment } from '../../../environments/environment';

describe('TaskTypesComponent', () => {
  let component: TaskTypesComponent;
  let fixture: ComponentFixture<TaskTypesComponent>;
  let httpMock: HttpTestingController;

  const apiUrl = `${environment.apiUrl}/api/admin/task-types`;

  const mockPageResponse = {
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
    size: 20,
    totalElements: 2,
    totalPages: 1,
    first: true,
    last: true,
  };

  function flushTaskTypesRequest(response = mockPageResponse) {
    const req = httpMock.expectOne((r) => r.url === apiUrl);
    req.flush(response);
    return req;
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TaskTypesComponent, NoopAnimationsModule],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(TaskTypesComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should create', () => {
    fixture.detectChanges();
    flushTaskTypesRequest();
    expect(component).toBeTruthy();
  });

  it('should load task types on init with default sort', () => {
    fixture.detectChanges();
    const req = flushTaskTypesRequest();
    expect(req.request.params.get('page')).toBe('0');
    expect(req.request.params.get('size')).toBe('20');
    expect(req.request.params.get('sort')).toBe('nombre,asc');
    expect(component.data()?.content.length).toBe(2);
  });

  it('should reset page to 0 on search', async () => {
    fixture.detectChanges();
    flushTaskTypesRequest();

    component.page.set(5);
    component.searchCtrl.setValue('trabajo');

    await new Promise((r) => setTimeout(r, 400));

    const req = flushTaskTypesRequest();
    expect(req.request.params.get('page')).toBe('0');
    expect(req.request.params.get('search')).toBe('trabajo');
  });

  it('should handle pagination', () => {
    fixture.detectChanges();
    flushTaskTypesRequest();

    component.onPageChange({ pageIndex: 1, pageSize: 10, length: 50 });

    expect(component.page()).toBe(1);
    expect(component.size()).toBe(10);

    const req = flushTaskTypesRequest();
    expect(req.request.params.get('page')).toBe('1');
    expect(req.request.params.get('size')).toBe('10');
  });

  it('should handle sort on sortable columns', () => {
    fixture.detectChanges();
    flushTaskTypesRequest();

    component.onSortChange({ active: 'nombre', direction: 'desc' });

    expect(component.sortActive()).toBe('nombre');
    expect(component.sortDirection()).toBe('desc');
    expect(component.page()).toBe(0);

    const req = flushTaskTypesRequest();
    expect(req.request.params.get('sort')).toBe('nombre,desc');
  });

  it('should reset sort to default for non-sortable columns', () => {
    fixture.detectChanges();
    flushTaskTypesRequest();

    component.onSortChange({ active: 'usuarioUsername', direction: 'asc' });

    expect(component.sortActive()).toBe('nombre');
    expect(component.sortDirection()).toBe('asc');

    flushTaskTypesRequest();
  });

  it('should reset sort to default when direction is empty', () => {
    fixture.detectChanges();
    flushTaskTypesRequest();

    component.sortActive.set('id');
    component.sortDirection.set('desc');
    component.onSortChange({ active: 'id', direction: '' });

    expect(component.sortActive()).toBe('nombre');
    expect(component.sortDirection()).toBe('asc');

    flushTaskTypesRequest();
  });

  it('should show error on failure', () => {
    fixture.detectChanges();
    const req = httpMock.expectOne((r) => r.url === apiUrl);
    req.flush('Error', { status: 500, statusText: 'Server Error' });

    expect(component.error()).toBe('No se pudieron cargar los tipos de tarea.');
    expect(component.loading()).toBeFalsy();
  });

  it('should clear search', () => {
    fixture.detectChanges();
    flushTaskTypesRequest();

    component.searchCtrl.setValue('test');
    component.clearSearch();
    expect(component.searchCtrl.value).toBe('');
  });

  it('should format descripcion correctly', () => {
    expect(component.formatDescripcion('Trabajo')).toBe('Trabajo');
    expect(component.formatDescripcion(null)).toBe('-');
  });

  it('should format color correctly', () => {
    expect(component.formatColor('#FF0000')).toBe('#FF0000');
    expect(component.formatColor(null)).toBe('-');
  });
});
