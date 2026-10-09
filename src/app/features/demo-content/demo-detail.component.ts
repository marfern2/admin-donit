import { Component, DestroyRef, effect, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DemoAdminApiService } from './demo-admin-api.service';
import { DemoKind, DemoPage, DemoTask, DemoTaskType, DemoUser, DemoUserWrite, DemoTypeWrite, DemoTaskWrite, Versioned } from './demo-admin.model';
import { DemoEditorDialogComponent } from './demo-editor-dialog.component';
import { DemoPermissionsService } from '../../core/auth/demo-permissions.service';
import { demoError } from './demo-error';

type Row = DemoUser | DemoTaskType | DemoTask;

@Component({
  selector: 'app-demo-detail', standalone: true,
  imports: [RouterLink, MatButtonModule],
  template: `
  <section class="demo-page" aria-labelledby="detail-title">
    <a [routerLink]="['/demo-content', kind]" class="demo-back">← {{ plural }}</a>
    @if (loading()) { <div class="demo-card demo-skeleton" aria-label="Cargando detalle"></div> }
    @if (error()) { <div class="error-banner" role="alert">{{ error() }} @if (reloadNeeded()) { <button type="button" (click)="load()">Recargar datos</button> }</div> }
    @if (permissions.canReadDemo() && record(); as value) {
      <header class="demo-heading"><div><span class="demo-kicker">{{ singular.toUpperCase() }} DEMO · #{{ value.body.id }}</span><h1 id="detail-title">{{ main(value.body) }}</h1><span class="demo-badge" [class.published]="value.body.publicationStatus === 'PUBLISHED'">{{ value.body.publicationStatus === 'PUBLISHED' ? 'Publicado' : 'Borrador' }}</span></div>
        <div class="demo-actions">
          @if (permissions.canUseDemoEditor()) { <button mat-stroked-button type="button" (click)="edit()">Editar</button> }
          @if (permissions.canUseDemoPublication()) { <button mat-flat-button type="button" (click)="publish()">{{ value.body.publicationStatus === 'PUBLISHED' ? 'Despublicar' : 'Publicar' }}</button> }
          @if (kind !== 'users' && permissions.canUseDemoEditor()) { <button mat-button type="button" (click)="remove()">Borrar</button> }
        </div>
      </header>
      <article class="demo-card"><h2>Datos administrativos</h2><div class="info-grid">
        <div class="info-item"><span class="info-label">ID interno</span><span class="info-value">{{ value.body.id }}</span></div>
        <div class="info-item"><span class="info-label">ID público</span><span class="info-value">{{ value.body.publicId }}</span></div>
        <div class="info-item"><span class="info-label">Estado</span><span class="info-value">{{ value.body.publicationStatus }}</span></div>
        <div class="info-item"><span class="info-label">Versión</span><span class="info-value">{{ value.body.version }}</span></div>
        @if (user(value.body); as u) { <div class="info-item"><span class="info-label">Handle</span><span class="info-value">{{ u.handle }}</span></div><div class="info-item"><span class="info-label">Nombre visible</span><span class="info-value">{{ u.displayName }}</span></div><div class="info-item"><span class="info-label">Biografía</span><span class="info-value">{{ u.bio || '—' }}</span></div> }
        @if (type(value.body); as t) { <div class="info-item"><span class="info-label">Usuario</span><a [routerLink]="['/demo-content/users', t.demoUserId]">#{{ t.demoUserId }}</a></div><div class="info-item"><span class="info-label">Nombre</span><span class="info-value">{{ t.name }}</span></div><div class="info-item"><span class="info-label">Color</span><span class="info-value color-value"><span class="color-swatch" [style.background-color]="t.color"></span>{{ t.color }}</span></div><div class="info-item"><span class="info-label">Descripción</span><span class="info-value">{{ t.description || '—' }}</span></div> }
        @if (task(value.body); as t) { <div class="info-item"><span class="info-label">Usuario</span><a [routerLink]="['/demo-content/users', t.demoUserId]">#{{ t.demoUserId }}</a></div><div class="info-item"><span class="info-label">Tipo</span><a [routerLink]="['/demo-content/task-types', t.demoTaskTypeId]">#{{ t.demoTaskTypeId }}</a></div><div class="info-item"><span class="info-label">Fecha</span><span class="info-value">{{ t.dueDate }}</span></div><div class="info-item"><span class="info-label">Completada</span><span class="info-value">{{ t.completed ? 'Sí' : 'No' }}</span></div><div class="info-item"><span class="info-label">Urgencia</span><span class="info-value">{{ t.urgency }}</span></div><div class="info-item"><span class="info-label">Descripción</span><span class="info-value">{{ t.description || '—' }}</span></div> }
      </div></article>
      @if (kind === 'users' || kind === 'task-types') {
        @if (kind === 'users') { <section class="demo-card"><h2>Tipos relacionados</h2>@if (relatedTypes(); as types) { @if (types.content.length) { <ul>@for (t of types.content; track t.id) { <li><a [routerLink]="['/demo-content/task-types', t.id]">{{ t.name }}</a> · {{ t.publicationStatus }}</li> }</ul> } @else { <p>Sin tipos.</p> } }<a [routerLink]="['/demo-content/task-types']" [queryParams]="{demoUserId: value.body.id}">Ver todos los tipos</a></section> }
        <section class="demo-card"><h2>Tareas relacionadas</h2>@if (relatedTasks(); as tasks) { @if (tasks.content.length) { <ul>@for (t of tasks.content; track t.id) { <li><a [routerLink]="['/demo-content/tasks', t.id]">{{ t.title }}</a> · {{ t.publicationStatus }}</li> }</ul> } @else { <p>Sin tareas.</p> } }<a [routerLink]="['/demo-content/tasks']" [queryParams]="kind === 'users' ? {demoUserId: value.body.id} : {demoTaskTypeId: value.body.id}">Ver todas las tareas</a></section>
      }
    }
  </section>`,
})
export class DemoDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(DemoAdminApiService);
  private readonly dialog = inject(MatDialog);
  private readonly destroyRef = inject(DestroyRef);
  readonly permissions = inject(DemoPermissionsService);
  readonly kind = this.route.snapshot.data['kind'] as DemoKind;
  readonly id = Number(this.route.snapshot.paramMap.get('id'));
  readonly singular = this.kind === 'users' ? 'usuario' : this.kind === 'task-types' ? 'tipo' : 'tarea';
  readonly plural = this.kind === 'users' ? 'Usuarios' : this.kind === 'task-types' ? 'Tipos' : 'Tareas';
  readonly record = signal<Versioned<Row> | null>(null);
  readonly relatedTypes = signal<DemoPage<DemoTaskType> | null>(null);
  readonly relatedTasks = signal<DemoPage<DemoTask> | null>(null);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly reloadNeeded = signal(false);

  constructor() {
    effect(() => {
      if (!this.permissions.canReadDemo()) { this.record.set(null); this.relatedTypes.set(null); this.relatedTasks.set(null); }
      else this.load();
    });
  }
  user(row: Row): DemoUser | null { return 'handle' in row ? row : null; }
  type(row: Row): DemoTaskType | null { return 'name' in row ? row : null; }
  task(row: Row): DemoTask | null { return 'title' in row ? row : null; }
  main(row: Row): string { return 'handle' in row ? row.displayName : 'name' in row ? row.name : row.title; }

  load(): void {
    if (!this.permissions.has('DEMO_READ')) { this.error.set('Se requiere DEMO_READ para consultar el detalle y obtener su ETag.'); this.loading.set(false); return; }
    if (!Number.isSafeInteger(this.id) || this.id < 1) { this.error.set('ID no válido.'); this.loading.set(false); return; }
    this.loading.set(true); this.error.set(''); this.reloadNeeded.set(false);
    this.api.get<Row>(this.kind, this.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: value => {
        this.record.set(value); this.loading.set(false);
        if (this.kind === 'users') this.api.list<DemoTaskType>('task-types', { page: 0, size: 20, demoUserId: this.id }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({ next: page => this.relatedTypes.set(page), error: error => this.setError(error) });
        if (this.kind !== 'tasks') this.api.list<DemoTask>('tasks', { page: 0, size: 20, [this.kind === 'users' ? 'demoUserId' : 'demoTaskTypeId']: this.id }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({ next: page => this.relatedTasks.set(page), error: error => this.setError(error) });
      }, error: error => { this.loading.set(false); this.error.set(demoError(error).message); this.reloadNeeded.set(true); },
    });
  }

  publish(): void {
    const value = this.record();
    if (!value || !this.permissions.canUseDemoPublication()) return;
    const next = value.body.publicationStatus === 'DRAFT' ? 'PUBLISHED' : 'DRAFT';
    this.api.publish<Row>(this.kind, this.id, next, value.etag).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({ next: response => { this.record.set(response); this.error.set(''); }, error: error => this.setError(error) });
  }

  edit(): void {
    const value = this.record();
    if (!value || !this.permissions.canUseDemoEditor()) return;
    if (this.kind === 'users') { this.openEditor(value, [], []); return; }
    this.api.list<DemoUser>('users', { page: 0, size: 100 }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: users => {
        if (this.kind === 'task-types') { this.openEditor(value, users.content, []); return; }
        this.api.list<DemoTaskType>('task-types', { page: 0, size: 100 }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({ next: types => this.openEditor(value, users.content, types.content), error: error => this.setError(error) });
      }, error: error => this.setError(error),
    });
  }

  private openEditor(value: Versioned<Row>, users: DemoUser[], types: DemoTaskType[]): void {
    if (!this.permissions.canUseDemoEditor()) return;
    this.dialog.open(DemoEditorDialogComponent, { data: { kind: this.kind, entity: value.body, users, types }, width: 'min(94vw, 600px)', maxHeight: '90vh' })
      .afterClosed().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(body => {
        if (!body || !this.permissions.canUseDemoEditor()) return;
        this.api.update<Row>(this.kind, this.id, body as Partial<DemoUserWrite | DemoTypeWrite | DemoTaskWrite>, value.etag)
          .pipe(takeUntilDestroyed(this.destroyRef)).subscribe({ next: response => { this.record.set(response); this.error.set(''); }, error: error => this.setError(error) });
      });
  }

  remove(): void {
    const value = this.record();
    if (!value || this.kind === 'users' || !this.permissions.canUseDemoEditor()) return;
    if (!window.confirm(`¿Borrar ${this.singular} «${this.main(value.body)}»?`) || !this.permissions.canUseDemoEditor()) return;
    this.api.delete(this.kind, this.id, value.etag).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => this.router.navigate(['/demo-content', this.kind]),
      error: error => error?.status === 409 && this.kind === 'task-types'
        ? this.error.set('No se puede borrar el tipo porque tiene tareas asociadas.') : this.setError(error),
    });
  }

  private setError(error: unknown): void {
    const issue = demoError(error); this.error.set(issue.message); this.reloadNeeded.set(issue.reload);
  }
}
