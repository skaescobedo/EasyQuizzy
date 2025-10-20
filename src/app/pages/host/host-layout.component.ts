import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from '../../shared/header/header.component';

@Component({
  selector: 'app-host-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, HeaderComponent],
  template: `
    <div class="min-h-screen flex flex-col bg-[var(--color-bg-secondary)] text-[var(--color-text)]">
      <!-- 🔹 Header fijo -->
      <app-header></app-header>

      <!-- 🔸 Contenido -->
      <main class="flex-1 pt-16 p-6 overflow-y-auto">
        <router-outlet></router-outlet>
      </main>
    </div>
  `,
})
export class HostLayoutComponent {}
