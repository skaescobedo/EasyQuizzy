import { Component, EventEmitter, Output, ChangeDetectionStrategy, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormArray } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { QuizService, AIQuizParams, QuizPayload } from '../../../../services/quiz.service';

@Component({
  selector: 'app-ai-builder',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ReactiveFormsModule, MatIconModule],
  templateUrl: './ai-builder.html',
})
export class AIBuilder {
  @Output() generated = new EventEmitter<QuizPayload>();

  private fb = inject(FormBuilder);
  private api = inject(QuizService);

  loading = signal(false);
  error = signal<string | null>(null);
  files: File[] = [];

  form = this.fb.group({
    title_hint: [''],
    instructions: ['', [Validators.required]],
    num_questions: [5, [Validators.min(1), Validators.max(50)]],
    difficulty: ['normal' as 'easy' | 'normal' | 'hard'],
    include_explanations: [true],
    categories: [''], // coma-separadas
    types_multiple_choice: [true],
    types_true_false: [false],
    types_short_answer: [false],
  });

  onFileChange(ev: Event) {
    const input = ev.target as HTMLInputElement;
    if (!input?.files) return;
    this.files = Array.from(input.files);
  }

  removeFile(idx: number) {
    this.files.splice(idx, 1);
  }

  buildParams(): AIQuizParams {
    const v = this.form.value;
    const allowed: Array<'multiple_choice'|'true_false'|'short_answer'> = [];
    if (v.types_multiple_choice) allowed.push('multiple_choice');
    if (v.types_true_false) allowed.push('true_false');
    if (v.types_short_answer) allowed.push('short_answer');

    const cats = (v.categories || '').trim()
      ? (v.categories as string).split(',').map(s => s.trim()).filter(Boolean)
      : null;

    return {
      title_hint: v.title_hint || null,
      instructions: v.instructions || null,
      num_questions: Number(v.num_questions || 5),
      difficulty: (v.difficulty || 'normal') as any,
      include_explanations: !!v.include_explanations,
      allowed_types: allowed.length ? allowed : null,
      categories: cats,
      persist: false,
    };
  }

  async generate() {
    if (this.form.invalid) {
      this.error.set('Completa al menos las instrucciones o sube archivos.');
      return;
    }
    this.loading.set(true);
    this.error.set(null);
    try {
      const params = this.buildParams();
      const data = await this.api.aiGenerateQuiz(params, this.files);
      this.generated.emit(data);
    } catch (e: any) {
      console.error(e);
      this.error.set(e?.error?.detail || 'No se pudo generar el quiz con IA.');
    } finally {
      this.loading.set(false);
    }
  }
}
