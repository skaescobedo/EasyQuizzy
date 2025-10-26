import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
  signal,
  OnInit,
  OnDestroy,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormArray, FormBuilder, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';

import { AnswersEditor } from './answers-editor/answers-editor';
import { ImageUploader } from './image-uploader/image-uploader';
import { TimeLimitToggle } from './time-limit-toggle/time-limit-toggle';

@Component({
  selector: 'app-question-item',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ReactiveFormsModule, MatIconModule, AnswersEditor, ImageUploader, TimeLimitToggle],
  templateUrl: './question-item.html',
})
export class QuestionItem implements OnInit, OnDestroy {
  @Input({ required: true }) group!: FormGroup;
  @Input() categoryNames: string[] = [];
  @Input() index = 0;
  @Input() startCollapsed = false;

  @Output() remove = new EventEmitter<void>();
  @Output() imageSelected = new EventEmitter<File>();

  private fb = inject(FormBuilder);
  collapsed = signal<boolean>(false);

  /** preview local; si viene de archivo será blob:, si ya existiera un URL será http(s): */
  previewUrl = signal<string | null>(null);
  previewName = signal<string | null>(null);

  ngOnInit(): void {
    if (this.startCollapsed) this.collapsed.set(true);

    // Reaccionar a cambios de tipo
    this.group.get('question_type')?.valueChanges.subscribe((nextType: string) => {
      this.onTypeChange(nextType);
    });
    this.onTypeChange(this.type);

    // Si en algún momento precargas un 'image_url' (modo edición), muéstralo:
    const existingUrl = this.group.get('image_url')?.value as string | null;
    if (existingUrl) {
      this.previewUrl.set(existingUrl);
      this.previewName.set(this.group.get('original_filename')?.value ?? null);
    }
  }

  ngOnDestroy(): void {
    this.revokePreview();
  }

  get answersArray(): FormArray {
    return this.group.get('answers') as FormArray;
  }

  get questionText(): string {
    return (this.group.get('question_text')?.value as string) ?? '';
  }

  get type(): string {
    return (this.group.get('question_type')?.value as string) ?? 'multiple_choice';
  }

  toggleCollapse(): void {
    this.collapsed.update(v => !v);
  }

  onFileSelected(file: File) {
    // Emitir hacia arriba (para que el padre lo ponga en el FormGroup 'image')
    this.imageSelected.emit(file);

    // Actualizar preview local
    this.revokePreview();
    const url = URL.createObjectURL(file);
    this.previewUrl.set(url);
    this.previewName.set(file.name);
  }

  private revokePreview() {
    const url = this.previewUrl();
    if (url && url.startsWith('blob:')) {
      URL.revokeObjectURL(url);
    }
  }

  onTypeChange(nextType: string) {
    if (!nextType) return;
    const answers = this.answersArray;

    if (nextType === 'true_false') {
      answers.clear();
      answers.push(this.fb.group({ answer_text: ['Verdadero', Validators.required], is_correct: [true] }));
      answers.push(this.fb.group({ answer_text: ['Falso', Validators.required], is_correct: [false] }));
      this.group.get('correct_text')?.setValue(null);
      return;
    }

    if (nextType === 'short_answer') {
      answers.clear();
      if (this.group.get('correct_text')?.value == null) {
        this.group.get('correct_text')?.setValue('');
      }
      return;
    }

    // multiple_choice ⇒ siempre regenerar 2 vacías (para que se vean placeholders)
    answers.clear();
    answers.push(this.fb.group({ answer_text: ['', Validators.required], is_correct: [false] }));
    answers.push(this.fb.group({ answer_text: ['', Validators.required], is_correct: [false] }));
    this.group.get('correct_text')?.setValue(null);
  }
}
