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
  templateUrl: './users.component.html',
  styleUrl: './users.component.scss',
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
    this.loading.set(true);
    this.error.set(null);

    this.adminUsersService
      .getUsers({
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
          this.error.set('No se pudieron cargar los usuarios.');
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
