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
import { QuizService, ExplainQuestionIn } from '../../../../../services/quiz.service';

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
  private api = inject(QuizService);

  collapsed = signal<boolean>(false);
  iaLoading = signal<boolean>(false);

  /** preview local; si viene de archivo será blob:, si ya existiera un URL será http(s): */
  previewUrl = signal<string | null>(null);
  previewName = signal<string | null>(null);

  ngOnInit(): void {
    if (this.startCollapsed) this.collapsed.set(true);

    // Reaccionar a cambios de tipo
    this.group.get('question_type')?.valueChanges.subscribe((nextType: string) => {
      this.onTypeChange(nextType);
    });
    // Inicializa respetando contenido existente (IA/manual)
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
    this.imageSelected.emit(file);
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
      // Determina si ya había una "correcta" y cuál
      const hadAny = answers.length > 0;
      let correctTrue = true;

      if (hadAny) {
        // Si ya viene marcada la correcta por IA/manual, respétala
        const arr = answers.value as Array<{ answer_text: string; is_correct: boolean }>;
        const trueMarked = arr.some(a => (a.answer_text || '').toLowerCase().startsWith('v') && !!a.is_correct);
        const falseMarked = arr.some(a => (a.answer_text || '').toLowerCase().startsWith('f') && !!a.is_correct);
        if (trueMarked && !falseMarked) correctTrue = true;
        else if (!trueMarked && falseMarked) correctTrue = false;
        // si ambos o ninguno, default true
      }

      answers.clear();
      answers.push(this.fb.group({ answer_text: ['Verdadero', Validators.required], is_correct: [correctTrue] }));
      answers.push(this.fb.group({ answer_text: ['Falso', Validators.required], is_correct: [!correctTrue] }));
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

    // multiple_choice → SOLO generar placeholders si NO hay respuestas aún
    if (answers.length === 0) {
      answers.push(this.fb.group({ answer_text: ['', Validators.required], is_correct: [false] }));
      answers.push(this.fb.group({ answer_text: ['', Validators.required], is_correct: [false] }));
    }
    this.group.get('correct_text')?.setValue(null);
  }

  /** IA: generar explicación para esta pregunta */
  async generateExplanation() {
    const qt = (this.group.get('question_text')?.value as string) || '';
    const type = (this.group.get('question_type')?.value as string) || 'multiple_choice';

    if (!qt.trim()) return;

    const payload: ExplainQuestionIn = { question_text: qt, question_type: type as any };

    if (type === 'short_answer') {
      payload.correct_text = (this.group.get('correct_text')?.value as string) ?? '';
    } else {
      const arr = (this.group.get('answers') as FormArray).value as Array<{ answer_text: string; is_correct: boolean }>;
      payload.answers = (arr || []).map(a => ({ answer_text: a.answer_text || '', is_correct: !!a.is_correct }));
    }

    try {
      this.iaLoading.set(true);
      const res = await this.api.aiExplainQuestion(payload);
      this.group.get('explanation')?.setValue((res?.explanation || '').trim());
    } catch (e) {
      console.error(e);
    } finally {
      this.iaLoading.set(false);
    }
  }
}
