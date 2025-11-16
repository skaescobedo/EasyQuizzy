import { Component, inject, signal, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormArray,
  Validators,
  FormGroup,
} from '@angular/forms';
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
  private cdr = inject(ChangeDetectorRef);

  loading = signal(false);
  success = signal(false);
  error = signal<string | null>(null);

  // Toggle de modo (manual / IA)
  useAI = signal<boolean>(false);

  quizForm = this.fb.group({
    title: ['', [Validators.required, Validators.maxLength(120)]],
    description: [''],
    // Angular tipa esto como FormArray<FormControl<unknown>>, por eso luego casteamos a any
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
    // 1) Título/Descripción
    this.quizForm.patchValue(
      {
        title: payload.title || '',
        description: payload.description || '',
      },
      { emitEvent: false }
    );

    // 2) NUEVOS FormArray (para cambiar referencia y que OnPush reactive el hijo)
    const catsFA = new FormArray<FormGroup<any>>([]);
    (payload.categories || []).forEach((c: any, idx: number) => {
      catsFA.push(
        this.fb.group({
          name: [c.name || 'General', Validators.required],
          weight: [Number(c.weight ?? 1), [Validators.required]],
          order_index: [idx + 1],
          is_active: [true],
        })
      );
    });

    const qsFA = new FormArray<FormGroup<any>>([]);
    (payload.questions || []).forEach((q: any) => {
      qsFA.push(
        this.fb.group({
          question_text: [q.question_text || '', Validators.required],
          question_type: [q.question_type || 'multiple_choice', Validators.required],
          explanation: [q.explanation ?? ''],
          correct_text: [q.correct_text ?? ''],
          has_time_limit: [!!q.time_limit_sec],
          time_limit_sec: [q.time_limit_sec ?? null],
          category_name: [q.category_name ?? ''],
          answers: this.fb.array(
            (q.answers || []).map((a: any) =>
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

    // 3) Reemplazar controles — casteamos a any para no pelear con los generics de Angular
    this.quizForm.setControl('categories', catsFA as any);
    this.quizForm.setControl('questions', qsFA as any);

    // 4) Forzar CD
    this.cdr.markForCheck();

    // Volver a modo Manual para editar/guardar
    this.useAI.set(false);
    this.success.set(true);
  }

  /**
   * Handler opcional desde <app-categories-editor (categoryRemoved)="onCategoryRemoved($event)">
   * Acepta string (nombre) u objeto { name?: string; index: number }.
   */
  onCategoryRemoved(evt: unknown) {
    let removedName: string | undefined;

    if (typeof evt === 'string') {
      removedName = evt;
    } else if (evt && typeof evt === 'object' && 'name' in (evt as any)) {
      removedName = (evt as any).name ?? undefined;
    }

    // Re-numerar order_index de categorías
    const catsFA = this.categories;
    for (let i = 0; i < catsFA.length; i++) {
      (catsFA.at(i) as FormGroup).get('order_index')?.setValue(i + 1, { emitEvent: false });
    }

    // Limpiar preguntas cuya category_name ya no exista
    this.cleanupDanglingCategoryRefs();

    this.cdr.markForCheck();
    void removedName;
  }

  /** Deja en vacío las category_name que no existan en categories */
  private cleanupDanglingCategoryRefs() {
    const validNames = new Set(this.categoryNames);
    const qsFA = this.questions;

    for (let i = 0; i < qsFA.length; i++) {
      const qg = qsFA.at(i) as FormGroup;
      const current = (qg.get('category_name')?.value as string) || '';
      if (current && !validNames.has(current)) {
        qg.get('category_name')?.setValue('', { emitEvent: false });
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
      this.quizForm.setControl('questions', new FormArray([]) as any);
      this.quizForm.setControl('categories', new FormArray([]) as any);

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
