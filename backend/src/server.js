import http from 'node:http';
import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createSessionService } from './services/session-service.js';
import { createExamsRoutes } from './routes/exams-routes.js';
import { createSessionsRoutes } from './routes/sessions-routes.js';
import { createExamSetRepository } from './models/exam-set-repository.js';
import { createQuestionRepository } from './models/question-repository.js';
import { createSessionRepository } from './models/session-repository.js';

const currentFile = fileURLToPath(import.meta.url);
const backendRoot = path.resolve(path.dirname(currentFile), '..');
const projectRoot = path.resolve(backendRoot, '..');
const frontendRoot = path.join(projectRoot, 'frontend', 'src');

function getContentType(filePath) {
  if (filePath.endsWith('.html')) return 'text/html; charset=utf-8';
  if (filePath.endsWith('.css')) return 'text/css; charset=utf-8';
  if (filePath.endsWith('.js')) return 'application/javascript; charset=utf-8';
  if (filePath.endsWith('.json')) return 'application/json; charset=utf-8';
  return 'text/plain; charset=utf-8';
}

async function readRequestBody(request) {
  const chunks = [];
  for await (const chunk of request) {
    chunks.push(chunk);
  }
  if (chunks.length === 0) {
    return {};
  }
  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? JSON.parse(raw) : {};
}

async function serveStatic(pathname) {
  const sanitizedPath = pathname === '/' ? '/pages/index.html' : pathname;
  const fullPath = path.join(frontendRoot, sanitizedPath.replace(/^\//, ''));
  const data = await readFile(fullPath);
  return {
    status: 200,
    headers: { 'content-type': getContentType(fullPath) },
    body: data,
  };
}

function createErrorResponse(error) {
  const message = error.message ?? 'Request failed.';
  const status = message.includes('not found') ? 404 : 400;
  const code = message.includes('valid questions')
    ? 'INVALID_EXAM_DATA'
    : message.includes('Invalid answer option')
      ? 'INVALID_ANSWER_OPTION'
      : message.includes('Session not found')
        ? 'SESSION_NOT_FOUND'
        : 'REQUEST_ERROR';

  return {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET,POST,OPTIONS,DELETE',
      'access-control-allow-headers': 'Content-Type',
    },
    body: JSON.stringify({ error: { code, message } }),
  };
}

function writeResponse(response, result) {
  response.writeHead(result.status, {
    ...result.headers,
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET,POST,OPTIONS,DELETE',
    'access-control-allow-headers': 'Content-Type',
  });
  response.end(result.body);
}

export function createApp({ 
  sessionService = createSessionService(),
  examSetRepository = createExamSetRepository(),
  questionRepository = createQuestionRepository(),
  sessionRepository = createSessionRepository(),
} = {}) {
  const handlers = [
    createExamsRoutes({ sessionService, examSetRepository, questionRepository, sessionRepository }),
    createSessionsRoutes({ sessionService }),
  ];

  return http.createServer(async (request, response) => {
    const url = new URL(request.url, 'http://localhost');
    try {
      if (request.method === 'OPTIONS') {
        response.writeHead(204, {
          'access-control-allow-origin': '*',
          'access-control-allow-methods': 'GET,POST,OPTIONS',
          'access-control-allow-headers': 'Content-Type',
        });
        response.end();
        return;
      }

      const payload = {
        method: request.method,
        pathname: url.pathname,
        body: request.method === 'POST' ? await readRequestBody(request) : {},
      };

      for (const handler of handlers) {
        const result = await handler(payload);
        if (result) {
          writeResponse(response, result);
          return;
        }
      }

      writeResponse(response, await serveStatic(url.pathname));
    } catch (error) {
      writeResponse(response, createErrorResponse(error));
    }
  });
}

export async function bootstrap() {
  const port = Number(process.env.PORT ?? '3001');
  const app = createApp();
  return new Promise((resolve) => {
    app.listen(port, () => {
      console.log(`PMP backend running at http://localhost:${port}`);
      resolve(app);
    });
  });
}

if (process.argv[1] && process.argv[1].endsWith('server.js')) {
  bootstrap().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
