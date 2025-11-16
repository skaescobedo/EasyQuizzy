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
import { Subscription } from 'rxjs';

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

  /** Subs para TF (mutua exclusión) */
  private tfSubs: Subscription[] = [];

  /** preview local; si viene de archivo será blob:, si ya existiera un URL será http(s): */
  previewUrl = signal<string | null>(null);
  previewName = signal<string | null>(null);

  ngOnInit(): void {
    if (this.startCollapsed) this.collapsed.set(true);

    // Reaccionar a cambios de tipo, preservando respuestas de IA cuando existan
    this.group.get('question_type')?.valueChanges.subscribe((nextType: string) => {
      this.onTypeChange(nextType);
    });
    this.onTypeChange(this.type);

    // Si ya hay un image_url (modo edición), mostrarlo:
    const existingUrl = this.group.get('image_url')?.value as string | null;
    if (existingUrl) {
      this.previewUrl.set(existingUrl);
      this.previewName.set(this.group.get('original_filename')?.value ?? null);
    }
  }

  ngOnDestroy(): void {
    this.revokePreview();
    this.clearTfSubs();
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

  private clearTfSubs() {
    this.tfSubs.forEach(s => s.unsubscribe());
    this.tfSubs = [];
  }

  /** Configura la mutua exclusión de is_correct para TF */
  private setupTrueFalseMutualExclusion() {
    this.clearTfSubs();
    if (this.type !== 'true_false') return;

    const a0 = this.answersArray.at(0)?.get('is_correct');
    const a1 = this.answersArray.at(1)?.get('is_correct');
    if (!a0 || !a1) return;

    this.tfSubs.push(
      a0.valueChanges.subscribe((v: boolean) => {
        if (v) a1.setValue(false, { emitEvent: false });
      })
    );
    this.tfSubs.push(
      a1.valueChanges.subscribe((v: boolean) => {
        if (v) a0.setValue(false, { emitEvent: false });
      })
    );
  }

  onTypeChange(nextType: string) {
    if (!nextType) return;
    const answers = this.answersArray;

    // --- TRUE / FALSE ---
    if (nextType === 'true_false') {
      // Detectar si ya venían de IA y preservar cuál es correcta
      const current = (answers.value ?? []) as Array<{ answer_text?: string; is_correct?: boolean }>;
      let correctTrue = true; // default

      const hasExistingTF =
        current?.length >= 2 &&
        /verdadero/i.test(String(current[0]?.answer_text || '')) &&
        /falso/i.test(String(current[1]?.answer_text || ''));

      if (hasExistingTF) {
        correctTrue = !!current[0]?.is_correct; // si Verdadero venía correcto, se respeta
      }

      answers.clear();
      answers.push(this.fb.group({ answer_text: ['Verdadero', Validators.required], is_correct: [correctTrue] }));
      answers.push(this.fb.group({ answer_text: ['Falso', Validators.required], is_correct: [!correctTrue] }));
      this.group.get('correct_text')?.setValue(null);

      this.setupTrueFalseMutualExclusion();
      return;
    }

    // Al salir de TF, limpiar subs
    this.clearTfSubs();

    // --- SHORT ANSWER ---
    if (nextType === 'short_answer') {
      answers.clear();
      if (this.group.get('correct_text')?.value == null) {
        this.group.get('correct_text')?.setValue('');
      }
      return;
    }

    // --- MULTIPLE CHOICE ---
    // Preservar las respuestas si ya vienen de IA y tienen texto.
    const controls = answers.controls ?? [];
    const hasAnyAnswer = controls.length > 0;
    const hasAnyText = controls.some(c => (c.get('answer_text')?.value || '').toString().trim().length > 0);

    if (!hasAnyAnswer || !hasAnyText) {
      answers.clear();
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
