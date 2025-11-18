import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { SessionService } from '../../../../services/session.service';
import { SessionAnalytics } from '../../../../models/session.model';
import { GlobalStatsCardComponent } from '../global-stats-card/global-stats-card';
import { QuestionAnalyticsItemComponent } from '../question-analytics-item/question-analytics-item';
import { InsightsPanelComponent } from '../insights-panel/insights-panel';

@Component({
  selector: 'app-session-analytics',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    RouterLink,
    MatIconModule,
    GlobalStatsCardComponent,
    QuestionAnalyticsItemComponent,
    InsightsPanelComponent
  ],
  templateUrl: './session-analytics.html',
})
export class SessionAnalyticsComponent implements OnInit {
  private sessionService = inject(SessionService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  analytics = signal<SessionAnalytics | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);
  sessionId = signal<number | null>(null);

  async ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('sessionId'));
    if (!id) {
      this.error.set('ID de sesión inválido');
      this.loading.set(false);
      return;
    }

    this.sessionId.set(id);
    await this.loadAnalytics(id);
  }

  async loadAnalytics(sessionId: number) {
    try {
      this.loading.set(true);
      this.error.set(null);

      const data = await this.sessionService.getSessionAnalytics(sessionId);
      this.analytics.set(data);
    } catch (err: any) {
      this.error.set(err?.error?.detail || 'Error al cargar analytics');
    } finally {
      this.loading.set(false);
    }
  }

  goBack() {
    this.router.navigate(['/host/sessions']);
  }

  exportCSV() {
    // TODO: Implementar exportación a CSV
    alert('🚧 Exportar a CSV - Por implementar');
  }
}