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
import { AdminUsersService } from './services/admin-users.service';
import { AdminPage, AdminUserSummary } from './models/admin-user.model';
import { isAdminPage } from '../../shared/models/admin-page.model';
import { adminErrorMessage } from '../../shared/admin-error-message';
import { SPANISH_PAGINATOR_PROVIDER } from '../../shared/spanish-paginator-intl';

@Component({
  selector: 'app-users',
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
  providers: [SPANISH_PAGINATOR_PROVIDER],
  templateUrl: './users.component.html',
  styleUrl: './users.component.css',
})
export class UsersComponent implements OnInit {
  private readonly adminUsersService = inject(AdminUsersService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly searchCtrl = new FormControl('', { nonNullable: true });
  readonly page = signal(0);
  readonly size = signal(20);
  readonly sortActive = signal('id');
  readonly sortDirection = signal<'asc' | 'desc'>('asc');
  readonly data = signal<AdminPage<AdminUserSummary> | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  private requestId = 0;

  readonly displayedColumns = ['id', 'username', 'email', 'taskCount', 'taskTypeCount', 'actions'];

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
    const requestId = ++this.requestId;
    this.loading.set(true);
    this.data.set(null);
    this.error.set(null);

    this.adminUsersService
      .getUsers({
        page: this.page(),
        size: this.size(),
        search: this.searchCtrl.value || undefined,
        sort: `${this.sortActive()},${this.sortDirection()}`,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          if (requestId !== this.requestId) return;
          if (!isAdminPage(data)) {
            this.error.set('La respuesta de usuarios no es válida. Inténtalo de nuevo.');
            this.loading.set(false);
            return;
          }
          this.data.set(data);
          this.loading.set(false);
        },
        error: (error) => {
          if (requestId !== this.requestId) return;
          this.error.set(adminErrorMessage(error, 'No se pudieron cargar los usuarios.'));
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
    if (event.active && event.direction) {
      this.sortActive.set(event.active);
      this.sortDirection.set(event.direction as 'asc' | 'desc');
    } else {
      this.sortActive.set('id');
      this.sortDirection.set('asc');
    }
    this.page.set(0);
    this.loadData();
  }

  clearSearch(): void {
    this.searchCtrl.setValue('');
  }

  viewUser(id: number): void {
    this.router.navigate(['/users', id]);
  }
}
