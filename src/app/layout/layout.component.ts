import { Component, inject, signal, OnInit, DestroyRef } from '@angular/core';
import { Router, RouterOutlet, RouterLink, RouterLinkActive, NavigationEnd } from '@angular/router';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatListModule } from '@angular/material/list';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { filter, map } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AdminAuthService } from '../core/auth/auth.service';
import { ThemePreference, ThemeService } from '../core/theme/theme.service';
import { RuntimeConfigService } from '../core/config/runtime-config.service';
import { DemoPermissionsService } from '../core/auth/demo-permissions.service';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatSidenavModule,
    MatToolbarModule,
    MatListModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
  ],
  templateUrl: './layout.component.html',
  styleUrl: './layout.component.css',
})
export class LayoutComponent implements OnInit {
  readonly authService = inject(AdminAuthService);
  readonly demoPermissions = inject(DemoPermissionsService);
  readonly theme = inject(ThemeService);
  private readonly runtimeConfig = inject(RuntimeConfigService);
  private readonly router = inject(Router);
  private readonly breakpointObserver = inject(BreakpointObserver);
  private readonly destroyRef = inject(DestroyRef);

  readonly sidenav = signal(false);
  readonly isMobile = signal(false);
  readonly pageTitle = signal('Panel de Administración');
  readonly environmentLabel = (() => {
    try {
      const host = new URL(this.runtimeConfig.apiUrl).hostname;
      return host.split('.')[0].endsWith('-dev') || ['localhost', '127.0.0.1', '10.0.2.2'].includes(host) ? 'DEV' : 'PROD';
    } catch { return 'DEV'; }
  })();

  private readonly routeTitles: Record<string, string> = {
    dashboard: 'Dashboard',
    users: 'Usuarios',
    tasks: 'Tareas',
    'task-types': 'Tipos de tarea',
    'demo-content': 'Contenido demo',
    fixtures: 'Fixtures demo',
    settings: 'Configuración',
  };

  ngOnInit(): void {
    this.breakpointObserver
      .observe([Breakpoints.Handset, Breakpoints.TabletPortrait])
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result) => {
        this.isMobile.set(result.matches);
        if (!result.matches) {
          this.sidenav.set(false);
        }
      });

    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        map((event) => event as NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((event) => {
        this.updateTitle(event.urlAfterRedirects || event.url);
        if (this.isMobile()) {
          this.sidenav.set(false);
        }
      });

    this.updateTitle(this.router.url);
  }

  toggleSidenav(): void {
    this.sidenav.set(!this.sidenav());
  }

  closeSidenav(): void {
    if (this.isMobile()) {
      this.sidenav.set(false);
    }
  }

  setTheme(value: string): void {
    if (value === 'light' || value === 'dark' || value === 'system') {
      this.theme.setPreference(value as ThemePreference);
    }
  }

  private updateTitle(url: string): void {
    const segments = url.split(/[?#]/, 1)[0].split('/').filter(Boolean);
    const lastSegment = segments[segments.length - 1];

    if (lastSegment && /^\d+$/.test(lastSegment) && segments.length >= 2) {
      const parentSegment = segments[segments.length - 2];
      this.pageTitle.set(this.routeTitles[parentSegment] ?? 'Detalle');
      return;
    }

    this.pageTitle.set(this.routeTitles[lastSegment ?? ''] ?? 'Panel de Administración');
  }
}
