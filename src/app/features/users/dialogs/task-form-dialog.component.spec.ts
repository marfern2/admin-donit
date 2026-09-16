import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { TaskFormDialogComponent, TaskFormDialogData } from './task-form-dialog.component';

describe('TaskFormDialogComponent', () => {
  let component: TaskFormDialogComponent;
  let fixture: ComponentFixture<TaskFormDialogComponent>;
  let dialogRefSpy: { close: ReturnType<typeof vi.fn> };

  const mockTaskTypes = [
    { id: 1, nombre: 'Trabajo', descripcion: null, color: '#FF0000', taskCount: 3 },
    { id: 2, nombre: 'Personal', descripcion: null, color: '#00FF00', taskCount: 0 },
  ];

  function createComponent(data: TaskFormDialogData) {
    dialogRefSpy = { close: vi.fn() };

    TestBed.configureTestingModule({
      imports: [TaskFormDialogComponent, NoopAnimationsModule],
      providers: [
        { provide: MatDialogRef, useValue: dialogRefSpy },
        { provide: MAT_DIALOG_DATA, useValue: data },
      ],
    });

    fixture = TestBed.createComponent(TaskFormDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  describe('create mode', () => {
    beforeEach(() => {
      createComponent({ taskTypes: mockTaskTypes, isEdit: false });
    });

    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should have empty default values', () => {
      expect(component.form.get('titulo')?.value).toBe('');
      expect(component.form.get('fecha')?.value).toBe('');
      expect(component.form.get('completada')?.value).toBeFalsy();
      expect(component.form.get('urgencia')?.value).toBe(0);
    });

    it('should require titulo', () => {
      component.form.get('titulo')?.setValue('');
      expect(component.form.get('titulo')?.valid).toBeFalsy();
    });

    it('should require titulo min length 3', () => {
      component.form.get('titulo')?.setValue('ab');
      expect(component.form.get('titulo')?.valid).toBeFalsy();
    });

    it('should require fecha', () => {
      component.form.get('fecha')?.setValue('');
      expect(component.form.get('fecha')?.valid).toBeFalsy();
    });

    it('should be valid with correct data', () => {
      component.form.patchValue({
        titulo: 'Nueva tarea',
        fecha: '2024-01-01',
        tipoTareaId: 1,
      });
      expect(component.form.valid).toBeTruthy();
    });

    it('should render create title', () => {
      const el: HTMLElement = fixture.nativeElement;
      expect(el.textContent).toContain('Crear tarea');
    });

    it('should close with data on valid submit', () => {
      component.form.patchValue({
        titulo: 'Nueva tarea',
        descripcion: 'Desc',
        fecha: '2024-01-01',
        completada: false,
        urgencia: 1,
        tipoTareaId: 1,
      });
      component.onSubmit();
      expect(dialogRefSpy.close).toHaveBeenCalledWith(
        expect.objectContaining({
          titulo: 'Nueva tarea',
          fecha: '2024-01-01',
          tipoTareaId: 1,
        }),
      );
    });

    it('should not close dialog when form is invalid', () => {
      component.onSubmit();
      expect(dialogRefSpy.close).not.toHaveBeenCalled();
    });
  });

  describe('edit mode', () => {
    it('should prefill form with task data', () => {
      createComponent({
        titulo: 'Existing',
        descripcion: 'Desc',
        fecha: '2024-06-15',
        completada: true,
        urgencia: 2,
        tipoTareaId: 1,
        taskTypes: mockTaskTypes,
        isEdit: true,
      });

      expect(component.form.get('titulo')?.value).toBe('Existing');
      expect(component.form.get('descripcion')?.value).toBe('Desc');
      expect(component.form.get('fecha')?.value).toBe('2024-06-15');
      expect(component.form.get('completada')?.value).toBeTruthy();
      expect(component.form.get('urgencia')?.value).toBe(2);
      expect(component.form.get('tipoTareaId')?.value).toBe(1);
    });

    it('should render edit title', () => {
      createComponent({
        titulo: 'Task',
        taskTypes: mockTaskTypes,
        isEdit: true,
      });
      const el: HTMLElement = fixture.nativeElement;
      expect(el.textContent).toContain('Editar tarea');
    });
  });
});
