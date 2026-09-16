import { Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

export interface EditUserData {
  username: string;
  email: string;
}

@Component({
  selector: 'app-edit-user-dialog',
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
    <h2 mat-dialog-title>Editar usuario</h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="dialog-form">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Nombre de usuario</mat-label>
          <input matInput formControlName="username" aria-label="Nombre de usuario" />
          @if (form.get('username')!.hasError('required')) {
            <mat-error>El nombre de usuario es obligatorio.</mat-error>
          }
          @if (form.get('username')!.hasError('minlength')) {
            <mat-error>Mínimo 3 caracteres.</mat-error>
          }
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Email</mat-label>
          <input matInput formControlName="email" type="email" aria-label="Email" />
          @if (form.get('email')!.hasError('required')) {
            <mat-error>El email es obligatorio.</mat-error>
          }
          @if (form.get('email')!.hasError('email')) {
            <mat-error>Introduce un email válido.</mat-error>
          }
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close aria-label="Cancelar">Cancelar</button>
      <button
        mat-flat-button
        color="primary"
        [disabled]="form.invalid || saving()"
        (click)="onSubmit()"
        aria-label="Guardar cambios"
      >
        @if (saving()) {
          <mat-spinner diameter="18"></mat-spinner>
        } @else {
          Guardar
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
export class EditUserDialogComponent {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly dialogRef = inject(MatDialogRef<EditUserDialogComponent>);
  readonly data = inject<EditUserData>(MAT_DIALOG_DATA);

  readonly saving = signal(false);

  readonly form = this.fb.group({
    username: [this.data.username, [Validators.required, Validators.minLength(3)]],
    email: [this.data.email, [Validators.required, Validators.email]],
  });

  onSubmit(): void {
    if (this.form.invalid) return;
    this.saving.set(true);
    this.dialogRef.close(this.form.getRawValue());
  }
}
