import { Injectable, computed, signal } from '@angular/core';

export type DemoPermission = 'DEMO_READ' | 'DEMO_WRITE' | 'DEMO_PUBLISH' | 'DEMO_RESTORE';

/** In-memory capabilities from /api/admin/me. Unknown permissions are ignored. */
@Injectable({ providedIn: 'root' })
export class DemoPermissionsService {
  private readonly values = signal<ReadonlySet<DemoPermission>>(new Set());
  readonly permissions = this.values.asReadonly();
  readonly canReadDemo = computed(() => this.has('DEMO_READ'));
  readonly canWriteDemo = computed(() => this.has('DEMO_WRITE'));
  readonly canPublishDemo = computed(() => this.has('DEMO_PUBLISH'));
  readonly canRestoreDemo = computed(() => this.has('DEMO_RESTORE'));
  readonly canUseDemoEditor = computed(() => this.canReadDemo() && this.canWriteDemo());
  readonly canUseDemoPublication = computed(() => this.canReadDemo() && this.canPublishDemo());

  setPermissions(permissions: readonly string[]): void {
    const allowed: DemoPermission[] = ['DEMO_READ', 'DEMO_WRITE', 'DEMO_PUBLISH', 'DEMO_RESTORE'];
    this.values.set(new Set(permissions.filter((permission): permission is DemoPermission => allowed.includes(permission as DemoPermission))));
  }

  clear(): void { this.values.set(new Set()); }

  has(permission: DemoPermission): boolean { return this.values().has(permission); }
  any(): boolean { return this.values().size > 0; }
}
