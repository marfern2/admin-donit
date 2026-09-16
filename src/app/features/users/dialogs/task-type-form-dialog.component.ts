import { Component, inject, signal, OnInit } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

export interface TaskTypeFormDialogData {
  nombre?: string;
  descripcion?: string | null;
  color?: string;
  isEdit: boolean;
}

@Component({
  selector: 'app-task-type-form-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <h2 mat-dialog-title>{{ data.isEdit ? 'Editar tipo de tarea' : 'Crear tipo de tarea' }}</h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="dialog-form">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Nombre</mat-label>
          <input matInput formControlName="nombre" maxlength="50" aria-label="Nombre" />
          @if (form.get('nombre')!.hasError('required')) {
            <mat-error>El nombre es obligatorio.</mat-error>
          }
          @if (form.get('nombre')!.hasError('minlength')) {
            <mat-error>Mínimo 2 caracteres.</mat-error>
          }
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Descripción</mat-label>
          <textarea matInput formControlName="descripcion" maxlength="500" rows="3" aria-label="Descripción"></textarea>
        </mat-form-field>

        <div class="color-field">
          <label class="info-label" for="task-type-color">Color</label>
          <input
            id="task-type-color"
            type="color"
            formControlName="color"
            class="color-input"
            aria-label="Color"
          />
        </div>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close aria-label="Cancelar">Cancelar</button>
      <button
        mat-flat-button
        color="primary"
        [disabled]="form.invalid || saving()"
        (click)="onSubmit()"
        [attr.aria-label]="data.isEdit ? 'Actualizar tipo' : 'Crear tipo'"
      >
        @if (saving()) {
          <mat-spinner diameter="18"></mat-spinner>
        } @else {
          {{ data.isEdit ? 'Actualizar' : 'Crear' }}
        }
      </button>
    </mat-dialog-actions>
  `,
  styles: `
    .dialog-form {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .full-width {
      width: 100%;
    }
    .color-field {
      display: flex;
      flex-direction: column;
      gap: 4px;
      margin-top: 8px;
    }
    .color-input {
      width: 60px;
      height: 40px;
      border: 1px solid #ccc;
      border-radius: 4px;
      cursor: pointer;
      padding: 2px;
    }
  `,
})
export class TaskTypeFormDialogComponent implements OnInit {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly dialogRef = inject(MatDialogRef<TaskTypeFormDialogComponent>);
  readonly data = inject<TaskTypeFormDialogData>(MAT_DIALOG_DATA);

  readonly saving = signal(false);

  readonly form = this.fb.group({
    nombre: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
    descripcion: [''],
    color: ['#3f51b5', Validators.required],
  });

  ngOnInit(): void {
    if (this.data.isEdit) {
      this.form.patchValue({
        nombre: this.data.nombre ?? '',
        descripcion: this.data.descripcion ?? '',
        color: this.data.color ?? '#3f51b5',
      });
    }
  }

  onSubmit(): void {
    if (this.form.invalid) return;
    this.saving.set(true);
    this.dialogRef.close(this.form.getRawValue());
  }
}
