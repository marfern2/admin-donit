import { Component, OnInit, signal, inject, DestroyRef } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged, forkJoin } from 'rxjs';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AdminTasksService } from './services/admin-tasks.service';
import { AdminTaskTypesService } from '../task-types/services/admin-task-types.service';
import { AdminPage } from '../../shared/models/admin-page.model';
import { AdminTaskSummary } from './models/admin-task.model';
import { AdminTaskTypeSummary } from '../task-types/models/admin-task-type.model';

@Component({
  selector: 'app-tasks',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './tasks.component.html',
  styleUrl: './tasks.component.scss',
})
export class TasksComponent implements OnInit {
  private readonly adminTasksService = inject(AdminTasksService);
  private readonly adminTaskTypesService = inject(AdminTaskTypesService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly searchCtrl = new FormControl('', { nonNullable: true });
  readonly userIdCtrl = new FormControl<number | null>(null);
  readonly completedCtrl = new FormControl<'all' | 'true' | 'false'>('all', { nonNullable: true });
  readonly urgencyCtrl = new FormControl('', { nonNullable: true });
  readonly taskTypeIdCtrl = new FormControl<number | null>(null);

  readonly page = signal(0);
  readonly size = signal(20);
  readonly sortActive = signal('fecha');
  readonly sortDirection = signal<'asc' | 'desc'>('desc');
  readonly data = signal<AdminPage<AdminTaskSummary> | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  readonly taskTypes = signal<AdminTaskTypeSummary[]>([]);
  readonly loadingTypes = signal(false);
  readonly typesError = signal<string | null>(null);

  readonly displayedColumns = ['id', 'titulo', 'usuarioUsername', 'fecha', 'completada', 'urgencia', 'tipoTareaNombre', 'actions'];

  ngOnInit(): void {
    this.searchCtrl.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.page.set(0);
        this.loadData();
      });

    this.loadTaskTypes();
    this.loadData();
  }

  private loadTaskTypes(): void {
    this.loadingTypes.set(true);
    this.typesError.set(null);

    this.adminTaskTypesService
      .getTaskTypes({ page: 0, size: 100, sort: 'nombre,asc' })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (firstPage) => {
          if (firstPage.totalPages <= 1) {
            this.taskTypes.set(firstPage.content);
            this.loadingTypes.set(false);
            return;
          }

          const remainingPages: number[] = [];
          for (let p = 1; p < firstPage.totalPages && p < 10; p++) {
            remainingPages.push(p);
          }

          if (remainingPages.length > 0) {
            const requests = remainingPages.map((p) =>
              this.adminTaskTypesService.getTaskTypes({ page: p, size: 100, sort: 'nombre,asc' })
            );

            forkJoin(requests)
              .pipe(takeUntilDestroyed(this.destroyRef))
              .subscribe({
                next: (pages) => {
                  const allContent = [
                    ...firstPage.content,
                    ...pages.flatMap((page) => page.content),
                  ];
                  this.taskTypes.set(allContent);
                  this.loadingTypes.set(false);
                },
                error: () => {
                  this.taskTypes.set(firstPage.content);
                  this.typesError.set('No se pudieron cargar todos los tipos de tarea.');
                  this.loadingTypes.set(false);
                },
              });
          } else {
            this.taskTypes.set(firstPage.content);
            this.loadingTypes.set(false);
          }
        },
        error: () => {
          this.typesError.set('No se pudieron cargar los tipos de tarea.');
          this.loadingTypes.set(false);
        },
      });
  }

  loadData(): void {
    this.loading.set(true);
    this.error.set(null);

    const completedValue = this.completedCtrl.value;
    let completed: boolean | undefined;
    if (completedValue === 'true') {
      completed = true;
    } else if (completedValue === 'false') {
      completed = false;
    }

    this.adminTasksService
      .getTasks({
        page: this.page(),
        size: this.size(),
        search: this.searchCtrl.value || undefined,
        userId: this.userIdCtrl.value ?? undefined,
        completed,
        urgency: this.urgencyCtrl.value || undefined,
        taskTypeId: this.taskTypeIdCtrl.value ?? undefined,
        sort: `${this.sortActive()},${this.sortDirection()}`,
      })
      .subscribe({
        next: (data) => {
          this.data.set(data);
          this.loading.set(false);
        },
        error: () => {
          this.error.set('No se pudieron cargar las tareas.');
          this.loading.set(false);
        },
      });
  }

  onPageChange(event: PageEvent): void {
    this.page.set(event.pageIndex);
    this.size.set(event.pageSize);
    this.loadData();
  }

  onSortChange(event: Sort): void {
    const sortableColumns = ['id', 'titulo', 'fecha', 'completada', 'urgencia'];

    if (event.active && event.direction && sortableColumns.includes(event.active)) {
      this.sortActive.set(event.active);
      this.sortDirection.set(event.direction as 'asc' | 'desc');
    } else {
      this.sortActive.set('fecha');
      this.sortDirection.set('desc');
    }
    this.page.set(0);
    this.loadData();
  }

  onFilterChange(): void {
    this.page.set(0);
    this.loadData();
  }

  clearFilters(): void {
    this.searchCtrl.setValue('');
    this.userIdCtrl.setValue(null);
    this.completedCtrl.setValue('all');
    this.urgencyCtrl.setValue('');
    this.taskTypeIdCtrl.setValue(null);
    this.page.set(0);
    this.loadData();
  }

  hasActiveFilters(): boolean {
    return (
      !!this.searchCtrl.value ||
      this.userIdCtrl.value !== null ||
      this.completedCtrl.value !== 'all' ||
      !!this.urgencyCtrl.value ||
      this.taskTypeIdCtrl.value !== null
    );
  }

  viewTask(id: number): void {
    this.router.navigate(['/tasks', id]);
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

  formatUrgencia(urgencia: string | null): string {
    return urgencia ?? '-';
  }
}
