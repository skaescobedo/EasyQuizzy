import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormArray, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { QuizService } from '../../../services/quiz.service';

@Component({
  selector: 'app-create-quiz',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatIconModule],
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
  get questions() {
    return this.quizForm.get('questions') as FormArray;
  }

  get categories() {
    return this.quizForm.get('categories') as FormArray;
  }

  // === Categorías ===
  addCategory() {
    const orderIndex = this.categories.length + 1;
    this.categories.push(
      this.fb.group({
        name: ['', Validators.required],
        weight: [1, [Validators.required, Validators.min(0)]],
        order_index: [orderIndex],
        is_active: [true],
      })
    );
  }

  removeCategory(i: number) {
    this.categories.removeAt(i);
    // Reordenamos order_index para mantener 1..n
    this.categories.controls.forEach((ctrl, idx) => ctrl.get('order_index')?.setValue(idx + 1));
  }

  // === Preguntas ===
  addQuestion() {
    this.questions.push(
      this.fb.group({
        question_text: ['', Validators.required],
        question_type: ['multiple_choice', Validators.required],
        explanation: [''],
        correct_text: [''],
        has_time_limit: [false],
        time_limit_sec: [null],
        category_name: [''],
        answers: this.fb.array([
          this.fb.group({ answer_text: ['Opción 1', Validators.required], is_correct: [false] }),
          this.fb.group({ answer_text: ['Opción 2', Validators.required], is_correct: [false] }),
        ]),
        image: [null], // solo a nivel UI
      })
    );
  }

  removeQuestion(i: number) {
    this.questions.removeAt(i);
  }

  getAnswers(i: number) {
    return this.questions.at(i).get('answers') as FormArray;
  }

  addAnswer(i: number) {
    this.getAnswers(i).push(this.fb.group({ answer_text: ['', Validators.required], is_correct: [false] }));
  }

  removeAnswer(i: number, j: number) {
    this.getAnswers(i).removeAt(j);
  }

  toggleTimeLimit(i: number) {
    const q = this.questions.at(i);
    const has = q.get('has_time_limit')?.value;
    if (!has) {
      q.get('time_limit_sec')?.setValue(null);
    }
  }

  onFileSelected(event: any, i: number) {
    const file = event.target.files[0];
    if (file) this.questions.at(i).patchValue({ image: file });
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

      // Categorías con order_index 1..n
      const categories = (raw.categories ?? []).map((c: any, idx: number) => ({
        name: c.name,
        weight: c.weight,
        order_index: idx + 1,
        is_active: c.is_active ?? true,
      }));

      // Preguntas saneadas para el JSON (sin 'image' ni 'has_time_limit')
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

      // Imágenes: nombradas por order_index de la pregunta (requisito del backend)
      const imagesByIndex: { index: number; file: File }[] = (raw.questions ?? [])
        .map((q: any, idx: number) => (q?.image ? { index: idx + 1, file: q.image as File } : null))
        .filter((x: any) => !!x);

      await this.quizService.createQuiz(
        {
          title: raw.title!,
          description: raw.description || '',
          categories,
          questions,
        },
        imagesByIndex
      );

      this.success.set(true);
      this.quizForm.reset();
      this.questions.clear();
      this.categories.clear();

      this.router.navigate(['/host/quizzes']);
    } catch (err: any) {
      console.error(err);
      this.error.set(err?.error?.detail || 'Error al crear el quiz.');
    } finally {
      this.loading.set(false);
    }
  }
}
