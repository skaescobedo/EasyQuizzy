import { Component, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';

import { QuizService, QuizListItem } from '../../../services/quiz.service';

@Component({
  selector: 'app-host-quizzes',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink, MatIconModule],
  templateUrl: './quizzes.html',
})
export class HostQuizzes {
  private api = inject(QuizService);

  items = signal<QuizListItem[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);

  // paginación simple
  limit = 12;
  offset = signal(0);
  endReached = signal(false);

  totalLoaded = computed(() => this.items().length);

  async ngOnInit() {
    await this.loadPage(true);
  }

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
      if (reset) this.items.set(page);
      else this.items.update(arr => [...arr, ...page]);

      if (page.length < this.limit) this.endReached.set(true);
    } catch (e: any) {
      this.error.set(e?.error?.detail || 'No se pudieron cargar tus quizzes.');
    } finally {
      this.loading.set(false);
    }
  }

  trackById = (_: number, q: QuizListItem) => q.quiz_id;
}
