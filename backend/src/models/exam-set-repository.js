import { query } from '../db/connection.js';

export function createExamSetRepository(database = { query }) {
  return {
    async upsert({ slug, title, sourceFileName, questionCount, skippedRowCount, importSummary, importStatus }) {
      const result = await database.query(
        `INSERT INTO exam_sets (
           slug, title, source_file_name, question_count, skipped_row_count, import_summary, import_status, updated_at
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
         ON CONFLICT (slug)
         DO UPDATE SET
           title = EXCLUDED.title,
           source_file_name = EXCLUDED.source_file_name,
           question_count = EXCLUDED.question_count,
           skipped_row_count = EXCLUDED.skipped_row_count,
           import_summary = EXCLUDED.import_summary,
           import_status = EXCLUDED.import_status,
           updated_at = NOW()
         RETURNING id, slug, title, source_file_name AS "sourceFileName", question_count AS "questionCount",
                   skipped_row_count AS "skippedRowCount", import_summary AS "importSummary", import_status AS "importStatus"`,
        [slug, title, sourceFileName, questionCount, skippedRowCount, importSummary, importStatus],
      );
      return result.rows[0];
    },

    async listReady() {
      const result = await database.query(
        `SELECT id, slug, title, question_count AS "questionCount",
                skipped_row_count AS "skippedRowCount", import_summary AS "importSummary"
         FROM exam_sets
         WHERE import_status = 'ready'
         ORDER BY title ASC`,
      );
      return result.rows;
    },

    async getById(id) {
      const result = await database.query(
        `SELECT id, slug, title, source_file_name AS "sourceFileName", question_count AS "questionCount",
                skipped_row_count AS "skippedRowCount", import_summary AS "importSummary", import_status AS "importStatus"
         FROM exam_sets
         WHERE id = $1`,
        [id],
      );
      return result.rows[0] ?? null;
    },

    async deleteAll() {
      await database.query('DELETE FROM exam_sets');
    },
  };
}
