import { Router } from 'express';
import multer from 'multer';

import { query } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import supabase from '../supabase.js';

const router = Router();

/* =========================================================
   UPLOAD PHOTO COACH
========================================================= */

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024
  },
  fileFilter: (request, file, callback) => {
    if (!file.mimetype.startsWith('image/')) {
      return callback(
        new Error('Le fichier doit être une image.')
      );
    }

    callback(null, true);
  }
});

/* =========================================================
   LISTE DES COACHS APPROUVÉS
========================================================= */

router.get(
  '/',
  async (request, response, next) => {
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
        const searchValue =
          `%${search.trim()}%`;

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
        const minRating =
          Number(rating);

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
        const minExperience =
          Number(experience);

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
           coach_profiles.rating_avg,
           coach_profiles.photo_url,
           (
             SELECT COUNT(*)
             FROM coach_ratings
             WHERE coach_ratings.coach_id =
                   coach_profiles.id
           ) AS reviews_count
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

          specialties:
            coach.speciality
              ? [coach.speciality]
              : [],

          years_experience:
            coach.experience,

          rating:
            Number(
              coach.rating_avg || 0
            ),

          reviews_count:
            Number(
              coach.reviews_count || 0
            ),

          photo_url:
            coach.photo_url || null
        }))
      );
    } catch (error) {
      next(error);
    }
  }
);

/* =========================================================
   CANDIDATURE COACH
   IMPORTANT : AVANT LES ROUTES /:id
========================================================= */

router.get(
  '/application',
  requireAuth,
  async (request, response, next) => {
    try {
      const [rows] = await query(
        `SELECT
           id,
           speciality,
           experience,
           bio,
           status,
           photo_url
         FROM coach_profiles
         WHERE user_id = ?
         LIMIT 1`,
        [request.user.id]
      );

      response.json(
        rows[0] || null
      );
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/application',
  requireAuth,
  upload.single('photo'),
  async (request, response, next) => {
    try {
      if (
        request.user.role === 'COACH'
      ) {
        return response.status(403).json({
          error:
            'Vous êtes déjà coach. Vous ne pouvez pas déposer une candidature coach.'
        });
      }

      const speciality =
        request.body.speciality?.trim();

      const bio =
        request.body.bio?.trim() || '';

      const experience =
        Number(
          request.body.experience
        );

      if (
        !speciality ||
        !Number.isInteger(experience) ||
        experience < 0 ||
        experience > 80
      ) {
        return response.status(400).json({
          error:
            'Spécialité et expérience valide sont obligatoires.'
        });
      }

      if (
        speciality.length > 150 ||
        bio.length > 5000
      ) {
        return response.status(400).json({
          error:
            'La spécialité ou la présentation est trop longue.'
        });
      }

      const [existing] =
        await query(
          `SELECT id, status
           FROM coach_profiles
           WHERE user_id = ?
           LIMIT 1`,
          [request.user.id]
        );

      if (
        existing.length &&
        ['PENDING', 'APPROVED'].includes(
          existing[0].status
        )
      ) {
        return response.status(409).json({
          error:
            existing[0].status === 'PENDING'
              ? 'Votre candidature est déjà en attente de validation.'
              : 'Votre profil coach est déjà validé.'
        });
      }

      if (existing.length) {
        await query(
          `UPDATE coach_profiles
           SET speciality = ?,
               experience = ?,
               bio = ?,
               status = 'PENDING'
           WHERE id = ?`,
          [
            speciality,
            experience,
            bio,
            existing[0].id
          ]
        );
      } else {
        await query(
          `INSERT INTO coach_profiles
            (
              user_id,
              speciality,
              experience,
              bio,
              status,
              rating_avg
            )
           VALUES (
             ?,
             ?,
             ?,
             ?,
             'PENDING',
             0.00
           )`,
          [
            request.user.id,
            speciality,
            experience,
            bio
          ]
        );
      }

      response.status(201).json({
        status: 'PENDING',
        speciality,
        experience,
        bio
      });
    } catch (error) {
      next(error);
    }
  }
);

/* =========================================================
   AVIS D'UN COACH
========================================================= */

router.get(
  '/:id/ratings',
  async (request, response, next) => {
    try {
      const coachId =
        Number(request.params.id);

      if (!Number.isInteger(coachId)) {
        return response.status(400).json({
          error: 'Identifiant coach invalide.'
        });
      }

      const [coachRows] = await query(
        `SELECT id
         FROM coach_profiles
         WHERE id = ?
           AND status = 'APPROVED'
         LIMIT 1`,
        [coachId]
      );

      if (!coachRows.length) {
        return response.status(404).json({
          error: 'Coach introuvable.'
        });
      }

      const [rows] = await query(
        `SELECT
           coach_ratings.id,
           coach_ratings.rating,
           coach_ratings.comment,
           coach_ratings.created_at,
           users.name
         FROM coach_ratings
         INNER JOIN users
           ON users.id = coach_ratings.user_id
         WHERE coach_ratings.coach_id = ?
         ORDER BY coach_ratings.created_at DESC`,
        [coachId]
      );

      response.json(
        rows.map((rating) => ({
          ...rating,

          rating:
            Number(
              rating.rating
            )
        }))
      );
    } catch (error) {
      next(error);
    }
  }
);

/* =========================================================
   NOTER UN COACH
========================================================= */

router.post(
  '/:id/rating',
  requireAuth,
  async (request, response, next) => {
    try {
      const coachId =
        Number(request.params.id);

      if (!Number.isInteger(coachId)) {
        return response.status(400).json({
          error: 'Identifiant coach invalide.'
        });
      }

      const rating =
        Number(
          request.body.rating
        );

      const comment =
        request.body.comment?.trim() || null;

      /* -----------------------------------------------------
         VALIDATION DE LA NOTE
      ----------------------------------------------------- */

      if (
        !Number.isInteger(rating) ||
        rating < 1 ||
        rating > 5
      ) {
        return response.status(400).json({
          error:
            'La note doit être comprise entre 1 et 5.'
        });
      }

      /* -----------------------------------------------------
         VALIDATION DU COMMENTAIRE
      ----------------------------------------------------- */

      if (
        comment &&
        comment.length > 1000
      ) {
        return response.status(400).json({
          error:
            'Le commentaire ne peut pas dépasser 1000 caractères.'
        });
      }

      /* -----------------------------------------------------
         VÉRIFIER LE COACH
      ----------------------------------------------------- */

      const [coachRows] =
        await query(
          `SELECT
             id,
             user_id,
             status
           FROM coach_profiles
           WHERE id = ?
           LIMIT 1`,
          [coachId]
        );

      if (!coachRows.length) {
        return response.status(404).json({
          error: 'Coach introuvable.'
        });
      }

      const coach =
        coachRows[0];

      if (
        coach.status !== 'APPROVED'
      ) {
        return response.status(403).json({
          error:
            'Vous ne pouvez noter qu’un coach approuvé.'
        });
      }

      /* -----------------------------------------------------
         EMPÊCHER UN COACH DE SE NOTER LUI-MÊME
      ----------------------------------------------------- */

      if (
        Number(coach.user_id) ===
        Number(request.user.id)
      ) {
        return response.status(403).json({
          error:
            'Vous ne pouvez pas noter votre propre profil.'
        });
      }

      /* -----------------------------------------------------
         VÉRIFIER SI L'UTILISATEUR A DÉJÀ NOTÉ
      ----------------------------------------------------- */

      const [existingRatings] =
        await query(
          `SELECT id
           FROM coach_ratings
           WHERE coach_id = ?
             AND user_id = ?
           LIMIT 1`,
          [
            coachId,
            request.user.id
          ]
        );

      if (existingRatings.length) {
        return response.status(409).json({
          error:
            'Vous avez déjà noté ce coach.'
        });
      }

      /* -----------------------------------------------------
         AJOUTER LA NOTE
      ----------------------------------------------------- */

      await query(
        `INSERT INTO coach_ratings
          (
            coach_id,
            user_id,
            rating,
            comment
          )
         VALUES (
           ?,
           ?,
           ?,
           ?
         )`,
        [
          coachId,
          request.user.id,
          rating,
          comment
        ]
      );

      /* -----------------------------------------------------
         RECALCULER LA MOYENNE
      ----------------------------------------------------- */

      const [averageRows] =
        await query(
          `SELECT
             AVG(rating) AS average_rating,
             COUNT(*) AS reviews_count
           FROM coach_ratings
           WHERE coach_id = ?`,
          [coachId]
        );

      const average =
        Number(
          averageRows[0]?.average_rating || 0
        );

      const reviewsCount =
        Number(
          averageRows[0]?.reviews_count || 0
        );

      await query(
        `UPDATE coach_profiles
         SET rating_avg = ?
         WHERE id = ?`,
        [
          average.toFixed(2),
          coachId
        ]
      );

      response.status(201).json({
        message:
          'Votre avis a été enregistré.',

        rating,

        comment,

        rating_avg:
          Number(
            average.toFixed(2)
          ),

        reviews_count:
          reviewsCount
      });
    } catch (error) {
      next(error);
    }
  }
);

/* =========================================================
   PROFIL D'UN COACH
========================================================= */

router.get(
  '/:id',
  async (request, response, next) => {
    try {
      const coachId =
        Number(request.params.id);

      if (!Number.isInteger(coachId)) {
        return response.status(400).json({
          error: 'Identifiant coach invalide.'
        });
      }

      const [rows] = await query(
        `SELECT
           coach_profiles.id,
           coach_profiles.user_id,
           users.name,
           users.email,
           coach_profiles.bio,
           coach_profiles.speciality,
           coach_profiles.experience,
           coach_profiles.rating_avg,
           coach_profiles.photo_url,
           (
             SELECT COUNT(*)
             FROM coach_ratings
             WHERE coach_ratings.coach_id =
                   coach_profiles.id
           ) AS reviews_count
         FROM coach_profiles
         INNER JOIN users
           ON users.id = coach_profiles.user_id
         WHERE coach_profiles.id = ?
           AND coach_profiles.status = 'APPROVED'
         LIMIT 1`,
        [coachId]
      );

      if (!rows.length) {
        return response.status(404).json({
          error: 'Coach introuvable.'
        });
      }

      const coach = rows[0];

      response.json({
        ...coach,

        rating:
          Number(
            coach.rating_avg || 0
          ),

        reviews_count:
          Number(
            coach.reviews_count || 0
          ),

        photo_url:
          coach.photo_url || null
      });
    } catch (error) {
      next(error);
    }
  }
);

/* =========================================================
   MODIFICATION PHOTO DU COACH
========================================================= */

router.post(
  '/profile/photo',
  requireAuth,
  upload.single('photo'),
  async (request, response, next) => {
    try {
      if (
        request.user.role !== 'COACH'
      ) {
        return response.status(403).json({
          error:
            'Seul un coach peut modifier sa photo.'
        });
      }

      if (!request.file) {
        return response.status(400).json({
          error:
            'Veuillez sélectionner une image.'
        });
      }

      const [rows] = await query(
        `SELECT id
         FROM coach_profiles
         WHERE user_id = ?
           AND status = 'APPROVED'
         LIMIT 1`,
        [request.user.id]
      );

      if (!rows.length) {
        return response.status(404).json({
          error:
            'Profil coach approuvé introuvable.'
        });
      }

      const coachId =
        rows[0].id;

      const extension =
        request.file.mimetype
          .split('/')[1]
          ?.replace('jpeg', 'jpg') ||
        'jpg';

      const fileName =
        `${coachId}-${Date.now()}.${extension}`;

      const filePath =
        `coaches/${fileName}`;

      const {
        error: uploadError
      } = await supabase.storage
        .from('confession-images')
        .upload(
          filePath,
          request.file.buffer,
          {
            contentType:
              request.file.mimetype,

            upsert: true
          }
        );

      if (uploadError) {
        throw uploadError;
      }

      const {
        data: publicUrlData
      } = supabase.storage
        .from('confession-images')
        .getPublicUrl(filePath);

      const photoUrl =
        publicUrlData?.publicUrl;

      if (!photoUrl) {
        throw new Error(
          'Impossible de récupérer l’URL publique de la photo.'
        );
      }

      await query(
        `UPDATE coach_profiles
         SET photo_url = ?
         WHERE id = ?`,
        [
          photoUrl,
          coachId
        ]
      );

      response.json({
        message:
          'Photo de profil mise à jour.',

        photo_url:
          photoUrl
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;