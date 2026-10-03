import { Injectable } from '@angular/core';

export interface RuntimeConfig {
  apiUrl: string;
}

@Injectable({ providedIn: 'root' })
export class RuntimeConfigService {
  private config: RuntimeConfig | null = null;

  get apiUrl(): string {
    if (!this.config) {
      throw new Error('runtime-config.json no se ha cargado');
    }
    return this.config.apiUrl;
  }

  async load(): Promise<void> {
    this.config = null;
    const response = await fetch('/config/runtime-config.json', {
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`No se pudo cargar runtime-config.json (${response.status})`);
    }

    const raw: unknown = await response.json();
    if (!this.isRuntimeConfig(raw)) {
      throw new Error('runtime-config.json no contiene una apiUrl valida');
    }

    this.config = { apiUrl: raw.apiUrl.replace(/\/+$/, '') };
  }

  private isRuntimeConfig(value: unknown): value is RuntimeConfig {
    if (typeof value !== 'object' || value === null || !('apiUrl' in value)) {
      return false;
    }

    const apiUrl = (value as { apiUrl: unknown }).apiUrl;
    if (typeof apiUrl !== 'string' || apiUrl.trim() !== apiUrl || apiUrl === '') {
      return false;
    }

    try {
      const url = new URL(apiUrl);
      return (
        url.protocol === 'https:' || (url.protocol === 'http:' && this.isLocalHost(url.hostname))
      );
    } catch {
      return false;
    }
  }

  private isLocalHost(hostname: string): boolean {
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '10.0.2.2';
  }
}
