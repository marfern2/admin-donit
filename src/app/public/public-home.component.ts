import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PublicDemoApiService } from './public-demo-api.service';
import { PublicDemoStats } from './public-demo.model';
import { publicErrorMessage } from './public-error';

@Component({
  selector: 'app-public-home', standalone: true, imports: [RouterLink],
  template: `
    <section class="demo-hero">
      <span class="demo-eyebrow">EXPLORA DONIT</span>
      <h1>Una demo abierta para descubrir Donit.</h1>
      <p>Explora usuarios, tipos y tareas con datos sintéticos de demostración. El catálogo es de solo lectura y no requiere iniciar sesión.</p>
      <a class="demo-button" routerLink="/demo/tasks">Explorar tareas <span aria-hidden="true">→</span></a>
    </section>
    <section class="demo-section" aria-labelledby="stats-title">
      <div class="demo-section-heading"><div><span class="demo-eyebrow">EN CIFRAS</span><h2 id="stats-title">El catálogo ahora</h2></div></div>
      @if (state().loading) {
        <div class="demo-stats" aria-busy="true" aria-label="Cargando estadísticas"><div class="demo-skeleton"></div><div class="demo-skeleton"></div><div class="demo-skeleton"></div><div class="demo-skeleton"></div></div>
      } @else if (state().error) {
        <div class="demo-notice" role="alert"><p>{{ state().error }}</p><button type="button" (click)="retry()">Reintentar</button></div>
      } @else if (state().stats; as stats) {
        <div class="demo-stats">
          <div class="demo-stat"><strong>{{ stats.users }}</strong><span>Usuarios</span></div>
          <div class="demo-stat"><strong>{{ stats.taskTypes }}</strong><span>Tipos</span></div>
          <div class="demo-stat"><strong>{{ stats.tasks }}</strong><span>Tareas</span></div>
          <div class="demo-stat"><strong>{{ stats.completedTasks }}</strong><span>Tareas completadas</span></div>
        </div>
        @if (stats.users === 0 && stats.taskTypes === 0 && stats.tasks === 0) { <p class="demo-muted">Aún no hay elementos publicados. Puedes explorar las secciones mientras se prepara la demo.</p> }
      }
    </section>
    <section class="demo-section" aria-labelledby="explore-title">
      <div class="demo-section-heading"><div><span class="demo-eyebrow">EXPLORAR</span><h2 id="explore-title">Elige por dónde empezar</h2></div></div>
      <div class="demo-feature-grid">
        <a class="demo-feature" routerLink="/demo/users"><span class="demo-feature-icon" aria-hidden="true">◉</span><h3>Usuarios</h3><p>Conoce los perfiles públicos de la demo.</p><span>Ver usuarios →</span></a>
        <a class="demo-feature" routerLink="/demo/task-types"><span class="demo-feature-icon" aria-hidden="true">▦</span><h3>Tipos</h3><p>Descubre las categorías que organizan las tareas.</p><span>Ver tipos →</span></a>
        <a class="demo-feature" routerLink="/demo/tasks"><span class="demo-feature-icon" aria-hidden="true">✓</span><h3>Tareas</h3><p>Explora tareas, estados y urgencias.</p><span>Ver tareas →</span></a>
      </div>
    </section>
  `,
})
export class PublicHomeComponent {
  private readonly api = inject(PublicDemoApiService);
  readonly state = signal<{ loading: boolean; stats: PublicDemoStats | null; error: string | null }>({ loading: true, stats: null, error: null });
  constructor() { this.retry(); }
  retry(): void {
    this.state.set({ loading: true, stats: null, error: null });
    this.api.stats().subscribe({
      next: stats => this.state.set({ loading: false, stats, error: null }),
      error: error => this.state.set({ loading: false, stats: null, error: publicErrorMessage(error) }),
    });
  }
}
