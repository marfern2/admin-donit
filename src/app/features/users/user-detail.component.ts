import { Component, OnInit, signal, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatTabsModule } from '@angular/material/tabs';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AdminUsersService } from './services/admin-users.service';
import { AdminUserDetail, AdminUserTaskSummary } from './models/admin-user.model';

@Component({
  selector: 'app-user-detail',
  standalone: true,
  imports: [
    MatTableModule,
    MatPaginatorModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatTabsModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './user-detail.component.html',
  styleUrl: './user-detail.component.scss',
})
export class UserDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly adminUsersService = inject(AdminUsersService);

  readonly user = signal<AdminUserDetail | null>(null);
  readonly userLoading = signal(false);
  readonly userError = signal<string | null>(null);

  readonly tasks = signal<AdminUserTaskSummary[]>([]);
  readonly tasksLoading = signal(false);
  readonly tasksError = signal<string | null>(null);
  readonly tasksTotal = signal(0);
  readonly tasksPage = signal(0);
  readonly tasksSize = signal(20);

  readonly taskColumns = ['id', 'titulo', 'fecha', 'completada', 'urgencia', 'tipoTareaNombre'];

  readonly selectedTab = signal(0);

  private userId = 0;
  private tasksLoaded = false;

  ngOnInit(): void {
    this.userId = Number(this.route.snapshot.paramMap.get('id'));

    const tabParam = this.route.snapshot.queryParamMap.get('tab');
    if (tabParam === 'tasks') {
      this.selectedTab.set(1);
    }

    this.loadUser();

    if (this.selectedTab() === 1) {
      this.loadTasks();
    }
  }

  onTabChange(index: number): void {
    this.selectedTab.set(index);
    if (index === 1 && !this.tasksLoaded) {
      this.loadTasks();
    }
  }

  loadUser(): void {
    this.userLoading.set(true);
    this.userError.set(null);

    this.adminUsersService.getUserById(this.userId).subscribe({
      next: (user) => {
        this.user.set(user);
        this.userLoading.set(false);
      },
      error: () => {
        this.userError.set('No se pudo cargar el usuario.');
        this.userLoading.set(false);
      },
    });
  }

  loadTasks(): void {
    this.tasksLoading.set(true);
    this.tasksError.set(null);

    this.adminUsersService
      .getUserTasks(this.userId, {
        page: this.tasksPage(),
        size: this.tasksSize(),
      })
      .subscribe({
        next: (data) => {
          this.tasks.set(data.content);
          this.tasksTotal.set(data.totalElements);
          this.tasksLoading.set(false);
          this.tasksLoaded = true;
        },
        error: () => {
          this.tasksError.set('No se pudieron cargar las tareas.');
          this.tasksLoading.set(false);
          this.tasksLoaded = true;
        },
      });
  }

  onTasksPageChange(event: PageEvent): void {
    this.tasksPage.set(event.pageIndex);
    this.tasksSize.set(event.pageSize);
    this.loadTasks();
  }

  goBack(): void {
    this.router.navigate(['/users']);
  }

  formatTaskStatus(completada: boolean | null): string {
    if (completada === true) return 'Completada';
    if (completada === false) return 'Pendiente';
    return 'Pendiente';
  }

  formatTaskType(tipoTareaNombre: string | null): string {
    return tipoTareaNombre ?? 'Sin tipo';
  }

  formatFecha(fecha: string | null): string {
    return fecha ?? '-';
  }
}
