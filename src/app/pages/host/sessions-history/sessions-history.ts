import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { SessionService } from '../../../services/session.service';
import { SessionListItem } from '../../../models/session.model';

@Component({
  selector: 'app-sessions-history',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink, MatIconModule],
  templateUrl: './sessions-history.html',
})
export class SessionsHistoryComponent implements OnInit {
  private sessionService = inject(SessionService);
  private router = inject(Router);

  sessions = signal<SessionListItem[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);
  
  // Filtros
  selectedStatus = signal<string | undefined>(undefined);
  
  // Paginación
  limit = 20;
  offset = signal(0);
  hasMore = signal(true);

  async ngOnInit() {
    await this.loadSessions(true);
  }

  async loadSessions(reset = false) {
    if (this.loading()) return;

    try {
      this.loading.set(true);
      this.error.set(null);

      if (reset) {
        this.offset.set(0);
        this.sessions.set([]);
      }

      const data = await this.sessionService.listSessions(
        undefined,
        this.selectedStatus(),
        this.limit,
        this.offset()
      );

      if (reset) {
        this.sessions.set(data);
      } else {
        this.sessions.update(current => [...current, ...data]);
      }

      // Si trajo menos del límite, ya no hay más
      this.hasMore.set(data.length === this.limit);
    } catch (err: any) {
      this.error.set(err?.error?.detail || 'Error al cargar sesiones');
    } finally {
      this.loading.set(false);
    }
  }

  async filterByStatus(status?: string) {
    this.selectedStatus.set(status);
    await this.loadSessions(true);
  }

  async loadMore() {
    if (!this.hasMore() || this.loading()) return;
    this.offset.update(v => v + this.limit);
    await this.loadSessions(false);
  }

  viewAnalytics(sessionId: number) {
    this.router.navigate(['/host/analytics/session', sessionId]);
  }

  getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'active':
      case 'pending':
        return 'bg-green-100 text-green-700 border-green-300';
      case 'ended':
      case 'finished':
        return 'bg-gray-100 text-gray-700 border-gray-300';
      default:
        return 'bg-blue-100 text-blue-700 border-blue-300';
    }
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'active':
        return 'Activa';
      case 'pending':
        return 'Pendiente';
      case 'ended':
      case 'finished':
        return 'Finalizada';
      default:
        return status;
    }
  }

  getModeLabel(mode: string): string {
    return mode === 'live' ? 'En vivo' : 'Autoestudio';
  }
}