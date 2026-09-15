import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { TaskTypeDetailComponent } from './task-type-detail.component';
import { environment } from '../../../environments/environment';

describe('TaskTypeDetailComponent', () => {
  let component: TaskTypeDetailComponent;
  let fixture: ComponentFixture<TaskTypeDetailComponent>;
  let httpMock: HttpTestingController;

  const apiUrl = `${environment.apiUrl}/api/admin/task-types`;

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

  const mockActivatedRoute = {
    snapshot: {
      paramMap: {
        get: (key: string) => (key === 'id' ? '1' : null),
      },
    },
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TaskTypeDetailComponent, NoopAnimationsModule],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: ActivatedRoute, useValue: mockActivatedRoute },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TaskTypeDetailComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should create', () => {
    fixture.detectChanges();
    const req = httpMock.expectOne(`${apiUrl}/1`);
    req.flush(mockTaskType);
    expect(component).toBeTruthy();
  });

  it('should load task type on init', () => {
    fixture.detectChanges();
    const req = httpMock.expectOne(`${apiUrl}/1`);
    req.flush(mockTaskType);

    expect(component.taskType()?.nombre).toBe('Trabajo');
    expect(component.taskType()?.usuarioUsername).toBe('admin');
    expect(component.loading()).toBeFalsy();
  });

  it('should handle error', () => {
    fixture.detectChanges();
    const req = httpMock.expectOne(`${apiUrl}/1`);
    req.flush('Error', { status: 404, statusText: 'Not Found' });

    expect(component.error()).toBe('No se pudo cargar el tipo de tarea.');
    expect(component.loading()).toBeFalsy();
  });

  it('should format descripcion null as -', () => {
    fixture.detectChanges();
    const req = httpMock.expectOne(`${apiUrl}/1`);
    req.flush(mockTaskType);

    expect(component.formatDescripcion(null)).toBe('-');
    expect(component.formatDescripcion('Some desc')).toBe('Some desc');
  });

  it('should format color null as -', () => {
    fixture.detectChanges();
    const req = httpMock.expectOne(`${apiUrl}/1`);
    req.flush(mockTaskType);

    expect(component.formatColor(null)).toBe('-');
    expect(component.formatColor('#FF0000')).toBe('#FF0000');
  });

  it('should have correct user data', () => {
    fixture.detectChanges();
    const req = httpMock.expectOne(`${apiUrl}/1`);
    req.flush(mockTaskType);

    expect(component.taskType()?.usuarioId).toBe(1);
    expect(component.taskType()?.usuarioUsername).toBe('admin');
    expect(component.taskType()?.usuarioEmail).toBe('admin@test.com');
  });

  it('should handle null fields in detail', () => {
    const mockNullTaskType = {
      id: 2,
      nombre: 'Personal',
      descripcion: null,
      color: null,
      usuarioId: 1,
      usuarioUsername: 'admin',
      usuarioEmail: 'admin@test.com',
      taskCount: 0,
    };

    fixture.detectChanges();
    const req = httpMock.expectOne(`${apiUrl}/1`);
    req.flush(mockNullTaskType);

    expect(component.taskType()?.descripcion).toBeNull();
    expect(component.taskType()?.color).toBeNull();
    expect(component.formatDescripcion(component.taskType()!.descripcion)).toBe('-');
    expect(component.formatColor(component.taskType()!.color)).toBe('-');
  });
});
