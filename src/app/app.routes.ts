import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    title: 'Iniciar sesión',
    loadComponent: () =>
      import('./features/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./layout/layout.component').then((m) => m.LayoutComponent),
    children: [
      { path: '', redirectTo: 'users', pathMatch: 'full' },
      {
        path: 'users',
        title: 'Usuarios',
        children: [
          {
            path: '',
            loadComponent: () =>
              import('./features/users/users.component').then((m) => m.UsersComponent),
          },
          {
            path: ':id',
            title: 'Detalle de usuario',
            loadComponent: () =>
              import('./features/users/user-detail.component').then(
                (m) => m.UserDetailComponent,
              ),
          },
        ],
      },
      {
        path: 'tasks',
        title: 'Tareas',
        children: [
          {
            path: '',
            loadComponent: () =>
              import('./features/tasks/tasks.component').then((m) => m.TasksComponent),
          },
          {
            path: ':id',
            title: 'Detalle de tarea',
            loadComponent: () =>
              import('./features/tasks/task-detail.component').then(
                (m) => m.TaskDetailComponent,
              ),
          },
        ],
      },
      {
        path: 'task-types',
        title: 'Tipos de tarea',
        children: [
          {
            path: '',
            loadComponent: () =>
              import('./features/task-types/task-types.component').then(
                (m) => m.TaskTypesComponent,
              ),
          },
          {
            path: ':id',
            title: 'Detalle de tipo',
            loadComponent: () =>
              import('./features/task-types/task-type-detail.component').then(
                (m) => m.TaskTypeDetailComponent,
              ),
          },
        ],
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
