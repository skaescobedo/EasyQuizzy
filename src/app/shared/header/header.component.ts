import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { SidebarComponent } from "../sidebar/sidebar.component"; 
@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink, MatIconModule, CommonModule, SidebarComponent],
  template: `
    <header
      class="fixed top-0 left-0 w-full z-50 backdrop-blur-sm border-b border-[var(--color-border)]
             bg-[var(--color-bg)]/70 dark:bg-[var(--color-bg)]/70 transition-colors duration-300"
    >
      <div class="max-w-7xl mx-auto flex items-center justify-between py-3 px-6">

        <!-- 🔹 Logo -->
        <div class="flex items-center gap-3">
          <!-- Sidebar toggle solo si está logueado -->
          @if (isLoggedIn()) {
            <button
              (click)="toggleSidebar()"
              class="p-2 rounded-full flex items-center hover:bg-[var(--color-bg-secondary)] transition cursor-pointer"
            >
              <mat-icon fontIcon="menu"></mat-icon>
            </button>
          }

          <a routerLink="/" class="flex items-center gap-2">
            <img src="assets/logo-no-bg.png" alt="EasyQuizzy" class="h-8 md:h-10 logo-invert" />
          </a>
        </div>

        <!-- 🔸 Nav dinámico -->
        <nav class="flex items-center gap-6 text-sm font-medium text-[var(--color-text)]">

          <!-- 🔹 Visitante (no logueado) -->
          @if (!isLoggedIn()) {
            <a routerLink="/auth/login" class="hover:text-[var(--color-primary)] transition">Iniciar sesión</a>
            <a routerLink="/auth/register" class="hover:text-[var(--color-primary)] transition">Registrarse</a>
          }

          <!-- 🧑 Usuario logueado -->
          @if (isLoggedIn()) {
            <span class="text-[var(--color-text)]">Hola, <strong>{{ userName() }}</strong></span>
          }

          <!-- 🌙 Botón modo oscuro -->
          <button
            type="button"
            (click)="toggleTheme()"
            class="flex items-center justify-center w-9 h-9 rounded-full border border-[var(--color-border)]
                   bg-[var(--color-bg)] text-[var(--color-text)] hover:bg-[var(--color-bg-secondary)]
                   transition cursor-pointer" 
          >
            <mat-icon fontIcon="{{ theme() === 'light' ? 'dark_mode' : 'light_mode' }}"></mat-icon>
          </button>
        </nav>
      </div>
    </header>

    @if (showSidebar()) {
      <div class="fixed inset-0 z-[9998] flex">
        <!-- Fondo oscuro -->
        <div class="fixed inset-0 bg-black/40" (click)="toggleSidebar()"></div>

        <!-- Sidebar -->
        <app-sidebar class="relative z-[9999] w-64"
                    (close)="toggleSidebar()"></app-sidebar>
      </div>
    }

  `,
})
export class HeaderComponent {
  private auth = inject(AuthService);
  private router = inject(Router);

  // 🌗 Theme system
  theme = signal<'light' | 'dark'>('light');
  isLoggedIn = computed(() => !!this.auth.currentUser());
  userName = computed(() => this.auth.currentUser()?.full_name || 'Usuario');

  // 📂 Sidebar
  showSidebar = signal(false);

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

  toggleSidebar() {
    this.showSidebar.set(!this.showSidebar());
  }
}
