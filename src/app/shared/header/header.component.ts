import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink, MatIconModule],
  template: `
    <header
      class="fixed top-0 left-0 w-full z-50 backdrop-blur-sm border-b border-[var(--color-border)]
             bg-[var(--color-bg)]/70 dark:bg-[var(--color-bg)]/70 transition-colors duration-300"
    >
      <div class="max-w-7xl mx-auto flex items-center justify-between py-3 px-6">

        <!-- 🔹 Logo -->
        <a routerLink="/" class="flex items-center gap-2">
          <img src="assets/logo-no-bg.png" alt="EasyQuizzy" class="h-8 md:h-10" />
        </a>

        <!-- 🔸 Nav Links -->
        <nav class="flex items-center gap-6 text-sm font-medium text-[var(--color-text)]">
          <a routerLink="/auth/login" class="hover:text-[var(--color-primary)] transition">Iniciar sesión</a>
          <a routerLink="/auth/register" class="hover:text-[var(--color-primary)] transition">Registrarse</a>

          <!-- 🌙 Toggle modo oscuro -->
          <button
            type="button"
            (click)="toggleTheme()"
            class="flex items-center justify-center w-9 h-9 rounded-full border border-[var(--color-border)]
                   bg-[var(--color-bg)] text-[var(--color-text)] hover:bg-[var(--color-bg-secondary)]
                   transition"
          >
            <mat-icon fontIcon="{{ theme() === 'light' ? 'dark_mode' : 'light_mode' }}"></mat-icon>
          </button>
        </nav>
      </div>
    </header>
  `,
})
export class HeaderComponent {
  theme = signal<'light' | 'dark'>('light');

  constructor() {
    const saved = localStorage.getItem('theme') as 'light' | 'dark' | null;
    if (saved) this.theme.set(saved);
    document.documentElement.setAttribute('data-theme', this.theme());
  }

  toggleTheme() {
    const newTheme = this.theme() === 'light' ? 'dark' : 'light';
    this.theme.set(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
  }
}
