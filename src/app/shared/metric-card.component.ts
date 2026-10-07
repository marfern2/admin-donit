import { Component, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

export interface MetricCardData {
  label: string;
  icon: string;
  value: number | null;
  helper: string;
  loading: boolean;
}

@Component({
  selector: 'app-metric-card',
  standalone: true,
  imports: [MatIconModule],
  template: `
    <article class="metric-card" [attr.aria-busy]="data().loading">
      <div class="metric-top"><span class="metric-icon"><mat-icon aria-hidden="true">{{ data().icon }}</mat-icon></span></div>
      <div class="metric-label">{{ data().label }}</div>
      @if (data().loading) {
        <div class="metric-skeleton" role="status"><span class="sr-only">Cargando {{ data().label }}</span></div>
      } @else {
        <div class="metric-value">{{ data().value === null ? '—' : data().value!.toLocaleString('es-ES') }}</div>
      }
      <div class="metric-helper">{{ data().helper }}</div>
    </article>
  `,
  styleUrl: './metric-card.component.css',
})
export class MetricCardComponent {
  readonly data = input.required<MetricCardData>();
}
