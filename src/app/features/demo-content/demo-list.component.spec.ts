import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, RouterModule } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { of } from 'rxjs';
import { DemoListComponent } from './demo-list.component';
import { DemoAdminApiService } from './demo-admin-api.service';
import { DemoPermissionsService } from '../../core/auth/demo-permissions.service';
import { DemoUser } from './demo-admin.model';

describe('DemoListComponent permissions', () => {
  const user: DemoUser = { id: 1, publicId: 'uuid', handle: 'demo', displayName: 'Demo', bio: null, publicationStatus: 'DRAFT', publishedAt: null, version: 0, createdAt: '', updatedAt: '' };
  const api = { list: vi.fn(() => of({ content: [user], number: 0, size: 20, totalElements: 1, totalPages: 1, first: true, last: true })) };
  const route = { snapshot: { data: { kind: 'users' } }, queryParamMap: of(convertToParamMap({})) };
  beforeEach(async () => {
    vi.clearAllMocks();
    await TestBed.configureTestingModule({ imports: [DemoListComponent, RouterModule.forRoot([])], providers: [
      { provide: DemoAdminApiService, useValue: api }, { provide: ActivatedRoute, useValue: route },
      { provide: MatDialog, useValue: { open: vi.fn() } },
    ] }).compileComponents();
  });

  it.each([
    { permissions: ['DEMO_READ'] as const, create: false, edit: false, publish: false, read: true },
    { permissions: ['DEMO_WRITE'] as const, create: false, edit: false, publish: false, read: false },
    { permissions: ['DEMO_PUBLISH'] as const, create: false, edit: false, publish: false, read: false },
    { permissions: ['DEMO_RESTORE'] as const, create: false, edit: false, publish: false, read: false },
    { permissions: ['DEMO_READ', 'DEMO_WRITE'] as const, create: true, edit: true, publish: false, read: true },
    { permissions: ['DEMO_READ', 'DEMO_PUBLISH'] as const, create: false, edit: false, publish: true, read: true },
    { permissions: ['DEMO_READ', 'DEMO_WRITE', 'DEMO_PUBLISH'] as const, create: true, edit: true, publish: true, read: true },
  ])('renders exact actions for $permissions', state => {
    TestBed.inject(DemoPermissionsService).setPermissions(state.permissions);
    const fixture = TestBed.createComponent(DemoListComponent); fixture.detectChanges();
    const text = fixture.nativeElement.textContent as string;
    expect(text.includes('Crear usuario')).toBe(state.create);
    expect(text.includes('Editar')).toBe(state.edit);
    expect(text.includes('Publicar')).toBe(state.publish);
    expect(api.list).toHaveBeenCalledTimes(state.read ? 1 : 0);
  });
});
