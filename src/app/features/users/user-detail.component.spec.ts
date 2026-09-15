import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
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
        urgencia: 'alta',
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

  const mockActivatedRoute = {
    snapshot: {
      paramMap: {
        get: (key: string) => (key === 'id' ? '1' : null),
      },
    },
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserDetailComponent, NoopAnimationsModule],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: ActivatedRoute, useValue: mockActivatedRoute },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(UserDetailComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  function flushInitRequests() {
    const userReq = httpMock.expectOne(`${apiUrl}/1`);
    const tasksReq = httpMock.expectOne((r) => r.url === `${apiUrl}/1/tasks`);
    return { userReq, tasksReq };
  }

  it('should create', () => {
    fixture.detectChanges();
    const { userReq, tasksReq } = flushInitRequests();
    userReq.flush(mockUser);
    tasksReq.flush(mockTasksResponse);
    expect(component).toBeTruthy();
  });

  it('should load user on init', () => {
    fixture.detectChanges();
    const { userReq, tasksReq } = flushInitRequests();
    userReq.flush(mockUser);
    tasksReq.flush(mockTasksResponse);

    expect(component.user()?.username).toBe('testuser');
    expect(component.user()?.email).toBe('test@test.com');
    expect(component.userLoading()).toBeFalsy();
  });

  it('should load tasks on init', () => {
    fixture.detectChanges();
    const { userReq, tasksReq } = flushInitRequests();
    userReq.flush(mockUser);
    tasksReq.flush(mockTasksResponse);

    expect(component.tasks().length).toBe(2);
    expect(component.tasksTotal()).toBe(2);
    expect(component.tasksLoading()).toBeFalsy();
  });

  it('should handle user error', () => {
    fixture.detectChanges();
    const { userReq, tasksReq } = flushInitRequests();
    userReq.flush('Error', { status: 404, statusText: 'Not Found' });
    tasksReq.flush(mockTasksResponse);

    expect(component.userError()).toBe('No se pudo cargar el usuario.');
    expect(component.userLoading()).toBeFalsy();
  });

  it('should handle tasks error', () => {
    fixture.detectChanges();
    const { userReq, tasksReq } = flushInitRequests();
    userReq.flush(mockUser);
    tasksReq.flush('Error', { status: 500, statusText: 'Server Error' });

    expect(component.tasksError()).toBe('No se pudieron cargar las tareas.');
    expect(component.tasksLoading()).toBeFalsy();
  });

  it('should format task status correctly', () => {
    fixture.detectChanges();
    const { userReq, tasksReq } = flushInitRequests();
    userReq.flush(mockUser);
    tasksReq.flush(mockTasksResponse);

    expect(component.formatTaskStatus(true)).toBe('Completada');
    expect(component.formatTaskStatus(false)).toBe('Pendiente');
    expect(component.formatTaskStatus(null)).toBe('Pendiente');
  });

  it('should format task type correctly', () => {
    fixture.detectChanges();
    const { userReq, tasksReq } = flushInitRequests();
    userReq.flush(mockUser);
    tasksReq.flush(mockTasksResponse);

    expect(component.formatTaskType('Trabajo')).toBe('Trabajo');
    expect(component.formatTaskType(null)).toBe('Sin tipo');
  });

  it('should format fecha correctly', () => {
    fixture.detectChanges();
    const { userReq, tasksReq } = flushInitRequests();
    userReq.flush(mockUser);
    tasksReq.flush(mockTasksResponse);

    expect(component.formatFecha('2024-01-01')).toBe('2024-01-01');
    expect(component.formatFecha(null)).toBe('-');
  });

  it('should handle tasks pagination', () => {
    fixture.detectChanges();
    const { userReq, tasksReq } = flushInitRequests();
    userReq.flush(mockUser);
    tasksReq.flush(mockTasksResponse);

    component.onTasksPageChange({ pageIndex: 1, pageSize: 10, length: 50 });

    expect(component.tasksPage()).toBe(1);
    expect(component.tasksSize()).toBe(10);

    const tasksReq2 = httpMock.expectOne((r) => r.url === `${apiUrl}/1/tasks`);
    expect(tasksReq2.request.params.get('page')).toBe('1');
    expect(tasksReq2.request.params.get('size')).toBe('10');
    tasksReq2.flush({ ...mockTasksResponse, content: [] });
  });
});
