import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../../src/server.js';
import { createSessionService } from '../../src/services/session-service.js';
import { createMockRepositories } from '../unit/test-helpers.js';
import { startTestServer } from './test-server.js';

test('GET /api/exams and session lifecycle endpoints work for the MVP flow', async () => {
  const repositories = createMockRepositories();
  const service = createSessionService({
    ...repositories,
    random: (() => {
      const values = [0.75, 0.25, 0.5, 0.1];
      return () => values.shift() ?? 0;
    })(),
  });
  const authHeaders = { 'Content-Type': 'application/json', 'x-user-id': '1' };
  const server = createApp({
    sessionService: service,
    examSetRepository: repositories.examSetRepository,
    questionRepository: repositories.questionRepository,
    sessionRepository: repositories.sessionRepository,
    userRepository: repositories.userRepository,
  });
  const testServer = await startTestServer(server);

  try {
    const examsResponse = await fetch(`${testServer.baseUrl}/api/exams`);
    const examsPayload = await examsResponse.json();
    assert.equal(examsPayload.items.length, 1);
    assert.equal(examsPayload.items[0].questionCount, 5);

    const sessionResponse = await fetch(`${testServer.baseUrl}/api/sessions`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ examSetId: 1, mode: 'practice' }),
    });
    const sessionPayload = await sessionResponse.json();
    assert.equal(sessionPayload.totalQuestions, 5);

    const questionResponse = await fetch(`${testServer.baseUrl}/api/sessions/${sessionPayload.id}/questions/1`, {
      headers: authHeaders,
    });
    const questionPayload = await questionResponse.json();
    assert.equal(questionPayload.questionNumber, 1);
    assert.equal(questionPayload.prompt, 'Question 3');

    const resumeResponse = await fetch(`${testServer.baseUrl}/api/sessions/${sessionPayload.id}`, {
      headers: authHeaders,
    });
    const resumePayload = await resumeResponse.json();
    assert.equal(resumePayload.status, 'in_progress');
    assert.equal(resumePayload.totalQuestions, 5);

    const activeResponse = await fetch(`${testServer.baseUrl}/api/sessions/active`, {
      headers: authHeaders,
    });
    const activePayload = await activeResponse.json();
    assert.equal(activePayload.session.id, sessionPayload.id);
    assert.equal(activePayload.session.status, 'in_progress');

    const completeResponse = await fetch(`${testServer.baseUrl}/api/sessions/${sessionPayload.id}/complete`, {
      method: 'POST',
      headers: authHeaders,
    });
    const completePayload = await completeResponse.json();
    assert.equal(completePayload.totalQuestions, 5);
    assert.equal(completePayload.summary.unansweredCount, 5);

    const historyResponse = await fetch(`${testServer.baseUrl}/api/exams/1/sessions`, {
      headers: authHeaders,
    });
    const historyPayload = await historyResponse.json();
    assert.equal(historyPayload.items.length, 1);
    assert.equal(historyPayload.items[0].summary.unansweredCount, 5);

    const deleteSessionResponse = await fetch(`${testServer.baseUrl}/api/sessions/${sessionPayload.id}`, {
      method: 'DELETE',
      headers: authHeaders,
    });
    const deleteSessionPayload = await deleteSessionResponse.json();
    assert.equal(deleteSessionPayload.deletedCount, 1);

    const deletedSessionHistoryResponse = await fetch(`${testServer.baseUrl}/api/exams/1/sessions`, {
      headers: authHeaders,
    });
    const deletedSessionHistoryPayload = await deletedSessionHistoryResponse.json();
    assert.equal(deletedSessionHistoryPayload.items.length, 0);

    const secondSessionResponse = await fetch(`${testServer.baseUrl}/api/sessions`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ examSetId: 1, mode: 'practice' }),
    });
    const secondSessionPayload = await secondSessionResponse.json();
    await fetch(`${testServer.baseUrl}/api/sessions/${secondSessionPayload.id}/complete`, {
      method: 'POST',
      headers: authHeaders,
    });

    const deleteHistoryResponse = await fetch(`${testServer.baseUrl}/api/exams/1/sessions`, {
      method: 'DELETE',
      headers: authHeaders,
    });
    const deleteHistoryPayload = await deleteHistoryResponse.json();
    assert.equal(deleteHistoryPayload.deletedCount, 1);

    const clearedHistoryResponse = await fetch(`${testServer.baseUrl}/api/exams/1/sessions`, {
      headers: authHeaders,
    });
    const clearedHistoryPayload = await clearedHistoryResponse.json();
    assert.equal(clearedHistoryPayload.items.length, 0);
  } finally {
    await testServer.close();
  }
});
