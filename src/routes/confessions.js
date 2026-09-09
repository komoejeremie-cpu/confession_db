import { Router } from 'express';
import multer from 'multer';

import { query } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import supabase from '../supabase.js';

const router = Router();

/* =========================================================
   UPLOAD DES IMAGES
   ========================================================= */

const upload = multer({
  storage: multer.memoryStorage(),

  limits: {
    fileSize: 5 * 1024 * 1024
  },

  fileFilter: (_request, file, callback) => {
    if (!file.mimetype.startsWith('image/')) {
      return callback(
        new Error('Seules les images sont autorisées.')
      );
    }

    callback(null, true);
  }
});

/* =========================================================
   UTILITAIRES AUTHENTIFICATION
   ========================================================= */

function getSessionToken(request) {
  const cookieHeader = request.headers.cookie || '';

  return (
    cookieHeader.match(
      /(?:^|;\s*)session=([^;]+)/
    )?.[1] || null
  );
}

async function getOptionalUser(request) {
  const token = getSessionToken(request);

  if (!token) {
    return null;
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

  return rows[0] || null;
}

/* =========================================================
   CONFESSIONS — PUBLICS
   ========================================================= */

router.get('/', async (request, response, next) => {
  try {
    const category =
      request.query.category?.trim() || '';

    const search =
      request.query.search?.trim() || '';

    let sql = `
      SELECT
        confessions.id,
        confessions.title,
        confessions.content,
        confessions.image_url,
        confessions.created_at,

        categories.name AS category,

        (
          SELECT COUNT(*)
          FROM confession_likes
          WHERE confession_likes.confession_id =
                confessions.id
        ) AS likes_count,

        (
          SELECT COUNT(*)
          FROM confession_comments
          WHERE confession_comments.confession_id =
                confessions.id
        ) AS comments_count,

        (
          SELECT COUNT(*)
          FROM confession_favorites
          WHERE confession_favorites.confession_id =
                confessions.id
        ) AS favorites_count

      FROM confessions

      INNER JOIN categories
        ON categories.id = confessions.category_id

      WHERE 1 = 1
    `;

    const values = [];

    if (category) {
      sql += `
        AND categories.name = ?
      `;

      values.push(category);
    }

    if (search) {
      sql += `
        AND (
          confessions.title LIKE ?
          OR confessions.content LIKE ?
        )
      `;

      const searchValue = `%${search}%`;

      values.push(
        searchValue,
        searchValue
      );
    }

    sql += `
      ORDER BY confessions.created_at DESC
    `;

    const [rows] = await query(
      sql,
      values
    );

    response.json(
      rows.map((row) => ({
        ...row,

        likes_count:
          Number(row.likes_count || 0),

        comments_count:
          Number(row.comments_count || 0),

        favorites_count:
          Number(row.favorites_count || 0),

        liked: false,

        favorite: false
      }))
    );

  } catch (error) {
    next(error);
  }
});

/* =========================================================
   COMMENTAIRES — PUBLICS
   ========================================================= */

router.get(
  '/:id/comments',
  async (request, response, next) => {
    try {
      const confessionId =
        Number(request.params.id);

      if (
        !Number.isInteger(confessionId) ||
        confessionId < 1
      ) {
        return response.status(400).json({
          error: 'Confession invalide.'
        });
      }

      const user =
        await getOptionalUser(request);

      const userId =
        user?.id || 0;

      const [rows] = await query(
        `SELECT
           confession_comments.id,
           confession_comments.confession_id,
           confession_comments.user_id,
           confession_comments.parent_comment_id,
           confession_comments.content,
           confession_comments.created_at,

           users.name AS author_name,

           (
             SELECT COUNT(*)
             FROM comment_likes
             WHERE comment_likes.comment_id =
                   confession_comments.id
           ) AS likes_count,

           EXISTS (
             SELECT 1
             FROM comment_likes
             WHERE comment_likes.comment_id =
                   confession_comments.id
               AND comment_likes.user_id = ?
           ) AS liked

         FROM confession_comments

         INNER JOIN users
           ON users.id =
              confession_comments.user_id

         WHERE confession_comments.confession_id = ?

         ORDER BY confession_comments.created_at ASC`,
        [
          userId,
          confessionId
        ]
      );

      response.json(
        rows.map((row) => ({
          ...row,

          parent_comment_id:
            row.parent_comment_id
              ? Number(row.parent_comment_id)
              : null,

          likes_count:
            Number(row.likes_count || 0),

          liked:
            Boolean(row.liked)
        }))
      );

    } catch (error) {
      next(error);
    }
  }
);

/* =========================================================
   CRÉER UNE CONFESSION / PUBLICATION
   ========================================================= */

router.post(
  '/',
  requireAuth,
  upload.single('image'),
  async (request, response, next) => {
    try {
      const {
        title,
        content,
        category,
        coachId = null
      } = request.body;

      const cleanTitle =
        title?.trim();

      const cleanContent =
        content?.trim();

      const cleanCategory =
        category?.trim();

      if (
        !cleanTitle ||
        !cleanContent ||
        !cleanCategory
      ) {
        return response.status(400).json({
          error:
            'Titre, catégorie et confession sont obligatoires.'
        });
      }

      if (cleanTitle.length > 200) {
        return response.status(400).json({
          error:
            'Le titre est limité à 200 caractères.'
        });
      }

      if (cleanContent.length > 10000) {
        return response.status(400).json({
          error:
            'La confession est limitée à 10000 caractères.'
        });
      }

      /* -----------------------------------------------------
         CATÉGORIE
         ----------------------------------------------------- */

      const [categoryRows] =
        await query(
          `SELECT id
           FROM categories
           WHERE name = ?
           LIMIT 1`,
          [cleanCategory]
        );

      if (!categoryRows.length) {
        return response.status(400).json({
          error:
            'Cette catégorie n’existe pas dans la base.'
        });
      }

      /* -----------------------------------------------------
         COACH
         ----------------------------------------------------- */

      let validCoachId = null;

      if (
        coachId !== null &&
        coachId !== ''
      ) {
        const numericCoachId =
          Number(coachId);

        if (
          !Number.isInteger(
            numericCoachId
          ) ||
          numericCoachId < 1
        ) {
          return response.status(400).json({
            error: 'Coach invalide.'
          });
        }

        const [coachRows] =
          await query(
            `SELECT id
             FROM coach_profiles
             WHERE id = ?
               AND status = 'APPROVED'
             LIMIT 1`,
            [numericCoachId]
          );

        if (!coachRows.length) {
          return response.status(400).json({
            error:
              'Coach invalide ou indisponible.'
          });
        }

        validCoachId =
          numericCoachId;
      }

      /* -----------------------------------------------------
         IMAGE
         ----------------------------------------------------- */

      let cleanImageUrl = null;

      if (request.file) {
        const fileExtension =
          request.file.originalname
            .split('.')
            .pop()
            ?.toLowerCase() || 'jpg';

        const fileName =
          `${request.user.id}-${Date.now()}.${fileExtension}`;

        const filePath =
          `confessions/${fileName}`;

        const {
          error: uploadError
        } =
          await supabase.storage
            .from('confession-images')
            .upload(
              filePath,
              request.file.buffer,
              {
                contentType:
                  request.file.mimetype,

                upsert: false
              }
            );

        if (uploadError) {
          console.error(
            'Erreur upload Supabase:',
            uploadError
          );

          return response.status(500).json({
            error:
              'Impossible de télécharger l’image.'
          });
        }

        const {
          data: publicUrlData
        } =
          supabase.storage
            .from('confession-images')
            .getPublicUrl(filePath);

        cleanImageUrl =
          publicUrlData?.publicUrl || null;

        if (
          cleanImageUrl &&
          cleanImageUrl.length > 500
        ) {
          return response.status(500).json({
            error:
              'L’URL de l’image est trop longue.'
          });
        }
      }

      /* -----------------------------------------------------
         ENREGISTRER LA PUBLICATION
         ----------------------------------------------------- */

      const [result] =
        await query(
          `INSERT INTO confessions
            (
              user_id,
              category_id,
              coach_id,
              title,
              content,
              image_url,
              is_anonymous
            )
           VALUES (?, ?, ?, ?, ?, ?, 1)`,
          [
            request.user.id,
            categoryRows[0].id,
            validCoachId,
            cleanTitle,
            cleanContent,
            cleanImageUrl
          ]
        );

      response.status(201).json({
        id: result.insertId,

        title: cleanTitle,

        content: cleanContent,

        image_url:
          cleanImageUrl,

        category:
          cleanCategory,

        likes_count: 0,

        comments_count: 0,

        favorites_count: 0,

        liked: false,

        favorite: false
      });

    } catch (error) {
      next(error);
    }
  }
);

/* =========================================================
   MES CONFESSIONS
   ========================================================= */

router.get(
  '/mine',
  requireAuth,
  async (request, response, next) => {
    try {
      const [rows] =
        await query(
          `SELECT
             confessions.id,
             confessions.title,
             confessions.content,
             confessions.image_url,
             categories.name AS category,
             confessions.created_at,

             (
               SELECT COUNT(*)
               FROM confession_likes
               WHERE confession_id =
                     confessions.id
             ) AS likes_count,

             (
               SELECT COUNT(*)
               FROM confession_comments
               WHERE confession_id =
                     confessions.id
             ) AS comments_count

           FROM confessions

           INNER JOIN categories
             ON categories.id =
                confessions.category_id

           WHERE confessions.user_id = ?

           ORDER BY confessions.created_at DESC`,
          [request.user.id]
        );

      response.json(
        rows.map((row) => ({
          ...row,

          likes_count:
            Number(row.likes_count || 0),

          comments_count:
            Number(row.comments_count || 0)
        }))
      );

    } catch (error) {
      next(error);
    }
  }
);

/* =========================================================
   LIKE D'UNE CONFESSION
   ========================================================= */

router.post(
  '/:id/like',
  requireAuth,
  async (request, response, next) => {
    try {
      const confessionId =
        Number(request.params.id);

      if (
        !Number.isInteger(confessionId) ||
        confessionId < 1
      ) {
        return response.status(400).json({
          error: 'Confession invalide.'
        });
      }

      const [confessionRows] =
        await query(
          `SELECT id
           FROM confessions
           WHERE id = ?
           LIMIT 1`,
          [confessionId]
        );

      if (!confessionRows.length) {
        return response.status(404).json({
          error:
            'Confession introuvable.'
        });
      }

      const [existing] =
        await query(
          `SELECT 1
           FROM confession_likes
           WHERE confession_id = ?
             AND user_id = ?`,
          [
            confessionId,
            request.user.id
          ]
        );

      if (existing.length) {
        await query(
          `DELETE FROM confession_likes
           WHERE confession_id = ?
             AND user_id = ?`,
          [
            confessionId,
            request.user.id
          ]
        );
      } else {
        await query(
          `INSERT INTO confession_likes
            (
              confession_id,
              user_id
            )
           VALUES (?, ?)`,
          [
            confessionId,
            request.user.id
          ]
        );
      }

      const [[count]] =
        await query(
          `SELECT COUNT(*) AS likes_count
           FROM confession_likes
           WHERE confession_id = ?`,
          [confessionId]
        );

      response.json({
        liked:
          !existing.length,

        likes_count:
          Number(count.likes_count || 0)
      });

    } catch (error) {
      next(error);
    }
  }
);

/* =========================================================
   FAVORI D'UNE CONFESSION
   ========================================================= */

router.post(
  '/:id/favorite',
  requireAuth,
  async (request, response, next) => {
    try {
      const confessionId =
        Number(request.params.id);

      if (
        !Number.isInteger(confessionId) ||
        confessionId < 1
      ) {
        return response.status(400).json({
          error: 'Confession invalide.'
        });
      }

      const [confessionRows] =
        await query(
          `SELECT id
           FROM confessions
           WHERE id = ?
           LIMIT 1`,
          [confessionId]
        );

      if (!confessionRows.length) {
        return response.status(404).json({
          error:
            'Confession introuvable.'
        });
      }

      const [existing] =
        await query(
          `SELECT 1
           FROM confession_favorites
           WHERE confession_id = ?
             AND user_id = ?`,
          [
            confessionId,
            request.user.id
          ]
        );

      if (existing.length) {
        await query(
          `DELETE FROM confession_favorites
           WHERE confession_id = ?
             AND user_id = ?`,
          [
            confessionId,
            request.user.id
          ]
        );
      } else {
        await query(
          `INSERT INTO confession_favorites
            (
              confession_id,
              user_id
            )
           VALUES (?, ?)`,
          [
            confessionId,
            request.user.id
          ]
        );
      }

      response.json({
        favorite:
          !existing.length
      });

    } catch (error) {
      next(error);
    }
  }
);

/* =========================================================
   AJOUTER UN COMMENTAIRE OU UNE RÉPONSE
   ========================================================= */

router.post(
  '/:id/comments',
  requireAuth,
  async (request, response, next) => {
    try {
      const confessionId =
        Number(request.params.id);

      const content =
        request.body.content?.trim();

      const parentCommentId =
        request.body.parentCommentId === null ||
        request.body.parentCommentId === undefined ||
        request.body.parentCommentId === ''
          ? null
          : Number(
              request.body.parentCommentId
            );

      if (
        !Number.isInteger(confessionId) ||
        confessionId < 1 ||
        !content
      ) {
        return response.status(400).json({
          error:
            'Confession et commentaire sont obligatoires.'
        });
      }

      if (content.length > 1000) {
        return response.status(400).json({
          error:
            'Le commentaire est limité à 1000 caractères.'
        });
      }

      if (
        parentCommentId !== null &&
        (
          !Number.isInteger(
            parentCommentId
          ) ||
          parentCommentId < 1
        )
      ) {
        return response.status(400).json({
          error:
            'Réponse invalide.'
        });
      }

      const [confessionRows] =
        await query(
          `SELECT id
           FROM confessions
           WHERE id = ?
           LIMIT 1`,
          [confessionId]
        );

      if (!confessionRows.length) {
        return response.status(404).json({
          error:
            'Confession introuvable.'
        });
      }

      if (
        parentCommentId !== null
      ) {
        const [parentRows] =
          await query(
            `SELECT id
             FROM confession_comments
             WHERE id = ?
               AND confession_id = ?
             LIMIT 1`,
            [
              parentCommentId,
              confessionId
            ]
          );

        if (!parentRows.length) {
          return response.status(404).json({
            error:
              'Commentaire parent introuvable.'
          });
        }
      }

      const [result] =
        await query(
          `INSERT INTO confession_comments
            (
              confession_id,
              user_id,
              parent_comment_id,
              content
            )
           VALUES (?, ?, ?, ?)`,
          [
            confessionId,
            request.user.id,
            parentCommentId,
            content
          ]
        );

      response.status(201).json({
        id: result.insertId,

        parent_comment_id:
          parentCommentId,

        content,

        author_name:
          request.user.name,

        likes_count: 0,

        liked: false,

        created_at:
          new Date().toISOString()
      });

    } catch (error) {
      next(error);
    }
  }
);

/* =========================================================
   LIKE D'UN COMMENTAIRE
   ========================================================= */

router.post(
  '/:id/comments/:commentId/like',
  requireAuth,
  async (request, response, next) => {
    try {
      const confessionId =
        Number(request.params.id);

      const commentId =
        Number(
          request.params.commentId
        );

      if (
        !Number.isInteger(confessionId) ||
        confessionId < 1 ||
        !Number.isInteger(commentId) ||
        commentId < 1
      ) {
        return response.status(400).json({
          error:
            'Commentaire invalide.'
        });
      }

      const [commentRows] =
        await query(
          `SELECT id
           FROM confession_comments
           WHERE id = ?
             AND confession_id = ?
           LIMIT 1`,
          [
            commentId,
            confessionId
          ]
        );

      if (!commentRows.length) {
        return response.status(404).json({
          error:
            'Commentaire introuvable.'
        });
      }

      const [existing] =
        await query(
          `SELECT 1
           FROM comment_likes
           WHERE comment_id = ?
             AND user_id = ?`,
          [
            commentId,
            request.user.id
          ]
        );

      if (existing.length) {
        await query(
          `DELETE FROM comment_likes
           WHERE comment_id = ?
             AND user_id = ?`,
          [
            commentId,
            request.user.id
          ]
        );
      } else {
        await query(
          `INSERT INTO comment_likes
            (
              comment_id,
              user_id
            )
           VALUES (?, ?)`,
          [
            commentId,
            request.user.id
          ]
        );
      }

      const [[count]] =
        await query(
          `SELECT COUNT(*) AS likes_count
           FROM comment_likes
           WHERE comment_id = ?`,
          [commentId]
        );

      response.json({
        liked:
          !existing.length,

        likes_count:
          Number(count.likes_count || 0)
      });

    } catch (error) {
      next(error);
    }
  }
);

/* =========================================================
   EXPORT
   ========================================================= */

export default router;