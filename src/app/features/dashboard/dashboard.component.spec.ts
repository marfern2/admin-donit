import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { DashboardComponent } from './dashboard.component';
import { AdminUsersService } from '../users/services/admin-users.service';
import { AdminTasksService } from '../tasks/services/admin-tasks.service';
import { AdminAuthService } from '../../core/auth/auth.service';
import { DemoPermissionsService } from '../../core/auth/demo-permissions.service';

describe('DashboardComponent', () => {
  const page = (totalElements: number) => ({ content: [], page: 0, size: 1, totalElements, totalPages: 0, first: true, last: true });
  let getUsers: ReturnType<typeof vi.fn>;
  let getTasks: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    getUsers = vi.fn().mockReturnValue(of(page(42)));
    getTasks = vi.fn().mockImplementation((params) => of(page(params.completed ? 31 : 76)));
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AdminUsersService, useValue: { getUsers } },
        { provide: AdminTasksService, useValue: { getTasks } },
        { provide: AdminAuthService, useValue: { currentUser: () => ({ username: 'Marcos' }) } },
      ],
    });
    TestBed.inject(DemoPermissionsService).setPermissions(['ADMIN_READ']);
  });

  it('uses paginated totals without downloading complete collections', () => {
    const fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();
    expect(getUsers).toHaveBeenCalledWith({ page: 0, size: 1 });
    expect(getTasks).toHaveBeenCalledWith({ page: 0, size: 1, completed: true });
    expect(fixture.componentInstance.metrics().map((metric) => metric.value)).toEqual([42, null, 76, 31]);
    expect(fixture.nativeElement.textContent).toContain('Marcos');
    expect(fixture.nativeElement.textContent).toContain('No disponible');
  });

  it('shows unavailable state when an endpoint fails', () => {
    getUsers.mockReturnValue(throwError(() => new Error('offline')));
    const fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance.metrics()[0].value).toBeNull();
    expect(fixture.componentInstance.metrics()[0].loading).toBe(false);
    expect(fixture.nativeElement.textContent).toContain('No disponible en este momento');
  });

  it('does not request real admin data or render widgets without ADMIN_READ', () => {
    TestBed.inject(DemoPermissionsService).setPermissions(['DEMO_READ', 'DEMO_WRITE', 'DEMO_PUBLISH', 'DEMO_RESTORE']);
    const fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();
    expect(getUsers).not.toHaveBeenCalled();
    expect(getTasks).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('.dashboard')).toBeNull();
  });
});
