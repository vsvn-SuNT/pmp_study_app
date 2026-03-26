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
    selectedOption: answer?.selectedOption ?? null,
    feedback: null,
    deadlineAt: session.deadlineAt,
    importSummary: session.importSummary,
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

export function createSessionService({
  examSetRepository = createExamSetRepository(),
  questionRepository = createQuestionRepository(),
  sessionRepository = createSessionRepository(),
  sessionAnswerRepository = createSessionAnswerRepository(),
  sessionQuestionRepository = createSessionQuestionRepository(),
  random = Math.random,
} = {}) {
  return {
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
          // Return existing session instead of creating a new one
          return {
            ...toSessionSummary({ ...existingSession, importSummary: examSet.importSummary }),
            resumed: true,
          };
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

      return {
        sessionId: finalized.id,
        status: finalized.status,
        totalQuestions: finalized.totalQuestions,
        summary: {
          correctCount: finalized.correctCount,
          incorrectCount: finalized.incorrectCount,
          unansweredCount: finalized.unansweredCount,
          correctPercentage: Number(finalized.correctPercentage),
          incorrectPercentage: Number(finalized.incorrectPercentage),
        },
        reviewItems: summary.reviewItems,
      };
    },

    async getResults(sessionId) {
      const session = await sessionRepository.getById(sessionId);
      if (!session) {
        throw new Error('Session not found.');
      }

      if (session.status === 'in_progress') {
        return this.completeSession(sessionId, { expired: session.mode === 'exam' && hasExpired(session.deadlineAt) });
      }

      const questions = await sessionQuestionRepository.listForSession(sessionId);
      const answers = await sessionAnswerRepository.listForSession(sessionId);
      const summary = calculateSummary(questions, answers);
      return {
        sessionId: session.id,
        status: session.status,
        totalQuestions: session.totalQuestions,
        summary: {
          correctCount: session.correctCount,
          incorrectCount: session.incorrectCount,
          unansweredCount: session.unansweredCount,
          correctPercentage: Number(session.correctPercentage),
          incorrectPercentage: Number(session.incorrectPercentage),
        },
        reviewItems: summary.reviewItems,
      };
    },
  };
}
