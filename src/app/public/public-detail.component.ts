import { Component, DestroyRef, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Observable, catchError, of, take } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PublicDemoApiService } from './public-demo-api.service';
import { PublicDemoTask, PublicDemoTaskType, PublicDemoUser } from './public-demo.model';
import { publicErrorMessage } from './public-error';

type Kind = 'users' | 'task-types' | 'tasks';
type Item = PublicDemoUser | PublicDemoTaskType | PublicDemoTask;

@Component({
  selector: 'app-public-detail', standalone: true, imports: [RouterLink],
  template: `
    <section class="demo-page-heading">
      <a [routerLink]="['/demo', kind]" class="demo-back">← Volver a {{ listTitle }}</a>
      <span class="demo-eyebrow">DETALLE PÚBLICO</span>
      @if (loading()) { <div class="demo-skeleton demo-detail-skeleton" aria-label="Cargando detalle"></div> }
      @else if (error()) { <div class="demo-notice" role="alert"><h1>Contenido no disponible</h1><p>{{ error() }}</p><button type="button" (click)="load()">Reintentar</button></div> }
      @else if (item(); as value) {
        @if (kind === 'users') {
          <h1>{{ user(value).displayName }}</h1><p class="demo-handle">{{ user(value).handle }}</p>
          <div class="demo-detail-card"><h2>Sobre este usuario</h2><p>{{ user(value).bio || 'Sin biografía pública.' }}</p><div class="demo-detail-links"><a [routerLink]="['/demo/task-types']" [queryParams]="{userPublicId: value.publicId}">Ver sus tipos →</a><a [routerLink]="['/demo/tasks']" [queryParams]="{userPublicId: value.publicId}">Ver sus tareas →</a></div></div>
        }
        @if (kind === 'task-types') {
          <h1><span class="demo-color demo-color-large" [style.background-color]="taskType(value).color || 'var(--brand)'" aria-hidden="true"></span>{{ taskType(value).name }}</h1>
          <div class="demo-detail-card"><h2>Acerca del tipo</h2><p>{{ taskType(value).description || 'Sin descripción pública.' }}</p><dl><dt>Color</dt><dd>{{ taskType(value).color || 'No especificado' }}</dd><dt>Usuario</dt><dd><a [routerLink]="['/demo/users', taskType(value).userPublicId]">Ver perfil público →</a></dd></dl></div>
          <section class="demo-section" aria-labelledby="related-title"><h2 id="related-title">Tareas de este tipo</h2>
            @if (relatedLoading()) { <div class="demo-skeleton"></div> }
            @else if (relatedError()) { <p class="demo-muted">{{ relatedError() }}</p> }
            @else if (relatedTasks().length === 0) { <p class="demo-muted">No hay tareas publicadas de este tipo.</p> }
            @else { <div class="demo-related">@for (task of relatedTasks(); track task.publicId) { <a [routerLink]="['/demo/tasks', task.publicId]">{{ task.title }} →</a> }</div> }
            <a class="demo-text-link" routerLink="/demo/tasks" [queryParams]="{taskTypePublicId: value.publicId}">Ver todas las tareas del tipo →</a>
          </section>
        }
        @if (kind === 'tasks') {
          <h1>{{ task(value).title }}</h1>
          <div class="demo-detail-card"><h2>La tarea</h2><p>{{ task(value).description || 'Sin descripción pública.' }}</p><dl><dt>Estado</dt><dd>{{ task(value).completed === true ? 'Completada' : task(value).completed === false ? 'Pendiente' : 'No especificado' }}</dd><dt>Urgencia</dt><dd>{{ task(value).urgency ?? 'No especificada' }}</dd><dt>Fecha</dt><dd>{{ task(value).dueDate || 'No especificada' }}</dd><dt>Usuario</dt><dd><a [routerLink]="['/demo/users', task(value).userPublicId]">{{ relatedUser()?.displayName || 'Ver usuario público' }} →</a></dd><dt>Tipo</dt><dd>@if (task(value).taskTypePublicId; as typeId) { <a [routerLink]="['/demo/task-types', typeId]">{{ relatedType()?.name || 'Ver tipo público' }} →</a> } @else { Sin tipo }</dd></dl></div>
        }
      }
    </section>
  `,
})
export class PublicDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(PublicDemoApiService);
  private readonly destroyRef = inject(DestroyRef);
  readonly kind = this.route.snapshot.data['kind'] as Kind;
  readonly listTitle = ({ users: 'usuarios', 'task-types': 'tipos', tasks: 'tareas' } as const)[this.kind];
  readonly item = signal<Item | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly relatedTasks = signal<PublicDemoTask[]>([]);
  readonly relatedUser = signal<PublicDemoUser | null>(null);
  readonly relatedType = signal<PublicDemoTaskType | null>(null);
  readonly relatedLoading = signal(false);
  readonly relatedError = signal<string | null>(null);
  private requestId = 0;

  constructor() { this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.load()); }
  user(value: Item): PublicDemoUser { return value as PublicDemoUser; }
  taskType(value: Item): PublicDemoTaskType { return value as PublicDemoTaskType; }
  task(value: Item): PublicDemoTask { return value as PublicDemoTask; }

  load(): void {
    const requestId = ++this.requestId;
    const id = this.route.snapshot.paramMap.get('publicId') || '';
    this.loading.set(true); this.error.set(null); this.item.set(null);
    this.relatedTasks.set([]); this.relatedUser.set(null); this.relatedType.set(null); this.relatedError.set(null);
    const request: Observable<Item> = this.kind === 'users' ? this.api.user(id) : this.kind === 'task-types' ? this.api.taskType(id) : this.api.task(id);
    request.pipe(take(1), takeUntilDestroyed(this.destroyRef)).subscribe({
      next: item => { if (requestId !== this.requestId) return; this.item.set(item); this.loading.set(false); this.loadRelated(item, requestId); },
      error: error => { if (requestId !== this.requestId) return; this.error.set(publicErrorMessage(error)); this.loading.set(false); },
    });
  }

  private loadRelated(item: Item, requestId: number): void {
    if (this.kind === 'task-types') {
      this.relatedLoading.set(true);
      this.api.tasks({ page: 0, size: 20, taskTypePublicId: item.publicId }).pipe(take(1), takeUntilDestroyed(this.destroyRef)).subscribe({
        next: page => { if (requestId !== this.requestId) return; this.relatedTasks.set(page.content); this.relatedLoading.set(false); },
        error: error => { if (requestId !== this.requestId) return; this.relatedError.set(publicErrorMessage(error)); this.relatedLoading.set(false); },
      });
    }
    if (this.kind === 'tasks') {
      const task = item as PublicDemoTask;
      this.api.user(task.userPublicId).pipe(take(1), catchError(() => of(null)), takeUntilDestroyed(this.destroyRef)).subscribe(user => { if (requestId === this.requestId) this.relatedUser.set(user); });
      if (task.taskTypePublicId) this.api.taskType(task.taskTypePublicId).pipe(take(1), catchError(() => of(null)), takeUntilDestroyed(this.destroyRef)).subscribe(type => { if (requestId === this.requestId) this.relatedType.set(type); });
    }
  }
}
