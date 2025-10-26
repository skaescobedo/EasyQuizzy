import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormArray, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';

import { QuizService } from '../../../services/quiz.service';
import { CategoriesEditor } from './categories-editor/categories-editor';
import { QuestionsEditor } from './questions-editor/questions-editor';

@Component({
  selector: 'app-create-quiz',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatIconModule, CategoriesEditor, QuestionsEditor],
  templateUrl: './create-quiz.component.html',
})
export class CreateQuizComponent {
  private fb = inject(FormBuilder);
  private quizService = inject(QuizService);
  private router = inject(Router);

  loading = signal(false);
  success = signal(false);
  error = signal<string | null>(null);

  quizForm = this.fb.group({
    title: ['', [Validators.required, Validators.maxLength(120)]],
    description: [''],
    categories: this.fb.array([]),
    questions: this.fb.array([]),
  });

  // === Getters ===
  get questions() { return this.quizForm.get('questions') as FormArray; }
  get categories() { return this.quizForm.get('categories') as FormArray; }

  // Nombres de categorías para el selector (sin arrow functions en template)
  get categoryNames(): string[] {
    const arr = (this.categories?.value ?? []) as any[];
    return arr.map(c => c?.name).filter((n: any) => !!n);
  }

  // === Submit ===
  async submitQuiz() {
    if (this.quizForm.invalid) {
      this.error.set('Por favor completa los campos requeridos.');
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    try {
      const raw = this.quizForm.getRawValue() as any;

      const categories = (raw.categories ?? []).map((c: any, idx: number) => ({
        name: c.name,
        weight: c.weight,
        order_index: idx + 1,
        is_active: c.is_active ?? true,
      }));

      const questions = (raw.questions ?? []).map((q: any, idx: number) => ({
        question_text: q.question_text,
        question_type: q.question_type,
        explanation: q.explanation || null,
        correct_text: q.correct_text || null,
        time_limit_sec: q.has_time_limit ? q.time_limit_sec : null,
        category_name: q.category_name || null,
        order_index: idx + 1,
        answers: (q.answers ?? []).map((a: any, j: number) => ({
          answer_text: a.answer_text,
          is_correct: !!a.is_correct,
          order_index: j + 1,
        })),
      }));

      // Importante: el backend asocia imágenes por "order_index" usando el nombre del archivo (p.ej. 1.png)
      const imagesByIndex: { index: number; file: File }[] = (raw.questions ?? [])
        .map((q: any, idx: number) => (q?.image ? { index: idx + 1, file: q.image as File } : null))
        .filter((x: any) => !!x) as any[];

      // ⬇️ Recibimos el quiz creado (debe traer quiz_id)
      const created = await this.quizService.createQuiz(
        { title: raw.title!, description: raw.description || '', categories, questions },
        imagesByIndex
      );

      this.success.set(true);

      // Limpieza local del formulario
      this.quizForm.reset();
      this.questions.clear();
      this.categories.clear();

      // 🚀 Ir al viewer del quiz recién creado
      const id = created?.quiz_id ?? created?.id ?? created?.data?.quiz_id;
      if (id) {
        this.router.navigate(['/host/quizzes', id]); // ruta: /host/quizzes/:id
      } else {
        // fallback por si la API no regresó el id como esperamos
        this.router.navigate(['/host/quizzes']);
      }
    } catch (err: any) {
      console.error(err);
      this.error.set(err?.error?.detail || 'Error al crear el quiz.');
    } finally {
      this.loading.set(false);
    }
  }
}
