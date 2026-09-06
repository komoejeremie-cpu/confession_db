import { requireAuth } from './auth.js';

export async function requireAdmin(request, response, next) {
  await requireAuth(request, response, (error) => {
    if (error) return next(error);
    if (request.user.role !== 'ADMIN') {
      return response.status(403).json({ error: 'Accès administrateur requis.' });
    }
    next();
  });
}
