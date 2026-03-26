function jsonResponse(body, status = 200) {
  return {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
    body: JSON.stringify(body),
  };
}

export function createAuthRoutes({ userRepository }) {
  return async function handleAuthRoute(request) {
    // Login - returns session token (user ID)
    if (request.method === 'POST' && request.pathname === '/api/auth/login') {
      const { username } = request.body;
      if (!username || username.trim().length === 0) {
        return jsonResponse(
          { error: { code: 'INVALID_USERNAME', message: 'Username is required' } },
          400,
        );
      }

      try {
        const user = await userRepository.findOrCreateByUsername(username.trim());
        return jsonResponse({ userId: user.id, username: user.username }, 200);
      } catch (error) {
        return jsonResponse(
          { error: { code: 'AUTH_ERROR', message: error.message } },
          400,
        );
      }
    }

    // Logout - just clear client-side session
    if (request.method === 'POST' && request.pathname === '/api/auth/logout') {
      return jsonResponse({ success: true }, 200);
    }

    // Get current user info
    if (request.method === 'GET' && request.pathname === '/api/auth/me') {
      const userId = request.headers['x-user-id'];
      if (!userId) {
        return jsonResponse(
          { error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } },
          401,
        );
      }

      try {
        const user = await userRepository.getById(Number(userId));
        if (!user) {
          return jsonResponse(
            { error: { code: 'USER_NOT_FOUND', message: 'User not found' } },
            404,
          );
        }
        return jsonResponse(user, 200);
      } catch (error) {
        return jsonResponse(
          { error: { code: 'AUTH_ERROR', message: error.message } },
          400,
        );
      }
    }

    return null;
  };
}
