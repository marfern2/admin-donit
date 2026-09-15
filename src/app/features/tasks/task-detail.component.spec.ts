import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { TaskDetailComponent } from './task-detail.component';
import { environment } from '../../../environments/environment';

describe('TaskDetailComponent', () => {
  let component: TaskDetailComponent;
  let fixture: ComponentFixture<TaskDetailComponent>;
  let httpMock: HttpTestingController;

  const apiUrl = `${environment.apiUrl}/api/admin/tasks`;

  const mockTask = {
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
      imports: [TaskDetailComponent, NoopAnimationsModule],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: ActivatedRoute, useValue: mockActivatedRoute },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TaskDetailComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should create', () => {
    fixture.detectChanges();
    const req = httpMock.expectOne(`${apiUrl}/1`);
    req.flush(mockTask);
    expect(component).toBeTruthy();
  });

  it('should load task on init', () => {
    fixture.detectChanges();
    const req = httpMock.expectOne(`${apiUrl}/1`);
    req.flush(mockTask);

    expect(component.task()?.titulo).toBe('Task 1');
    expect(component.task()?.usuarioUsername).toBe('user1');
    expect(component.loading()).toBeFalsy();
  });

  it('should handle error', () => {
    fixture.detectChanges();
    const req = httpMock.expectOne(`${apiUrl}/1`);
    req.flush('Error', { status: 404, statusText: 'Not Found' });

    expect(component.error()).toBe('No se pudo cargar la tarea.');
    expect(component.loading()).toBeFalsy();
  });

  it('should format completada null as Pendiente', () => {
    fixture.detectChanges();
    const req = httpMock.expectOne(`${apiUrl}/1`);
    req.flush({ ...mockTask, completada: null });

    expect(component.formatStatus(null)).toBe('Pendiente');
    expect(component.formatStatus(false)).toBe('Pendiente');
    expect(component.formatStatus(true)).toBe('Completada');
  });

  it('should format tipoTareaNombre null as Sin tipo', () => {
    fixture.detectChanges();
    const req = httpMock.expectOne(`${apiUrl}/1`);
    req.flush(mockTask);

    expect(component.formatTipo(null)).toBe('Sin tipo');
    expect(component.formatTipo('Trabajo')).toBe('Trabajo');
  });

  it('should format fecha null as -', () => {
    fixture.detectChanges();
    const req = httpMock.expectOne(`${apiUrl}/1`);
    req.flush(mockTask);

    expect(component.formatFecha(null)).toBe('-');
    expect(component.formatFecha('2024-01-01')).toBe('2024-01-01');
  });

  it('should format descripcion null as -', () => {
    fixture.detectChanges();
    const req = httpMock.expectOne(`${apiUrl}/1`);
    req.flush(mockTask);

    expect(component.formatDescripcion(null)).toBe('-');
    expect(component.formatDescripcion('Some desc')).toBe('Some desc');
  });

  it('should format urgencia null as -', () => {
    fixture.detectChanges();
    const req = httpMock.expectOne(`${apiUrl}/1`);
    req.flush(mockTask);

    expect(component.formatUrgencia(null)).toBe('-');
    expect(component.formatUrgencia('alta')).toBe('alta');
  });
});
