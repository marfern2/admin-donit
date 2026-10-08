import { Component, DestroyRef, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ParamMap } from '@angular/router';
import { Observable, catchError, debounceTime, distinctUntilChanged, of, switchMap, take, tap } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PublicDemoApiService } from './public-demo-api.service';
import { PublicDemoListParams, PublicDemoPage, PublicDemoTask, PublicDemoTaskType, PublicDemoUser } from './public-demo.model';
import { publicErrorMessage } from './public-error';

type Kind = 'users' | 'task-types' | 'tasks';
type Item = PublicDemoUser | PublicDemoTaskType | PublicDemoTask;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SORTS: Record<Kind, { label: string; value: string }[]> = {
  users: [{ label: 'Nombre A–Z', value: 'displayName,asc' }, { label: 'Nombre Z–A', value: 'displayName,desc' }, { label: 'Handle A–Z', value: 'handle,asc' }, { label: 'Handle Z–A', value: 'handle,desc' }],
  'task-types': [{ label: 'Nombre A–Z', value: 'name,asc' }, { label: 'Nombre Z–A', value: 'name,desc' }],
  tasks: [{ label: 'Fecha más próxima', value: 'dueDate,asc' }, { label: 'Fecha más lejana', value: 'dueDate,desc' }, { label: 'Título A–Z', value: 'title,asc' }, { label: 'Título Z–A', value: 'title,desc' }],
};

@Component({
  selector: 'app-public-list', standalone: true, imports: [RouterLink, ReactiveFormsModule],
  template: `
    <section class="demo-page-heading"><a routerLink="/demo" class="demo-back">← Inicio</a><span class="demo-eyebrow">CATÁLOGO PÚBLICO</span><h1>{{ title }}</h1><p>{{ description }}</p></section>
    <section class="demo-panel" aria-label="Filtros de {{ title.toLowerCase() }}">
      <div class="demo-filters">
        <label class="demo-field demo-search">Buscar <input type="search" [formControl]="search" placeholder="Escribe al menos 2 caracteres" autocomplete="off" /></label>
        <label class="demo-field">Ordenar <select [value]="params().sort || ''" (change)="setParam('sort', $event)"><option value="">Predeterminado</option>@for (sort of sorts; track sort.value) { <option [value]="sort.value">{{ sort.label }}</option> }</select></label>
        @if (kind !== 'users') { <label class="demo-field">Usuario <input type="text" list="demo-user-options" [value]="params().userPublicId || ''" (focus)="loadUserSuggestions()" (change)="setParam('userPublicId', $event)" placeholder="Elegir o pegar UUID" autocomplete="off" /></label><datalist id="demo-user-options">@for (user of userSuggestions(); track user.publicId) { <option [value]="user.publicId" [label]="user.displayName"></option> }</datalist> }
        @if (kind === 'tasks') {
          <label class="demo-field">Tipo <input type="text" list="demo-type-options" [value]="params().taskTypePublicId || ''" (focus)="loadTypeSuggestions()" (change)="setParam('taskTypePublicId', $event)" placeholder="Elegir o pegar UUID" autocomplete="off" /></label><datalist id="demo-type-options">@for (type of typeSuggestions(); track type.publicId) { <option [value]="type.publicId" [label]="type.name"></option> }</datalist>
          <label class="demo-field">Estado <select [value]="completedValue()" (change)="setParam('completed', $event)"><option value="">Todos</option><option value="true">Completadas</option><option value="false">Pendientes</option></select></label>
          <label class="demo-field">Urgencia <select [value]="urgencyValue()" (change)="setParam('urgency', $event)"><option value="">Todas</option><option value="0">0</option><option value="1">1</option><option value="2">2</option></select></label>
        }
        <label class="demo-field">Por página <select [value]="params().size" (change)="setParam('size', $event)"><option value="10">10</option><option value="20">20</option></select></label>
      </div>
      @if (search.value.trim().length === 1) { <p class="demo-hint">Escribe otro carácter para buscar.</p> }
      @if (hasFilters()) { <button type="button" class="demo-text-button" (click)="clearFilters()">Limpiar filtros</button> }
    </section>
    <section class="demo-section" aria-live="polite">
      @if (loading()) { <div class="demo-card-grid" aria-busy="true"><div class="demo-skeleton"></div><div class="demo-skeleton"></div><div class="demo-skeleton"></div></div> }
      @else if (error()) { <div class="demo-notice" role="alert"><p>{{ error() }}</p><button type="button" (click)="retry()">Reintentar</button></div> }
      @else if (page(); as result) {
        @if (result.content.length === 0) { <div class="demo-empty"><span aria-hidden="true">◇</span><h2>Sin resultados</h2><p>No hay {{ title.toLowerCase() }} publicados para esta búsqueda.</p></div> }
        @else {
          <p class="demo-count">{{ result.totalElements }} {{ result.totalElements === 1 ? singular : title.toLowerCase() }} {{ publishedWord(result.totalElements) }}</p>
          <div class="demo-card-grid">
            @for (item of result.content; track item.publicId) {
              <a class="demo-item-card" [routerLink]="['/demo', kind, item.publicId]">
                @if (kind === 'users') { <span class="demo-item-kicker">USUARIO · {{ user(item).handle }}</span><h2>{{ user(item).displayName }}</h2><p>{{ user(item).bio || 'Sin biografía pública.' }}</p> }
                @if (kind === 'task-types') { <span class="demo-item-kicker"><span class="demo-color" [style.background-color]="taskType(item).color || 'var(--brand)'" aria-hidden="true"></span> TIPO</span><h2>{{ taskType(item).name }}</h2><p>{{ taskType(item).description || 'Sin descripción pública.' }}</p> }
                @if (kind === 'tasks') { <span class="demo-item-kicker">TAREA · {{ task(item).completed === true ? 'Completada' : task(item).completed === false ? 'Pendiente' : 'Sin estado' }}</span><h2>{{ task(item).title }}</h2><p>{{ task(item).description || 'Sin descripción pública.' }}</p><span class="demo-item-meta">{{ task(item).dueDate || 'Sin fecha' }} · Urgencia {{ task(item).urgency ?? '—' }}</span> }
                <span class="demo-item-link">Ver detalle →</span>
              </a>
            }
          </div>
        }
        <nav class="demo-pagination" aria-label="Paginación"><button type="button" (click)="goPage(result.page - 1)" [disabled]="result.page <= 0">← Anterior</button><span>Página {{ result.page + 1 }} de {{ result.totalPages || 1 }}</span><button type="button" (click)="goPage(result.page + 1)" [disabled]="!result.hasNext">Siguiente →</button></nav>
      }
    </section>
  `,
})
export class PublicListComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(PublicDemoApiService);
  private readonly destroyRef = inject(DestroyRef);
  readonly kind = this.route.snapshot.data['kind'] as Kind;
  readonly title = ({ users: 'Usuarios', 'task-types': 'Tipos de tarea', tasks: 'Tareas' } as const)[this.kind];
  readonly singular = ({ users: 'usuario', 'task-types': 'tipo de tarea', tasks: 'tarea' } as const)[this.kind];
  publishedWord(count: number): string { return this.kind === 'tasks' ? (count === 1 ? 'publicada' : 'publicadas') : (count === 1 ? 'publicado' : 'publicados'); }
  readonly description = ({ users: 'Perfiles sintéticos disponibles en la demo.', 'task-types': 'Categorías públicas para organizar tareas.', tasks: 'Tareas sintéticas publicadas para explorar.' } as const)[this.kind];
  readonly sorts = SORTS[this.kind];
  readonly search = new FormControl('', { nonNullable: true });
  readonly params = signal<PublicDemoListParams>({ page: 0, size: 20 });
  readonly page = signal<PublicDemoPage<Item> | null>(null);
  readonly userSuggestions = signal<PublicDemoUser[]>([]);
  readonly typeSuggestions = signal<PublicDemoTaskType[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  private usersLoaded = false;
  private typesLoaded = false;

  constructor() {
    this.search.valueChanges.pipe(
      debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef),
    ).subscribe(value => { const term = this.searchTerm(value); if (term !== (this.params().search ?? '')) this.navigate({ search: term || null, page: null }); });
    this.route.queryParamMap.pipe(
      tap(map => {
        this.params.set(this.parse(map));
        this.search.setValue(map.get('search') || '', { emitEvent: false });
        this.loading.set(true); this.error.set(null); this.page.set(null);
      }),
      switchMap(() => {
        const params = this.params();
        const request: Observable<PublicDemoPage<Item>> = this.kind === 'users' ? this.api.users(params) : this.kind === 'task-types' ? this.api.taskTypes(params) : this.api.tasks(params);
        return request.pipe(catchError(error => of({ error })), tap(result => {
          if ('error' in result) this.error.set(publicErrorMessage(result.error));
          else this.page.set(result as PublicDemoPage<Item>);
          this.loading.set(false);
        }));
      }), takeUntilDestroyed(this.destroyRef),
    ).subscribe();
  }

  user(value: Item): PublicDemoUser { return value as PublicDemoUser; }
  loadUserSuggestions(): void {
    if (this.usersLoaded) return;
    this.usersLoaded = true;
    this.api.users({ page: 0, size: 20 }).pipe(take(1), takeUntilDestroyed(this.destroyRef)).subscribe({ next: page => this.userSuggestions.set(page.content), error: () => { this.usersLoaded = false; } });
  }
  loadTypeSuggestions(): void {
    if (this.typesLoaded) return;
    this.typesLoaded = true;
    this.api.taskTypes({ page: 0, size: 20 }).pipe(take(1), takeUntilDestroyed(this.destroyRef)).subscribe({ next: page => this.typeSuggestions.set(page.content), error: () => { this.typesLoaded = false; } });
  }
  taskType(value: Item): PublicDemoTaskType { return value as PublicDemoTaskType; }
  task(value: Item): PublicDemoTask { return value as PublicDemoTask; }
  completedValue(): string { return this.params().completed?.toString() ?? ''; }
  urgencyValue(): string { return this.params().urgency?.toString() ?? ''; }
  hasFilters(): boolean { const p = this.params(); return !!(p.search || p.sort || p.userPublicId || p.taskTypePublicId || p.completed !== undefined || p.urgency !== undefined); }
  setParam(key: string, event: Event): void { this.navigate({ [key]: (event.target as HTMLInputElement).value.trim() || null, page: null }); }
  clearFilters(): void { this.search.setValue('', { emitEvent: false }); this.router.navigate([], { relativeTo: this.route, queryParams: { size: this.params().size }, replaceUrl: false }); }
  goPage(page: number): void { this.navigate({ page }); }
  retry(): void { this.router.navigate([], { relativeTo: this.route, queryParams: { ...this.route.snapshot.queryParams, retry: Date.now() } }); }
  private navigate(changes: Record<string, unknown>): void { this.router.navigate([], { relativeTo: this.route, queryParams: changes, queryParamsHandling: 'merge' }); }
  private searchTerm(value: string): string { const term = value.trim().slice(0, 60); return term.length >= 2 ? term : ''; }
  private parse(map: ParamMap): PublicDemoListParams {
    const number = (name: string, fallback: number, min: number, max: number): number => { const raw = map.get(name); const value = raw !== null && /^\d+$/.test(raw) ? Number(raw) : fallback; return value >= min && value <= max ? value : fallback; };
    const search = map.get('search')?.trim();
    const sort = map.get('sort');
    const completed = map.get('completed');
    const urgency = map.get('urgency');
    const userPublicId = map.get('userPublicId');
    const taskTypePublicId = map.get('taskTypePublicId');
    return {
      page: number('page', 0, 0, 49), size: number('size', 20, 1, 20),
      search: search && search.length >= 2 && search.length <= 60 ? search : undefined,
      sort: this.sorts.some(option => option.value === sort) ? sort! : undefined,
      userPublicId: userPublicId && UUID.test(userPublicId) ? userPublicId : undefined,
      taskTypePublicId: taskTypePublicId && UUID.test(taskTypePublicId) ? taskTypePublicId : undefined,
      completed: completed === 'true' ? true : completed === 'false' ? false : undefined,
      urgency: urgency !== null && /^[0-2]$/.test(urgency) ? Number(urgency) : undefined,
    };
  }
}
