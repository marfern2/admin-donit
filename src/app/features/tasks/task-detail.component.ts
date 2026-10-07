import { Component, OnInit, signal, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AdminTasksService } from './services/admin-tasks.service';
import { AdminTaskDetail } from './models/admin-task.model';
import { adminErrorMessage } from '../../shared/admin-error-message';

@Component({
  selector: 'app-task-detail',
  standalone: true,
  imports: [MatButtonModule, MatIconModule, MatCardModule, MatProgressSpinnerModule],
  templateUrl: './task-detail.component.html',
  styleUrl: './task-detail.component.css',
})
export class TaskDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly adminTasksService = inject(AdminTasksService);
  private readonly destroyRef = inject(DestroyRef);

  readonly task = signal<AdminTaskDetail | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  private taskId = 0;

  ngOnInit(): void {
    this.taskId = Number(this.route.snapshot.paramMap.get('id'));
    this.loadTask();
  }

  loadTask(): void {
    this.loading.set(true);
    this.task.set(null);
    this.error.set(null);

    this.adminTasksService.getTaskById(this.taskId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (task) => {
        if (task) this.task.set(task);
        else this.error.set('No se pudo cargar la tarea.');
        this.loading.set(false);
      },
      error: (error) => {
        this.error.set(adminErrorMessage(error, 'No se pudo cargar la tarea.'));
        this.loading.set(false);
      },
    });
  }

  goBack(): void {
    const usuarioId = this.task()?.usuarioId;
    if (usuarioId) {
      this.router.navigate(['/users', usuarioId], { queryParams: { tab: 'tasks' } });
    } else {
      this.router.navigate(['/users']);
    }
  }

  formatStatus(completada: boolean | null): string {
    if (completada === true) return 'Completada';
    return 'Pendiente';
  }

  formatTipo(tipoTareaNombre: string | null): string {
    return tipoTareaNombre ?? 'Sin tipo';
  }

  formatFecha(fecha: string | null): string {
    return fecha ?? '-';
  }

  formatUrgencia(urgencia: number | null): string {
    return urgencia !== null ? String(urgencia) : '-';
  }

  formatDescripcion(descripcion: string | null): string {
    return descripcion ?? '-';
  }
}
