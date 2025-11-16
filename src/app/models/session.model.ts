// === Participantes conectados ===
export interface Participant {
  nickname: string;
  avatar_url?: string;
  score: number;
}

// === Información general de la sesión ===
export interface SessionInfo {
  session_id: number;
  code: string;
  quiz_title: string;
}

// === Datos del quiz que se usará en la sesión ===
export interface AnswerSessionOut {
  answer_id: number;
  answer_text: string;
  is_correct?: boolean;
}

export interface QuestionSessionOut {
  question_id: number;
  question_text: string;
  question_type: string;
  time_limit_sec?: number;
  image_url?: string;
  correct_text?: string;
  explanation?: string;
  answers: AnswerSessionOut[];
}

export interface QuizSessionOut {
  quiz_id: number;
  mode: string;
  title: string;
  description?: string;
  categories: string[];
  questions: QuestionSessionOut[];
}
