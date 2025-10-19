import { Component, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-error',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    @if (message()) {
      <div class="error-container animate-fade-in">
        <mat-icon fontIcon="error_outline" class="error-icon"></mat-icon>
        <p class="error-text">{{ message() }}</p>
      </div>
    }
  `,
  styles: [`
    .error-container {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.5rem .7rem;
      border-radius: 0.75rem;
      background-color: rgba(239, 68, 68, 0.08); /* rojo sutil */
      border: 1px solid rgba(239, 68, 68, 0.2);
      color: var(--color-text);
      width: 100%;
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
    }

    .error-icon {
      color: #ef4444; /* rojo */
      font-size: 22px;
      flex-shrink: 0;
    }

    .error-text {
      color: #ef4444;
      font-size: 0.95rem;
      line-height: 1.4;
      margin: 0;
    }

    /* 🌙 Dark mode support */
    [data-theme="dark"] .error-container {
      background-color: rgba(239, 68, 68, 0.15);
      border-color: rgba(239, 68, 68, 0.3);
    }

    /* ✨ Animación */
    @keyframes fade-in {
      from { opacity: 0; transform: translateY(-4px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .animate-fade-in {
      animation: fade-in 0.25s ease-out;
    }
  `]
})
export class ErrorAlertComponent {
  message = input<string | null>();
}
