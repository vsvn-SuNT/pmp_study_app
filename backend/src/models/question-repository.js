import { query } from '../db/connection.js';

export function createQuestionRepository(database = { query }) {
  return {
    async replaceForExamSet(examSetId, questions) {
      await database.query('DELETE FROM questions WHERE exam_set_id = $1', [examSetId]);

      for (const question of questions) {
        await database.query(
          `INSERT INTO questions (
             exam_set_id, question_number, source_number, prompt, option_a, option_b, option_c, option_d,
             correct_option, hint, explanation, detail_a, detail_b, detail_c, detail_d
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
          [
            examSetId,
            question.questionNumber,
            question.sourceNumber,
            question.prompt,
            question.optionA,
            question.optionB,
            question.optionC,
            question.optionD,
            question.correctOption,
            question.hint,
            question.explanation,
            question.detailA,
            question.detailB,
            question.detailC,
            question.detailD,
          ],
        );
      }
    },

    async listByExamSet(examSetId) {
      const result = await database.query(
        `SELECT id, exam_set_id AS "examSetId", question_number AS "questionNumber", source_number AS "sourceNumber",
                prompt, option_a AS "optionA", option_b AS "optionB", option_c AS "optionC", option_d AS "optionD",
                correct_option AS "correctOption", hint, explanation,
                detail_a AS "detailA", detail_b AS "detailB", detail_c AS "detailC", detail_d AS "detailD"
         FROM questions
         WHERE exam_set_id = $1
         ORDER BY question_number ASC`,
        [examSetId],
      );
      return result.rows;
    },

    async getByExamSetAndNumber(examSetId, questionNumber) {
      const result = await database.query(
        `SELECT id, exam_set_id AS "examSetId", question_number AS "questionNumber", source_number AS "sourceNumber",
                prompt, option_a AS "optionA", option_b AS "optionB", option_c AS "optionC", option_d AS "optionD",
                correct_option AS "correctOption", hint, explanation,
                detail_a AS "detailA", detail_b AS "detailB", detail_c AS "detailC", detail_d AS "detailD"
         FROM questions
         WHERE exam_set_id = $1 AND question_number = $2`,
        [examSetId, questionNumber],
      );
      return result.rows[0] ?? null;
    },

    async deleteAll() {
      await database.query('DELETE FROM questions');
    },
  };
}
