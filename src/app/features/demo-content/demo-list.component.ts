import { Component, DestroyRef, effect, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DemoAdminApiService } from './demo-admin-api.service';
import { DemoKind, DemoListParams, DemoPage, DemoTask, DemoTaskType, DemoUser, DemoUserWrite, DemoTypeWrite, DemoTaskWrite, PublicationStatus } from './demo-admin.model';
import { DemoEditorDialogComponent } from './demo-editor-dialog.component';
import { DemoPermissionsService } from '../../core/auth/demo-permissions.service';
import { demoError } from './demo-error';

type Row = DemoUser | DemoTaskType | DemoTask;

@Component({
  selector: 'app-demo-list', standalone: true,
  imports: [RouterLink, MatButtonModule],
  template: `
  <section class="demo-page" [attr.aria-labelledby]="'list-title'">
    <a routerLink="/demo-content" class="demo-back">← Contenido demo</a>
    <header class="demo-heading"><div><span class="demo-kicker">CATÁLOGO DEMO</span><h1 id="list-title">{{ title }}</h1><p>{{ description }}</p></div>
      @if (permissions.canUseDemoEditor()) { <button mat-flat-button type="button" (click)="create()">Crear {{ singular }}</button> }
    </header>
    @if (error()) { <div class="error-banner" role="alert">{{ error() }} <button type="button" (click)="load()">Recargar</button></div> }
    @if (!permissions.has('DEMO_READ')) { <p class="demo-note">Se requiere DEMO_READ para consultar este listado.</p> }
    @if (permissions.canReadDemo()) { <form class="demo-toolbar" (submit)="applyFilters($event, search.value, status.value, sort.value, size.value, userId.value, typeId.value, completed.value, urgency.value)" aria-label="Filtros del listado">
      <label class="demo-search">Buscar <input name="search" [value]="params().search ?? ''" #search maxlength="60" placeholder="Buscar en el catálogo"></label>
      <label>Estado <select #status [value]="params().publicationStatus ?? ''"><option value="">Todos</option><option value="DRAFT">Borrador</option><option value="PUBLISHED">Publicado</option></select></label>
      <label [hidden]="kind === 'users'">ID usuario <input #userId type="number" min="1" [value]="params().demoUserId ?? ''"></label>
      <label [hidden]="kind !== 'tasks'">ID tipo <input #typeId type="number" min="1" [value]="params().demoTaskTypeId ?? ''"></label>
      <label [hidden]="kind !== 'tasks'">Completada <select #completed [value]="params().completed === undefined ? '' : String(params().completed)"><option value="">Todas</option><option value="true">Sí</option><option value="false">No</option></select></label>
      <label [hidden]="kind !== 'tasks'">Urgencia <select #urgency [value]="params().urgency ?? ''"><option value="">Todas</option><option value="0">Baja</option><option value="1">Media</option><option value="2">Alta</option></select></label>
      <label>Orden <select #sort [value]="params().sort ?? 'id,asc'">@for (s of sorts; track s.value) { <option [value]="s.value">{{ s.label }}</option> }</select></label>
      <label>Tamaño <select #size [value]="params().size"><option value="10">10</option><option value="20">20</option><option value="50">50</option><option value="100">100</option></select></label>
      <button mat-stroked-button type="button" (click)="filter(search.value, status.value, sort.value, size.value, kind !== 'users' ? userId.value : '', kind === 'tasks' ? typeId.value : '', kind === 'tasks' ? completed.value : '', kind === 'tasks' ? urgency.value : '')">Aplicar</button>
    </form> }
    @if (loading()) { <div class="demo-card demo-skeleton" aria-label="Cargando listado"></div> }
    @if (!loading() && page()?.content?.length === 0) { <div class="empty-state">No hay {{ title.toLowerCase() }} con estos filtros.</div> }
    @if (page(); as p) {
      <ul class="demo-list">
        @for (row of p.content; track row.id) {
          <li class="demo-row"><div class="demo-row-main"><a [routerLink]="['/demo-content', kind, row.id]">{{ main(row) }}</a><span class="demo-meta">{{ meta(row) }}</span><span class="demo-meta">ID {{ row.id }} · Público {{ row.publicId }}</span></div>
            <div class="demo-row-actions"><span class="demo-badge" [class.published]="row.publicationStatus === 'PUBLISHED'">{{ row.publicationStatus === 'PUBLISHED' ? 'Publicado' : 'Borrador' }}</span>
              @if (permissions.canUseDemoEditor()) { <button mat-button type="button" (click)="edit(row.id)">Editar</button> }
              @if (permissions.canUseDemoPublication()) { <button mat-button type="button" (click)="publish(row.id, row.publicationStatus)">{{ row.publicationStatus === 'PUBLISHED' ? 'Despublicar' : 'Publicar' }}</button> }
              @if (kind !== 'users' && permissions.canUseDemoEditor()) { <button mat-button type="button" (click)="remove(row.id)">Borrar</button> }
            </div>
          </li>
        }
      </ul>
      <nav class="demo-pager" aria-label="Paginación"><span>{{ p.totalElements }} resultados · página {{ params().page + 1 }} de {{ p.totalPages || 1 }}</span><div class="demo-actions"><button mat-button type="button" [disabled]="params().page === 0" (click)="goPage(params().page - 1)">Anterior</button><button mat-button type="button" [disabled]="params().page + 1 >= p.totalPages" (click)="goPage(params().page + 1)">Siguiente</button></div></nav>
    }
  </section>`,
})
export class DemoListComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(DemoAdminApiService);
  private readonly dialog = inject(MatDialog);
  private readonly destroyRef = inject(DestroyRef);
  readonly permissions = inject(DemoPermissionsService);
  readonly kind = this.route.snapshot.data['kind'] as DemoKind;
  readonly title = this.kind === 'users' ? 'Usuarios' : this.kind === 'task-types' ? 'Tipos de tarea' : 'Tareas';
  readonly singular = this.kind === 'users' ? 'usuario' : this.kind === 'task-types' ? 'tipo' : 'tarea';
  readonly description = this.kind === 'users' ? 'Perfiles de prueba y su estado de publicación.' : this.kind === 'task-types' ? 'Tipos vinculados a usuarios demo.' : 'Tareas sintéticas del catálogo.';
  readonly String = String;
  readonly sorts = this.kind === 'users' ? [{ value: 'id,asc', label: 'ID ↑' }, { value: 'handle,asc', label: 'Handle ↑' }, { value: 'displayName,asc', label: 'Nombre ↑' }, { value: 'updatedAt,desc', label: 'Última edición' }]
    : this.kind === 'task-types' ? [{ value: 'id,asc', label: 'ID ↑' }, { value: 'name,asc', label: 'Nombre ↑' }, { value: 'updatedAt,desc', label: 'Última edición' }]
    : [{ value: 'id,asc', label: 'ID ↑' }, { value: 'title,asc', label: 'Título ↑' }, { value: 'dueDate,asc', label: 'Fecha ↑' }, { value: 'urgency,desc', label: 'Urgencia ↓' }, { value: 'updatedAt,desc', label: 'Última edición' }];
  readonly params = signal<DemoListParams>({ page: 0, size: 20, sort: 'id,asc' });
  readonly page = signal<DemoPage<Row> | null>(null);
  readonly loading = signal(false);
  readonly error = signal('');

  constructor() {
    effect(() => {
      if (!this.permissions.canReadDemo()) { this.page.set(null); this.loading.set(false); }
      else this.load();
    });
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(query => {
      const n = (key: string) => { const value = Number(query.get(key)); return Number.isSafeInteger(value) && value > 0 ? value : undefined; };
      const page = Number(query.get('page'));
      const size = Number(query.get('size'));
      const search = query.get('search')?.trim();
      const publicationStatus = query.get('publicationStatus');
      const completed = query.get('completed');
      const urgency = query.get('urgency');
      this.params.set({
        page: Number.isSafeInteger(page) && page >= 0 ? page : 0,
        size: [10, 20, 50, 100].includes(size) ? size : 20,
        search: search && search.length <= 60 ? search : undefined,
        sort: this.sorts.some(option => option.value === query.get('sort')) ? query.get('sort')! : 'id,asc',
        publicationStatus: publicationStatus === 'DRAFT' || publicationStatus === 'PUBLISHED' ? publicationStatus : undefined,
        demoUserId: n('demoUserId'), demoTaskTypeId: n('demoTaskTypeId'),
        completed: completed === 'true' ? true : completed === 'false' ? false : undefined,
        urgency: urgency && ['0', '1', '2'].includes(urgency) ? Number(urgency) : undefined,
      });
    });
  }

  load(): void {
    if (!this.permissions.has('DEMO_READ')) { this.page.set(null); this.loading.set(false); return; }
    this.loading.set(true); this.error.set('');
    this.api.list<Row>(this.kind, this.params()).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: page => { this.page.set(page); this.loading.set(false); },
      error: error => { this.page.set(null); this.error.set(demoError(error).message); this.loading.set(false); },
    });
  }

  applyFilters(event: Event, search: string, status: string, sort: string, size: string, user: string, type: string, completed: string, urgency: string): void {
    event.preventDefault(); this.filter(search, status, sort, size, user, type, completed, urgency);
  }

  filter(search: string, status: string, sort: string, size: string, user: string, type: string, completed: string, urgency: string): void {
    this.navigate({ page: 0, size: Number(size), search: search.trim() || undefined,
      publicationStatus: status as PublicationStatus || undefined, sort,
      demoUserId: user ? Number(user) : undefined, demoTaskTypeId: type ? Number(type) : undefined,
      completed: completed === '' ? undefined : completed === 'true', urgency: urgency === '' ? undefined : Number(urgency) });
  }

  goPage(page: number): void { this.navigate({ ...this.params(), page }); }
  private navigate(params: DemoListParams): void { this.router.navigate([], { relativeTo: this.route, queryParams: params }); }

  main(row: Row): string { return 'handle' in row ? `${row.displayName} · @${row.handle}` : 'name' in row ? row.name : row.title; }
  meta(row: Row): string {
    return 'handle' in row ? '' : 'name' in row ? `Usuario #${row.demoUserId} · ${row.color}`
      : `Usuario #${row.demoUserId} · Tipo #${row.demoTaskTypeId} · ${row.completed ? 'Completada' : 'Pendiente'} · Urgencia ${row.urgency} · ${row.dueDate}`;
  }

  create(): void {
    if (!this.permissions.canUseDemoEditor()) return;
    this.openEditor();
  }

  edit(id: number): void {
    if (!this.permissions.canUseDemoEditor()) return;
    this.api.get<Row>(this.kind, id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: value => this.openEditor(value.body, value.etag), error: error => this.error.set(demoError(error).message),
    });
  }

  publish(id: number, status: PublicationStatus): void {
    if (!this.permissions.canUseDemoPublication()) return;
    this.api.get<Row>(this.kind, id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: value => { if (!this.permissions.canUseDemoPublication()) return; this.api.publish<Row>(this.kind, id, status === 'DRAFT' ? 'PUBLISHED' : 'DRAFT', value.etag)
        .pipe(takeUntilDestroyed(this.destroyRef)).subscribe({ next: () => this.load(), error: error => this.error.set(demoError(error).message) });
      },
      error: error => this.error.set(demoError(error).message),
    });
  }

  remove(id: number): void {
    if (!this.permissions.canUseDemoEditor() || this.kind === 'users') return;
    this.api.get<Row>(this.kind, id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: value => {
        if (!this.permissions.canUseDemoEditor() || !window.confirm(`¿Borrar ${this.singular} «${this.main(value.body)}»?`)) return;
        this.api.delete(this.kind as 'task-types' | 'tasks', id, value.etag).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
          next: () => this.load(), error: error => this.error.set(error?.status === 409 && this.kind === 'task-types' ? 'No se puede borrar el tipo porque tiene tareas asociadas.' : demoError(error).message),
        });
      }, error: error => this.error.set(demoError(error).message),
    });
  }

  private openEditor(entity?: Row, etag?: string): void {
    // Form choices are read from the private catalog; a write-only account cannot obtain them.
    const users$ = this.kind === 'users' ? null : this.api.list<DemoUser>('users', { page: 0, size: 100 });
    if (!users$) { this.showEditor(entity, etag, [], []); return; }
    users$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: users => {
        if (this.kind !== 'tasks') { this.showEditor(entity, etag, users.content, []); return; }
        this.api.list<DemoTaskType>('task-types', { page: 0, size: 100 }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
          next: types => this.showEditor(entity, etag, users.content, types.content),
          error: error => this.error.set(demoError(error).message),
        });
      }, error: error => this.error.set(demoError(error).message),
    });
  }

  private showEditor(entity: Row | undefined, etag: string | undefined, users: DemoUser[], types: DemoTaskType[]): void {
    if (!this.permissions.canUseDemoEditor()) return;
    this.dialog.open(DemoEditorDialogComponent, { data: { kind: this.kind, entity, users, types }, width: 'min(94vw, 600px)', maxHeight: '90vh', autoFocus: 'first-tabbable' })
      .afterClosed().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(body => {
        if (!body || !this.permissions.canUseDemoEditor()) return;
        const request = entity && etag
          ? this.api.update<Row>(this.kind, entity.id, body as Partial<DemoUserWrite | DemoTypeWrite | DemoTaskWrite>, etag)
          : this.api.create<Row>(this.kind, body as DemoUserWrite | DemoTypeWrite | DemoTaskWrite);
        request.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({ next: () => this.load(), error: error => this.error.set(demoError(error).message) });
      });
  }
}
