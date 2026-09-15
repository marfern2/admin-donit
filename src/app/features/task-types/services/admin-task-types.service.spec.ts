import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { AdminTaskTypesService } from './admin-task-types.service';
import { environment } from '../../../../environments/environment';

describe('AdminTaskTypesService', () => {
  let service: AdminTaskTypesService;
  let httpMock: HttpTestingController;

  const apiUrl = `${environment.apiUrl}/api/admin/task-types`;

  const mockPageResponse = {
    content: [],
    page: 0,
    size: 20,
    totalElements: 0,
    totalPages: 0,
    first: true,
    last: true,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AdminTaskTypesService, provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(AdminTaskTypesService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getTaskTypes', () => {
    it('should fetch task types with default params', () => {
      service.getTaskTypes({ page: 0, size: 20 }).subscribe((result) => {
        expect(result).toEqual(mockPageResponse);
      });

      const req = httpMock.expectOne((r) => r.url === apiUrl);
      expect(req.request.method).toBe('GET');
      expect(req.request.params.get('page')).toBe('0');
      expect(req.request.params.get('size')).toBe('20');
      expect(req.request.params.has('search')).toBeFalsy();
      expect(req.request.params.has('sort')).toBeFalsy();
      req.flush(mockPageResponse);
    });

    it('should include search param when provided', () => {
      service.getTaskTypes({ page: 0, size: 20, search: 'trabajo' }).subscribe();

      const req = httpMock.expectOne((r) => r.url === apiUrl);
      expect(req.request.params.get('search')).toBe('trabajo');
      req.flush(mockPageResponse);
    });

    it('should include sort param when provided', () => {
      service.getTaskTypes({ page: 0, size: 20, sort: 'nombre,asc' }).subscribe();

      const req = httpMock.expectOne((r) => r.url === apiUrl);
      expect(req.request.params.get('sort')).toBe('nombre,asc');
      req.flush(mockPageResponse);
    });

    it('should pass page and size correctly', () => {
      service.getTaskTypes({ page: 2, size: 50 }).subscribe();

      const req = httpMock.expectOne((r) => r.url === apiUrl);
      expect(req.request.params.get('page')).toBe('2');
      expect(req.request.params.get('size')).toBe('50');
      req.flush(mockPageResponse);
    });

    it('should omit optional params when not provided', () => {
      service.getTaskTypes({ page: 0, size: 20 }).subscribe();

      const req = httpMock.expectOne((r) => r.url === apiUrl);
      expect(req.request.params.has('search')).toBeFalsy();
      expect(req.request.params.has('sort')).toBeFalsy();
      req.flush(mockPageResponse);
    });
  });

  describe('getTaskTypeById', () => {
    it('should fetch task type by id', () => {
      const mockTaskType = {
        id: 1,
        nombre: 'Trabajo',
        descripcion: 'Tareas de trabajo',
        color: '#FF0000',
        usuarioId: 1,
        usuarioUsername: 'admin',
        usuarioEmail: 'admin@test.com',
        taskCount: 5,
      };

      service.getTaskTypeById(1).subscribe((result) => {
        expect(result).toEqual(mockTaskType);
      });

      const req = httpMock.expectOne(`${apiUrl}/1`);
      expect(req.request.method).toBe('GET');
      req.flush(mockTaskType);
    });

    it('should handle null fields in response', () => {
      const mockTaskType = {
        id: 2,
        nombre: 'Personal',
        descripcion: null,
        color: null,
        usuarioId: 1,
        usuarioUsername: 'admin',
        usuarioEmail: 'admin@test.com',
        taskCount: 0,
      };

      service.getTaskTypeById(2).subscribe((result) => {
        expect(result.descripcion).toBeNull();
        expect(result.color).toBeNull();
      });

      const req = httpMock.expectOne(`${apiUrl}/2`);
      req.flush(mockTaskType);
    });
  });
});
