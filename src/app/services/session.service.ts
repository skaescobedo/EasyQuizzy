import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environment/environment';
import { Participant, QuizSessionOut, QuestionSessionOut } from '../models/session.model';

@Injectable({ providedIn: 'root' })
export class SessionService {
  private http = inject(HttpClient);
  private socket?: WebSocket;

  // === Signals reactivas ===
  sessionId = signal<number | null>(null);
  quizId = signal<number | null>(null);
  code = signal<string>('');
  quizTitle = signal<string>('');
  participants = signal<Participant[]>([]);
  questions = signal<QuestionSessionOut[]>([]);
  currentQuestionIndex = signal<number>(0);
  isConnected = signal(false);
  mode = signal<string | null>(null);
  role = signal<'host' | 'player' | null>(null);
  accessCode = signal<string | null>(null);
  nickname = signal<string | null>(null);
  avatarUrl = signal<string | null>(null);

  private apiUrl = `${environment.apiUrl}/sessions`;
  private wsUrl = `${environment.wsUrl}/sessions/ws`;

  // =======================================================
  // 🚀 Crear sesión (HOST)
  // =======================================================
  async createSession(quizId: number) {
    const session: any = await this.http
      .post(`${this.apiUrl}?quiz_id=${quizId}`, {})
      .toPromise();

    this.sessionId.set(session.session_id);
    this.code.set(session.code);
    this.quizTitle.set(session.name);
    this.participants.set([]);

    this.connectAsHost(session.session_id);
    return session;
  }

  async createSelfStudySession(quizId: number) {
    const session: any = await this.http
      .post(`${this.apiUrl}?quiz_id=${quizId}&mode=self`, {})
      .toPromise();

    console.log(session);
    const s = session.session;
    const p = session.participant;

    this.sessionId.set(s.session_id);
    this.quizTitle.set(s.name);

    // 🔥 conectar como jugador
    this.connectAsPlayer(
      s.session_id,
      p.nickname,
      "",
      p.access_code
    );

    this.nickname.set(p.nickname);
    this.accessCode.set(p.access_code);

    // 🔥 guardar localmente para submit_answer()
    localStorage.setItem("access_code", p.access_code);
    localStorage.setItem("participant_id", p.participant_id.toString());

    await this.fetchQuiz(s.session_id);
    this.currentQuestionIndex.set(0);

    return session;
  }

  // =======================================================
  // 👤 Intentar reconexión automática (PLAYER)
  // =======================================================
  async tryAutoJoin(code: string): Promise<boolean> {
    const savedCode = localStorage.getItem('session_code');
    const savedAccess = localStorage.getItem('access_code');
    const savedNickname = localStorage.getItem('nickname');
    const savedAvatar = localStorage.getItem('avatar_url');

    if (!savedAccess || savedCode !== code) {
      // No hay sesión previa o el código cambió
      return false;
    }

    try {
      const res: any = await this.http
        .post(`${this.apiUrl}/${code}/join`, {
          nickname: savedNickname || 'Jugador',
          avatar_url: savedAvatar,
          access_code: savedAccess,
        })
        .toPromise();

      this.persistSession(res, code);
      this.connectAsPlayer(res.session_id, res.nickname, res.avatar_url, res.access_code);
      return true;
    } catch (err) {
      console.warn('⚠️ Access code inválido, limpieza local');
      this.clearLocalSession();
      return false;
    }
  }

  // =======================================================
  // 👤 Unirse a sesión (manual)
  // =======================================================
  async joinSession(code: string, nickname: string, avatarUrl: string) {
    try {
      const res: any = await this.http
        .post(`${this.apiUrl}/${code}/join`, {
          nickname,
          avatar_url: avatarUrl,
        })
        .toPromise();

      this.persistSession(res, code, nickname, avatarUrl);
      this.connectAsPlayer(res.session_id, nickname, avatarUrl, res.access_code);
      return res;
    } catch (err: any) {
      console.error('❌ Error uniéndose a sesión', err);
      throw new Error(err?.error?.detail || 'No se pudo unir a la sesión.');
    }
  }

  // =======================================================
  // 🔒 Persistir datos locales
  // =======================================================
  private persistSession(res: any, code: string, nickname?: string, avatarUrl?: string) {
    this.sessionId.set(res.session_id);
    this.code.set(code);
    this.accessCode.set(res.access_code);
    this.nickname.set(nickname || res.nickname);
    this.avatarUrl.set(avatarUrl || res.avatar_url);

    localStorage.setItem('access_code', res.access_code);
    localStorage.setItem('session_code', code);
    localStorage.setItem('participant_id', res.participant_id);
    localStorage.setItem('nickname', nickname || res.nickname);
    localStorage.setItem('avatar_url', avatarUrl || res.avatar_url);
  }

  clearLocalSession() {
    localStorage.removeItem('access_code');
    localStorage.removeItem('session_code');
    localStorage.removeItem('participant_id');
    localStorage.removeItem('nickname');
    localStorage.removeItem('avatar_url');
  }

  // =======================================================
  // 🔌 Conectar HOST / PLAYER
  // =======================================================
  connectAsHost(sessionId: number) {
    this.role.set('host');
    this.connect(`${this.wsUrl}/${sessionId}/host`, sessionId);
  }

  connectAsPlayer(sessionId: number, nickname: string, avatarUrl: string, accessCode?: string) {
    this.role.set('player');
    this.connect(`${this.wsUrl}/${sessionId}/player`, sessionId, {
      nickname,
      avatar_url: avatarUrl,
      access_code: accessCode,
    });
  }

  private connect(wsUrl: string, sessionId: number, playerData?: any) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) this.socket.close();

    this.socket = new WebSocket(wsUrl);
    this.sessionId.set(sessionId);

    this.socket.onopen = () => {
      console.log('✅ WS conectado:', wsUrl);
      this.isConnected.set(true);

      if (this.role() === 'player' && playerData) {
        this.send('join_player', playerData);
      }
    };

    this.socket.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      this.handleMessage(msg);
    };

    this.socket.onclose = () => {
      console.log('🔌 WS cerrado');
      this.isConnected.set(false);
    };

    this.socket.onerror = (err) => {
      console.error('⚠️ WS error', err);
      this.isConnected.set(false);
    };
  }

  // =======================================================
  // 💬 Enviar evento WS
  // =======================================================
  send(event: string, data: any = {}) {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ event, data }));
    }
  }

  submitAnswer(questionId: number, answerId: number | null, responseTimeMs: number, shortAnswer?: string) {
    const participantId = localStorage.getItem('participant_id');
    this.send("submit_answer", {
      question_id: questionId,
      answer_id: answerId,
      response_time_ms: responseTimeMs,
      short_answer: shortAnswer ?? null,
      participant_id: participantId,
    });
  }


  // =======================================================
  // 📡 Sistema de listeners para eventos WS dinámicos
  // =======================================================
  private listeners = new Map<string, ((data?: any) => void)[]>();

  on(event: string, callback: (data?: any) => void) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  off(event: string, callback: (data?: any) => void) {
    const arr = this.listeners.get(event);
    if (!arr) return;
    this.listeners.set(
      event,
      arr.filter(fn => fn !== callback)
    );
  }

  // 🔹 Método para disparar los listeners cuando llega un evento
  private emit(event: string, data?: any) {
    const arr = this.listeners.get(event);
    if (arr) {
      arr.forEach(fn => {
        try {
          fn(data);
        } catch (err) {
          console.error(`Error en listener '${event}'`, err);
        }
      });
    }
  }

  // =======================================================
  // 📩 Manejador de mensajes
  // =======================================================
  private handleMessage(msg: any) {
    this.emit(msg.event, msg);

    switch (msg.event) {
      case 'update_participants':
        this.participants.set(msg.players || []);
        break;
      case 'quiz_started':
        this.fetchQuiz(this.sessionId()!);
        break;
      case 'next_question':
        const index = msg.index;
        console.log('➡️ Cambiando a pregunta:', index);
        this.currentQuestionIndex.set(index);
        break;
      case 'session_closed':
        alert('❌ La sesión fue finalizada por el host.');
        this.clearLocalSession();
        this.disconnect();
        break;
      default:
        console.log('📩 Evento desconocido:', msg);
    }
  }

  async fetchQuiz(sessionId: number): Promise<QuizSessionOut> {
    const quiz = await this.http
      .get<QuizSessionOut>(`${this.apiUrl}/${sessionId}/quiz`)
      .toPromise();

    this.quizTitle.set(quiz!.title);
    this.questions.set(quiz!.questions);
    this.mode.set(quiz!.mode);
    this.quizId.set(quiz!.quiz_id);
    console.log(quiz);
    return quiz!;
  }

  async fetchScores(sessionId: number): Promise<any[]> {
    const res = await this.http.get<any[]>(`${this.apiUrl}/${sessionId}/scores`).toPromise();
    return res || [];
  }

  async endSession() {
    const id = this.sessionId();
    if (!id) return;

    await this.http.post(`${this.apiUrl}/${id}/end`, {}).toPromise();
    this.disconnect();
  }
  
  disconnect() {
    this.socket?.close();
    this.isConnected.set(false);
  }
}
