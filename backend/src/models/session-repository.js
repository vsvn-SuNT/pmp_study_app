import { query } from '../db/connection.js';

export function createSessionRepository(database = { query }) {
  return {
    async create({ examSetId, mode, deadlineAt, totalQuestions, userId = null }) {
      const result = await database.query(
        `INSERT INTO study_sessions (exam_set_id, mode, deadline_at, total_questions, unanswered_count, user_id)
         VALUES ($1, $2, $3, $4, $4, $5)
         RETURNING id, exam_set_id AS "examSetId", mode, status, started_at AS "startedAt",
                   deadline_at AS "deadlineAt", completed_at AS "completedAt", total_questions AS "totalQuestions",
                   current_question_number AS "currentQuestionNumber", correct_count AS "correctCount",
                   incorrect_count AS "incorrectCount", unanswered_count AS "unansweredCount",
                   correct_percentage AS "correctPercentage", incorrect_percentage AS "incorrectPercentage",
                   user_id AS "userId"`,
        [examSetId, mode, deadlineAt, totalQuestions, userId],
      );
      return result.rows[0];
    },

    async getById(sessionId) {
      const result = await database.query(
        `SELECT id, exam_set_id AS "examSetId", mode, status, started_at AS "startedAt",
                deadline_at AS "deadlineAt", completed_at AS "completedAt", total_questions AS "totalQuestions",
                current_question_number AS "currentQuestionNumber", correct_count AS "correctCount",
                incorrect_count AS "incorrectCount", unanswered_count AS "unansweredCount",
                correct_percentage AS "correctPercentage", incorrect_percentage AS "incorrectPercentage",
                user_id AS "userId"
         FROM study_sessions
         WHERE id = $1`,
        [sessionId],
      );
      return result.rows[0] ?? null;
    },

    async getByIdAndUserId(sessionId, userId) {
      const result = await database.query(
        `SELECT id, exam_set_id AS "examSetId", mode, status, started_at AS "startedAt",
                deadline_at AS "deadlineAt", completed_at AS "completedAt", total_questions AS "totalQuestions",
                current_question_number AS "currentQuestionNumber", correct_count AS "correctCount",
                incorrect_count AS "incorrectCount", unanswered_count AS "unansweredCount",
                correct_percentage AS "correctPercentage", incorrect_percentage AS "incorrectPercentage",
                user_id AS "userId"
         FROM study_sessions
         WHERE id = $1 AND user_id = $2`,
        [sessionId, userId],
      );
      return result.rows[0] ?? null;
    },

    async findActiveSessionForUser(userId, examSetId) {
      const result = await database.query(
        `SELECT id, exam_set_id AS "examSetId", mode, status, started_at AS "startedAt",
                deadline_at AS "deadlineAt", completed_at AS "completedAt", total_questions AS "totalQuestions",
                current_question_number AS "currentQuestionNumber", correct_count AS "correctCount",
                incorrect_count AS "incorrectCount", unanswered_count AS "unansweredCount",
                correct_percentage AS "correctPercentage", incorrect_percentage AS "incorrectPercentage",
                user_id AS "userId"
         FROM study_sessions
         WHERE user_id = $1 AND exam_set_id = $2 AND status = 'in_progress'
         LIMIT 1`,
        [userId, examSetId],
      );
      return result.rows[0] ?? null;
    },

    async findLatestActiveSessionForUser(userId) {
      const result = await database.query(
        `SELECT id, exam_set_id AS "examSetId", mode, status, started_at AS "startedAt",
                deadline_at AS "deadlineAt", completed_at AS "completedAt", total_questions AS "totalQuestions",
                current_question_number AS "currentQuestionNumber", correct_count AS "correctCount",
                incorrect_count AS "incorrectCount", unanswered_count AS "unansweredCount",
                correct_percentage AS "correctPercentage", incorrect_percentage AS "incorrectPercentage",
                user_id AS "userId"
         FROM study_sessions
         WHERE user_id = $1 AND status = 'in_progress'
         ORDER BY started_at DESC, id DESC
         LIMIT 1`,
        [userId],
      );
      return result.rows[0] ?? null;
    },

    async listSessionsForExamSetAndUser(userId, examSetId) {
      const result = await database.query(
        `SELECT id, exam_set_id AS "examSetId", mode, status, started_at AS "startedAt",
                deadline_at AS "deadlineAt", completed_at AS "completedAt", total_questions AS "totalQuestions",
                current_question_number AS "currentQuestionNumber", correct_count AS "correctCount",
                incorrect_count AS "incorrectCount", unanswered_count AS "unansweredCount",
                correct_percentage AS "correctPercentage", incorrect_percentage AS "incorrectPercentage",
                user_id AS "userId"
         FROM study_sessions
         WHERE user_id = $1 AND exam_set_id = $2
         ORDER BY started_at DESC`,
        [userId, examSetId],
      );
      return result.rows;
    },

    async listSessionsForUser(userId) {
      const result = await database.query(
        `SELECT id, exam_set_id AS "examSetId", mode, status, started_at AS "startedAt",
                deadline_at AS "deadlineAt", completed_at AS "completedAt", total_questions AS "totalQuestions",
                current_question_number AS "currentQuestionNumber", correct_count AS "correctCount",
                incorrect_count AS "incorrectCount", unanswered_count AS "unansweredCount",
                correct_percentage AS "correctPercentage", incorrect_percentage AS "incorrectPercentage",
                user_id AS "userId"
         FROM study_sessions
         WHERE user_id = $1
         ORDER BY started_at DESC`,
        [userId],
      );
      return result.rows;
    },

    async deleteForExamSetAndUser(userId, examSetId) {
      const result = await database.query(
        'DELETE FROM study_sessions WHERE user_id = $1 AND exam_set_id = $2',
        [userId, examSetId],
      );
      return result.rowCount;
    },

    async deleteByIdAndUserId(sessionId, userId) {
      const result = await database.query(
        'DELETE FROM study_sessions WHERE id = $1 AND user_id = $2',
        [sessionId, userId],
      );
      return result.rowCount;
    },

    async updateProgress(sessionId, currentQuestionNumber) {
      await database.query('UPDATE study_sessions SET current_question_number = $2 WHERE id = $1', [sessionId, currentQuestionNumber]);
    },

    async findActiveById(sessionId) {
      const result = await database.query(
        `SELECT id, exam_set_id AS "examSetId", mode, status, started_at AS "startedAt",
                deadline_at AS "deadlineAt", completed_at AS "completedAt", total_questions AS "totalQuestions",
                current_question_number AS "currentQuestionNumber", correct_count AS "correctCount",
                incorrect_count AS "incorrectCount", unanswered_count AS "unansweredCount",
                correct_percentage AS "correctPercentage", incorrect_percentage AS "incorrectPercentage",
                user_id AS "userId"
         FROM study_sessions
         WHERE id = $1 AND status = 'in_progress'`,
        [sessionId],
      );
      return result.rows[0] ?? null;
    },

    async finalize(sessionId, summary, status) {
      const result = await database.query(
        `UPDATE study_sessions
         SET status = $2,
             completed_at = NOW(),
             correct_count = $3,
             incorrect_count = $4,
             unanswered_count = $5,
             correct_percentage = $6,
             incorrect_percentage = $7
         WHERE id = $1
         RETURNING id, exam_set_id AS "examSetId", mode, status, started_at AS "startedAt",
                   deadline_at AS "deadlineAt", completed_at AS "completedAt", total_questions AS "totalQuestions",
                   current_question_number AS "currentQuestionNumber", correct_count AS "correctCount",
                   incorrect_count AS "incorrectCount", unanswered_count AS "unansweredCount",
                   correct_percentage AS "correctPercentage", incorrect_percentage AS "incorrectPercentage",
                   user_id AS "userId"`,
        [sessionId, status, summary.correctCount, summary.incorrectCount, summary.unansweredCount, summary.correctPercentage, summary.incorrectPercentage],
      );
      return result.rows[0];
    },

    async deleteByExamSetId(examSetId) {
      await database.query('DELETE FROM study_sessions WHERE exam_set_id = $1', [examSetId]);
    },

    async deleteAll() {
      await database.query('DELETE FROM study_sessions');
    },
  };
}
