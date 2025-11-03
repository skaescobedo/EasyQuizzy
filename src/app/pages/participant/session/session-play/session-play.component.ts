import { Component, inject, signal, computed, effect } from "@angular/core";
import { CommonModule } from "@angular/common";
import { SessionService } from "../../../../services/session.service";

@Component({
  standalone: true,
  selector: "app-quiz-play",
  imports: [CommonModule],
  templateUrl: "./session-play.component.html",
})
export class QuizPlayComponent {
  session = inject(SessionService);

  // === Estado local ===
  timeLeft = signal<number>(0);
  timerRunning = signal<boolean>(false);
  selectedAnswer = signal<number | null>(null);
  startTime = 0;

  // === Computed ===
  currentQuestion = computed(() => {
    const index = this.session.currentQuestionIndex();
    return this.session.questions()[index];
  });

  isHost = computed(() => this.session.role() === "host");

  constructor() {
    // Efecto reactivo: cada vez que cambia la pregunta, reinicia temporizador
    effect(() => {
      const q = this.currentQuestion();
      if (q) this.startTimer(q.time_limit_sec || 0);
    });
  }

  // 🔹 Inicia o reinicia el temporizador
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
          if (!this.isHost()) this.autoSubmit();
        }
      }, 1000);
    } else {
      this.timeLeft.set(0);
      this.timerRunning.set(false);
    }
  }

  // 🔹 Enviar respuesta manual o automática
  submit(answerId: number) {
    if (this.selectedAnswer()) return; // prevenir doble clic

    this.selectedAnswer.set(answerId);
    const elapsed = Date.now() - this.startTime; // ⏱ tiempo que tardó
    const q = this.currentQuestion();
    if (!q) return;

    // Se manda la respuesta
    this.session.submitAnswer(q.question_id, answerId, false, elapsed);
  }

  autoSubmit() {
    console.warn("⏰ Tiempo agotado, enviando sin respuesta...");
    this.submit(-1);
  }

  nextQuestion() {
    const nextIndex = this.session.currentQuestionIndex() + 1;
    this.session.send("next_question", { index: nextIndex });
    this.session.currentQuestionIndex.set(nextIndex);
  }

  getAvatar() {
    return this.session.avatarUrl() || "https://cdn-icons-png.flaticon.com/512/149/149071.png";
  }
}
