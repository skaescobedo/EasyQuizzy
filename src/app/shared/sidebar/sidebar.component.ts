import { Component, EventEmitter, Output, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, MatIconModule],
  template: `
    <div
      class="sidebar-container"
      (click)="close.emit()"
    >
      <!-- 🔹 Sidebar -->
      <aside
        class="sidebar"
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
              <a
                routerLink="/host"
                [class.active]="isActive('/host', true)"
              >
                <mat-icon fontIcon="home"></mat-icon>
                Inicio
              </a>
            </li>
            <li>
              <a
                routerLink="/host/quizzes"
                [class.active]="isActive('/host/quizzes')"
              >
                <mat-icon fontIcon="list_alt"></mat-icon>
                Mis Quizzes
              </a>
            </li>
            <li>
              <a
                routerLink="/host/create"
                [class.active]="isActive('/host/create')"
              >
                <mat-icon fontIcon="add_circle"></mat-icon>
                Crear Quiz
              </a>
            </li>
            <li>
              <a
                routerLink="/host/sessions"
                [class.active]="isActive('/host/sessions')"
              >
                <mat-icon fontIcon="bar_chart"></mat-icon>
                Analíticas
              </a>
            </li>
            <li>
              <a
                routerLink="/host/profile"
                [class.active]="isActive('/host/profile')"
              >
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
  private router = inject(Router);

  logout() {
    this.auth.logout();
    this.close.emit();
  }

  /** ✅ Verifica si una ruta está activa (exacta o parcial) */
  isActive(url: string, exact = false): boolean {
    return this.router.isActive(url, {
      paths: exact ? 'exact' : 'subset',
      queryParams: 'ignored',
      fragment: 'ignored',
      matrixParams: 'ignored',
    });
  }
}
