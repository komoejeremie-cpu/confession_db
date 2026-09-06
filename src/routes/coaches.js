import { Router } from 'express';

import { query } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.get('/', async (request, response, next) => {
  try {
    const {
      search,
      specialty,
      rating,
      experience
    } = request.query;

    const values = [];

    const filters = [
      `coach_profiles.status = 'APPROVED'`
    ];

    if (search?.trim()) {
      const searchValue = `%${search.trim()}%`;

      filters.push(
        `(users.name LIKE ?
          OR coach_profiles.bio LIKE ?
          OR coach_profiles.speciality LIKE ?)`
      );

      values.push(
        searchValue,
        searchValue,
        searchValue
      );
    }

    if (
      specialty &&
      specialty !== 'Toutes'
    ) {
      filters.push(
        `coach_profiles.speciality = ?`
      );

      values.push(specialty);
    }

    if (rating) {
      const minRating = Number(rating);

      if (
        Number.isFinite(minRating) &&
        minRating > 0
      ) {
        filters.push(
          `coach_profiles.rating_avg >= ?`
        );

        values.push(minRating);
      }
    }

    if (experience) {
      const minExperience = Number(experience);

      if (
        Number.isFinite(minExperience) &&
        minExperience > 0
      ) {
        filters.push(
          `coach_profiles.experience >= ?`
        );

        values.push(minExperience);
      }
    }

    const [rows] = await query(
      `SELECT
         coach_profiles.id,
         users.name,
         coach_profiles.bio,
         coach_profiles.speciality,
         coach_profiles.experience,
         coach_profiles.rating_avg
       FROM coach_profiles
       INNER JOIN users
         ON users.id = coach_profiles.user_id
       WHERE ${filters.join(' AND ')}
       ORDER BY coach_profiles.rating_avg DESC`,
      values
    );

    response.json(
      rows.map((coach) => ({
        ...coach,
        specialties: coach.speciality
          ? [coach.speciality]
          : [],
        years_experience: coach.experience,
        rating: Number(coach.rating_avg || 0),
        reviews_count: 0
      }))
    );
  } catch (error) {
    next(error);
  }
});

router.get('/application', requireAuth, async (request, response, next) => {
  try {
    const [rows] = await query(
      `SELECT id, speciality, experience, bio, status
       FROM coach_profiles
       WHERE user_id = ?
       LIMIT 1`,
      [request.user.id]
    );

    response.json(rows[0] || null);
  } catch (error) {
    next(error);
  }
});

router.post('/application', requireAuth, async (request, response, next) => {
  try {
    const speciality = request.body.speciality?.trim();
    const bio = request.body.bio?.trim() || '';
    const experience = Number(request.body.experience);

    if (!speciality || !Number.isInteger(experience) || experience < 0 || experience > 80) {
      return response.status(400).json({ error: 'Spécialité et expérience valide sont obligatoires.' });
    }

    if (speciality.length > 150 || bio.length > 5000) {
      return response.status(400).json({ error: 'La spécialité ou la présentation est trop longue.' });
    }

    const [existing] = await query(
      'SELECT id, status FROM coach_profiles WHERE user_id = ? LIMIT 1',
      [request.user.id]
    );

    if (existing.length && ['PENDING', 'APPROVED'].includes(existing[0].status)) {
      return response.status(409).json({ error: existing[0].status === 'PENDING' ? 'Votre candidature est déjà en attente de validation.' : 'Votre profil coach est déjà validé.' });
    }

    if (existing.length) {
      await query(
        `UPDATE coach_profiles
         SET speciality = ?, experience = ?, bio = ?, status = 'PENDING'
         WHERE id = ?`,
        [speciality, experience, bio, existing[0].id]
      );
    } else {
      await query(
        `INSERT INTO coach_profiles (user_id, speciality, experience, bio, status, rating_avg)
         VALUES (?, ?, ?, ?, 'PENDING', 0.00)`,
        [request.user.id, speciality, experience, bio]
      );
    }

    response.status(201).json({ status: 'PENDING', speciality, experience, bio });
  } catch (error) {
    next(error);
  }
});

export default router;