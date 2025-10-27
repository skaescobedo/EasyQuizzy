import { Component, Input, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormArray, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { QuestionItem } from './question-item/question-item';
import { QuizService, ExplainQuestionIn } from '../../../../services/quiz.service';

@Component({
  selector: 'app-questions-editor',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ReactiveFormsModule, MatIconModule, QuestionItem],
  templateUrl: './questions-editor.html',
})
export class QuestionsEditor {
  @Input({ required: true }) formArray!: FormArray;
  @Input() categoryNames: string[] = [];

  private fb = inject(FormBuilder);
  private api = inject(QuizService);

  genAllLoading = signal(false);

  addQuestion() {
    this.formArray.push(
      this.fb.group({
        question_text: ['', Validators.required],
        question_type: ['multiple_choice', Validators.required],
        explanation: [''],
        correct_text: [''],
        has_time_limit: [false],
        time_limit_sec: [null],
        category_name: [''],
        answers: this.fb.array([
          this.fb.group({ answer_text: ['', Validators.required], is_correct: [false] }),
          this.fb.group({ answer_text: ['', Validators.required], is_correct: [false] }),
        ]),
        image: [null],
        image_url: [null],
        original_filename: [null],
      })
    );
  }

  removeQuestion(i: number) {
    this.formArray.removeAt(i);
  }

  onImageSelected(i: number, file: File) {
    const q = this.getGroup(i);
    q.patchValue({ image: file });
  }

  getGroup(i: number): FormGroup {
    return this.formArray.at(i) as FormGroup;
  }

  trackByIndex = (index: number) => index;

  /** IA: generar explicaciones para todas las preguntas */
  async generateExplanationsAll() {
    if (!this.formArray?.length) return;

    const payload: ExplainQuestionIn[] = [];
    for (let i = 0; i < this.formArray.length; i++) {
      const g = this.getGroup(i);
      const type = (g.get('question_type')?.value as string) || 'multiple_choice';
      const question_text = (g.get('question_text')?.value as string) || '';

      if (!question_text?.trim()) {
        payload.push({ question_text: ' ', question_type: 'multiple_choice', answers: [] });
        continue;
      }

      if (type === 'short_answer') {
        payload.push({
          question_text,
          question_type: 'short_answer',
          correct_text: (g.get('correct_text')?.value as string) ?? '',
        });
      } else {
        const arr = (g.get('answers') as FormArray).value as Array<{ answer_text: string; is_correct: boolean }>;
        payload.push({
          question_text,
          question_type: (type as any),
          answers: (arr || []).map(a => ({ answer_text: a.answer_text || '', is_correct: !!a.is_correct })),
        });
      }
    }

    try {
      this.genAllLoading.set(true);
      const exps = await this.api.aiExplainBatch(payload);
      exps.forEach((exp, idx) => {
        const g = this.getGroup(idx);
        g.get('explanation')?.setValue(exp || '');
      });
    } catch (e) {
      console.error(e);
    } finally {
      this.genAllLoading.set(false);
    }
  }
}
