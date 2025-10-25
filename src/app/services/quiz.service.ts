import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';
import { environment } from '../../environment/environment';

export interface QuizQuestion {
  question_text: string;
  question_type: string;
  explanation?: string | null;
  correct_text?: string | null;
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

@Injectable({ providedIn: 'root' })
export class QuizService {
  private http = inject(HttpClient);

  // imagesByIndex: [{ index: order_index_de_la_pregunta, file }]
  async createQuiz(data: QuizPayload, imagesByIndex: { index: number; file: File }[]): Promise<any> {
    const formData = new FormData();

    // JSON principal
    formData.append('quiz_data', JSON.stringify(data));

    // Archivos nombrados con el order_index (como requiere el backend)
    imagesByIndex.forEach(({ index, file }) => {
      const ext = file.name.includes('.') ? file.name.split('.').pop() : 'png';
      const filename = `${index}.${ext}`;
      formData.append('images', file, filename);
    });

    const result$ = this.http.post(`${environment.apiUrl}/quizzes/`, formData);
    return await lastValueFrom(result$);
  }
}
