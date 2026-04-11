import { getPool, query } from '../db/connection.js';

const BACKUP_VERSION = 1;

const TABLES = [
  {
    name: 'exam_sets',
    columns: [
      'id',
      'slug',
      'title',
      'source_file_name',
      'question_count',
      'skipped_row_count',
      'import_summary',
      'import_status',
      'created_at',
      'updated_at',
    ],
    sequence: 'exam_sets_id_seq',
  },
  {
    name: 'questions',
    columns: [
      'id',
      'exam_set_id',
      'question_number',
      'source_number',
      'prompt',
      'option_a',
      'option_b',
      'option_c',
      'option_d',
      'correct_option',
      'hint',
      'explanation',
      'detail_a',
      'detail_b',
      'detail_c',
      'detail_d',
      'created_at',
      'image_url',
    ],
    sequence: 'questions_id_seq',
  },
  {
    name: 'users',
    columns: ['id', 'username', 'email', 'created_at', 'updated_at'],
    sequence: 'users_id_seq',
  },
  {
    name: 'study_sessions',
    columns: [
      'id',
      'exam_set_id',
      'mode',
      'status',
      'started_at',
      'deadline_at',
      'completed_at',
      'total_questions',
      'current_question_number',
      'correct_count',
      'incorrect_count',
      'unanswered_count',
      'correct_percentage',
      'incorrect_percentage',
      'user_id',
    ],
    sequence: 'study_sessions_id_seq',
  },
  {
    name: 'session_questions',
    columns: ['id', 'session_id', 'question_id', 'question_number', 'is_marked_for_review'],
    sequence: 'session_questions_id_seq',
  },
  {
    name: 'session_answers',
    columns: ['id', 'session_id', 'question_id', 'question_number', 'selected_option', 'is_correct', 'answered_at'],
    sequence: 'session_answers_id_seq',
  },
];

function assertBackupShape(backup) {
  if (!backup || backup.app !== 'pmp_learning_app' || backup.version !== BACKUP_VERSION || !backup.tables) {
    throw new Error('Invalid backup file.');
  }

  for (const table of TABLES) {
    if (!Array.isArray(backup.tables[table.name])) {
      throw new Error(`Backup is missing table: ${table.name}`);
    }
  }
}

async function resetSequence(client, table) {
  const result = await client.query(`SELECT COALESCE(MAX(id), 0) AS max_id FROM ${table.name}`);
  const maxId = Number(result.rows[0].max_id);
  await client.query('SELECT setval($1::regclass, $2, $3)', [table.sequence, Math.max(maxId, 1), maxId > 0]);
}

export function createBackupService(database = { query }) {
  return {
    async exportBackup() {
      const tables = {};

      for (const table of TABLES) {
        const result = await database.query(
          `SELECT ${table.columns.join(', ')}
           FROM ${table.name}
           ORDER BY id ASC`,
        );
        tables[table.name] = result.rows;
      }

      return {
        app: 'pmp_learning_app',
        version: BACKUP_VERSION,
        exportedAt: new Date().toISOString(),
        tables,
      };
    },

    async restoreBackup(backup) {
      assertBackupShape(backup);

      const client = database.connect ? await database.connect() : await (await getPool()).connect();

      await client.query('BEGIN');
      try {
        await client.query('TRUNCATE session_answers, session_questions, study_sessions, questions, exam_sets, users RESTART IDENTITY CASCADE');

        for (const table of TABLES) {
          for (const row of backup.tables[table.name]) {
            const placeholders = table.columns.map((_, index) => `$${index + 1}`).join(', ');
            const values = table.columns.map((column) => row[column]);
            await client.query(
              `INSERT INTO ${table.name} (${table.columns.join(', ')})
               VALUES (${placeholders})`,
              values,
            );
          }
          await resetSequence(client, table);
        }

        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }

      return {
        examSetCount: backup.tables.exam_sets.length,
        questionCount: backup.tables.questions.length,
        userCount: backup.tables.users.length,
        sessionCount: backup.tables.study_sessions.length,
      };
    },

    async getRestoreResumeContext(username) {
      if (!username) {
        return { user: null, activeSession: null };
      }

      const userResult = await database.query(
        `SELECT id, username
         FROM users
         WHERE username = $1`,
        [username],
      );
      const user = userResult.rows[0] ?? null;

      if (!user) {
        return { user: null, activeSession: null };
      }

      const sessionResult = await database.query(
        `SELECT s.id,
                s.exam_set_id AS "examSetId",
                e.title AS "examTitle",
                s.mode,
                s.status,
                s.current_question_number AS "currentQuestionNumber",
                s.total_questions AS "totalQuestions",
                s.deadline_at AS "deadlineAt"
         FROM study_sessions s
         INNER JOIN exam_sets e ON e.id = s.exam_set_id
         WHERE s.user_id = $1 AND s.status = 'in_progress'
         ORDER BY s.started_at DESC, s.id DESC
         LIMIT 1`,
        [user.id],
      );

      return {
        user,
        activeSession: sessionResult.rows[0] ?? null,
      };
    },
  };
}
