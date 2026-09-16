import { Component, OnInit, signal, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AdminTasksService } from './services/admin-tasks.service';
import { AdminTaskDetail } from './models/admin-task.model';

@Component({
  selector: 'app-task-detail',
  standalone: true,
  imports: [MatButtonModule, MatIconModule, MatCardModule, MatProgressSpinnerModule],
  templateUrl: './task-detail.component.html',
  styleUrl: './task-detail.component.scss',
})
export class TaskDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly adminTasksService = inject(AdminTasksService);

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
    this.error.set(null);

    this.adminTasksService.getTaskById(this.taskId).subscribe({
      next: (task) => {
        this.task.set(task);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('No se pudo cargar la tarea.');
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
