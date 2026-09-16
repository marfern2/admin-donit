import { Component, inject, signal, OnInit } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AdminUserTaskTypeSummary } from '../models/admin-user.model';

export interface TaskFormDialogData {
  titulo?: string;
  descripcion?: string | null;
  fecha?: string;
  completada?: boolean;
  urgencia?: number;
  tipoTareaId?: number;
  taskTypes: AdminUserTaskTypeSummary[];
  isEdit: boolean;
}

@Component({
  selector: 'app-task-form-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCheckboxModule,
    MatButtonModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <h2 mat-dialog-title>{{ data.isEdit ? 'Editar tarea' : 'Crear tarea' }}</h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="dialog-form">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Título</mat-label>
          <input matInput formControlName="titulo" maxlength="100" aria-label="Título" />
          @if (form.get('titulo')!.hasError('required')) {
            <mat-error>El título es obligatorio.</mat-error>
          }
          @if (form.get('titulo')!.hasError('minlength')) {
            <mat-error>Mínimo 3 caracteres.</mat-error>
          }
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Descripción</mat-label>
          <textarea matInput formControlName="descripcion" maxlength="500" rows="3" aria-label="Descripción"></textarea>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Fecha</mat-label>
          <input matInput formControlName="fecha" type="date" aria-label="Fecha" />
          @if (form.get('fecha')!.hasError('required')) {
            <mat-error>La fecha es obligatoria.</mat-error>
          }
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Urgencia</mat-label>
          <mat-select formControlName="urgencia" aria-label="Urgencia">
            <mat-option [value]="0">0</mat-option>
            <mat-option [value]="1">1</mat-option>
            <mat-option [value]="2">2</mat-option>
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Tipo de tarea</mat-label>
          <mat-select formControlName="tipoTareaId" aria-label="Tipo de tarea">
            @for (type of data.taskTypes; track type.id) {
              <mat-option [value]="type.id">{{ type.nombre }}</mat-option>
            }
          </mat-select>
          @if (form.get('tipoTareaId')!.hasError('required')) {
            <mat-error>El tipo de tarea es obligatorio.</mat-error>
          }
        </mat-form-field>

        <mat-checkbox formControlName="completada" aria-label="Completada">
          Completada
        </mat-checkbox>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close aria-label="Cancelar">Cancelar</button>
      <button
        mat-flat-button
        color="primary"
        [disabled]="form.invalid || saving()"
        (click)="onSubmit()"
        [attr.aria-label]="data.isEdit ? 'Actualizar tarea' : 'Crear tarea'"
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
  `,
})
export class TaskFormDialogComponent implements OnInit {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly dialogRef = inject(MatDialogRef<TaskFormDialogComponent>);
  readonly data = inject<TaskFormDialogData>(MAT_DIALOG_DATA);

  readonly saving = signal(false);

  readonly form = this.fb.group({
    titulo: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(100)]],
    descripcion: [''],
    fecha: ['', Validators.required],
    completada: [false],
    urgencia: [0, Validators.required],
    tipoTareaId: [0, Validators.required],
  });

  ngOnInit(): void {
    if (this.data.isEdit) {
      this.form.patchValue({
        titulo: this.data.titulo ?? '',
        descripcion: this.data.descripcion ?? '',
        fecha: this.data.fecha ?? '',
        completada: this.data.completada ?? false,
        urgencia: this.data.urgencia ?? 0,
        tipoTareaId: this.data.tipoTareaId ?? 0,
      });
    }
  }

  onSubmit(): void {
    if (this.form.invalid) return;
    this.saving.set(true);
    this.dialogRef.close(this.form.getRawValue());
  }
}
