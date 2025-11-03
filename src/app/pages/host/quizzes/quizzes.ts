import { Component, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

import { QuizService, QuizListItem } from '../../../services/quiz.service';
import { QuizCard } from './quiz-card/quiz-card';
import { environment } from '../../../../environment/environment';
import { Router } from '@angular/router';
import { SessionService } from '../../../services/session.service';

@Component({
  selector: 'app-host-quizzes',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, QuizCard],
  templateUrl: './quizzes.html',
})
export class HostQuizzes {
  private api = inject(QuizService);
  private sessionService = inject(SessionService);
  private router = inject(Router);

  items = signal<QuizListItem[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);

  limit = 12;
  offset = signal(0);
  endReached = signal(false);

  totalLoaded = computed(() => this.items().length);

  async ngOnInit() { await this.loadPage(true); }

  async loadMore() {
    if (this.loading() || this.endReached()) return;
    this.offset.update(v => v + this.limit);
    await this.loadPage(false);
  }

  private async loadPage(reset: boolean) {
    try {
      this.loading.set(true);
      this.error.set(null);
      const page = await this.api.listMyQuizzes(this.limit, this.offset());
      if (reset) this.items.set(page); else this.items.update(arr => [...arr, ...page]);
      if (page.length < this.limit) this.endReached.set(true);
    } catch (e: any) {
      this.error.set(e?.error?.detail || 'No se pudieron cargar tus quizzes.');
    } finally {
      this.loading.set(false);
    }
  }

  trackById = (_: number, q: QuizListItem) => q.quiz_id;

// ==============================================================
  // 🚀 Crear sesión en vivo (desde el botón del quiz-card)
  // ==============================================================
  async createLiveSession(quizId: number) {
    try {
      this.loading.set(true);
      await this.sessionService.createSession(quizId);
      this.router.navigate(['/host/session-host']);
    } catch (err: any) {
      this.error.set(err.message || 'Error al crear la sesión.');
    } finally {
      this.loading.set(false);
    }
  }
}
