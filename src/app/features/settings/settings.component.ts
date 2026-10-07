import { Component, inject } from '@angular/core';
import { ThemePreference, ThemeService } from '../../core/theme/theme.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  template: `
    <section class="settings-page">
      <div class="page-header"><h1>Configuración</h1></div>
      <div class="settings-card">
        <div><h2>Apariencia</h2><p>Elige cómo quieres ver Donit Admin. La opción Sistema sigue la preferencia de tu dispositivo.</p></div>
        <fieldset aria-label="Tema visual">
          <legend class="sr-only">Tema visual</legend>
          @for (option of options; track option.value) {
            <label class="theme-option" [class.selected]="theme.preference() === option.value">
              <input type="radio" name="theme" [value]="option.value" [checked]="theme.preference() === option.value" (change)="theme.setPreference(option.value)" />
              <span>{{ option.label }}</span>
            </label>
          }
        </fieldset>
      </div>
    </section>
  `,
  styleUrl: './settings.component.css',
})
export class SettingsComponent {
  readonly theme = inject(ThemeService);
  readonly options: { value: ThemePreference; label: string }[] = [
    { value: 'system', label: 'Sistema' }, { value: 'light', label: 'Claro' }, { value: 'dark', label: 'Oscuro' },
  ];
}
