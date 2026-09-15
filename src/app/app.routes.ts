import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
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
        children: [
          {
            path: '',
            loadComponent: () =>
              import('./features/users/users.component').then((m) => m.UsersComponent),
          },
          {
            path: ':id',
            loadComponent: () =>
              import('./features/users/user-detail.component').then(
                (m) => m.UserDetailComponent,
              ),
          },
        ],
      },
      {
        path: 'tasks',
        loadComponent: () =>
          import('./features/tasks/tasks.component').then((m) => m.TasksComponent),
      },
      {
        path: 'task-types',
        loadComponent: () =>
          import('./features/task-types/task-types.component').then(
            (m) => m.TaskTypesComponent,
          ),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
