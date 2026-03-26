import { createWriteStream, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createExamImportService } from '../services/exam-import-service.js';
import { createExamSetRepository } from '../models/exam-set-repository.js';
import { createQuestionRepository } from '../models/question-repository.js';
import { createSessionRepository } from '../models/session-repository.js';

function jsonResponse(body, status = 200) {
  return {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
    body: JSON.stringify(body),
  };
}

export function createExamsRoutes({ 
  sessionService,
  examSetRepository = createExamSetRepository(),
  questionRepository = createQuestionRepository(),
  sessionRepository = createSessionRepository(),
}) {
  const importService = createExamImportService({ examSetRepository, questionRepository });

  return async function handleExamsRoute(request) {
    if (request.method === 'GET' && request.pathname === '/api/exams') {
      const items = await sessionService.listExamSets();
      return jsonResponse({ items });
    }

    if (request.method === 'DELETE' && request.pathname === '/api/exams') {
      // Clear all data
      await sessionRepository.deleteAll();
      await questionRepository.deleteAll();
      await examSetRepository.deleteAll();
      return jsonResponse({ message: 'All exams and sessions cleared' });
    }

    // Delete individual exam by ID
    const deleteExamMatch = request.pathname.match(/^\/api\/exams\/(\d+)$/);
    if (request.method === 'DELETE' && deleteExamMatch) {
      const examSetId = Number(deleteExamMatch[1]);
      console.log(`DELETE /api/exams/${examSetId}`);
      const exam = await examSetRepository.getById(examSetId);
      if (!exam) {
        console.log(`Exam ${examSetId} not found`);
        return jsonResponse({ error: { message: 'Exam not found' } }, 404);
      }
      // Delete sessions, questions, and exam set
      console.log(`Deleting sessions for exam ${examSetId}`);
      await sessionRepository.deleteByExamSetId(examSetId);
      console.log(`Deleting questions for exam ${examSetId}`);
      await questionRepository.deleteByExamSetId(examSetId);
      console.log(`Deleting exam set ${examSetId}`);
      await examSetRepository.deleteById(examSetId);
      console.log(`Exam ${examSetId} deleted successfully`);
      return jsonResponse({ message: `Exam "${exam.title}" deleted` });
    }

    if (request.method === 'POST' && request.pathname === '/api/exams/import') {
      try {
        // Expect JSON with csvContent, filename, and optional examName
        const { csvContent, filename, examName } = request.body || {};
        if (!csvContent || !filename) {
          return jsonResponse(
            { error: { message: 'Missing csvContent or filename' } },
            400
          );
        }

        // Write to temp file
        const tmpFile = join(tmpdir(), `import-${Date.now()}.csv`);
        await new Promise((resolve, reject) => {
          const stream = createWriteStream(tmpFile);
          stream.write(csvContent);
          stream.end();
          stream.on('finish', resolve);
          stream.on('error', reject);
        });

        try {
          // Import the file with optional exam name
          const result = await importService.importFile(tmpFile, examName);
          return jsonResponse({
            success: true,
            message: `Imported ${result.questionCount} questions from ${filename}`,
            examSet: result,
          });
        } finally {
          // Cleanup
          try { unlinkSync(tmpFile); } catch (e) { /* ignore */ }
        }
      } catch (error) {
        return jsonResponse(
          { error: { message: error.message || 'Import failed' } },
          400
        );
      }
    }

    return null;
  };
}
