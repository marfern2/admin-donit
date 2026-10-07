import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { UsersComponent } from './users.component';
import { RuntimeConfigService } from '../../core/config/runtime-config.service';
import { environment } from '../../../environments/environment';

describe('UsersComponent', () => {
  let component: UsersComponent;
  let fixture: ComponentFixture<UsersComponent>;
  let httpMock: HttpTestingController;

  const apiUrl = `${environment.apiUrl}/api/admin/users`;

  const mockPageResponse = {
    content: [
      { id: 1, username: 'user1', email: 'user1@test.com', taskCount: 5, taskTypeCount: 2 },
      { id: 2, username: 'user2', email: 'user2@test.com', taskCount: 3, taskTypeCount: 1 },
    ],
    page: 0,
    size: 20,
    totalElements: 2,
    totalPages: 1,
    first: true,
    last: true,
  };

  function flushUsersRequest(response = mockPageResponse) {
    const req = httpMock.expectOne((r) => r.url === apiUrl);
    req.flush(response);
    return req;
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UsersComponent, NoopAnimationsModule],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: RuntimeConfigService, useValue: { apiUrl: environment.apiUrl } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(UsersComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should create', () => {
    fixture.detectChanges();
    flushUsersRequest();
    expect(component).toBeTruthy();
  });

  it('should load users on init', () => {
    fixture.detectChanges();
    const req = flushUsersRequest();
    expect(req.request.params.get('page')).toBe('0');
    expect(req.request.params.get('size')).toBe('20');
    expect(component.data()?.content.length).toBe(2);
  });

  it('should reset page to 0 on search', async () => {
    fixture.detectChanges();
    flushUsersRequest();

    component.page.set(5);
    component.searchCtrl.setValue('test');

    await new Promise((r) => setTimeout(r, 400));

    const req = flushUsersRequest();
    expect(req.request.params.get('page')).toBe('0');
    expect(req.request.params.get('search')).toBe('test');
  });

  it('should handle pagination', () => {
    fixture.detectChanges();
    flushUsersRequest();

    component.onPageChange({ pageIndex: 1, pageSize: 10, length: 50 });

    expect(component.page()).toBe(1);
    expect(component.size()).toBe(10);

    const req = flushUsersRequest();
    expect(req.request.params.get('page')).toBe('1');
    expect(req.request.params.get('size')).toBe('10');
  });

  it('ignores an older response after pagination changes', () => {
    fixture.detectChanges();
    const first = httpMock.expectOne((r) => r.url === apiUrl && r.params.get('page') === '0');
    component.onPageChange({ pageIndex: 1, pageSize: 20, length: 40 });
    const second = httpMock.expectOne((r) => r.url === apiUrl && r.params.get('page') === '1');

    second.flush({ ...mockPageResponse, page: 1, content: [{ ...mockPageResponse.content[0], username: 'newer' }] });
    first.flush(mockPageResponse);
    expect(component.data()?.content[0].username).toBe('newer');
  });

  it('should handle sort', () => {
    fixture.detectChanges();
    flushUsersRequest();

    component.onSortChange({ active: 'username', direction: 'desc' });

    expect(component.sortActive()).toBe('username');
    expect(component.sortDirection()).toBe('desc');
    expect(component.page()).toBe(0);

    const req = flushUsersRequest();
    expect(req.request.params.get('sort')).toBe('username,desc');
  });

  it('should reset sort to id asc when direction is empty', () => {
    fixture.detectChanges();
    flushUsersRequest();

    component.sortActive.set('username');
    component.sortDirection.set('desc');
    component.onSortChange({ active: 'username', direction: '' });

    expect(component.sortActive()).toBe('id');
    expect(component.sortDirection()).toBe('asc');

    const req = flushUsersRequest();
    expect(req.request.params.get('sort')).toBe('id,asc');
  });

  it('should show error on failure', () => {
    fixture.detectChanges();
    const req = httpMock.expectOne((r) => r.url === apiUrl);
    req.flush('Error', { status: 500, statusText: 'Server Error' });

    expect(component.error()).toBe('No se pudieron cargar los usuarios.');
    expect(component.loading()).toBeFalsy();
  });

  it('shows a recoverable error for a null page response', () => {
    fixture.detectChanges();
    httpMock.expectOne((request) => request.url === apiUrl).flush(null);
    fixture.detectChanges();

    expect(component.data()).toBeNull();
    expect(component.error()).toContain('no es válida');
    expect(fixture.nativeElement.querySelector('.error-banner button')).toBeTruthy();
  });

  it('explains rate limits and lets the user retry', () => {
    fixture.detectChanges();
    httpMock.expectOne((r) => r.url === apiUrl)
      .flush('Limit', { status: 429, statusText: 'Too Many Requests' });
    fixture.detectChanges();

    expect(component.error()).toContain('Demasiadas solicitudes');
    const retry = fixture.nativeElement.querySelector('.error-banner button') as HTMLButtonElement;
    retry.click();
    flushUsersRequest();
    expect(component.data()?.totalElements).toBe(2);
  });

  it('should clear search', () => {
    fixture.detectChanges();
    flushUsersRequest();

    component.searchCtrl.setValue('test');
    component.clearSearch();
    expect(component.searchCtrl.value).toBe('');
  });
});
