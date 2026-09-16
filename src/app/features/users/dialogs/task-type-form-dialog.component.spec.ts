import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import {
  TaskTypeFormDialogComponent,
  TaskTypeFormDialogData,
} from './task-type-form-dialog.component';

describe('TaskTypeFormDialogComponent', () => {
  let component: TaskTypeFormDialogComponent;
  let fixture: ComponentFixture<TaskTypeFormDialogComponent>;

  function createComponent(data: TaskTypeFormDialogData) {
    TestBed.configureTestingModule({
      imports: [TaskTypeFormDialogComponent, NoopAnimationsModule],
      providers: [
        { provide: MatDialogRef, useValue: { close: vi.fn() } },
        { provide: MAT_DIALOG_DATA, useValue: data },
      ],
    });

    fixture = TestBed.createComponent(TaskTypeFormDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  describe('create mode', () => {
    beforeEach(() => {
      createComponent({ isEdit: false });
    });

    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should have default color', () => {
      expect(component.form.get('color')?.value).toBe('#3f51b5');
    });

    it('should require nombre', () => {
      component.form.get('nombre')?.setValue('');
      expect(component.form.get('nombre')?.valid).toBeFalsy();
    });

    it('should require nombre min length 2', () => {
      component.form.get('nombre')?.setValue('a');
      expect(component.form.get('nombre')?.valid).toBeFalsy();
    });

    it('should accept valid nombre', () => {
      component.form.get('nombre')?.setValue('Trabajo');
      expect(component.form.get('nombre')?.valid).toBeTruthy();
    });

    it('should accept valid color format', () => {
      component.form.get('color')?.setValue('#FF0000');
      expect(component.form.get('color')?.value).toBe('#FF0000');
    });

    it('should be valid with correct data', () => {
      component.form.patchValue({
        nombre: 'Nuevo tipo',
        color: '#00FF00',
      });
      expect(component.form.valid).toBeTruthy();
    });

    it('should render create title', () => {
      const el: HTMLElement = fixture.nativeElement;
      expect(el.textContent).toContain('Crear tipo de tarea');
    });

    it('should close with data on valid submit', () => {
      const dialogRef = TestBed.inject(MatDialogRef);
      component.form.patchValue({
        nombre: 'Nuevo tipo',
        descripcion: 'Desc',
        color: '#FF0000',
      });
      component.onSubmit();
      expect(dialogRef.close).toHaveBeenCalledWith({
        nombre: 'Nuevo tipo',
        descripcion: 'Desc',
        color: '#FF0000',
      });
    });

    it('should not close dialog when form is invalid', () => {
      const dialogRef = TestBed.inject(MatDialogRef);
      component.onSubmit();
      expect(dialogRef.close).not.toHaveBeenCalled();
    });
  });

  describe('edit mode', () => {
    it('should prefill form with type data', () => {
      createComponent({
        nombre: 'Trabajo',
        descripcion: 'Tipo de trabajo',
        color: '#FF0000',
        isEdit: true,
      });

      expect(component.form.get('nombre')?.value).toBe('Trabajo');
      expect(component.form.get('descripcion')?.value).toBe('Tipo de trabajo');
      expect(component.form.get('color')?.value).toBe('#FF0000');
    });

    it('should render edit title', () => {
      createComponent({
        nombre: 'Tipo',
        isEdit: true,
      });
      const el: HTMLElement = fixture.nativeElement;
      expect(el.textContent).toContain('Editar tipo de tarea');
    });
  });
});
