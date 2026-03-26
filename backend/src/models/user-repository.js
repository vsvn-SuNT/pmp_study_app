import { query } from '../db/connection.js';

export function createUserRepository(database = { query }) {
  return {
    async findOrCreateByUsername(username) {
      // Check if user exists
      const existing = await database.query(
        `SELECT id, username, created_at AS "createdAt", updated_at AS "updatedAt"
         FROM users WHERE username = $1`,
        [username],
      );

      if (existing.rows.length > 0) {
        return existing.rows[0];
      }

      // Create new user
      const result = await database.query(
        `INSERT INTO users (username)
         VALUES ($1)
         RETURNING id, username, created_at AS "createdAt", updated_at AS "updatedAt"`,
        [username],
      );

      return result.rows[0];
    },

    async getById(userId) {
      const result = await database.query(
        `SELECT id, username, email, created_at AS "createdAt", updated_at AS "updatedAt"
         FROM users WHERE id = $1`,
        [userId],
      );
      return result.rows[0] ?? null;
    },

    async getByUsername(username) {
      const result = await database.query(
        `SELECT id, username, email, created_at AS "createdAt", updated_at AS "updatedAt"
         FROM users WHERE username = $1`,
        [username],
      );
      return result.rows[0] ?? null;
    },

    async deleteAll() {
      await database.query('DELETE FROM users');
    },
  };
}
