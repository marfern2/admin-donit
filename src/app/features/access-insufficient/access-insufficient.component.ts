import { Component } from '@angular/core';

@Component({
  selector: 'app-access-insufficient',
  standalone: true,
  template: `<section class="access-page" aria-labelledby="access-title"><div class="access-card"><h1 id="access-title">Acceso insuficiente</h1><p>Tu cuenta no tiene acceso a ninguna sección administrativa. Contacta con un administrador si necesitas permisos.</p></div></section>`,
  styles: [`.access-page { max-width: 720px; margin: 0 auto; padding: 24px 0; } .access-card { padding: 32px; border: 1px solid var(--border); border-radius: var(--radius-lg); background: var(--surface); box-shadow: var(--shadow-md); } h1 { margin: 0 0 12px; } p { margin: 0; color: var(--text-muted); line-height: 1.6; }`],
})
export class AccessInsufficientComponent {}
