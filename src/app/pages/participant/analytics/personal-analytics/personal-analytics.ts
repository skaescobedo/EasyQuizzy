import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { SessionService } from '../../../../services/session.service';
import { SessionAnalytics } from '../../../../models/session.model';

@Component({
  selector: 'app-personal-analytics',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink, MatIconModule],
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

  retryQuiz() {
    const quizId = this.analytics()?.session_info.quiz_id;
    if (!quizId) return;

    // Crear nueva sesión de autoestudio con el mismo quiz
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
}