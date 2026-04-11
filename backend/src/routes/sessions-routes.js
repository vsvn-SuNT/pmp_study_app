function jsonResponse(body, status = 200) {
  return {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
    body: JSON.stringify(body),
  };
}

function getAuthError() {
  return jsonResponse({ error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } }, 401);
}

export function createSessionsRoutes({ sessionService, sessionRepository, userRepository }) {
  return async function handleSessionsRoute(request) {
    // Mark or unmark a question for review
    const markMatch = request.pathname.match(/^\/api\/sessions\/(\d+)\/questions\/(\d+)\/mark$/);
    const userId = request.headers['x-user-id'] ? Number(request.headers['x-user-id']) : null;
    if (request.method === 'POST' && markMatch) {
      try {
        if (!userId) return getAuthError();
        const [, sessionId, questionNumber] = markMatch;
        // Verify user owns session
        const session = await sessionRepository.getByIdAndUserId(Number(sessionId), userId);
        if (!session) return getAuthError();
        const { isMarked } = request.body;
        await sessionService.setMarkForReview(Number(sessionId), Number(questionNumber), !!isMarked);
        return jsonResponse({ success: true });
      } catch (error) {
        return jsonResponse(
          { error: { code: 'SESSION_ERROR', message: error.message } },
          400,
        );
      }
    }
    // Optional: Check user ID for all routes except starting a new session
    // (Đã khai báo userId ở trên, không khai báo lại)

    if (request.method === 'POST' && request.pathname === '/api/sessions') {
      try {
        if (!userId) return getAuthError();
        const user = await userRepository.getById(userId);
        if (!user) return getAuthError();

        const session = await sessionService.startSession(request.body, userId);
        return jsonResponse(session, 201);
      } catch (error) {
        return jsonResponse(
          { error: { code: 'SESSION_ERROR', message: error.message } },
          400,
        );
      }
    }

    if (request.method === 'GET' && request.pathname === '/api/sessions/active') {
      try {
        if (!userId) return getAuthError();
        const user = await userRepository.getById(userId);
        if (!user) return getAuthError();

        return jsonResponse({ session: await sessionService.getLatestActiveSessionForUser(userId) });
      } catch (error) {
        return jsonResponse(
          { error: { code: 'SESSION_ERROR', message: error.message } },
          400,
        );
      }
    }

    const sessionMatch = request.pathname.match(/^\/api\/sessions\/(\d+)$/);
    if (request.method === 'DELETE' && sessionMatch) {
      try {
        if (!userId) return getAuthError();
        const [, sessionId] = sessionMatch;
        const session = await sessionRepository.getByIdAndUserId(Number(sessionId), userId);
        if (!session) return getAuthError();

        const deletedCount = await sessionRepository.deleteByIdAndUserId(Number(sessionId), userId);
        return jsonResponse({ message: 'Session history deleted', deletedCount });
      } catch (error) {
        return jsonResponse(
          { error: { code: 'SESSION_ERROR', message: error.message } },
          400,
        );
      }
    }

    if (request.method === 'GET' && sessionMatch) {
      try {
        if (!userId) return getAuthError();
        const [, sessionId] = sessionMatch;
        // Verify user owns session
        const session = await sessionRepository.getByIdAndUserId(Number(sessionId), userId);
        if (!session) return getAuthError();
        
        return jsonResponse(await sessionService.getSession(Number(sessionId)));
      } catch (error) {
        return jsonResponse(
          { error: { code: 'SESSION_ERROR', message: error.message } },
          400,
        );
      }
    }

    // Get all questions for a session
    const allQuestionsMatch = request.pathname.match(/^\/api\/sessions\/(\d+)\/questions$/);
    if (request.method === 'GET' && allQuestionsMatch) {
      try {
        if (!userId) return getAuthError();
        const [, sessionId] = allQuestionsMatch;
        // Verify user owns session
        const session = await sessionRepository.getByIdAndUserId(Number(sessionId), userId);
        if (!session) return getAuthError();
        
        return jsonResponse(await sessionService.getAllQuestions(Number(sessionId)));
      } catch (error) {
        return jsonResponse(
          { error: { code: 'SESSION_ERROR', message: error.message } },
          400,
        );
      }
    }

    const questionMatch = request.pathname.match(/^\/api\/sessions\/(\d+)\/questions\/(\d+)$/);
    if (request.method === 'GET' && questionMatch) {
      try {
        if (!userId) return getAuthError();
        const [, sessionId, questionNumber] = questionMatch;
        // Verify user owns session
        const session = await sessionRepository.getByIdAndUserId(Number(sessionId), userId);
        if (!session) return getAuthError();
        
        return jsonResponse(await sessionService.getQuestion(Number(sessionId), Number(questionNumber)));
      } catch (error) {
        return jsonResponse(
          { error: { code: 'SESSION_ERROR', message: error.message } },
          400,
        );
      }
    }

    const answersMatch = request.pathname.match(/^\/api\/sessions\/(\d+)\/answers$/);
    if (request.method === 'POST' && answersMatch) {
      try {
        if (!userId) return getAuthError();
        const [, sessionId] = answersMatch;
        // Verify user owns session
        const session = await sessionRepository.getByIdAndUserId(Number(sessionId), userId);
        if (!session) return getAuthError();
        
        return jsonResponse(await sessionService.submitAnswer(Number(sessionId), request.body));
      } catch (error) {
        return jsonResponse(
          { error: { code: 'SESSION_ERROR', message: error.message } },
          400,
        );
      }
    }

    const completeMatch = request.pathname.match(/^\/api\/sessions\/(\d+)\/complete$/);
    if (request.method === 'POST' && completeMatch) {
      try {
        if (!userId) return getAuthError();
        const [, sessionId] = completeMatch;
        // Verify user owns session
        const session = await sessionRepository.getByIdAndUserId(Number(sessionId), userId);
        if (!session) return getAuthError();
        
        return jsonResponse(await sessionService.completeSession(Number(sessionId)));
      } catch (error) {
        return jsonResponse(
          { error: { code: 'SESSION_ERROR', message: error.message } },
          400,
        );
      }
    }

    const resultMatch = request.pathname.match(/^\/api\/sessions\/(\d+)\/results$/);
    if (request.method === 'GET' && resultMatch) {
      try {
        if (!userId) return getAuthError();
        const [, sessionId] = resultMatch;
        // Verify user owns session
        const session = await sessionRepository.getByIdAndUserId(Number(sessionId), userId);
        if (!session) return getAuthError();
        
        return jsonResponse(await sessionService.getResults(Number(sessionId), { finalizeInProgress: false }));
      } catch (error) {
        return jsonResponse(
          { error: { code: 'SESSION_ERROR', message: error.message } },
          400,
        );
      }
    }

    return null;
  };
}
