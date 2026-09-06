import { query } from '../db.js';

export async function requireAuth(request, response, next) {
  try {
    const cookieHeader = request.headers.cookie || '';

    const token = cookieHeader
      .match(/(?:^|;\s*)session=([^;]+)/)?.[1];

    if (!token) {
      return response.status(401).json({
        error: 'Connectez-vous pour continuer.'
      });
    }

    const [rows] = await query(
      `SELECT
         users.id,
         users.name,
         users.email,
         users.role
       FROM sessions
       INNER JOIN users
         ON users.id = sessions.user_id
       WHERE sessions.token = ?
         AND sessions.expires_at > NOW()
       LIMIT 1`,
      [token]
    );

    if (!rows.length) {
      return response.status(401).json({
        error: 'Session expirée. Connectez-vous à nouveau.'
      });
    }

    request.user = rows[0];

    next();
  } catch (error) {
    next(error);
  }
}