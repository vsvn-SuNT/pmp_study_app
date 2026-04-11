import assert from 'node:assert/strict';
import test from 'node:test';
import { createBackupRoutes } from '../../src/routes/backup-routes.js';

test('backup route returns a downloadable JSON backup', async () => {
  const route = createBackupRoutes({
    backupService: {
      async exportBackup() {
        return {
          app: 'pmp_learning_app',
          version: 1,
          exportedAt: '2026-04-11T00:00:00.000Z',
          tables: { exam_sets: [] },
        };
      },
    },
  });

  const response = await route({ method: 'GET', pathname: '/api/backup' });
  const payload = JSON.parse(response.body);

  assert.equal(response.status, 200);
  assert.equal(response.headers['content-type'], 'application/json; charset=utf-8');
  assert.match(response.headers['content-disposition'], /^attachment; filename="pmp_learning_app_backup_/);
  assert.equal(payload.app, 'pmp_learning_app');
});

test('backup restore route passes uploaded backup data to the service', async () => {
  const backup = { app: 'pmp_learning_app', version: 1, tables: {} };
  const route = createBackupRoutes({
    backupService: {
      async restoreBackup(receivedBackup) {
        assert.equal(receivedBackup, backup);
        return {
          examSetCount: 1,
          questionCount: 200,
          userCount: 1,
          sessionCount: 3,
        };
      },
      async getRestoreResumeContext(username) {
        assert.equal(username, 'tester');
        return {
          user: { id: 1, username: 'tester' },
          activeSession: { id: 3, currentQuestionNumber: 20 },
        };
      },
    },
  });

  const response = await route({
    method: 'POST',
    pathname: '/api/backup/restore',
    body: { backup, username: 'tester' },
  });
  const payload = JSON.parse(response.body);

  assert.equal(response.status, 200);
  assert.equal(payload.success, true);
  assert.equal(payload.sessionCount, 3);
  assert.equal(payload.user.username, 'tester');
  assert.equal(payload.activeSession.currentQuestionNumber, 20);
});
