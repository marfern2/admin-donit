import { DOCUMENT } from '@angular/common';
import { Injectable, inject, signal } from '@angular/core';

export type ThemePreference = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'donit-admin-theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly media = this.document.defaultView?.matchMedia?.('(prefers-color-scheme: dark)');
  readonly preference = signal<ThemePreference>(this.readPreference());

  constructor() {
    this.apply();
    this.media?.addEventListener?.('change', () => this.apply());
  }

  setPreference(preference: ThemePreference): void {
    this.preference.set(preference);
    try {
      this.document.defaultView?.localStorage.setItem(STORAGE_KEY, preference);
    } catch { /* Storage may be unavailable in private browsing. */ }
    this.apply();
  }

  private readPreference(): ThemePreference {
    try {
      const saved = this.document.defaultView?.localStorage.getItem(STORAGE_KEY);
      if (saved === 'light' || saved === 'dark' || saved === 'system') return saved;
    } catch { /* Use the system theme when storage is unavailable. */ }
    return 'system';
  }

  private apply(): void {
    const preference = this.preference();
    const resolved = preference === 'system' ? (this.media?.matches ? 'dark' : 'light') : preference;
    this.document.documentElement.dataset['theme'] = resolved;
  }
}
