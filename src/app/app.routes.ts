import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';

export const routes: Routes = [
  {
    path: 'demo',
    loadComponent: () => import('./public/public-layout.component').then((m) => m.PublicLayoutComponent),
    children: [
      { path: '', title: 'Donit · Demo', loadComponent: () => import('./public/public-home.component').then((m) => m.PublicHomeComponent) },
      { path: 'users', children: [
        { path: '', title: 'Usuarios · Donit', data: { kind: 'users' }, loadComponent: () => import('./public/public-list.component').then((m) => m.PublicListComponent) },
        { path: ':publicId', title: 'Usuario · Donit', data: { kind: 'users' }, loadComponent: () => import('./public/public-detail.component').then((m) => m.PublicDetailComponent) },
      ] },
      { path: 'task-types', children: [
        { path: '', title: 'Tipos · Donit', data: { kind: 'task-types' }, loadComponent: () => import('./public/public-list.component').then((m) => m.PublicListComponent) },
        { path: ':publicId', title: 'Tipo · Donit', data: { kind: 'task-types' }, loadComponent: () => import('./public/public-detail.component').then((m) => m.PublicDetailComponent) },
      ] },
      { path: 'tasks', children: [
        { path: '', title: 'Tareas · Donit', data: { kind: 'tasks' }, loadComponent: () => import('./public/public-list.component').then((m) => m.PublicListComponent) },
        { path: ':publicId', title: 'Tarea · Donit', data: { kind: 'tasks' }, loadComponent: () => import('./public/public-detail.component').then((m) => m.PublicDetailComponent) },
      ] },
    ],
  },
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
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        title: 'Dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent),
      },
      {
        path: 'settings',
        title: 'Configuración',
        loadComponent: () =>
          import('./features/settings/settings.component').then((m) => m.SettingsComponent),
      },
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
