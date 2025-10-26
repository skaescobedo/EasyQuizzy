import { Component, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { QuizService, QuizFull, QuizQuestion } from '../../../../services/quiz.service';

@Component({
  selector: 'app-quiz-viewer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink, MatIconModule],
  templateUrl: './quiz-viewer.html',
})
export class QuizViewer {
  private route = inject(ActivatedRoute);
  private api = inject(QuizService);

  loading = signal(false);
  error = signal<string | null>(null);
  quiz = signal<QuizFull | null>(null);

  enlarged = signal<string | null>(null); // overlay para imagen

  // Ordenar preguntas por order_index
  sortedQuestions = computed(() => {
    const q = this.quiz()?.questions ?? [];
    return [...q].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
  });

  // Ordenar respuestas por order_index
  sortedAnswers(q: QuizQuestion) {
    const arr = q.answers ?? [];
    return [...arr].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
  }

  async ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id) {
      this.error.set('ID inválido');
      return;
    }

    try {
      this.loading.set(true);
      this.error.set(null);
      const data = await this.api.getQuiz(id);
      this.quiz.set(data);
    } catch (e: any) {
      this.error.set(e?.error?.detail || 'No se pudo cargar el quiz.');
    } finally {
      this.loading.set(false);
    }
  }

  openImage(url: string | null | undefined) {
    if (url) this.enlarged.set(url);
  }
  closeImage() {
    this.enlarged.set(null);
  }
}

