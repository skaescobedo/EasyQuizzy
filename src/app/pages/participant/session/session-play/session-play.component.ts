import { Component, inject, signal, computed, effect } from "@angular/core";
import { CommonModule } from "@angular/common";
import { SessionService } from "../../../../services/session.service";
import { FormsModule } from "@angular/forms";
import { Router } from "@angular/router";

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
  showNextButton = signal(false);    // Mostrar botón "Siguiente pregunta"
  allowFinishQuestion = signal(false); // Mostrar "Terminar pregunta"

  quizEnded = signal(false);
  participants = this.session.participants;
  totalScore = signal<number>(0);

  joinCode = "";
  showJoinInput = signal(false);

  currentQuestion = computed(() => {
    const index = this.session.currentQuestionIndex();
    return this.session.questions()[index];
  });

  rankedParticipants = computed(() =>
    [...this.participants()].sort((a, b) => (b.score || 0) - (a.score || 0))
  );

  constructor() {
    // Cuando se acaba una pregunta
    this.session.on("end_question", () => {
      this.autoSubmitIfNeeded();
      this.showFeedback.set(true);
      this.timeLeft.set(0);
    });

    // Cuando el host termina el quiz
    this.session.on("quiz_ended", async () => {
      this.quizEnded.set(true);
      const id = this.session.sessionId();
      if (id) {
        const scores = await this.session.fetchScores(id);
        this.participants.set(scores);

        const myName = this.session.nickname();
        const me = scores.find((p) => p.nickname === myName);
        this.totalScore.set(me?.score || 0);
      }
    });

    // Reinicia selección por pregunta
    effect(() => {
      const q = this.currentQuestion();
      if (q && !this.quizEnded()) {
        this.resetQuestion();
        this.startTimer(q.time_limit_sec || 0);
      }
    });

    // Detectar si es autoestudio desde sessionService
    effect(() => {
      const mode = this.session.mode?.(); 
      if (mode === "self") this.isSelfStudy.set(true);
    });
  }

  resetQuestion() {
    this.selectedAnswer.set(null);
    this.showFeedback.set(false);
    this.isSubmitted.set(false);
    this.shortAnswer = "";
  }

  // Temporizador
  startTimer(seconds: number) {
    clearInterval((this as any)._interval);
    this.startTime = Date.now();

    if (seconds <= 0) return;

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
        }
      }
    }, 1000);
  }


  selectAnswer(id: number) {
    if (this.showFeedback()) return;
    this.selectedAnswer.set(id);
  }

  submit() {
    if (this.isSubmitted()) return;
    this.autoSubmitIfNeeded();
    
    if (this.isSelfStudy()) {
      this.allowFinishQuestion.set(true);
    }
  }

  autoSubmitIfNeeded() {
    if (this.isSubmitted()) return;

    const q = this.currentQuestion();
    if (!q) return;
    const elapsed = Date.now() - this.startTime;

    if (q.question_type === "short_answer" && this.shortAnswer.trim()) {
      this.session.submitAnswer(q.question_id, null, elapsed, this.shortAnswer.trim());
    } else if (this.selectedAnswer()) {
      this.session.submitAnswer(q.question_id, this.selectedAnswer(), elapsed);
    } else {
      this.session.submitAnswer(q.question_id, null, elapsed, "");
    }

    this.isSubmitted.set(true);
  }

  isCorrectAnswer(ansId: number) {
    const q = this.currentQuestion();
    return !!q?.answers.find((a) => a.answer_id === ansId && a.is_correct);
  }

  getAvatar() {
    return (
      this.session.avatarUrl() ||
      "https://cdn-icons-png.flaticon.com/512/149/149071.png"
    );
  }

  // 🔁 Mostrar input para unirse a otro quiz
  reloadQuiz() {
    this.showJoinInput.set(true);
  }

  // 🔢 Unirse con nuevo código
  joinNewQuiz() {
    const code = this.joinCode.trim().toUpperCase();
    if (!code) return;
    this.router.navigate(['/quizz', code]);
  }

  // 🏠 Ir a inicio de EasyQuizzy
  goHome() {
    this.session.disconnect();
    window.location.href = "/"; // o router.navigate(['/inicio'])
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
    }

    this.session.disconnect();
  }

  finishQuestionSelfStudy() {
    if (!this.isSelfStudy()) return;

    // ⛔ Detener el temporizador
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
      // Finaliza quiz
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
    const quizId = this.session.quizId?.(); // lo guardaremos abajo
    if (!quizId) return;

    // Limpia estado actual
    this.session.disconnect();
    this.session.clearLocalSession();

    // Crear nueva sesión self-study
    this.session.createSelfStudySession(quizId).then(() => {
      // Reiniciar valores internos
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
}
