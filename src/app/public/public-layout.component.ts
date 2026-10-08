import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { ThemeService, ThemePreference } from '../core/theme/theme.service';

@Component({
  selector: 'app-public-layout', standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  template: `
    <a class="skip-link" href="#demo-content">Saltar al contenido</a>
    <div class="demo-shell">
      <header class="demo-header">
        <div class="demo-header-inner">
          <a class="demo-brand" routerLink="/demo" aria-label="Donit, inicio de la demo"><span aria-hidden="true">✓</span> donit <small>demo</small></a>
          <nav class="demo-nav" aria-label="Navegación de la demo">
            <a routerLink="/demo" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }">Inicio</a>
            <a routerLink="/demo/users" routerLinkActive="active">Usuarios</a>
            <a routerLink="/demo/task-types" routerLinkActive="active">Tipos</a>
            <a routerLink="/demo/tasks" routerLinkActive="active">Tareas</a>
          </nav>
          <div class="demo-header-actions">
            <label class="demo-theme">Tema <select aria-label="Tema visual" [value]="theme.preference()" (change)="setTheme($event)"><option value="system">Sistema</option><option value="light">Claro</option><option value="dark">Oscuro</option></select></label>
            <a class="demo-admin-link" routerLink="/login">Acceso admin</a>
          </div>
        </div>
      </header>
      <main id="demo-content" class="demo-main"><router-outlet /></main>
      <footer class="demo-footer"><span>Donit · Catálogo público de demostración</span><a routerLink="/demo">Volver al inicio</a></footer>
    </div>
  `,
})
export class PublicLayoutComponent {
  readonly theme = inject(ThemeService);
  setTheme(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    if (value === 'light' || value === 'dark' || value === 'system') this.theme.setPreference(value as ThemePreference);
  }
}
