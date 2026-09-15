import { Component } from '@angular/core';

@Component({
  selector: 'app-tasks',
  standalone: true,
  template: `
    <div class="placeholder">
      <h2>Tareas</h2>
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
export class TasksComponent {}
