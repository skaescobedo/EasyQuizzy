import { Component, inject, signal, computed, effect } from "@angular/core";
import { CommonModule } from "@angular/common";
import { SessionService } from "../../../../services/session.service";
import { Router } from "@angular/router";
import { TopsisRanking, TopsisParticipant } from "../../../../models/session.model";

@Component({
  standalone: true,
  selector: "app-session-play-host",
  imports: [CommonModule],
  templateUrl: "./session-play-host.component.html",
})
export class SessionPlayHostComponent {
  session = inject(SessionService);
  router = inject(Router);
  showScores = signal(false);
  quizEnded = signal(false);
  participants = this.session.participants;

  timeLeft = signal<number>(0);
  timerRunning = signal<boolean>(false);
  startTime = 0;

  // 🎯 NUEVO: Signals para TOPSIS
  topsisData = signal<TopsisRanking | null>(null);
  showTopsisRanking = signal(false);  // Toggle entre ranking normal y TOPSIS
  expandedParticipant = signal<number | null>(null);  // ID del participante expandido

  currentQuestion = computed(() => {
    const index = this.session.currentQuestionIndex();
    return this.session.questions()[index];
  });

  rankedParticipants = computed(() =>
    [...this.participants()].sort((a, b) => (b.score || 0) - (a.score || 0))
  );

  // 🎯 NUEVO: Ranking TOPSIS ordenado
  rankedTopsisParticipants = computed(() => {
    const data = this.topsisData();
    if (!data || !data.has_categories) return [];
    return [...data.ranking].sort((a, b) => a.topsis_rank - b.topsis_rank);
  });

  constructor() {
    // 🔹 Reiniciar temporizador en cada pregunta
    effect(() => {
      const q = this.currentQuestion();
      if (q && !this.quizEnded()) {
        this.startTimer(q.time_limit_sec || 0);
      }
    });
  }

  // ==============================
  // ⏱️ Temporizador
  // ==============================
  startTimer(seconds: number) {
    clearInterval((this as any)._interval);
    this.startTime = Date.now();

    if (seconds > 0) {
      this.timeLeft.set(seconds);
      this.timerRunning.set(true);

      (this as any)._interval = setInterval(() => {
        const newTime = this.timeLeft() - 1;
        this.timeLeft.set(newTime);

        if (newTime <= 0) {
          clearInterval((this as any)._interval);
          this.timerRunning.set(false);
          this.endQuestion();
        }
      }, 1000);
    } else {
      this.timeLeft.set(0);
      this.timerRunning.set(false);
    }
  }

  // ==============================
  // 🏁 Terminar pregunta
  // ==============================
  async endQuestion() {
    if (this.showScores()) return;
    clearInterval((this as any)._interval);

    this.showScores.set(true);
    this.session.send("end_question");

    const id = this.session.sessionId();
    if (id) {
      const scores = await this.session.fetchScores(id);
      this.participants.set(scores);
    }
  }

  // ==============================
  // ⏭️ Pasar a la siguiente
  // ==============================
  nextQuestion() {
    clearInterval((this as any)._interval);
    const nextIndex = this.session.currentQuestionIndex() + 1;

    if (nextIndex >= this.session.questions().length) {
      // 🔹 Si ya no hay más preguntas → terminar el quiz
      this.finishQuiz();
      return;
    }

    this.session.send("next_question", { index: nextIndex });
    this.session.currentQuestionIndex.set(nextIndex);
    this.showScores.set(false);
  }

  // ==============================
  // 🏁 Finalizar Quiz
  // ==============================
  async finishQuiz() {
    clearInterval((this as any)._interval);
    this.quizEnded.set(true);
    this.showScores.set(false);
    this.session.send("end_quiz");

    const id = this.session.sessionId();
    if (id) {
      // Obtener scores normales
      const scores = await this.session.fetchScores(id);
      this.participants.set(scores);

      // 🎯 NUEVO: Intentar obtener TOPSIS
      try {
        const topsis = await this.session.fetchTopsisRanking(id);
        if (topsis.has_categories) {
          this.topsisData.set(topsis);
        }
      } catch (err) {
        console.warn('No se pudo calcular TOPSIS:', err);
      }
    }
  }

  // ==============================
  // 🎯 NUEVO: Toggle ranking mode
  // ==============================
  toggleRankingMode(mode: 'normal' | 'topsis') {
    this.showTopsisRanking.set(mode === 'topsis');
  }

  // ==============================
  // 🎯 NUEVO: Toggle desglose de participante
  // ==============================
  toggleParticipantDetails(participantId: number) {
    if (this.expandedParticipant() === participantId) {
      this.expandedParticipant.set(null);
    } else {
      this.expandedParticipant.set(participantId);
    }
  }

  // ==============================
  // 🎯 NUEVO: Obtener categorías de un participante
  // ==============================
  getCategoryEntries(participant: TopsisParticipant): [string, any][] {
    return Object.entries(participant.category_performance);
  }

  // ==============================
  // 🎯 NUEVO: Color según score de categoría
  // ==============================
  getCategoryColor(score: number): string {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  }

  getCategoryTextColor(score: number): string {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  }

  // ==============================
  // 📊 Ver resultados detallados
  // ==============================
  viewDetailedResults() {
    const sessionId = this.session.sessionId();
    if (sessionId) {
      this.router.navigate(['/host/analytics/session', sessionId]);
    }
  }

  // ==============================
  // 🏠 Volver al inicio
  // ==============================
  goHome() {
    this.session.disconnect();
    this.router.navigate(['/']);
  }
}