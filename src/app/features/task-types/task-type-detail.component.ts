import { Component, OnInit, signal, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AdminTaskTypesService } from './services/admin-task-types.service';
import { AdminTaskTypeDetail } from './models/admin-task-type.model';

@Component({
  selector: 'app-task-type-detail',
  standalone: true,
  imports: [MatButtonModule, MatIconModule, MatCardModule, MatProgressSpinnerModule],
  templateUrl: './task-type-detail.component.html',
  styleUrl: './task-type-detail.component.scss',
})
export class TaskTypeDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly adminTaskTypesService = inject(AdminTaskTypesService);

  readonly taskType = signal<AdminTaskTypeDetail | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  private taskTypeId = 0;

  ngOnInit(): void {
    this.taskTypeId = Number(this.route.snapshot.paramMap.get('id'));
    this.loadTaskType();
  }

  loadTaskType(): void {
    this.loading.set(true);
    this.error.set(null);

    this.adminTaskTypesService.getTaskTypeById(this.taskTypeId).subscribe({
      next: (taskType) => {
        this.taskType.set(taskType);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('No se pudo cargar el tipo de tarea.');
        this.loading.set(false);
      },
    });
  }

  goBack(): void {
    this.router.navigate(['/task-types']);
  }

  formatDescripcion(descripcion: string | null): string {
    return descripcion ?? '-';
  }

  formatColor(color: string | null): string {
    return color ?? '-';
  }
}
