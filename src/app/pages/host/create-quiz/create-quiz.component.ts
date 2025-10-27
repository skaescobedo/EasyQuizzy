import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormArray, Validators, FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';

import { QuizService, QuizPayload } from '../../../services/quiz.service';
import { CategoriesEditor } from './categories-editor/categories-editor';
import { QuestionsEditor } from './questions-editor/questions-editor';
import { AIBuilder } from './ai-builder/ai-builder';

@Component({
  selector: 'app-create-quiz',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatIconModule, CategoriesEditor, QuestionsEditor, AIBuilder],
  templateUrl: './create-quiz.component.html',
})
export class CreateQuizComponent {
  private fb = inject(FormBuilder);
  private quizService = inject(QuizService);
  private router = inject(Router);

  loading = signal(false);
  success = signal(false);
  error = signal<string | null>(null);

  // Toggle de modo (manual / IA)
  useAI = signal<boolean>(false);

  quizForm = this.fb.group({
    title: ['', [Validators.required, Validators.maxLength(120)]],
    description: [''],
    categories: this.fb.array([]),
    questions: this.fb.array([]),
  });

  // === Getters ===
  get questions() { return this.quizForm.get('questions') as FormArray; }
  get categories() { return this.quizForm.get('categories') as FormArray; }

  // Nombres de categorías para el selector
  get categoryNames(): string[] {
    const arr = (this.categories?.value ?? []) as any[];
    return arr.map(c => c?.name).filter((n: any) => !!n);
  }

  // Cambiar modo
  setMode(ai: boolean) { this.useAI.set(ai); }

  /** Hidratar form con un preview de IA */
  loadPreviewFromAI(payload: QuizPayload) {
    // Limpia
    this.quizForm.reset();
    this.categories.clear();
    this.questions.clear();

    // Título/Descripción
    this.quizForm.patchValue({
      title: payload.title || '',
      description: payload.description || '',
    });

    // Categorías
    (payload.categories || []).forEach((c: any) => {
      this.categories.push(
        this.fb.group({
          name: [c.name || 'General', Validators.required],
          weight: [Number(c.weight ?? 1), [Validators.required]],
          is_active: [true],
        })
      );
    });

    // Preguntas
    (payload.questions || []).forEach((q) => {
      this.questions.push(
        this.fb.group({
          question_text: [q.question_text || '', Validators.required],
          question_type: [q.question_type || 'multiple_choice', Validators.required],
          explanation: [q.explanation ?? ''],
          correct_text: [q.correct_text ?? ''],
          has_time_limit: [!!q.time_limit_sec],
          time_limit_sec: [q.time_limit_sec ?? null],
          category_name: [q.category_name ?? ''],
          answers: this.fb.array(
            (q.answers || []).map(a =>
              this.fb.group({
                answer_text: [a.answer_text || '', Validators.required],
                is_correct: [!!a.is_correct],
              })
            )
          ),
          image: [null],
          image_url: [q.image_url ?? null],
          original_filename: [q.original_filename ?? null],
        })
      );
    });

    // Vuelve a Manual para editar/guardar
    this.useAI.set(false);
    this.success.set(true);
  }

  /** Si se elimina una categoría, poner esas preguntas en "Sin categoría" */
  onCategoryRemoved(name: string) {
    if (!name) return;
    for (let i = 0; i < this.questions.length; i++) {
      const g = this.questions.at(i) as FormGroup;
      const current = (g.get('category_name')?.value as string) || '';
      if (current === name) {
        g.get('category_name')?.setValue('');
      }
    }
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

      const imagesByIndex: { index: number; file: File }[] = (raw.questions ?? [])
        .map((q: any, idx: number) => (q?.image ? { index: idx + 1, file: q.image as File } : null))
        .filter((x: any) => !!x) as any[];

      const created = await this.quizService.createQuiz(
        { title: raw.title!, description: raw.description || '', categories, questions },
        imagesByIndex
      );

      this.success.set(true);

      // Limpieza
      this.quizForm.reset();
      this.questions.clear();
      this.categories.clear();

      // Ir al viewer
      const id = created?.quiz_id ?? created?.id ?? created?.data?.quiz_id;
      if (id) {
        this.router.navigate(['/host/quizzes', id]);
      } else {
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
