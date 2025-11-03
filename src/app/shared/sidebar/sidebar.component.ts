import { Component, EventEmitter, Output, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, MatIconModule],
  template: `
    <div
      class="sidebar-container"
      @fadeInOut
      (click)="close.emit()"
    >
      <!-- 🔹 Sidebar -->
      <aside
        class="sidebar"
        @slideInOut
        (click)="$event.stopPropagation()"
      >
        <div class="sidebar-header">
          <h2>Menú</h2>
          <button (click)="close.emit()" class="close-btn" title="Cerrar menú">
            <mat-icon fontIcon="close"></mat-icon>
          </button>
        </div>

        <nav class="sidebar-nav">
          <ul>
            <li>
              <a routerLink="/host" routerLinkActive="active">
                <mat-icon fontIcon="home"></mat-icon>
                Inicio
              </a>
            </li>
            <li>
              <a routerLink="/host/quizzes" routerLinkActive="active">
                <mat-icon fontIcon="list_alt"></mat-icon>
                Mis Quizzes
              </a>
            </li>
            <li>
              <a routerLink="/host/create" routerLinkActive="active">
                <mat-icon fontIcon="add_circle"></mat-icon>
                Crear Quiz
              </a>
            </li>
            <li>
              <a routerLink="/host/analytics" routerLinkActive="active">
                <mat-icon fontIcon="bar_chart"></mat-icon>
                Analíticas
              </a>
            </li>
            <li>
              <a routerLink="/host/profile" routerLinkActive="active">
                <mat-icon fontIcon="person"></mat-icon>
                Mi perfil
              </a>
            </li>
          </ul>
        </nav>

        <!-- 🔸 Botón de Cerrar sesión -->
        <div class="logout-section">
          <button (click)="logout()" class="logout-btn">
            <mat-icon fontIcon="logout"></mat-icon>
            Cerrar sesión
          </button>
        </div>
      </aside>
    </div>
  `,
  styleUrls: ['./sidebar.component.scss'],
})
export class SidebarComponent {
  @Output() close = new EventEmitter<void>();
  private auth = inject(AuthService);

  logout() {
    this.auth.logout();
    this.close.emit();
  }
}
