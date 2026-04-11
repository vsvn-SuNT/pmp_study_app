import { createBackupService } from '../services/backup-service.js';

function jsonResponse(body, status = 200, extraHeaders = {}) {
  return {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', ...extraHeaders },
    body: JSON.stringify(body, null, 2),
  };
}

function buildBackupFileName() {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  return `pmp_learning_app_backup_${stamp}.json`;
}

export function createBackupRoutes({ backupService = createBackupService() } = {}) {
  return async function handleBackupRoute(request) {
    if (request.method === 'GET' && request.pathname === '/api/backup') {
      const backup = await backupService.exportBackup();
      return jsonResponse(backup, 200, {
        'content-disposition': `attachment; filename="${buildBackupFileName()}"`,
      });
    }

    if (request.method === 'POST' && request.pathname === '/api/backup/restore') {
      const backup = request.body?.backup;
      const username = request.body?.username;
      if (!backup) {
        return jsonResponse({ error: { message: 'Missing backup data' } }, 400);
      }

      const result = await backupService.restoreBackup(backup);
      const resumeContext = await backupService.getRestoreResumeContext(username);
      return jsonResponse({
        success: true,
        message: 'Backup restored',
        ...result,
        ...resumeContext,
      });
    }

    return null;
  };
}
