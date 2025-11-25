import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { SessionService } from '../../../../services/session.service';
import { SessionAnalytics, TopsisRanking, TopsisParticipant } from '../../../../models/session.model';

@Component({
  selector: 'app-personal-analytics',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MatIconModule],
  templateUrl: './personal-analytics.html',
})
export class PersonalAnalyticsComponent implements OnInit {
  private sessionService = inject(SessionService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  analytics = signal<SessionAnalytics | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);
  sessionId = signal<number | null>(null);

  // 🎯 NUEVO: Signals para TOPSIS
  topsisData = signal<TopsisRanking | null>(null);
  myTopsisData = signal<TopsisParticipant | null>(null);

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

      // 🎯 NUEVO: Cargar TOPSIS
      try {
        const topsis = await this.sessionService.fetchTopsisRanking(sessionId);
        if (topsis.has_categories) {
          this.topsisData.set(topsis);
          
          // Buscar MIS datos en el ranking TOPSIS
          // Como es autoestudio, debería haber solo 1 participante
          if (topsis.ranking.length > 0) {
            this.myTopsisData.set(topsis.ranking[0]);
          }
        }
      } catch (err) {
        console.warn('No se pudo cargar TOPSIS:', err);
      }

    } catch (err: any) {
      this.error.set(err?.error?.detail || 'Error al cargar analytics');
    } finally {
      this.loading.set(false);
    }
  }

  retryQuiz() {
    const quizId = this.analytics()?.session_info.quiz_id;
    if (!quizId) return;

    this.sessionService.createSelfStudySession(quizId).then(() => {
      this.router.navigate(['/quizz/play']);
    });
  }

  goHome() {
    this.router.navigate(['/']);
  }

  getAnswerIcon(isCorrect: boolean): string {
    return isCorrect ? 'check_circle' : 'cancel';
  }

  getAnswerIconClass(isCorrect: boolean): string {
    return isCorrect ? 'text-green-600' : 'text-red-600';
  }

  formatTime(ms: number): string {
    return (ms / 1000).toFixed(1) + 's';
  }

  // 🎯 NUEVO: Métodos para TOPSIS
  
  getCategoryEntries(): [string, any][] {
    const data = this.myTopsisData();
    if (!data) return [];
    return Object.entries(data.category_performance);
  }

  getCategoryColor(score: number): string {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  }

  getCategoryTextColor(score: number): string {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  }

  getCategoryMessage(score: number): string {
    if (score >= 80) return '✅ ¡Excelente! Dominaste esta categoría';
    if (score >= 60) return '⚠️ Bien, pero hay espacio para mejorar';
    return '⚠️ Considera repasar este tema importante';
  }
}