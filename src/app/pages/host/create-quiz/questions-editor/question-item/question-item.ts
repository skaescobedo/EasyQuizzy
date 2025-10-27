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

    // Suscripción: cuando el usuario CAMBIA el tipo, normalizamos
    this.group.get('question_type')?.valueChanges.subscribe((nextType: string) => {
      this.onTypeChange(nextType, /*fromInit*/ false);
    });

    // Inicialización: NO destruir respuestas generadas por IA
    this.onTypeChange(this.type, /*fromInit*/ true);

    // Preview si ya viene url (modo edición / IA con imágenes)
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

  /**
   * Normaliza el bloque de respuestas según el tipo seleccionado.
   * - fromInit=true => NO destruir respuestas existentes para multiple_choice (respeta IA).
   * - En cambios de usuario (fromInit=false) sí se reconfigura.
   */
  onTypeChange(nextType: string, fromInit = false) {
    if (!nextType) return;
    const answers = this.answersArray;

    if (nextType === 'true_false') {
      // Siempre forzar TF: exactamente 2 respuestas (V/F)
      answers.clear();
      answers.push(this.fb.group({ answer_text: ['Verdadero', Validators.required], is_correct: [true] }));
      answers.push(this.fb.group({ answer_text: ['Falso', Validators.required], is_correct: [false] }));
      this.group.get('correct_text')?.setValue(null);
      return;
    }

    if (nextType === 'short_answer') {
      // Siempre forzar SA: sin answers, con correct_text
      answers.clear();
      if (this.group.get('correct_text')?.value == null) {
        this.group.get('correct_text')?.setValue('');
      }
      return;
    }

    // multiple_choice
    if (fromInit) {
      // En init NO tocar si ya hay respuestas (para respetar las de IA)
      if (answers.length > 0) {
        // Asegurar que tienen required y boolean
        for (let i = 0; i < answers.length; i++) {
          const g = answers.at(i) as FormGroup;
          if (!g.get('answer_text')?.validator) {
            g.get('answer_text')?.addValidators([Validators.required]);
            g.get('answer_text')?.updateValueAndValidity({ emitEvent: false });
          }
          if (g.get('is_correct')?.value == null) {
            g.get('is_correct')?.setValue(false, { emitEvent: false });
          }
        }
        this.group.get('correct_text')?.setValue(null);
        return;
      }
    }

    // Cambio del usuario o init sin respuestas: crear placeholders mínimos
    answers.clear();
    answers.push(this.fb.group({ answer_text: ['', Validators.required], is_correct: [false] }));
    answers.push(this.fb.group({ answer_text: ['', Validators.required], is_correct: [false] }));
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
