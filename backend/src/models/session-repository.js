import { query } from '../db/connection.js';

export function createSessionRepository(database = { query }) {
  return {
    async create({ examSetId, mode, deadlineAt, totalQuestions }) {
      const result = await database.query(
        `INSERT INTO study_sessions (exam_set_id, mode, deadline_at, total_questions, unanswered_count)
         VALUES ($1, $2, $3, $4, $4)
         RETURNING id, exam_set_id AS "examSetId", mode, status, started_at AS "startedAt",
                   deadline_at AS "deadlineAt", completed_at AS "completedAt", total_questions AS "totalQuestions",
                   current_question_number AS "currentQuestionNumber", correct_count AS "correctCount",
                   incorrect_count AS "incorrectCount", unanswered_count AS "unansweredCount",
                   correct_percentage AS "correctPercentage", incorrect_percentage AS "incorrectPercentage"`,
        [examSetId, mode, deadlineAt, totalQuestions],
      );
      return result.rows[0];
    },

    async getById(sessionId) {
      const result = await database.query(
        `SELECT id, exam_set_id AS "examSetId", mode, status, started_at AS "startedAt",
                deadline_at AS "deadlineAt", completed_at AS "completedAt", total_questions AS "totalQuestions",
                current_question_number AS "currentQuestionNumber", correct_count AS "correctCount",
                incorrect_count AS "incorrectCount", unanswered_count AS "unansweredCount",
                correct_percentage AS "correctPercentage", incorrect_percentage AS "incorrectPercentage"
         FROM study_sessions
         WHERE id = $1`,
        [sessionId],
      );
      return result.rows[0] ?? null;
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
                correct_percentage AS "correctPercentage", incorrect_percentage AS "incorrectPercentage"
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
                   correct_percentage AS "correctPercentage", incorrect_percentage AS "incorrectPercentage"`,
        [sessionId, status, summary.correctCount, summary.incorrectCount, summary.unansweredCount, summary.correctPercentage, summary.incorrectPercentage],
      );
      return result.rows[0];
    },

    async deleteAll() {
      await database.query('DELETE FROM study_sessions');
    },
  };
}
