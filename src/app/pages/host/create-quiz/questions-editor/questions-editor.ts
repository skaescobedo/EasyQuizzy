import { Component, Input, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormArray, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';

import { QuestionItem } from './question-item/question-item';

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
        // 👇 OJITO: valores vacíos para que el input muestre placeholder
        answers: this.fb.array([
          this.fb.group({ answer_text: ['', Validators.required], is_correct: [false] }),
          this.fb.group({ answer_text: ['', Validators.required], is_correct: [false] }),
        ]),
        image: [null],
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
}
