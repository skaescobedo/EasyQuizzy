import { Component, inject, signal, ChangeDetectorRef, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormArray,
  Validators,
  FormGroup,
} from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';

import { QuizService, QuizPayload } from '../../../services/quiz.service';
import { CategoriesEditor } from '../create-quiz/categories-editor/categories-editor';
import { QuestionsEditor } from '../create-quiz/questions-editor/questions-editor';

@Component({
  selector: 'app-edit-quiz',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatIconModule, CategoriesEditor, QuestionsEditor, RouterLink], // 👈 Agrega RouterLink aquí
  templateUrl: './edit-quiz.html',
})
export class EditQuizComponent implements OnInit {
  private fb = inject(FormBuilder);
  private quizService = inject(QuizService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private cdr = inject(ChangeDetectorRef);

  quizId = signal<number | null>(null);
  loading = signal(false);
  loadingQuiz = signal(true);
  success = signal(false);
  error = signal<string | null>(null);

  quizForm = this.fb.group({
    title: ['', [Validators.required, Validators.maxLength(120)]],
    description: [''],
    categories: this.fb.array([]),
    questions: this.fb.array([]),
  });

  get questions() { return this.quizForm.get('questions') as FormArray; }
  get categories() { return this.quizForm.get('categories') as FormArray; }

  get categoryNames(): string[] {
    const arr = (this.categories?.value ?? []) as any[];
    return arr.map(c => c?.name).filter((n: any) => !!n);
  }

  async ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id) {
      this.error.set('ID inválido');
      this.router.navigate(['/host/quizzes']);
      return;
    }

    this.quizId.set(id);
    await this.loadQuiz(id);
  }

  /** Cargar quiz desde el backend */
  async loadQuiz(id: number) {
    try {
      this.loadingQuiz.set(true);
      this.error.set(null);

      const quiz = await this.quizService.getQuiz(id);

      // 1. Cargar título y descripción
      this.quizForm.patchValue({
        title: quiz.title || '',
        description: quiz.description || '',
      }, { emitEvent: false });

      // 2. Cargar categorías
      const catsFA = new FormArray<FormGroup<any>>([]);
      (quiz.categories || []).forEach((c: any) => {
        catsFA.push(
          this.fb.group({
            name: [c.name || 'General', Validators.required],
            weight: [Number(c.weight ?? 1), [Validators.required]],
            order_index: [c.order_index ?? 0],
            is_active: [true],
          })
        );
      });

      // 3. Cargar preguntas
      const qsFA = new FormArray<FormGroup<any>>([]);
      (quiz.questions || []).forEach((q: any) => {
        // Determinar si tiene tiempo límite
        const hasTimeLimit = !!q.time_limit_sec;

        qsFA.push(
          this.fb.group({
            question_text: [q.question_text || '', Validators.required],
            question_type: [q.question_type || 'multiple_choice', Validators.required],
            explanation: [q.explanation ?? ''],
            correct_text: [q.correct_text ?? ''],
            has_time_limit: [hasTimeLimit],
            time_limit_sec: [q.time_limit_sec ?? null],
            category_name: [q.category_name ?? ''],
            order_index: [q.order_index ?? 0],
            answers: this.fb.array(
              (q.answers || []).map((a: any) =>
                this.fb.group({
                  answer_text: [a.answer_text || '', Validators.required],
                  is_correct: [!!a.is_correct],
                  order_index: [a.order_index ?? 0],
                })
              )
            ),
            image: [null], // No precargamos el File, solo la URL
            image_url: [q.image_url ?? null],
            original_filename: [q.original_filename ?? null],
          })
        );
      });

      // 4. Reemplazar controles
      this.quizForm.setControl('categories', catsFA as any);
      this.quizForm.setControl('questions', qsFA as any);

      this.cdr.markForCheck();
    } catch (err: any) {
      console.error(err);
      this.error.set(err?.error?.detail || 'No se pudo cargar el quiz.');
    } finally {
      this.loadingQuiz.set(false);
    }
  }

  /** Handler cuando se elimina una categoría */
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

  /** Limpia referencias a categorías eliminadas */
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

  /** Submit: actualizar quiz */
  async submitQuiz() {
    if (this.quizForm.invalid) {
      this.error.set('Por favor completa los campos requeridos.');
      return;
    }

    if (!this.quizId()) {
      this.error.set('ID de quiz no válido.');
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

      // Recopilar imágenes nuevas (solo las que tienen File)
      const imagesByIndex: { index: number; file: File }[] = (raw.questions ?? [])
        .map((q: any, idx: number) => (q?.image ? { index: idx + 1, file: q.image as File } : null))
        .filter((x: any) => !!x) as any[];

      const updated = await this.quizService.updateQuiz(
        this.quizId()!,
        { title: raw.title!, description: raw.description || '', categories, questions },
        imagesByIndex
      );

      this.success.set(true);

      // Ir al viewer
      const id = updated?.quiz_id ?? this.quizId();
      if (id) {
        this.router.navigate(['/host/quizzes', id]);
      } else {
        this.router.navigate(['/host/quizzes']);
      }
    } catch (err: any) {
      console.error(err);
      this.error.set(err?.error?.detail || 'Error al actualizar el quiz.');
    } finally {
      this.loading.set(false);
    }
  }
}