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
        enabled: true,
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

  describe('updateUser', () => {
    it('should patch user data', () => {
      const body = { username: 'newname', email: 'new@test.com' };
      const mockResponse = { id: 1, ...body, enabled: true, totalTasks: 0, completedTasks: 0, pendingTasks: 0, taskTypeCount: 0 };

      service.updateUser(1, body).subscribe((result) => {
        expect(result).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/api/admin/users/1`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual(body);
      req.flush(mockResponse);
    });
  });

  describe('setUserEnabled', () => {
    it('should patch user enabled status', () => {
      const mockResponse = { id: 1, username: 'test', email: 't@t.com', enabled: false, totalTasks: 0, completedTasks: 0, pendingTasks: 0, taskTypeCount: 0 };

      service.setUserEnabled(1, false).subscribe((result) => {
        expect(result.enabled).toBeFalsy();
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/api/admin/users/1/enabled`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual({ enabled: false });
      req.flush(mockResponse);
    });
  });

  describe('deleteUser', () => {
    it('should delete user', () => {
      service.deleteUser(1).subscribe();

      const req = httpMock.expectOne(`${environment.apiUrl}/api/admin/users/1`);
      expect(req.request.method).toBe('DELETE');
      req.flush(null);
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
            urgencia: 0,
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

  describe('createTask', () => {
    it('should create a task', () => {
      const body = {
        titulo: 'New Task',
        descripcion: 'Desc',
        fecha: '2024-01-01',
        completada: false,
        urgencia: 1,
        tipoTareaId: 1,
      };
      const mockResponse = { id: 10, ...body, tipoTareaNombre: 'Trabajo', tipoTareaColor: '#FF0000' };

      service.createTask(1, body).subscribe((result) => {
        expect(result).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/api/admin/users/1/tasks`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(body);
      req.flush(mockResponse);
    });
  });

  describe('updateTask', () => {
    it('should patch task', () => {
      const body = { titulo: 'Updated' };
      const mockResponse = { id: 1, titulo: 'Updated', descripcion: null, fecha: null, completada: false, urgencia: 0, tipoTareaNombre: 'Trabajo', tipoTareaColor: '#FF0000' };

      service.updateTask(1, 1, body).subscribe((result) => {
        expect(result.titulo).toBe('Updated');
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/api/admin/users/1/tasks/1`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual(body);
      req.flush(mockResponse);
    });
  });

  describe('deleteTask', () => {
    it('should delete task', () => {
      service.deleteTask(1, 1).subscribe();

      const req = httpMock.expectOne(`${environment.apiUrl}/api/admin/users/1/tasks/1`);
      expect(req.request.method).toBe('DELETE');
      req.flush(null);
    });
  });

  describe('getUserTaskTypes', () => {
    it('should fetch user task types', () => {
      const mockTypes = {
        content: [{ id: 1, nombre: 'Trabajo', descripcion: null, color: '#FF0000', taskCount: 3 }],
        page: 0,
        size: 20,
        totalElements: 1,
        totalPages: 1,
        first: true,
        last: true,
      };

      service.getUserTaskTypes(1, { page: 0, size: 20 }).subscribe((result) => {
        expect(result).toEqual(mockTypes);
      });

      const req = httpMock.expectOne(
        (r) => r.url === `${environment.apiUrl}/api/admin/users/1/task-types`,
      );
      expect(req.request.method).toBe('GET');
      req.flush(mockTypes);
    });
  });

  describe('createTaskType', () => {
    it('should create a task type', () => {
      const body = { nombre: 'Nuevo', descripcion: null, color: '#00FF00' };
      const mockResponse = { id: 10, ...body, taskCount: 0 };

      service.createTaskType(1, body).subscribe((result) => {
        expect(result).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/api/admin/users/1/task-types`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(body);
      req.flush(mockResponse);
    });
  });

  describe('updateTaskType', () => {
    it('should patch task type', () => {
      const body = { nombre: 'Updated Type' };
      const mockResponse = { id: 1, ...body, descripcion: null, color: '#FF0000', taskCount: 0 };

      service.updateTaskType(1, 1, body).subscribe((result) => {
        expect(result.nombre).toBe('Updated Type');
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/api/admin/users/1/task-types/1`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual(body);
      req.flush(mockResponse);
    });
  });

  describe('deleteTaskType', () => {
    it('should delete task type', () => {
      service.deleteTaskType(1, 1).subscribe();

      const req = httpMock.expectOne(`${environment.apiUrl}/api/admin/users/1/task-types/1`);
      expect(req.request.method).toBe('DELETE');
      req.flush(null);
    });
  });
});
