// src/app/app.ts
import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `
    <main class="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)] transition-colors duration-300">
      <router-outlet></router-outlet>
    </main>
  `,
})
export class App {
  // 🌙 Modo oscuro con signals
  darkMode = signal(false);

  toggleTheme() {
    this.darkMode.update(v => !v);
    document.documentElement.setAttribute('data-theme', this.darkMode() ? 'dark' : 'light');
  }
}
