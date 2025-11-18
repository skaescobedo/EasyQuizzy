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

// ===================================================
// 🆕 INTERFACES PARA ANALYTICS
// ===================================================

// === Lista de sesiones (historial) ===
export interface SessionListItem {
  session_id: number;
  code: string | null;
  quiz_title: string;
  quiz_id: number;
  mode: 'live' | 'self';
  // status: string;  // ❌ ELIMINAR esta línea
  created_at: string | null;
  ended_at: string | null;
  participant_count: number;
  avg_score: number;
}

// === Estadísticas globales ===
export interface GlobalStats {
  total_participants: number;
  avg_score: number;
  median_score: number;
  highest_score: number;
  lowest_score: number;
  overall_accuracy: number;
  avg_response_time_ms: number;
  total_responses: number;
  correct_responses: number;
  incorrect_responses: number;
}

// === Distribución de respuestas por opción ===
export interface AnswerDistribution {
  answer_id: number;
  answer_text: string;
  is_correct: boolean;
  selection_count: number;
  selection_percentage: number;
}

// === Analytics por pregunta ===
export interface QuestionAnalytics {
  question_id: number;
  question_text: string;
  question_type: string;
  order_index: number;
  is_active: boolean;
  total_responses: number;
  correct_count: number;
  incorrect_count: number;
  no_response_count: number;
  accuracy_rate: number;
  avg_response_time_ms: number;
  answer_distribution: AnswerDistribution[];
  common_wrong_answers: { answer: string; count: number }[];
}

// === Insights automáticos ===
export interface Insights {
  hardest_question: {
    question_text: string;
    accuracy_rate: number;
    order_index: number;
  };
  easiest_question: {
    question_text: string;
    accuracy_rate: number;
    order_index: number;
  };
  difficult_questions: Array<{
    question_text: string;
    accuracy_rate: number;
    order_index: number;
  }>;
  suggestions: string[];
}

// === Breakdown personal (autoestudio) ===
export interface PersonalBreakdown {
  question_id: number;
  question_text: string;
  question_type: string;
  order_index: number;
  your_answer: string;
  correct_answer: string;
  is_correct: boolean;
  response_time_ms: number;
  explanation: string | null;
}

// === Estadísticas personales (autoestudio) ===
export interface PersonalStats {
  total_score: number;
  max_possible_score: number;
  score_percentage: number;
  correct_answers: number;
  incorrect_answers: number;
  accuracy_rate: number;
  total_time_ms: number;
  avg_response_time_ms: number;
  questions_completed: number;
  total_questions: number;
  fastest_response_ms: number;
  slowest_response_ms: number;
}

// === Analytics completos de una sesión ===
export interface SessionAnalytics {
  session_info: {
    session_id: number;
    code: string;
    quiz_title: string;
    quiz_id: number;
    mode: string;
    status: string | null;
    created_at: string | null;
    ended_at: string | null;
  };
  global_stats: GlobalStats;
  question_analytics: QuestionAnalytics[];
  insights: Insights;
  personal_breakdown?: PersonalBreakdown[];  // Solo en autoestudio
  personal_stats?: PersonalStats;            // Solo en autoestudio
}