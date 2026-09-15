import { Component } from '@angular/core';

@Component({
  selector: 'app-users',
  standalone: true,
  template: `
    <div class="placeholder">
      <h2>Usuarios</h2>
      <p>Próximamente...</p>
    </div>
  `,
  styles: `
    .placeholder {
      padding: 24px;
      color: #666;
    }
  `,
})
export class UsersComponent {}
