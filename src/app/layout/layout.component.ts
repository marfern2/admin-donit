import { Component, inject, signal, OnInit, DestroyRef } from '@angular/core';
import { Router, RouterOutlet, RouterLink, RouterLinkActive, NavigationEnd } from '@angular/router';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatListModule } from '@angular/material/list';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { filter, map } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AdminAuthService } from '../core/auth/auth.service';

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
  ],
  templateUrl: './layout.component.html',
  styleUrl: './layout.component.scss',
})
export class LayoutComponent implements OnInit {
  readonly authService = inject(AdminAuthService);
  private readonly router = inject(Router);
  private readonly breakpointObserver = inject(BreakpointObserver);
  private readonly destroyRef = inject(DestroyRef);

  readonly sidenav = signal(false);
  readonly isMobile = signal(false);
  readonly pageTitle = signal('Panel de Administración');

  private readonly routeTitles: Record<string, string> = {
    users: 'Usuarios',
    tasks: 'Tareas',
    'task-types': 'Tipos de tarea',
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

  private updateTitle(url: string): void {
    const segments = url.split('/').filter(Boolean);
    const lastSegment = segments[segments.length - 1];

    if (lastSegment && /^\d+$/.test(lastSegment) && segments.length >= 2) {
      const parentSegment = segments[segments.length - 2];
      this.pageTitle.set(this.routeTitles[parentSegment] ?? 'Detalle');
      return;
    }

    this.pageTitle.set(this.routeTitles[lastSegment ?? ''] ?? 'Panel de Administración');
  }
}
