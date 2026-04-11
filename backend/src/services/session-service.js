import { createExamSetRepository } from '../models/exam-set-repository.js';
import { createQuestionRepository } from '../models/question-repository.js';
import { createSessionRepository } from '../models/session-repository.js';
import { createSessionAnswerRepository } from '../models/session-answer-repository.js';
import { createSessionQuestionRepository } from '../models/session-question-repository.js';
import { calculateDeadline, hasExpired } from './exam-timer-service.js';
import { buildPracticeFeedback } from './practice-feedback-service.js';
import { calculateSummary } from './scoring-service.js';

function shuffleQuestions(questions, random = Math.random) {
  const shuffled = [...questions];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}

function buildQuestionPayload(session, question, answer) {
  const selectedOption = answer?.selectedOption ?? null;
  return {
    sessionId: session.id,
    mode: session.mode,
    questionNumber: question.questionNumber,
    totalQuestions: session.totalQuestions,
    prompt: question.prompt,
    imageUrl: question.imageUrl || null,
    options: [
      { key: 'A', label: question.optionA },
      { key: 'B', label: question.optionB },
      { key: 'C', label: question.optionC },
      { key: 'D', label: question.optionD },
    ],
    selectedOption,
    feedback: session.mode === 'practice' && selectedOption
      ? buildPracticeFeedback(question, selectedOption)
      : null,
    deadlineAt: session.deadlineAt,
    importSummary: session.importSummary,
    isMarkedForReview: question.isMarkedForReview ?? false,
  };
}

function toSessionSummary(session) {
  return {
    id: session.id,
    examSetId: session.examSetId,
    mode: session.mode,
    status: session.status,
    currentQuestionNumber: session.currentQuestionNumber,
    totalQuestions: session.totalQuestions,
    deadlineAt: session.deadlineAt,
    importSummary: session.importSummary,
  };
}

function buildStoredSummary(session) {
  if (session.status === 'in_progress') {
    return null;
  }

  return {
    correctCount: session.correctCount,
    incorrectCount: session.incorrectCount,
    unansweredCount: session.unansweredCount,
    correctPercentage: Number(session.correctPercentage),
    incorrectPercentage: Number(session.incorrectPercentage),
  };
}

function buildResultPayload(session, reviewItems, importSummary) {
  return {
    sessionId: session.id,
    examSetId: session.examSetId,
    mode: session.mode,
    status: session.status,
    totalQuestions: session.totalQuestions,
    startedAt: session.startedAt,
    completedAt: session.completedAt,
    importSummary,
    summary: buildStoredSummary(session),
    reviewItems,
  };
}

function buildHistoryEntry(session) {
  return {
    id: session.id,
    examSetId: session.examSetId,
    mode: session.mode,
    status: session.status,
    totalQuestions: session.totalQuestions,
    currentQuestionNumber: session.currentQuestionNumber,
    startedAt: session.startedAt,
    completedAt: session.completedAt,
    summary: buildStoredSummary(session),
    canReview: session.status !== 'in_progress',
  };
}

export function createSessionService({
  examSetRepository = createExamSetRepository(),
  questionRepository = createQuestionRepository(),
  sessionRepository = createSessionRepository(),
  sessionAnswerRepository = createSessionAnswerRepository(),
  sessionQuestionRepository = createSessionQuestionRepository(),
  random = Math.random,
} = {}) {
  return {
    async setMarkForReview(sessionId, questionNumber, isMarked) {
      return sessionQuestionRepository.setMarkForReview(sessionId, questionNumber, isMarked);
    },
    async listExamSets() {
      return examSetRepository.listReady();
    },

    async startSession({ examSetId, mode }, userId = null) {
      const examSet = await examSetRepository.getById(examSetId);
      if (!examSet || examSet.importStatus !== 'ready' || examSet.questionCount <= 0) {
        throw new Error('The selected exam set does not contain any valid questions.');
      }

      // Check if user has an active session for this exam
      if (userId) {
        const existingSession = await sessionRepository.findActiveSessionForUser(userId, examSetId);
        if (existingSession) {
          // Check if the requested mode matches the existing session's mode
          if (existingSession.mode !== mode) {
            // Mode mismatch - complete the existing session and start a new one with the different mode
            // User clicked a different mode than their in-progress session
            const questions = await sessionQuestionRepository.listForSession(existingSession.id);
            const answers = await sessionAnswerRepository.listForSession(existingSession.id);
            const summary = calculateSummary(questions, answers);
            await sessionRepository.finalize(existingSession.id, summary, 'completed');
            // Now fall through to create a new session with the requested mode
          } else {
            // Mode matches - resume the existing session
            // Verify session has questions, rebuild if needed
            const sessionQuestions = await sessionQuestionRepository.listForSession(existingSession.id);
            if (sessionQuestions.length === 0) {
              // Session questions missing, repopulate them
              const orderedQuestions = shuffleQuestions(await questionRepository.listByExamSet(examSetId), random);
              await sessionQuestionRepository.replaceForSession(existingSession.id, orderedQuestions);
            }
            // Return existing session instead of creating a new one
            return {
              ...toSessionSummary({ ...existingSession, importSummary: examSet.importSummary }),
              resumed: true,
            };
          }
        }
      }

      const orderedQuestions = shuffleQuestions(await questionRepository.listByExamSet(examSetId), random);
      const startedAt = new Date();
      const deadlineAt = mode === 'exam' ? calculateDeadline(startedAt) : null;
      const session = await sessionRepository.create({
        examSetId,
        mode,
        deadlineAt,
        totalQuestions: orderedQuestions.length,
        userId,
      });
      await sessionQuestionRepository.replaceForSession(session.id, orderedQuestions);

      return {
        ...toSessionSummary({ ...session, importSummary: examSet.importSummary }),
        resumed: false,
      };
    },

    async getSession(sessionId) {
      const session = await sessionRepository.getById(sessionId);
      if (!session) {
        throw new Error('Session not found.');
      }
      const examSet = await examSetRepository.getById(session.examSetId);
      return toSessionSummary({ ...session, importSummary: examSet?.importSummary ?? null });
    },

    async getLatestActiveSessionForUser(userId) {
      const session = await sessionRepository.findLatestActiveSessionForUser(userId);
      if (!session) {
        return null;
      }

      const examSet = await examSetRepository.getById(session.examSetId);
      return toSessionSummary({ ...session, importSummary: examSet?.importSummary ?? null });
    },

    async listSessionsForExamSet(examSetId, userId) {
      const sessions = await sessionRepository.listSessionsForExamSetAndUser(userId, examSetId);
      return sessions.map(buildHistoryEntry);
    },

    async clearSessionsForExamSet(examSetId, userId) {
      const examSet = await examSetRepository.getById(examSetId);
      if (!examSet) {
        throw new Error('Exam not found.');
      }

      const deletedCount = await sessionRepository.deleteForExamSetAndUser(userId, examSetId);
      return { deletedCount };
    },

    async getQuestion(sessionId, questionNumber) {
      const session = await sessionRepository.getById(sessionId);
      if (!session) {
        throw new Error('Session not found.');
      }

      if (session.mode === 'exam' && hasExpired(session.deadlineAt)) {
        return this.completeSession(sessionId, { expired: true });
      }

      const question = await sessionQuestionRepository.getForSessionQuestion(sessionId, questionNumber);
      if (!question) {
        throw new Error('Question not found.');
      }

      const answer = await sessionAnswerRepository.getForSessionQuestion(sessionId, questionNumber);
      const examSet = await examSetRepository.getById(session.examSetId);
      return buildQuestionPayload({ ...session, importSummary: examSet?.importSummary ?? null }, question, answer);
    },

    async getAllQuestions(sessionId) {
      const session = await sessionRepository.getById(sessionId);
      if (!session) {
        throw new Error('Session not found.');
      }

      if (session.mode === 'exam' && hasExpired(session.deadlineAt)) {
        return this.completeSession(sessionId, { expired: true });
      }

      const questions = await sessionQuestionRepository.listForSession(sessionId);
      const answers = await sessionAnswerRepository.listForSession(sessionId);
      const examSet = await examSetRepository.getById(session.examSetId);
      
      const answersMap = new Map();
      answers.forEach(answer => {
        answersMap.set(answer.questionNumber, answer);
      });

      const questionsPayload = questions.map(question => {
        const answer = answersMap.get(question.questionNumber);
        return buildQuestionPayload({ ...session, importSummary: examSet?.importSummary ?? null }, question, answer);
      });

      return {
        sessionId: session.id,
        mode: session.mode,
        totalQuestions: session.totalQuestions,
        deadlineAt: session.deadlineAt,
        importSummary: session.importSummary,
        questions: questionsPayload,
      };
    },

    async submitAnswer(sessionId, { questionNumber, selectedOption }) {
      const session = await sessionRepository.getById(sessionId);
      if (!session) {
        throw new Error('Session not found.');
      }

      if (session.status !== 'in_progress') {
        return this.getResults(sessionId);
      }

      if (session.mode === 'exam' && hasExpired(session.deadlineAt)) {
        return this.completeSession(sessionId, { expired: true });
      }

      const question = await sessionQuestionRepository.getForSessionQuestion(sessionId, questionNumber);
      if (!question) {
        throw new Error('Question not found.');
      }

      const normalizedOption = String(selectedOption ?? '').toUpperCase();
      if (!['A', 'B', 'C', 'D'].includes(normalizedOption)) {
        throw new Error('Invalid answer option.');
      }

      await sessionAnswerRepository.upsertAnswer({
        sessionId,
        questionId: question.id,
        questionNumber,
        selectedOption: normalizedOption,
        isCorrect: normalizedOption === question.correctOption,
      });

      const nextQuestionNumber = Math.min(session.totalQuestions, questionNumber + 1);
      await sessionRepository.updateProgress(sessionId, nextQuestionNumber);

      if (session.mode === 'practice') {
        return {
          questionNumber,
          ...buildPracticeFeedback(question, normalizedOption),
          nextQuestionNumber: questionNumber < session.totalQuestions ? nextQuestionNumber : null,
        };
      }

      return {
        questionNumber,
        selectedOption: normalizedOption,
        result: 'recorded',
        nextQuestionNumber: questionNumber < session.totalQuestions ? nextQuestionNumber : null,
        deadlineAt: session.deadlineAt,
        totalQuestions: session.totalQuestions,
      };
    },

    async completeSession(sessionId, { expired = false } = {}) {
      const session = await sessionRepository.getById(sessionId);
      if (!session) {
        throw new Error('Session not found.');
      }

      const questions = await sessionQuestionRepository.listForSession(sessionId);
      const answers = await sessionAnswerRepository.listForSession(sessionId);
      const summary = calculateSummary(questions, answers);
      const finalized = await sessionRepository.finalize(sessionId, summary, expired ? 'expired' : 'completed');
      const examSet = await examSetRepository.getById(finalized.examSetId);

      return buildResultPayload(finalized, summary.reviewItems, examSet?.importSummary ?? null);
    },

    async getResults(sessionId, { finalizeInProgress = true } = {}) {
      const session = await sessionRepository.getById(sessionId);
      if (!session) {
        throw new Error('Session not found.');
      }

      if (session.status === 'in_progress') {
        if (!finalizeInProgress) {
          throw new Error('Session results are not available until the session is completed.');
        }
        return this.completeSession(sessionId, { expired: session.mode === 'exam' && hasExpired(session.deadlineAt) });
      }

      const questions = await sessionQuestionRepository.listForSession(sessionId);
      const answers = await sessionAnswerRepository.listForSession(sessionId);
      const examSet = await examSetRepository.getById(session.examSetId);
      const summary = calculateSummary(questions, answers);

      return buildResultPayload(
        session,
        summary.reviewItems,
        examSet?.importSummary ?? null,
      );
    },
  };
}
