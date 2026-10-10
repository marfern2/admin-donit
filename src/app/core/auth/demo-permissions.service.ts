import { Injectable, computed, signal } from '@angular/core';

export type DemoPermission = 'DEMO_READ' | 'DEMO_WRITE' | 'DEMO_PUBLISH' | 'DEMO_RESTORE';
export type AdminPermission = 'ADMIN_READ' | 'USER_WRITE' | 'USER_DELETE' | 'TASK_WRITE';
export type AdminCapability = DemoPermission | AdminPermission;

/** In-memory capabilities from /api/admin/me. Unknown permissions are ignored. */
@Injectable({ providedIn: 'root' })
export class DemoPermissionsService {
  private readonly values = signal<ReadonlySet<AdminCapability>>(new Set());
  readonly permissions = this.values.asReadonly();
  readonly canReadAdmin = computed(() => this.has('ADMIN_READ'));
  readonly canReadDemo = computed(() => this.has('DEMO_READ'));
  readonly canWriteDemo = computed(() => this.has('DEMO_WRITE'));
  readonly canPublishDemo = computed(() => this.has('DEMO_PUBLISH'));
  readonly canRestoreDemo = computed(() => this.has('DEMO_RESTORE'));
  readonly canUseDemoEditor = computed(() => this.canReadDemo() && this.canWriteDemo());
  readonly canUseDemoPublication = computed(() => this.canReadDemo() && this.canPublishDemo());

  setPermissions(permissions: readonly string[]): void {
    const allowed: AdminCapability[] = ['ADMIN_READ', 'USER_WRITE', 'USER_DELETE', 'TASK_WRITE', 'DEMO_READ', 'DEMO_WRITE', 'DEMO_PUBLISH', 'DEMO_RESTORE'];
    this.values.set(new Set(permissions.filter((permission): permission is AdminCapability => allowed.includes(permission as AdminCapability))));
  }

  clear(): void { this.values.set(new Set()); }

  has(permission: AdminCapability): boolean { return this.values().has(permission); }
  any(): boolean { return (['DEMO_READ', 'DEMO_WRITE', 'DEMO_PUBLISH', 'DEMO_RESTORE'] as const).some(permission => this.has(permission)); }
}
