import { Component, inject, signal, computed, effect } from "@angular/core";
import { CommonModule } from "@angular/common";
import { SessionService } from "../../../../services/session.service";
import { FormsModule } from "@angular/forms";
import { Router } from "@angular/router";
import { TopsisRanking, TopsisParticipant } from "../../../../models/session.model";

@Component({
  standalone: true,
  selector: "app-session-play",
  imports: [CommonModule, FormsModule],
  templateUrl: "./session-play.component.html",
})
export class SessionPlayComponent {
  session = inject(SessionService);

  selectedAnswer = signal<number | null>(null);
  showFeedback = signal(false);
  isSubmitted = signal(false);
  timeLeft = signal<number>(0);
  shortAnswer = "";
  startTime = 0;
  router = inject(Router);
  isSelfStudy = signal(false);
  showNextButton = signal(false);
  allowFinishQuestion = signal(false);

  quizEnded = signal(false);
  participants = this.session.participants;
  totalScore = signal<number>(0);

  joinCode = "";
  showJoinInput = signal(false);

  // 🎯 NUEVO: Signals para TOPSIS
  topsisData = signal<TopsisRanking | null>(null);
  showTopsisRanking = signal(false);
  myParticipantId = signal<number | null>(null);
  showMyDetails = signal(false);

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

  // 🎯 NUEVO: Mis datos en TOPSIS
  myTopsisData = computed(() => {
    const data = this.topsisData();
    if (!data || !data.has_categories) return null;
    
    const myName = this.session.nickname();
    return data.ranking.find(p => p.nickname === myName) || null;
  });

  constructor() {
    // Cuando se acaba una pregunta
    this.session.on("end_question", () => {
      this.autoSubmitIfNeeded();
      this.showFeedback.set(true);
      this.timeLeft.set(0);
    });

    // Cuando el host termina el quiz
    this.session.on("quiz_ended", async () => {
      await this.handleQuizEnded();
    });

    // Reinicia selección por pregunta
    effect(() => {
      const q = this.currentQuestion();
      if (q && !this.quizEnded()) {
        this.resetQuestion();
        this.startTimer(q.time_limit_sec || 0);
      }
    });

    // Detectar si es autoestudio
    effect(() => {
      const mode = this.session.mode?.();
      if (mode === "self") {
        this.isSelfStudy.set(true);
      }
    });
  }

  // 🎯 NUEVO: Manejar fin de quiz con TOPSIS
  async handleQuizEnded() {
    this.quizEnded.set(true);
    const id = this.session.sessionId();
    if (id) {
      const scores = await this.session.fetchScores(id);
      this.participants.set(scores);

      const myName = this.session.nickname();
      const me = scores.find((p) => p.nickname === myName);
      this.totalScore.set(me?.score || 0);
      
      if (me) {
        this.myParticipantId.set(me.participant_id);
      }

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

  resetQuestion() {
    this.selectedAnswer.set(null);
    this.showFeedback.set(false);
    this.isSubmitted.set(false);
    this.shortAnswer = "";
    this.allowFinishQuestion.set(false);
    this.showNextButton.set(false);
  }

  startTimer(seconds: number) {
    clearInterval((this as any)._interval);
    this.startTime = Date.now();

    if (seconds > 0) {
      this.timeLeft.set(seconds);

      (this as any)._interval = setInterval(() => {
        const newTime = this.timeLeft() - 1;
        this.timeLeft.set(newTime);

        if (newTime <= 0) {
          clearInterval((this as any)._interval);
          
          // 🔥 SI ES AUTOESTUDIO → AUTO-FINALIZAR PREGUNTA
          if (this.isSelfStudy()) {
            this.autoSubmitIfNeeded();     // enviar respuesta (aunque sea null)
            this.showFeedback.set(true);   // mostrar corrección
            this.showNextButton.set(true); // permitir avanzar
            this.allowFinishQuestion.set(false);
          } else {
            this.autoSubmitIfNeeded();
          }
        }
      }, 1000);
    } else {
      this.timeLeft.set(0);
      // ⏰ Sin tiempo límite en autoestudio → permitir terminar manualmente
      if (this.isSelfStudy()) {
        this.allowFinishQuestion.set(true);
      }
    }
  }

  selectAnswer(answerId: number) {
    if (this.isSubmitted() || this.showFeedback()) return;
    this.selectedAnswer.set(answerId);
  }

  // ✅ RESTAURADO: Método submit() para el botón "Enviar respuesta"
  submitAnswer() {
    if (this.isSubmitted()) return;
    
    const q = this.currentQuestion();
    if (!q) return;

    // Validación según tipo de pregunta
    if (q.question_type === "short_answer" && !this.shortAnswer.trim()) {
      return;
    }

    if (q.question_type !== "short_answer" && this.selectedAnswer() === null) {
      return;
    }

    // Enviar respuesta
    this.autoSubmitIfNeeded();
    
    // 🔥 SI ES AUTOESTUDIO → mostrar botón "Terminar pregunta"
    if (this.isSelfStudy()) {
      this.allowFinishQuestion.set(true);
    }
  }

  autoSubmitIfNeeded() {
    if (this.isSubmitted()) return;

    const q = this.currentQuestion();
    if (!q) return;

    const responseTime = Date.now() - this.startTime;
    const answerId = this.selectedAnswer();
    const shortAns = this.shortAnswer.trim() || undefined;

    this.session.submitAnswer(q.question_id, answerId, responseTime, shortAns);
    this.isSubmitted.set(true);
  }

  isCorrect(answerId: number): boolean {
    const q = this.currentQuestion();
    return !!q?.answers.find((a) => a.answer_id === answerId && a.is_correct);
  }

  getAvatar() {
    return (
      this.session.avatarUrl() ||
      "https://cdn-icons-png.flaticon.com/512/149/149071.png"
    );
  }

  reloadQuiz() {
    this.showJoinInput.set(true);
  }

  joinNewQuiz() {
    const code = this.joinCode.trim().toUpperCase();
    if (!code) return;
    this.router.navigate(['/quizz', code]);
  }

  goHome() {
    this.session.disconnect();
    window.location.href = "/";
  }

  async finishSelfStudy() {
    console.log("🔚 Finalizando autoestudio...");

    clearInterval((this as any)._interval);

    this.quizEnded.set(true);

    const id = this.session.sessionId();
    if (id) {
      const scores = await this.session.fetchScores(id);
      this.participants.set(scores);

      const playerName = this.session.nickname();
      const me = scores.find((p) => p.nickname === playerName);
      this.totalScore.set(me?.score || 0);

      // 🎯 NUEVO: Obtener TOPSIS también en autoestudio
      try {
        const topsis = await this.session.fetchTopsisRanking(id);
        if (topsis.has_categories) {
          this.topsisData.set(topsis);
        }
      } catch (err) {
        console.warn('No se pudo calcular TOPSIS:', err);
      }
    }

    this.session.disconnect();
  }

  // ✅ RESTAURADO: Terminar pregunta manualmente en autoestudio
  finishQuestionSelfStudy() {
    if (!this.isSelfStudy()) return;

    // Detener el temporizador
    clearInterval((this as any)._interval);
    this.timeLeft.set(0);

    this.autoSubmitIfNeeded();  // asegúrate que mande respuesta si no lo hizo

    this.showFeedback.set(true);
    this.allowFinishQuestion.set(false);

    // Mostrar botón para pasar a la siguiente
    this.showNextButton.set(true);
  }

  nextQuestion() {
    if (!this.isSelfStudy()) return;

    const next = this.session.currentQuestionIndex() + 1;
    const total = this.session.questions().length;

    if (next >= total) {
      this.finishSelfStudy();
      return;
    }

    this.session.currentQuestionIndex.set(next);
    this.showFeedback.set(false);
    this.allowFinishQuestion.set(false);
    this.showNextButton.set(false);
    this.resetQuestion();
  }

  retrySelfStudy() {
    const quizId = this.session.quizId?.();
    if (!quizId) return;

    this.session.disconnect();
    this.session.clearLocalSession();

    this.session.createSelfStudySession(quizId).then(() => {
      this.quizEnded.set(false);
      this.showFeedback.set(false);
      this.isSubmitted.set(false);
      this.showNextButton.set(false);
      this.allowFinishQuestion.set(false);

      this.session.currentQuestionIndex.set(0);
    });
  }

  viewDetailedResults() {
    const sessionId = this.session.sessionId();
    if (sessionId) {
      this.router.navigate(['/quizz/analytics/personal', sessionId]);
    }
  }

  // ==============================
  // 🎯 NUEVO: Métodos para TOPSIS
  // ==============================
  
  toggleRankingMode(mode: 'normal' | 'topsis') {
    this.showTopsisRanking.set(mode === 'topsis');
  }

  toggleMyDetails() {
    this.showMyDetails.update(v => !v);
  }

  getCategoryEntries(participant: TopsisParticipant): [string, any][] {
    return Object.entries(participant.category_performance);
  }

  getCategoryColor(score: number): string {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  }

  isMyRow(nickname: string): boolean {
    return nickname === this.session.nickname();
  }
}