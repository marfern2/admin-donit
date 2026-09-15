import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { AdminUsersService } from './admin-users.service';
import { environment } from '../../../../environments/environment';

describe('AdminUsersService', () => {
  let service: AdminUsersService;
  let httpMock: HttpTestingController;

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
      providers: [AdminUsersService, provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(AdminUsersService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getUsers', () => {
    it('should fetch users with default params', () => {
      service.getUsers({ page: 0, size: 20 }).subscribe((result) => {
        expect(result).toEqual(mockPageResponse);
      });

      const req = httpMock.expectOne(
        (r) => r.url === `${environment.apiUrl}/api/admin/users`,
      );
      expect(req.request.method).toBe('GET');
      expect(req.request.params.get('page')).toBe('0');
      expect(req.request.params.get('size')).toBe('20');
      expect(req.request.params.has('search')).toBeFalsy();
      expect(req.request.params.has('sort')).toBeFalsy();
      req.flush(mockPageResponse);
    });

    it('should include search param when provided', () => {
      service.getUsers({ page: 0, size: 20, search: 'test' }).subscribe();

      const req = httpMock.expectOne(
        (r) => r.url === `${environment.apiUrl}/api/admin/users`,
      );
      expect(req.request.params.get('search')).toBe('test');
      req.flush(mockPageResponse);
    });

    it('should include sort param when provided', () => {
      service.getUsers({ page: 0, size: 20, sort: 'username,asc' }).subscribe();

      const req = httpMock.expectOne(
        (r) => r.url === `${environment.apiUrl}/api/admin/users`,
      );
      expect(req.request.params.get('sort')).toBe('username,asc');
      req.flush(mockPageResponse);
    });

    it('should pass page and size correctly', () => {
      service.getUsers({ page: 3, size: 50 }).subscribe();

      const req = httpMock.expectOne(
        (r) => r.url === `${environment.apiUrl}/api/admin/users`,
      );
      expect(req.request.params.get('page')).toBe('3');
      expect(req.request.params.get('size')).toBe('50');
      req.flush(mockPageResponse);
    });
  });

  describe('getUserById', () => {
    it('should fetch user by id', () => {
      const mockUser = {
        id: 1,
        username: 'testuser',
        email: 'test@test.com',
        totalTasks: 5,
        completedTasks: 3,
        pendingTasks: 2,
        taskTypeCount: 2,
      };

      service.getUserById(1).subscribe((result) => {
        expect(result).toEqual(mockUser);
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/api/admin/users/1`);
      expect(req.request.method).toBe('GET');
      req.flush(mockUser);
    });
  });

  describe('getUserTasks', () => {
    it('should fetch user tasks with params', () => {
      const mockTasks = {
        content: [
          {
            id: 1,
            titulo: 'Task 1',
            descripcion: null,
            fecha: null,
            completada: true,
            urgencia: 'alta',
            tipoTareaId: 1,
            tipoTareaNombre: 'Trabajo',
            tipoTareaColor: '#FF0000',
          },
        ],
        page: 0,
        size: 20,
        totalElements: 1,
        totalPages: 1,
        first: true,
        last: true,
      };

      service.getUserTasks(1, { page: 0, size: 20 }).subscribe((result) => {
        expect(result).toEqual(mockTasks);
      });

      const req = httpMock.expectOne(
        (r) => r.url === `${environment.apiUrl}/api/admin/users/1/tasks`,
      );
      expect(req.request.method).toBe('GET');
      expect(req.request.params.get('page')).toBe('0');
      expect(req.request.params.get('size')).toBe('20');
      req.flush(mockTasks);
    });
  });
});
