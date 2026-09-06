import { Router } from 'express';
import { query } from '../db.js';
import { requireAdmin } from '../middleware/admin.js';
import { hashPassword, verifyPassword } from './auth.js';

const router = Router();
router.use(requireAdmin);

router.patch('/password', async (request, response, next) => {
  try {
    const { currentPassword, newPassword, passwordConfirmation } = request.body;

    if (!currentPassword || !newPassword || !passwordConfirmation) {
      return response.status(400).json({ error: 'Tous les champs du mot de passe sont obligatoires.' });
    }
    if (newPassword !== passwordConfirmation) {
      return response.status(400).json({ error: 'Les nouveaux mots de passe ne correspondent pas.' });
    }
    if (newPassword.length < 8) {
      return response.status(400).json({ error: 'Le nouveau mot de passe doit contenir au moins 8 caractères.' });
    }

    const [rows] = await query('SELECT password FROM users WHERE id = ? LIMIT 1', [request.user.id]);
    if (!rows.length || !(await verifyPassword(currentPassword, rows[0].password))) {
      return response.status(401).json({ error: 'Le mot de passe actuel est incorrect.' });
    }

    await query('UPDATE users SET password = ? WHERE id = ?', [await hashPassword(newPassword), request.user.id]);
    response.json({ message: 'Mot de passe administrateur mis à jour.' });
  } catch (error) { next(error); }
});

router.get('/overview', async (_request, response, next) => {
  try {
    const [[users], [pendingCoaches], [confessions]] = await Promise.all([
      query('SELECT COUNT(*) AS total FROM users'),
      query("SELECT COUNT(*) AS total FROM coach_profiles WHERE status = 'PENDING'"),
      query('SELECT COUNT(*) AS total FROM confessions')
    ]);
    response.json({ users: Number(users[0].total), pendingCoaches: Number(pendingCoaches[0].total), confessions: Number(confessions[0].total) });
  } catch (error) { next(error); }
});

router.get('/users', async (_request, response, next) => {
  try {
    const [rows] = await query('SELECT id, name, email, role FROM users ORDER BY id DESC');
    response.json(rows);
  } catch (error) { next(error); }
});

router.patch('/users/:id/role', async (request, response, next) => {
  try {
    const role = request.body.role;
    if (!['USER', 'COACH', 'ADMIN'].includes(role)) return response.status(400).json({ error: 'Rôle invalide.' });
    const [result] = await query('UPDATE users SET role = ? WHERE id = ?', [role, Number(request.params.id)]);
    if (!result.affectedRows) return response.status(404).json({ error: 'Compte introuvable.' });
    response.json({ id: Number(request.params.id), role });
  } catch (error) { next(error); }
});

router.delete('/users/:id', async (request, response, next) => {
  try {
    const userId = Number(request.params.id);
    if (userId === request.user.id) return response.status(400).json({ error: 'Vous ne pouvez pas supprimer votre propre compte.' });
    await query('DELETE FROM sessions WHERE user_id = ?', [userId]);
    const [result] = await query('DELETE FROM users WHERE id = ?', [userId]);
    if (!result.affectedRows) return response.status(404).json({ error: 'Compte introuvable.' });
    response.status(204).end();
  } catch (error) { next(error); }
});

router.get('/coach-applications', async (_request, response, next) => {
  try {
    const [rows] = await query(
      `SELECT coach_profiles.id, coach_profiles.user_id, users.name, users.email,
              coach_profiles.speciality, coach_profiles.experience, coach_profiles.bio, coach_profiles.status
       FROM coach_profiles INNER JOIN users ON users.id = coach_profiles.user_id
       ORDER BY FIELD(coach_profiles.status, 'PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED'), coach_profiles.id DESC`
    );
    response.json(rows);
  } catch (error) { next(error); }
});

router.patch('/coach-applications/:id', async (request, response, next) => {
  try {
    const status = request.body.status;
    if (!['APPROVED', 'REJECTED', 'SUSPENDED'].includes(status)) return response.status(400).json({ error: 'Statut invalide.' });
    const [result] = await query('UPDATE coach_profiles SET status = ? WHERE id = ?', [status, Number(request.params.id)]);
    if (!result.affectedRows) return response.status(404).json({ error: 'Candidature introuvable.' });
    response.json({ id: Number(request.params.id), status });
  } catch (error) { next(error); }
});

router.get('/confessions', async (_request, response, next) => {
  try {
    const [rows] = await query(
      `SELECT confessions.id, confessions.title, confessions.content, confessions.created_at,
              users.name AS author_name, categories.name AS category
       FROM confessions INNER JOIN users ON users.id = confessions.user_id
       INNER JOIN categories ON categories.id = confessions.category_id
       ORDER BY confessions.created_at DESC`
    );
    response.json(rows);
  } catch (error) { next(error); }
});

router.delete('/confessions/:id', async (request, response, next) => {
  try {
    const [result] = await query('DELETE FROM confessions WHERE id = ?', [Number(request.params.id)]);
    if (!result.affectedRows) return response.status(404).json({ error: 'Confession introuvable.' });
    response.status(204).end();
  } catch (error) { next(error); }
});

export default router;