import { Component, OnInit, signal, inject, DestroyRef } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AdminTaskTypesService } from './services/admin-task-types.service';
import { AdminPage } from '../../shared/models/admin-page.model';
import { AdminTaskTypeSummary } from './models/admin-task-type.model';

@Component({
  selector: 'app-task-types',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './task-types.component.html',
  styleUrl: './task-types.component.scss',
})
export class TaskTypesComponent implements OnInit {
  private readonly adminTaskTypesService = inject(AdminTaskTypesService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly searchCtrl = new FormControl('', { nonNullable: true });
  readonly page = signal(0);
  readonly size = signal(20);
  readonly sortActive = signal('nombre');
  readonly sortDirection = signal<'asc' | 'desc'>('asc');
  readonly data = signal<AdminPage<AdminTaskTypeSummary> | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  readonly displayedColumns = ['id', 'nombre', 'descripcion', 'color', 'usuarioUsername', 'taskCount', 'actions'];

  ngOnInit(): void {
    this.searchCtrl.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.page.set(0);
        this.loadData();
      });

    this.loadData();
  }

  loadData(): void {
    this.loading.set(true);
    this.error.set(null);

    this.adminTaskTypesService
      .getTaskTypes({
        page: this.page(),
        size: this.size(),
        search: this.searchCtrl.value || undefined,
        sort: `${this.sortActive()},${this.sortDirection()}`,
      })
      .subscribe({
        next: (data) => {
          this.data.set(data);
          this.loading.set(false);
        },
        error: () => {
          this.error.set('No se pudieron cargar los tipos de tarea.');
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
    const sortableColumns = ['id', 'nombre', 'color'];

    if (event.active && event.direction && sortableColumns.includes(event.active)) {
      this.sortActive.set(event.active);
      this.sortDirection.set(event.direction as 'asc' | 'desc');
    } else {
      this.sortActive.set('nombre');
      this.sortDirection.set('asc');
    }
    this.page.set(0);
    this.loadData();
  }

  clearSearch(): void {
    this.searchCtrl.setValue('');
  }

  viewTaskType(id: number): void {
    this.router.navigate(['/task-types', id]);
  }

  formatDescripcion(descripcion: string | null): string {
    return descripcion ?? '-';
  }

  formatColor(color: string | null): string {
    return color ?? '-';
  }
}
