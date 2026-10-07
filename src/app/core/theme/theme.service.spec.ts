import { TestBed } from '@angular/core/testing';
import { ThemeService } from './theme.service';

describe('ThemeService', () => {
  let changeListener: (() => void) | undefined;
  let systemDark = false;
  let theme: ThemeService;

  beforeEach(() => {
    localStorage.removeItem('donit-admin-theme');
    systemDark = false;
    changeListener = undefined;
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: vi.fn().mockImplementation(() => ({
        get matches() { return systemDark; },
        addEventListener: (_: string, listener: () => void) => { changeListener = listener; },
      })),
    });
    TestBed.configureTestingModule({});
    theme = TestBed.inject(ThemeService);
  });

  afterEach(() => {
    localStorage.removeItem('donit-admin-theme');
    delete document.documentElement.dataset['theme'];
  });

  it('starts in system mode and follows system changes', () => {
    expect(theme.preference()).toBe('system');
    expect(document.documentElement.dataset['theme']).toBe('light');
    systemDark = true;
    changeListener?.();
    expect(document.documentElement.dataset['theme']).toBe('dark');
  });

  it('persists explicit preference and ignores system changes', () => {
    theme.setPreference('light');
    expect(localStorage.getItem('donit-admin-theme')).toBe('light');
    systemDark = true;
    changeListener?.();
    expect(document.documentElement.dataset['theme']).toBe('light');
    theme.setPreference('dark');
    expect(document.documentElement.dataset['theme']).toBe('dark');
  });
});
