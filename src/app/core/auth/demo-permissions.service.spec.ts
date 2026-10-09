import { TestBed } from '@angular/core/testing';
import { DemoPermission, DemoPermissionsService } from './demo-permissions.service';

describe('DemoPermissionsService', () => {
  let service: DemoPermissionsService;
  beforeEach(() => { TestBed.configureTestingModule({}); service = TestBed.inject(DemoPermissionsService); });
  it('fails closed without a trusted permission source', () => {
    expect(service.any()).toBe(false);
    expect(service.has('DEMO_READ')).toBe(false);
  });
  it.each([
    ['DEMO_READ', 'DEMO_WRITE', 'DEMO_PUBLISH', 'DEMO_RESTORE'],
    ['DEMO_WRITE', 'DEMO_READ', 'DEMO_PUBLISH', 'DEMO_RESTORE'],
    ['DEMO_PUBLISH', 'DEMO_READ', 'DEMO_WRITE', 'DEMO_RESTORE'],
    ['DEMO_RESTORE', 'DEMO_READ', 'DEMO_WRITE', 'DEMO_PUBLISH'],
  ] as const)('%s never implies another permission', (only, ...others) => {
    service.setPermissions([only]);
    expect(service.has(only)).toBe(true);
    for (const other of others) expect(service.has(other)).toBe(false);
  });
  it('supports explicit combinations', () => {
    const permissions: DemoPermission[] = ['DEMO_READ', 'DEMO_PUBLISH'];
    service.setPermissions(permissions);
    expect(service.has('DEMO_READ')).toBe(true);
    expect(service.has('DEMO_PUBLISH')).toBe(true);
    expect(service.has('DEMO_WRITE')).toBe(false);
    expect(service.has('DEMO_RESTORE')).toBe(false);
    expect(service.canReadDemo()).toBe(true);
    expect(service.canUseDemoPublication()).toBe(true);
    expect(service.canUseDemoEditor()).toBe(false);
  });
  it('filters unrelated permissions and requires READ for CRUD controls', () => {
    service.setPermissions(['DEMO_WRITE', 'DEMO_PUBLISH', 'ADMIN_READ']);
    expect(service.any()).toBe(true);
    expect(service.canReadDemo()).toBe(false);
    expect(service.canUseDemoEditor()).toBe(false);
    expect(service.canUseDemoPublication()).toBe(false);
    service.setPermissions(['ADMIN_READ']);
    expect(service.any()).toBe(false);
  });
});
