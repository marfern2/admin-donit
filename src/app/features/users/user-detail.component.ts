import { Component, OnInit, signal, inject, DestroyRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatTabsModule } from '@angular/material/tabs';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatMenuModule } from '@angular/material/menu';
import { MatChipsModule } from '@angular/material/chips';
import { AdminUsersService } from './services/admin-users.service';
import {
  AdminUserDetail,
  AdminUserTaskSummary,
  AdminUserTaskTypeSummary,
} from './models/admin-user.model';
import { ConfirmDialogComponent } from './dialogs/confirm-dialog.component';
import { EditUserDialogComponent, EditUserData } from './dialogs/edit-user-dialog.component';
import {
  TaskFormDialogComponent,
  TaskFormDialogData,
} from './dialogs/task-form-dialog.component';
import {
  TaskTypeFormDialogComponent,
  TaskTypeFormDialogData,
} from './dialogs/task-type-form-dialog.component';
import { adminErrorMessage } from '../../shared/admin-error-message';
import { isAdminPage } from '../../shared/models/admin-page.model';
import { SPANISH_PAGINATOR_PROVIDER } from '../../shared/spanish-paginator-intl';

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
    MatMenuModule,
    MatChipsModule,
  ],
  providers: [SPANISH_PAGINATOR_PROVIDER],
  templateUrl: './user-detail.component.html',
  styleUrl: './user-detail.component.css',
})
export class UserDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly adminUsersService = inject(AdminUsersService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly destroyRef = inject(DestroyRef);

  readonly user = signal<AdminUserDetail | null>(null);
  readonly userLoading = signal(false);
  readonly userError = signal<string | null>(null);

  readonly tasks = signal<AdminUserTaskSummary[]>([]);
  readonly tasksLoading = signal(false);
  readonly tasksError = signal<string | null>(null);
  readonly tasksTotal = signal(0);
  readonly tasksPage = signal(0);
  readonly tasksSize = signal(20);

  readonly taskTypes = signal<AdminUserTaskTypeSummary[]>([]);
  readonly taskTypesLoading = signal(false);
  readonly taskTypesError = signal<string | null>(null);
  readonly taskTypesTotal = signal(0);
  readonly taskTypesPage = signal(0);
  readonly taskTypesSize = signal(20);

  readonly taskColumns = ['id', 'titulo', 'fecha', 'completada', 'urgencia', 'tipoTareaNombre', 'actions'];
  readonly taskTypeColumns = ['id', 'nombre', 'descripcion', 'color', 'taskCount', 'actions'];

  readonly selectedTab = signal(0);

  userId = 0;
  private tasksLoaded = false;
  private taskTypesLoaded = false;
  private tasksRequestId = 0;
  private taskTypesRequestId = 0;

  ngOnInit(): void {
    this.userId = Number(this.route.snapshot.paramMap.get('id'));

    const tabParam = this.route.snapshot.queryParamMap.get('tab');
    if (tabParam === 'tasks') {
      this.selectedTab.set(1);
    } else if (tabParam === 'task-types') {
      this.selectedTab.set(2);
    }

    this.loadUser();

    if (this.selectedTab() === 1) {
      this.loadTasks();
    } else if (this.selectedTab() === 2) {
      this.loadTaskTypes();
    }
  }

  onTabChange(index: number): void {
    this.selectedTab.set(index);
    if (index === 1 && !this.tasksLoaded) {
      this.loadTasks();
    } else if (index === 2 && !this.taskTypesLoaded) {
      this.loadTaskTypes();
    }
  }

  loadUser(): void {
    this.userLoading.set(true);
    this.user.set(null);
    this.userError.set(null);

    this.adminUsersService.getUserById(this.userId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (user) => {
        if (user) this.user.set(user);
        else this.userError.set('No se pudo cargar el usuario.');
        this.userLoading.set(false);
      },
      error: (error) => {
        this.userError.set(adminErrorMessage(error, 'No se pudo cargar el usuario.'));
        this.userLoading.set(false);
      },
    });
  }

  loadTasks(): void {
    const requestId = ++this.tasksRequestId;
    this.tasksLoading.set(true);
    this.tasks.set([]);
    this.tasksError.set(null);

    this.adminUsersService
      .getUserTasks(this.userId, {
        page: this.tasksPage(),
        size: this.tasksSize(),
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          if (requestId !== this.tasksRequestId) return;
          if (!isAdminPage(data)) {
            this.tasksError.set('La respuesta de tareas no es válida. Inténtalo de nuevo.');
            this.tasksLoading.set(false);
            this.tasksLoaded = true;
            return;
          }
          this.tasks.set(data.content);
          this.tasksTotal.set(data.totalElements);
          this.tasksLoading.set(false);
          this.tasksLoaded = true;
        },
        error: (error) => {
          if (requestId !== this.tasksRequestId) return;
          this.tasksError.set(adminErrorMessage(error, 'No se pudieron cargar las tareas.'));
          this.tasksLoading.set(false);
          this.tasksLoaded = true;
        },
      });
  }

  loadTaskTypes(): void {
    const requestId = ++this.taskTypesRequestId;
    this.taskTypesLoading.set(true);
    this.taskTypes.set([]);
    this.taskTypesError.set(null);

    this.adminUsersService
      .getUserTaskTypes(this.userId, {
        page: this.taskTypesPage(),
        size: this.taskTypesSize(),
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          if (requestId !== this.taskTypesRequestId) return;
          if (!isAdminPage(data)) {
            this.taskTypesError.set('La respuesta de tipos de tarea no es válida. Inténtalo de nuevo.');
            this.taskTypesLoading.set(false);
            this.taskTypesLoaded = true;
            return;
          }
          this.taskTypes.set(data.content);
          this.taskTypesTotal.set(data.totalElements);
          this.taskTypesLoading.set(false);
          this.taskTypesLoaded = true;
        },
        error: (error) => {
          if (requestId !== this.taskTypesRequestId) return;
          this.taskTypesError.set(adminErrorMessage(error, 'No se pudieron cargar los tipos de tarea.'));
          this.taskTypesLoading.set(false);
          this.taskTypesLoaded = true;
        },
      });
  }

  onTasksPageChange(event: PageEvent): void {
    this.tasksPage.set(event.pageIndex);
    this.tasksSize.set(event.pageSize);
    this.loadTasks();
  }

  onTaskTypesPageChange(event: PageEvent): void {
    this.taskTypesPage.set(event.pageIndex);
    this.taskTypesSize.set(event.pageSize);
    this.loadTaskTypes();
  }

  goBack(): void {
    this.router.navigate(['/users']);
  }

  // --- User actions ---

  openEditUserDialog(): void {
    const currentUser = this.user();
    if (!currentUser) return;

    const dialogRef = this.dialog.open(EditUserDialogComponent, {
      width: '400px',
      data: { username: currentUser.username, email: currentUser.email } satisfies EditUserData,
    });

    dialogRef.afterClosed().pipe(takeUntilDestroyed(this.destroyRef)).subscribe((result) => {
      if (!result) return;
      this.adminUsersService.updateUser(this.userId, result).subscribe({
        next: (updated) => {
          this.user.set(updated);
          this.snackBar.open('Usuario actualizado correctamente.', 'Cerrar', { duration: 3000 });
        },
        error: (err) => {
          this.handleUserUpdateError(err);
        },
      });
    });
  }

  toggleEnabled(): void {
    const currentUser = this.user();
    if (!currentUser) return;

    const newEnabled = !currentUser.enabled;
    const actionLabel = newEnabled ? 'Habilitar' : 'Deshabilitar';

    if (!newEnabled) {
      const dialogRef = this.dialog.open(ConfirmDialogComponent, {
        width: '420px',
        data: {
          title: 'Deshabilitar usuario',
          message:
            'El usuario dejará de poder iniciar sesión y sus sesiones activas serán revocadas.',
          confirmLabel: 'Deshabilitar',
          warn: true,
        },
      });

      dialogRef.afterClosed().pipe(takeUntilDestroyed(this.destroyRef)).subscribe((confirmed) => {
        if (confirmed) {
          this.applyEnabledChange(newEnabled);
        }
      });
    } else {
      this.applyEnabledChange(newEnabled);
    }
  }

  private applyEnabledChange(enabled: boolean): void {
    this.adminUsersService.setUserEnabled(this.userId, enabled).subscribe({
      next: (updated) => {
        this.user.set(updated);
        const label = enabled ? 'habilitado' : 'deshabilitado';
        this.snackBar.open(`Usuario ${label} correctamente.`, 'Cerrar', { duration: 3000 });
      },
      error: (error) => {
        this.showActionError(error, 'No se pudo cambiar el estado del usuario.');
      },
    });
  }

  deleteUser(): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '420px',
      data: {
        title: 'Eliminar usuario',
        message:
          'Esta acción eliminará permanentemente al usuario y sus datos asociados (tareas, tipos de tarea y sesiones).',
        confirmLabel: 'Eliminar usuario',
        warn: true,
      },
    });

    dialogRef.afterClosed().pipe(takeUntilDestroyed(this.destroyRef)).subscribe((confirmed) => {
      if (!confirmed) return;
      this.adminUsersService.deleteUser(this.userId).subscribe({
        next: () => {
          this.snackBar.open('Usuario eliminado correctamente.', 'Cerrar', { duration: 3000 });
          this.router.navigate(['/users']);
        },
        error: (error) => {
          this.showActionError(error, 'No se pudo eliminar el usuario.');
        },
      });
    });
  }

  // --- Task actions ---

  openCreateTaskDialog(): void {
    const taskTypes = this.taskTypes();
    if (taskTypes.length === 0) {
      this.snackBar.open('Crea al menos un tipo de tarea antes de crear tareas.', 'Cerrar', {
        duration: 4000,
      });
      return;
    }

    const dialogRef = this.dialog.open(TaskFormDialogComponent, {
      width: '500px',
      data: { taskTypes, isEdit: false } satisfies TaskFormDialogData,
    });

    dialogRef.afterClosed().pipe(takeUntilDestroyed(this.destroyRef)).subscribe((result) => {
      if (!result) return;
      this.adminUsersService.createTask(this.userId, result).subscribe({
        next: () => {
          this.snackBar.open('Tarea creada correctamente.', 'Cerrar', { duration: 3000 });
          this.loadTasks();
          this.loadUser();
        },
        error: (error) => {
          this.showActionError(error, 'No se pudo crear la tarea.');
        },
      });
    });
  }

  openEditTaskDialog(task: AdminUserTaskSummary): void {
    const dialogRef = this.dialog.open(TaskFormDialogComponent, {
      width: '500px',
      data: {
        titulo: task.titulo,
        descripcion: task.descripcion,
        fecha: task.fecha ?? '',
        completada: task.completada ?? false,
        urgencia: task.urgencia ?? 0,
        tipoTareaId: task.tipoTareaId ?? 0,
        taskTypes: this.taskTypes(),
        isEdit: true,
      } satisfies TaskFormDialogData,
    });

    dialogRef.afterClosed().pipe(takeUntilDestroyed(this.destroyRef)).subscribe((result) => {
      if (!result) return;
      this.adminUsersService.updateTask(this.userId, task.id, result).subscribe({
        next: () => {
          this.snackBar.open('Tarea actualizada correctamente.', 'Cerrar', { duration: 3000 });
          this.loadTasks();
          this.loadUser();
        },
        error: (error) => {
          this.showActionError(error, 'No se pudo actualizar la tarea.');
        },
      });
    });
  }

  toggleTaskCompleted(task: AdminUserTaskSummary): void {
    const newStatus = !(task.completada ?? false);
    this.adminUsersService.updateTask(this.userId, task.id, { completada: newStatus }).subscribe({
      next: () => {
        this.loadTasks();
        this.loadUser();
      },
      error: (error) => {
        this.showActionError(error, 'No se pudo actualizar la tarea.');
      },
    });
  }

  deleteTask(task: AdminUserTaskSummary): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Eliminar tarea',
        message: '¿Estás seguro de que deseas eliminar esta tarea?',
        confirmLabel: 'Eliminar',
        warn: true,
      },
    });

    dialogRef.afterClosed().pipe(takeUntilDestroyed(this.destroyRef)).subscribe((confirmed) => {
      if (!confirmed) return;
      this.adminUsersService.deleteTask(this.userId, task.id).subscribe({
        next: () => {
          this.snackBar.open('Tarea eliminada correctamente.', 'Cerrar', { duration: 3000 });
          if (this.tasks().length === 1 && this.tasksPage() > 0) {
            this.tasksPage.set(this.tasksPage() - 1);
          }
          this.loadTasks();
          this.loadUser();
        },
        error: (error) => {
          this.showActionError(error, 'No se pudo eliminar la tarea.');
        },
      });
    });
  }

  // --- Task type actions ---

  openCreateTaskTypeDialog(): void {
    const dialogRef = this.dialog.open(TaskTypeFormDialogComponent, {
      width: '400px',
      data: { isEdit: false } satisfies TaskTypeFormDialogData,
    });

    dialogRef.afterClosed().pipe(takeUntilDestroyed(this.destroyRef)).subscribe((result) => {
      if (!result) return;
      this.adminUsersService.createTaskType(this.userId, result).subscribe({
        next: () => {
          this.snackBar.open('Tipo de tarea creado correctamente.', 'Cerrar', { duration: 3000 });
          this.loadTaskTypes();
          this.loadUser();
        },
        error: (error) => {
          this.showActionError(error, 'No se pudo crear el tipo de tarea.');
        },
      });
    });
  }

  openEditTaskTypeDialog(taskType: AdminUserTaskTypeSummary): void {
    const dialogRef = this.dialog.open(TaskTypeFormDialogComponent, {
      width: '400px',
      data: {
        nombre: taskType.nombre,
        descripcion: taskType.descripcion,
        color: taskType.color ?? '#3f51b5',
        isEdit: true,
      } satisfies TaskTypeFormDialogData,
    });

    dialogRef.afterClosed().pipe(takeUntilDestroyed(this.destroyRef)).subscribe((result) => {
      if (!result) return;
      this.adminUsersService.updateTaskType(this.userId, taskType.id, result).subscribe({
        next: () => {
          this.snackBar.open('Tipo de tarea actualizado correctamente.', 'Cerrar', {
            duration: 3000,
          });
          this.loadTaskTypes();
        },
        error: (error) => {
          this.showActionError(error, 'No se pudo actualizar el tipo de tarea.');
        },
      });
    });
  }

  deleteTaskType(taskType: AdminUserTaskTypeSummary): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Eliminar tipo de tarea',
        message: '¿Estás seguro de que deseas eliminar este tipo de tarea?',
        confirmLabel: 'Eliminar',
        warn: true,
      },
    });

    dialogRef.afterClosed().pipe(takeUntilDestroyed(this.destroyRef)).subscribe((confirmed) => {
      if (!confirmed) return;
      this.adminUsersService.deleteTaskType(this.userId, taskType.id).subscribe({
        next: () => {
          this.snackBar.open('Tipo de tarea eliminado correctamente.', 'Cerrar', {
            duration: 3000,
          });
          if (this.taskTypes().length === 1 && this.taskTypesPage() > 0) {
            this.taskTypesPage.set(this.taskTypesPage() - 1);
          }
          this.loadTaskTypes();
          this.loadUser();
        },
        error: (err) => {
          if (err?.status === 409) {
            this.snackBar.open(
              'No se puede eliminar este tipo porque tiene tareas asociadas.',
              'Cerrar',
              { duration: 4000 },
            );
          } else {
            this.showActionError(err, 'No se pudo eliminar el tipo de tarea.');
          }
        },
      });
    });
  }

  // --- Helpers ---

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

  private handleUserUpdateError(err: { status?: number }): void {
    if (err?.status === 409) {
      this.snackBar.open('El nombre de usuario o email ya está en uso.', 'Cerrar', {
        duration: 4000,
      });
    } else {
      this.showActionError(err, 'No se pudo actualizar el usuario.');
    }
  }

  private showActionError(error: unknown, fallback: string): void {
    this.snackBar.open(adminErrorMessage(error, fallback), 'Cerrar', { duration: 5000 });
  }
}
