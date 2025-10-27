import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams, HttpEventType } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';
import { environment } from '../../environment/environment';

export interface QuizQuestion {
  question_text: string;
  question_type: 'multiple_choice' | 'true_false' | 'short_answer' | string;
  explanation?: string;
  correct_text?: string;
  time_limit_sec?: number | null;
  category_name?: string | null;
  order_index: number;
  image_url?: string | null;
  original_filename?: string | null;
  answers: {
    answer_text: string;
    is_correct: boolean;
    order_index: number;
  }[];
}

export interface QuizPayload {
  title: string;
  description?: string;
  categories?: any[];
  questions: QuizQuestion[];
}

export interface QuizListItem {
  quiz_id: number;
  title: string;
  description?: string | null;
  is_public: boolean;
  created_at: string; // ISO
  category_count: number;
  question_count: number;
}

export interface QuizFull {
  quiz_id: number;
  title: string;
  description?: string | null;
  categories: { category_id: number; name: string; weight: number; order_index: number }[];
  questions: QuizQuestion[];
}

/** ==== IA payloads ==== */
export type Difficulty = 'easy' | 'normal' | 'hard';

export interface AIQuizParams {
  title_hint?: string | null;
  instructions?: string | null;
  num_questions?: number; // 1..50
  difficulty?: Difficulty; // default normal
  categories?: string[] | null;
  include_explanations?: boolean;
  allowed_types?: Array<'multiple_choice' | 'true_false' | 'short_answer'> | null;
  persist?: boolean;
}

export interface ExplainAnswer {
  answer_text: string;
  is_correct: boolean;
}
export interface ExplainQuestionIn {
  question_text: string;
  question_type: 'multiple_choice' | 'true_false' | 'short_answer';
  answers?: ExplainAnswer[] | null;
  correct_text?: string | null;
}

@Injectable({ providedIn: 'root' })
export class QuizService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/quizzes`;

  async listMyQuizzes(limit = 12, offset = 0): Promise<QuizListItem[]> {
    const params = new HttpParams().set('limit', limit).set('offset', offset);
    return await lastValueFrom(this.http.get<QuizListItem[]>(this.base, { params }));
  }

  async createQuiz(data: QuizPayload, images: { index: number; file: File }[]): Promise<any> {
    const formData = new FormData();
    formData.append('quiz_data', JSON.stringify(data));
    for (const { index, file } of images) {
      const ext = file.name.includes('.') ? file.name.split('.').pop()! : 'png';
      formData.append('images', file, `${index}.${ext}`);
    }
    return await lastValueFrom(this.http.post(this.base + '/', formData));
  }

  // 🆕 detalle
  async getQuiz(id: number): Promise<QuizFull> {
    return await lastValueFrom(this.http.get<QuizFull>(`${this.base}/${id}`));
  }

  // =============== IA endpoints ===============

  /** Genera un preview de quiz con IA (no persiste) */
  async aiGenerateQuiz(params: AIQuizParams, files: File[] = []): Promise<QuizPayload> {
    const fd = new FormData();
    fd.append('params', JSON.stringify(params || {}));
    for (const f of files) fd.append('files', f, f.name);

    return await lastValueFrom(this.http.post<QuizPayload>(`${this.base}/ai/generate`, fd));
  }

  /** Explica una sola pregunta */
  async aiExplainQuestion(input: ExplainQuestionIn): Promise<{ explanation: string }> {
    return await lastValueFrom(
      this.http.post<{ explanation: string }>(`${this.base}/ai/explain/question`, input)
    );
  }

  /** Explica varias preguntas (mismo orden) */
  async aiExplainBatch(inputs: ExplainQuestionIn[]): Promise<string[]> {
    const res = await lastValueFrom(
      this.http.post<{ explanations: string[] }>(`${this.base}/ai/explain/quiz`, { questions: inputs })
    );
    return res.explanations ?? [];
  }
}
