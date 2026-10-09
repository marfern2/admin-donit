import { Component, inject } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators, AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { DemoKind, DemoTask, DemoTaskType, DemoUser } from './demo-admin.model';

export interface DemoEditorData {
  kind: DemoKind;
  entity?: DemoUser | DemoTaskType | DemoTask;
  users: DemoUser[];
  types: DemoTaskType[];
}

const forbiddenText = /[<>]|https?:\/\/|www\.|&(?:#\d+|[a-z]+);|javascript:|\b[a-z0-9-]+(?:\.[a-z0-9-]+)+(?::\d+)?(?:\/\S*)?/i;
function demoText(min: number, max: number): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (control.value === null || control.value === undefined) return min > 0 ? { required: true } : null;
    const text = String(control.value).trim();
    return text.length < min || text.length > max || forbiddenText.test(text) || /[\u0000-\u001f\u007f]/.test(text) ? { demoText: true } : null;
  };
}

@Component({
  selector: 'app-demo-editor-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, MatDialogModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>{{ data.entity ? 'Editar' : 'Crear' }} {{ label }}</h2>
    <mat-dialog-content>
      <form class="demo-form" [formGroup]="form" id="demo-editor-form" (ngSubmit)="save()">
        @if (data.kind === 'users') {
          <label>Handle <input formControlName="handle" maxlength="40" autocomplete="off" required aria-describedby="handle-help"></label>
          <small id="handle-help">3–40 caracteres: letras minúsculas, números, guion o guion bajo.</small>
          @if (form.controls['handle'].invalid && form.controls['handle'].touched) { <small class="demo-form-error">Introduce un handle válido.</small> }
          <label>Nombre visible <input formControlName="displayName" maxlength="80" required></label>
          @if (form.controls['displayName'].invalid && form.controls['displayName'].touched) { <small class="demo-form-error">Debe tener entre 2 y 80 caracteres.</small> }
          <label>Biografía <textarea formControlName="bio" maxlength="500"></textarea></label>
        }
        @if (data.kind === 'task-types') {
          <label>Usuario <select formControlName="demoUserId" required><option value="">Selecciona un usuario</option>@for (u of data.users; track u.id) { <option [value]="u.id">{{ u.displayName }} ({{ u.handle }})</option> }</select></label>
          <label>Nombre <input formControlName="name" minlength="2" maxlength="50" required></label>
          <label>Descripción <textarea formControlName="description" maxlength="500"></textarea></label>
          <label>Color <input formControlName="color" type="text" placeholder="#4F46E5" pattern="#[0-9a-fA-F]{6}" required></label>
        }
        @if (data.kind === 'tasks') {
          <label>Usuario <select formControlName="demoUserId" (change)="userChanged()" required><option value="">Selecciona un usuario</option>@for (u of data.users; track u.id) { <option [value]="u.id">{{ u.displayName }} ({{ u.handle }})</option> }</select></label>
          <label>Tipo <select formControlName="demoTaskTypeId" required><option value="">Selecciona un tipo</option>@for (t of availableTypes; track t.id) { <option [value]="t.id">{{ t.name }}</option> }</select></label>
          <label>Título <input formControlName="title" minlength="3" maxlength="100" required></label>
          <label>Descripción <textarea formControlName="description" maxlength="500"></textarea></label>
          <label>Fecha <input formControlName="dueDate" type="date" required></label>
          <label>Urgencia <select formControlName="urgency" required><option [value]="0">Baja</option><option [value]="1">Media</option><option [value]="2">Alta</option></select></label>
          <label class="demo-check"><input formControlName="completed" type="checkbox"> Completada</label>
        }
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end"><button mat-button type="button" mat-dialog-close>Cancelar</button><button mat-flat-button form="demo-editor-form" type="submit" [disabled]="form.invalid">Guardar</button></mat-dialog-actions>
  `,
})
export class DemoEditorDialogComponent {
  readonly data = inject<DemoEditorData>(MAT_DIALOG_DATA);
  private readonly dialog = inject(MatDialogRef<DemoEditorDialogComponent>);
  private readonly fb = inject(FormBuilder);
  readonly label = this.data.kind === 'users' ? 'usuario' : this.data.kind === 'task-types' ? 'tipo' : 'tarea';
  readonly form = this.fb.group({
    handle: ['', [Validators.required, Validators.pattern(/^[a-zA-Z0-9][a-zA-Z0-9_-]{2,39}$/)]],
    displayName: ['', demoText(2, 80)],
    bio: ['', demoText(0, 500)],
    demoUserId: ['', Validators.required],
    name: ['', demoText(2, 50)],
    description: ['', demoText(0, 500)],
    color: ['', [Validators.required, Validators.pattern(/^#[0-9a-fA-F]{6}$/)]],
    demoTaskTypeId: ['', Validators.required],
    title: ['', demoText(3, 100)],
    dueDate: ['', [Validators.required, Validators.pattern(/^\d{4}-\d{2}-\d{2}$/)]],
    completed: [false],
    urgency: [0, [Validators.required, Validators.min(0), Validators.max(2)]],
  });

  constructor() {
    const entity = this.data.entity;
    if (entity) this.form.patchValue(entity as never);
    const used = this.data.kind === 'users' ? ['handle', 'displayName', 'bio']
      : this.data.kind === 'task-types' ? ['demoUserId', 'name', 'description', 'color']
      : ['demoUserId', 'demoTaskTypeId', 'title', 'description', 'dueDate', 'completed', 'urgency'];
    for (const key of Object.keys(this.form.controls)) if (!used.includes(key)) this.form.get(key)?.disable();
    if (entity && this.data.kind !== 'users') {
      this.form.controls.demoUserId.disable();
      if (this.data.kind === 'tasks') this.form.controls.demoTaskTypeId.disable();
    }
  }

  get availableTypes(): DemoTaskType[] {
    const userId = Number(this.form.controls.demoUserId.value);
    return this.data.types.filter(t => t.demoUserId === userId);
  }

  userChanged(): void {
    const typeId = Number(this.form.controls.demoTaskTypeId.value);
    if (!this.availableTypes.some(t => t.id === typeId)) this.form.controls.demoTaskTypeId.setValue('');
  }

  save(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    const value = this.form.getRawValue();
    if (this.data.kind === 'users') this.dialog.close({ handle: value.handle!.trim().toLowerCase(), displayName: value.displayName!.trim(), bio: this.optionalText(value.bio) });
    if (this.data.kind === 'task-types') this.dialog.close({ demoUserId: Number(value.demoUserId), name: value.name!.trim(), description: this.optionalText(value.description), color: value.color });
    if (this.data.kind === 'tasks') {
      if (!this.availableTypes.some(t => t.id === Number(value.demoTaskTypeId))) return;
      this.dialog.close({ demoUserId: Number(value.demoUserId), demoTaskTypeId: Number(value.demoTaskTypeId), title: value.title!.trim(), description: this.optionalText(value.description), dueDate: value.dueDate, completed: !!value.completed, urgency: Number(value.urgency) });
    }
  }

  private optionalText(value: string | null | undefined): string | null {
    const trimmed = value?.trim() ?? '';
    return trimmed || (this.data.entity ? '' : null);
  }
}
