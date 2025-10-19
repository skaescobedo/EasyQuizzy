import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule],
  template: `
    <footer class="text-center py-6 text-sm bg-[var(--color-bg-secondary)]">
    © 2025 EasyQuizzy — Todos los derechos reservados
    </footer>
  `,
})
export class FooterComponent {}
