import { Component, DestroyRef, effect, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DemoAdminApiService } from './demo-admin-api.service';
import { DemoStats, FixturePreview } from './demo-admin.model';
import { demoError } from './demo-error';
import { DemoPermissionsService } from '../../core/auth/demo-permissions.service';

@Component({
  selector: 'app-demo-dashboard',
  standalone: true,
  imports: [RouterLink],
  template: `
    <section class="demo-page" aria-labelledby="demo-title">
      <header class="demo-heading"><div><span class="demo-kicker">CATÁLOGO PRIVADO</span><h1 id="demo-title">Contenido demo</h1><p>Gestiona el catálogo que alimenta la experiencia pública.</p></div></header>
      @if (error()) { <div class="error-banner" role="alert">{{ error() }} <button type="button" (click)="load()">Recargar</button></div> }
      @if (permissions.has('DEMO_READ') && loading()) { <div class="demo-grid" aria-label="Cargando estadísticas"><div class="demo-card demo-skeleton"></div><div class="demo-card demo-skeleton"></div><div class="demo-card demo-skeleton"></div></div> }
      @if (stats(); as s) {
        <div class="demo-grid" aria-label="Estadísticas del catálogo">
          <article class="demo-card"><span>Usuarios</span><strong>{{ s.usersTotal }}</strong><small>{{ s.usersPublished }} publicados</small></article>
          <article class="demo-card"><span>Tipos</span><strong>{{ s.typesTotal }}</strong><small>{{ s.typesPublished }} publicados</small></article>
          <article class="demo-card"><span>Tareas</span><strong>{{ s.tasksTotal }}</strong><small>{{ s.tasksPublished }} publicadas · {{ s.tasksCompleted }} completadas</small></article>
        </div>
      }
      @if (catalog(); as p) { <article class="demo-card"><h2>Estado del catálogo</h2><p>Manifest v{{ p.manifestVersion }} · revisión {{ p.currentRevision }} → {{ p.targetRevision }}</p><span class="demo-badge" [class.published]="!catalogConflicts()">{{ catalogConflicts() ? 'Conflictos en preview' : 'Sin conflictos' }}</span></article> }
      @if (catalogError()) { <div class="error-banner" role="alert">{{ catalogError() }} <button type="button" (click)="loadPreview()">Reintentar preview</button></div> }
      <h2>Accesos rápidos</h2>
      <nav class="demo-grid" aria-label="Secciones del catálogo">
        @if (permissions.has('DEMO_READ')) {
          <a class="demo-card demo-link" routerLink="users"><strong>Usuarios</strong><small>Perfiles y publicación</small></a>
          <a class="demo-card demo-link" routerLink="task-types"><strong>Tipos</strong><small>Categorías por usuario</small></a>
          <a class="demo-card demo-link" routerLink="tasks"><strong>Tareas</strong><small>Contenido y estado</small></a>
        }
        @if (permissions.has('DEMO_RESTORE')) { <a class="demo-card demo-link" routerLink="fixtures"><strong>Fixtures</strong><small>Preview y restauración controlada</small></a> }
      </nav>
      <p class="demo-note">El estado del manifest y la revisión se consultan en Fixtures, que requiere DEMO_RESTORE. La restauración nunca se ejecuta automáticamente.</p>
    </section>`,
})
export class DemoDashboardComponent {
  private readonly api = inject(DemoAdminApiService);
  readonly permissions = inject(DemoPermissionsService);
  private readonly destroyRef = inject(DestroyRef);
  readonly stats = signal<DemoStats | null>(null);
  readonly catalog = signal<FixturePreview | null>(null);
  readonly catalogError = signal('');
  readonly loading = signal(true);
  readonly error = signal('');
  private requestedStats = false;
  private requestedPreview = false;
  constructor() {
    effect(() => {
      if (this.permissions.has('DEMO_READ') && !this.requestedStats) { this.requestedStats = true; this.load(); }
      if (!this.permissions.has('DEMO_READ')) { this.stats.set(null); this.loading.set(false); this.requestedStats = false; }
      if (this.permissions.has('DEMO_RESTORE') && !this.requestedPreview) { this.requestedPreview = true; this.loadPreview(); }
      if (!this.permissions.has('DEMO_RESTORE')) { this.catalog.set(null); this.requestedPreview = false; }
    });
  }
  catalogConflicts(): boolean {
    const p = this.catalog();
    return !!p && (p.catalogConflicts.length > 0 || [p.users, p.types, p.tasks].some(x => x.conflicts.length > 0));
  }
  loadPreview(): void {
    if (!this.permissions.has('DEMO_RESTORE')) return;
    this.catalogError.set('');
    this.api.preview().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: value => this.catalog.set(value.body),
      error: error => this.catalogError.set(demoError(error).message),
    });
  }
  load(): void {
    this.loading.set(true); this.error.set('');
    this.api.stats().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: stats => { this.stats.set(stats); this.loading.set(false); },
      error: error => { this.error.set(demoError(error).message); this.loading.set(false); },
    });
  }
}
