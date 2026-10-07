import { Component, DestroyRef, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MetricCardComponent, MetricCardData } from '../../shared/metric-card.component';
import { AdminUsersService } from '../users/services/admin-users.service';
import { AdminTasksService } from '../tasks/services/admin-tasks.service';
import { AdminAuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink, MatIconModule, MetricCardComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
})
export class DashboardComponent {
  private readonly users = inject(AdminUsersService);
  private readonly tasks = inject(AdminTasksService);
  private readonly destroyRef = inject(DestroyRef);
  readonly auth = inject(AdminAuthService);

  readonly metrics = signal<MetricCardData[]>([
    { label: 'Usuarios totales', icon: 'group', value: null, helper: 'Consultando usuarios', loading: true },
    { label: 'Usuarios activos', icon: 'person_check', value: null, helper: 'No disponible: falta una API de resumen', loading: false },
    { label: 'Tareas totales', icon: 'task_alt', value: null, helper: 'Consultando tareas', loading: true },
    { label: 'Tareas completadas', icon: 'verified', value: null, helper: 'Consultando tareas completadas', loading: true },
  ]);

  constructor() {
    this.users.getUsers({ page: 0, size: 1 }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (page) => this.updateMetric(0, page?.totalElements ?? null),
      error: () => this.updateMetric(0, null),
    });
    this.tasks.getTasks({ page: 0, size: 1 }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (page) => this.updateMetric(2, page?.totalElements ?? null),
      error: () => this.updateMetric(2, null),
    });
    this.tasks.getTasks({ page: 0, size: 1, completed: true }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (page) => this.updateMetric(3, page?.totalElements ?? null),
      error: () => this.updateMetric(3, null),
    });
  }

  private updateMetric(index: number, value: number | null): void {
    this.metrics.update((items) => items.map((item, position) => position === index ? {
      ...item, value, loading: false,
      helper: value === null ? 'No disponible en este momento' : 'Datos actuales del sistema',
    } : item));
  }
}
