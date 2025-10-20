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
  }

  // === Preguntas ===
addQuestion() {
  this.questions.push(
    this.fb.group({
      question_text: ['', Validators.required],
      question_type: ['multiple_choice', Validators.required],
      explanation: [''],
      correct_text: [''],
      has_time_limit: [false], // 👈 nuevo campo
      time_limit_sec: [null],
      category_name: [''],
      answers: this.fb.array([
        this.fb.group({ answer_text: ['Opción 1'], is_correct: [false] }),
        this.fb.group({ answer_text: ['Opción 2'], is_correct: [false] }),
      ]),
      image: [null],
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
    this.getAnswers(i).push(this.fb.group({ answer_text: [''], is_correct: [false] }));
  }

  removeAnswer(i: number, j: number) {
    this.getAnswers(i).removeAt(j);
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
      const data = this.quizForm.getRawValue() as any;

      const categories = (data.categories ?? []).map((c: any, idx: number) => ({
        ...c,
        order_index: idx + 1,
      }));

      const questions = (data.questions ?? []).map((q: any, idx: number) => ({
        ...q,
        order_index: idx + 1,
        answers: (q.answers ?? []).map((a: any, j: number) => ({
          ...a,
          order_index: j + 1,
        })),
      }));

      const images: File[] = (data.questions ?? [])
        .filter((q: any) => q?.image)
        .map((q: any) => q.image as File);

      await this.quizService.createQuiz(
        {
          title: data.title!,
          description: data.description!,
          categories,
          questions,
        },
        images
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
