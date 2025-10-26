import { Component, Input, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormArray, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-answers-editor',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ReactiveFormsModule, MatIconModule],
  templateUrl: './answers-editor.html',
})
export class AnswersEditor {
  @Input({ required: true }) formArray!: FormArray;

  /** Bloquea agregar y eliminar (usado en true_false) */
  @Input() lockAddRemove = false;

  /** Oculta el toggle de "Correcta" (usado en true_false) */
  @Input() hideCorrectToggle = false;

  /** Vuelve de solo lectura los textos (usado en true_false) */
  @Input() readonlyText = false;

  private fb = inject(FormBuilder);

  addAnswer() {
    if (this.lockAddRemove) return;
    this.formArray.push(this.fb.group({ answer_text: ['', Validators.required], is_correct: [false] }));
  }

  removeAnswer(i: number) {
    if (this.lockAddRemove) return;
    this.formArray.removeAt(i);
  }

  groupAt(i: number): FormGroup {
    return this.formArray.at(i) as FormGroup;
  }

  get controls() {
    return this.formArray.controls;
  }
}
