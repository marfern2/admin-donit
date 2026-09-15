import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { AdminTasksService } from './admin-tasks.service';
import { environment } from '../../../../environments/environment';

describe('AdminTasksService', () => {
  let service: AdminTasksService;
  let httpMock: HttpTestingController;

  const apiUrl = `${environment.apiUrl}/api/admin/tasks`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AdminTasksService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AdminTasksService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should GET tasks list without filters', () => {
    const mockResponse = {
      content: [],
      page: 0,
      size: 20,
      totalElements: 0,
      totalPages: 0,
      first: true,
      last: true,
    };

    service.getTasks({ page: 0, size: 20 }).subscribe((res) => {
      expect(res).toEqual(mockResponse);
    });

    const req = httpMock.expectOne((r) => r.url === apiUrl);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('page')).toBe('0');
    expect(req.request.params.get('size')).toBe('20');
    expect(req.request.params.keys().length).toBe(2);
    req.flush(mockResponse);
  });

  it('should GET tasks with search', () => {
    service.getTasks({ page: 0, size: 20, search: 'test' }).subscribe();

    const req = httpMock.expectOne((r) => r.url === apiUrl);
    expect(req.request.params.get('search')).toBe('test');
    req.flush({ content: [], page: 0, size: 20, totalElements: 0, totalPages: 0, first: true, last: true });
  });

  it('should GET tasks with userId', () => {
    service.getTasks({ page: 0, size: 20, userId: 5 }).subscribe();

    const req = httpMock.expectOne((r) => r.url === apiUrl);
    expect(req.request.params.get('userId')).toBe('5');
    req.flush({ content: [], page: 0, size: 20, totalElements: 0, totalPages: 0, first: true, last: true });
  });

  it('should GET tasks with completed=true', () => {
    service.getTasks({ page: 0, size: 20, completed: true }).subscribe();

    const req = httpMock.expectOne((r) => r.url === apiUrl);
    expect(req.request.params.get('completed')).toBe('true');
    req.flush({ content: [], page: 0, size: 20, totalElements: 0, totalPages: 0, first: true, last: true });
  });

  it('should GET tasks with completed=false', () => {
    service.getTasks({ page: 0, size: 20, completed: false }).subscribe();

    const req = httpMock.expectOne((r) => r.url === apiUrl);
    expect(req.request.params.get('completed')).toBe('false');
    req.flush({ content: [], page: 0, size: 20, totalElements: 0, totalPages: 0, first: true, last: true });
  });

  it('should GET tasks with urgency', () => {
    service.getTasks({ page: 0, size: 20, urgency: 'alta' }).subscribe();

    const req = httpMock.expectOne((r) => r.url === apiUrl);
    expect(req.request.params.get('urgency')).toBe('alta');
    req.flush({ content: [], page: 0, size: 20, totalElements: 0, totalPages: 0, first: true, last: true });
  });

  it('should GET tasks with taskTypeId', () => {
    service.getTasks({ page: 0, size: 20, taskTypeId: 3 }).subscribe();

    const req = httpMock.expectOne((r) => r.url === apiUrl);
    expect(req.request.params.get('taskTypeId')).toBe('3');
    req.flush({ content: [], page: 0, size: 20, totalElements: 0, totalPages: 0, first: true, last: true });
  });

  it('should GET tasks with sort and page/size', () => {
    service.getTasks({ page: 2, size: 10, sort: 'fecha,desc' }).subscribe();

    const req = httpMock.expectOne((r) => r.url === apiUrl);
    expect(req.request.params.get('page')).toBe('2');
    expect(req.request.params.get('size')).toBe('10');
    expect(req.request.params.get('sort')).toBe('fecha,desc');
    req.flush({ content: [], page: 2, size: 10, totalElements: 0, totalPages: 0, first: false, last: true });
  });

  it('should GET task by id', () => {
    const mockTask = {
      id: 1,
      titulo: 'Task 1',
      descripcion: 'Desc',
      fecha: '2024-01-01',
      completada: true,
      urgencia: 'alta',
      usuarioId: 1,
      usuarioUsername: 'user1',
      usuarioEmail: 'user1@test.com',
      tipoTareaId: 1,
      tipoTareaNombre: 'Trabajo',
      tipoTareaColor: '#FF0000',
    };

    service.getTaskById(1).subscribe((res) => {
      expect(res).toEqual(mockTask);
    });

    const req = httpMock.expectOne(`${apiUrl}/1`);
    expect(req.request.method).toBe('GET');
    req.flush(mockTask);
  });

  it('should omit optional params when not provided', () => {
    service.getTasks({ page: 0, size: 20 }).subscribe();

    const req = httpMock.expectOne((r) => r.url === apiUrl);
    expect(req.request.params.has('search')).toBeFalsy();
    expect(req.request.params.has('userId')).toBeFalsy();
    expect(req.request.params.has('completed')).toBeFalsy();
    expect(req.request.params.has('urgency')).toBeFalsy();
    expect(req.request.params.has('taskTypeId')).toBeFalsy();
    expect(req.request.params.has('sort')).toBeFalsy();
    req.flush({ content: [], page: 0, size: 20, totalElements: 0, totalPages: 0, first: true, last: true });
  });
});
