import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';
import { environment } from '../../environment/environment';

export interface QuizQuestion {
  question_text: string;
  question_type: string;
  explanation?: string;
  correct_text?: string;
  time_limit_sec?: number | null;
  category_name?: string | null;
  order_index: number;
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
  created_at: string;         // ISO string desde FastAPI
  category_count: number;
  question_count: number;
}

@Injectable({ providedIn: 'root' })
export class QuizService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/quizzes`;

  // 🆕 Listado del usuario autenticado
  async listMyQuizzes(limit = 12, offset = 0): Promise<QuizListItem[]> {
    const params = new HttpParams()
      .set('limit', limit)
      .set('offset', offset);

    const obs$ = this.http.get<QuizListItem[]>(this.base, { params });
    return await lastValueFrom(obs$);
  }

  // Crear quiz (con imágenes indexadas por order_index)
  async createQuiz(
    data: QuizPayload,
    images: { index: number; file: File }[]
  ): Promise<any> {
    const formData = new FormData();

    formData.append('quiz_data', JSON.stringify(data));

    for (const { index, file } of images) {
      const ext = file.name.includes('.') ? file.name.split('.').pop()! : 'png';
      const filename = `${index}.${ext}`;
      formData.append('images', file, filename);
    }

    const result$ = this.http.post(this.base + '/', formData);
    return await lastValueFrom(result$);
  }

  // (opcional futuro) detalle:
  // async getQuiz(id: number) { return await lastValueFrom(this.http.get(`${this.base}/${id}`)); }
}
