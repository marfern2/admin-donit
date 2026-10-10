import { Component, DestroyRef, effect, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DatePipe, NgTemplateOutlet } from '@angular/common';
import { DemoAdminApiService } from './demo-admin-api.service';
import { DemoStats, FixtureChanges, FixturePreview, FixtureRestoreResult, Versioned } from './demo-admin.model';
import { demoError } from './demo-error';
import { DemoPermissionsService } from '../../core/auth/demo-permissions.service';

@Component({
  selector: 'app-demo-restore-confirm',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule],
  template: `<h2 mat-dialog-title>Restaurar catálogo demo</h2><mat-dialog-content><p>Los fixtures gestionados volverán al manifest y quedarán en DRAFT. Los registros personalizados no se modifican.</p><p>Esta operación puede ocultar contenido publicado hasta que se publique de nuevo.</p></mat-dialog-content><mat-dialog-actions align="end"><button mat-button [mat-dialog-close]="false">Cancelar</button><button mat-flat-button [mat-dialog-close]="true">Restaurar catálogo</button></mat-dialog-actions>`,
})
export class DemoRestoreConfirmComponent {}

@Component({
  selector: 'app-demo-fixtures',
  standalone: true,
  imports: [RouterLink, MatButtonModule, NgTemplateOutlet, DatePipe],
  template: `
    <section class="demo-page" aria-labelledby="fixtures-title">
      <a routerLink="/demo-content" class="demo-back">← Contenido demo</a>
      <header class="demo-heading"><div><span class="demo-kicker">CONTROL DEL CATÁLOGO</span><h1 id="fixtures-title">Fixtures</h1><p>Revisa el efecto antes de restaurar. El preview no modifica datos.</p></div></header>
      @if (error()) { <div class="error-banner" role="alert">{{ error() }} @if (reloadNeeded()) { <button type="button" (click)="previewRestore()">Actualizar preview</button> }</div> }
      @if (result(); as r) { <div class="demo-card" role="status"><strong>Restauración completada</strong><p>Revisión {{ r.previousRevision }} → {{ r.newRevision }} · manifest v{{ r.manifestVersion }}</p><small>ID {{ r.restoreId }}</small></div> }
      @if (permissions.has('DEMO_RESTORE')) { <div class="demo-actions"><button mat-flat-button type="button" (click)="previewRestore()" [disabled]="busy()">Previsualizar restauración</button><button mat-stroked-button type="button" (click)="confirmRestore()" [disabled]="busy() || !preview() || stale() || !isPreviewRecent() || hasConflicts()">Restaurar catálogo</button></div> }
      @else { <p class="demo-note">Se requiere DEMO_RESTORE para previsualizar o restaurar fixtures.</p> }
      @if (result() && stats(); as s) { <p class="demo-note">Estadísticas actualizadas: {{ s.usersTotal }} usuarios, {{ s.typesTotal }} tipos, {{ s.tasksTotal }} tareas.</p> }
      @if (busy()) { <div class="demo-card demo-skeleton" aria-label="Cargando preview"></div> }
      @if (permissions.canRestoreDemo() && preview(); as p) {
        <div class="demo-grid">
          <article class="demo-card"><span>Manifest</span><strong>v{{ p.body.manifestVersion }}</strong><small>Aplicado: {{ p.body.currentManifestVersion ?? 'ninguno' }}</small></article>
          <article class="demo-card"><span>Revisión actual</span><strong>{{ p.body.currentRevision }}</strong><small>Objetivo: {{ p.body.targetRevision }} · Preview: {{ previewedAt() | date:'short' }}</small></article>
          <article class="demo-card"><span>Registros personalizados</span><strong>{{ p.body.customRecords }}</strong><small>Fuera del alcance de restore</small></article>
        </div>
        @if (hasConflicts()) { <div class="error-banner" role="alert">Hay conflictos. Revísalos antes de restaurar.</div> }
        <div class="demo-grid">
          <article class="demo-card"><h2>Usuarios</h2><ng-container [ngTemplateOutlet]="changes" [ngTemplateOutletContext]="{ $implicit: p.body.users }" /></article>
          <article class="demo-card"><h2>Tipos</h2><ng-container [ngTemplateOutlet]="changes" [ngTemplateOutletContext]="{ $implicit: p.body.types }" /></article>
          <article class="demo-card"><h2>Tareas</h2><ng-container [ngTemplateOutlet]="changes" [ngTemplateOutletContext]="{ $implicit: p.body.tasks }" /></article>
        </div>
        @if (p.body.catalogConflicts.length) { <div class="demo-card"><h2>Conflictos generales</h2><p>{{ p.body.catalogConflicts.join(', ') }}</p></div> }
      }
      <ng-template #changes let-c><dl class="demo-changes"><div><dt>Crear</dt><dd>{{ c.create.length }}</dd></div><div><dt>Actualizar</dt><dd>{{ c.update.length }}</dd></div><div><dt>Sin cambios</dt><dd>{{ c.unchanged.length }}</dd></div><div><dt>Retirados</dt><dd>{{ c.retired.length }}</dd></div><div><dt>Conflictos</dt><dd>{{ c.conflicts.length }}</dd></div></dl>@if (c.conflicts.length) { <p class="demo-note">{{ c.conflicts.join(', ') }}</p> }</ng-template>
    </section>`,
})
export class DemoFixturesComponent {
  private readonly api = inject(DemoAdminApiService);
  readonly permissions = inject(DemoPermissionsService);
  private readonly dialog = inject(MatDialog);
  private readonly destroyRef = inject(DestroyRef);
  readonly preview = signal<Versioned<FixturePreview> | null>(null);
  readonly result = signal<FixtureRestoreResult | null>(null);
  readonly error = signal('');
  readonly busy = signal(false);
  readonly stale = signal(false);
  readonly reloadNeeded = signal(false);
  readonly previewedAt = signal(0);
  readonly stats = signal<DemoStats | null>(null);

  constructor() {
    effect(() => { if (!this.permissions.canRestoreDemo()) { this.preview.set(null); this.stale.set(true); } });
  }

  isPreviewRecent(): boolean { return Date.now() - this.previewedAt() < 5 * 60_000; }

  hasConflicts(): boolean {
    const p = this.preview()?.body;
    return !!p && [p.users, p.types, p.tasks].some((c: FixtureChanges) => c.conflicts.length > 0) || !!p?.catalogConflicts.length;
  }

  previewRestore(): void {
    if (!this.permissions.has('DEMO_RESTORE')) return;
    this.busy.set(true); this.error.set(''); this.preview.set(null); this.stale.set(false);
    this.api.preview().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: value => { this.preview.set(value); this.previewedAt.set(Date.now()); this.busy.set(false); this.reloadNeeded.set(false); },
      error: error => { this.error.set(demoError(error).message); this.busy.set(false); },
    });
  }

  confirmRestore(): void {
    if (!this.permissions.has('DEMO_RESTORE')) return;
    const snapshot = this.preview();
    if (!snapshot || this.stale() || this.hasConflicts()) return;
    if (!this.isPreviewRecent()) { this.stale.set(true); this.reloadNeeded.set(true); this.error.set('El preview ha caducado. Actualízalo antes de restaurar.'); return; }
    this.dialog.open(DemoRestoreConfirmComponent, { width: 'min(92vw, 520px)', autoFocus: 'first-tabbable', restoreFocus: true })
      .afterClosed().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(confirmed => {
        if ((confirmed === true || confirmed === 'true') && this.permissions.canRestoreDemo() && this.preview()?.etag === snapshot.etag) this.restore(snapshot.etag);
      });
  }

  private restore(etag: string): void {
    this.busy.set(true); this.error.set('');
    this.api.restore(etag).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: response => {
        this.result.set(response.body); this.busy.set(false); this.previewRestore();
        if (this.permissions.has('DEMO_READ')) {
          this.api.stats().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
            next: stats => this.stats.set(stats),
            error: error => this.error.set(`Restauración completada, pero no se pudieron actualizar las estadísticas: ${demoError(error).message}`),
          });
        }
      },
      error: error => {
        const issue = demoError(error);
        this.error.set(error?.status === 409 ? 'El catálogo contiene conflictos. Actualiza y revisa el preview antes de continuar.' : issue.message); this.busy.set(false);
        if (issue.reload || error?.status === 409) { this.stale.set(true); this.reloadNeeded.set(true); }
      },
    });
  }
}
