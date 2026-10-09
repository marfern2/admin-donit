import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { RouterModule } from '@angular/router';
import { of } from 'rxjs';
import { throwError } from 'rxjs';
import { HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { DemoAdminApiService } from './demo-admin-api.service';
import { DemoFixturesComponent } from './demo-fixtures.component';
import { DemoPermissionsService } from '../../core/auth/demo-permissions.service';
import { FixturePreview, FixtureRestoreResult } from './demo-admin.model';

describe('DemoFixturesComponent', () => {
  const changes = { create: [], update: ['one'], unchanged: [], retired: [], conflicts: [] };
  const preview: FixturePreview = { currentRevision: 1, targetRevision: 2, currentManifestVersion: 1, manifestVersion: 1, etag: '"v1-body"', users: changes, types: changes, tasks: changes, catalogConflicts: [], customRecords: 3 };
  const result: FixtureRestoreResult = { previousRevision: 1, newRevision: 2, manifestVersion: 1, restoreId: 'restore-id', etag: '"v2-body"', users: changes, types: changes, tasks: changes };
  const api = { preview: vi.fn(() => of({ body: preview, etag: '"v1-header"' })), restore: vi.fn(() => of({ body: result, etag: '"v2-header"' })), stats: vi.fn(() => of({ usersTotal: 6, typesTotal: 12, tasksTotal: 24 })) };
  const dialog = { open: vi.fn(() => ({ afterClosed: () => of(true) })) };
  let permissions: DemoPermissionsService;
  beforeEach(async () => {
    vi.clearAllMocks();
    await TestBed.configureTestingModule({ imports: [DemoFixturesComponent, RouterModule.forRoot([])], providers: [
      { provide: DemoAdminApiService, useValue: api }, { provide: MatDialog, useValue: dialog },
    ] }).compileComponents();
    permissions = TestBed.inject(DemoPermissionsService);
  });

  it('hides preview and restore without DEMO_RESTORE', () => {
    permissions.setPermissions(['DEMO_READ']);
    const fixture = TestBed.createComponent(DemoFixturesComponent); fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('button').length).toBe(0);
    expect(api.preview).not.toHaveBeenCalled();
  });

  it('requires preview, confirms restore, sends the header ETag and refreshes data', () => {
    permissions.setPermissions(['DEMO_RESTORE']);
    const fixture = TestBed.createComponent(DemoFixturesComponent); fixture.detectChanges();
    const component = fixture.componentInstance;
    expect(fixture.nativeElement.textContent).toContain('Previsualizar restauración');
    component.previewRestore(); fixture.detectChanges();
    expect(api.preview).toHaveBeenCalledTimes(1);
    expect(fixture.nativeElement.textContent).toContain('Registros personalizados');
    expect(fixture.nativeElement.textContent).toContain('Fuera del alcance de restore');
    component.confirmRestore(); fixture.detectChanges();
    expect(dialog.open).toHaveBeenCalledTimes(1);
    expect(api.restore).toHaveBeenCalledWith('"v1-header"');
    expect(api.preview).toHaveBeenCalledTimes(2);
    expect(api.stats).toHaveBeenCalledTimes(1);
    expect(fixture.nativeElement.textContent).toContain('Restauración completada');
  });

  it('blocks restore when preview reports conflicts', () => {
    permissions.setPermissions(['DEMO_RESTORE']);
    const fixture = TestBed.createComponent(DemoFixturesComponent);
    fixture.componentInstance.preview.set({ body: { ...preview, catalogConflicts: ['conflict'] }, etag: '"v1-header"' });
    fixture.componentInstance.confirmRestore();
    expect(dialog.open).not.toHaveBeenCalled();
  });

  it.each([412, 428, 409])('marks a %s restore response as stale and asks for a new preview', status => {
    permissions.setPermissions(['DEMO_RESTORE']);
    api.restore.mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status })));
    const fixture = TestBed.createComponent(DemoFixturesComponent);
    fixture.componentInstance.previewRestore();
    fixture.componentInstance.confirmRestore();
    fixture.detectChanges();
    expect(fixture.componentInstance.stale()).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('Actualizar preview');
  });

  it('shows Retry-After on 429 without retrying restore', () => {
    permissions.setPermissions(['DEMO_RESTORE']);
    api.restore.mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 429, headers: new HttpHeaders({ 'Retry-After': '17' }) })));
    const fixture = TestBed.createComponent(DemoFixturesComponent);
    fixture.componentInstance.previewRestore();
    fixture.componentInstance.confirmRestore();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Espera 17 segundos');
    expect(api.restore).toHaveBeenCalledTimes(1);
  });

  it('does not restore an expired local preview', () => {
    permissions.setPermissions(['DEMO_RESTORE']);
    const fixture = TestBed.createComponent(DemoFixturesComponent);
    fixture.componentInstance.previewRestore();
    fixture.componentInstance.previewedAt.set(Date.now() - 5 * 60_000 - 1);
    fixture.componentInstance.confirmRestore();
    expect(api.restore).not.toHaveBeenCalled();
    expect(fixture.componentInstance.reloadNeeded()).toBe(true);
  });
});
