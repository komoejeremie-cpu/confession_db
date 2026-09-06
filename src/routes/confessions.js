import { Router } from 'express';

import { query } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

function getSessionToken(request) {
  const cookieHeader = request.headers.cookie || '';

  return cookieHeader
    .match(/(?:^|;\s*)session=([^;]+)/)?.[1] || null;
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

router.get('/', async (request, response, next) => {
  try {
    const {
      category,
      search,
      limit = 20,
      offset = 0
    } = request.query;

    const values = [];
    const filters = [];

    if (
      category &&
      category !== 'Toutes'
    ) {
      values.push(category);

      filters.push(
        'categories.name = ?'
      );
    }

    if (search?.trim()) {
      const searchValue = `%${search.trim()}%`;

      filters.push(
        `(confessions.title LIKE ?
          OR confessions.content LIKE ?)`
      );

      values.push(
        searchValue,
        searchValue
      );
    }

    const parsedLimit = Number(limit);
    const parsedOffset = Number(offset);

    const safeLimit = Math.min(
      Math.max(
        Number.isFinite(parsedLimit)
          ? parsedLimit
          : 20,
        1
      ),
      100
    );

    const safeOffset = Math.max(
      Number.isFinite(parsedOffset)
        ? parsedOffset
        : 0,
      0
    );

    const where = filters.length
      ? `WHERE ${filters.join(' AND ')}`
      : '';

    const user = await getOptionalUser(request);

    const userId = user?.id || 0;

    const [rows] = await query(
      `SELECT
         confessions.id,
         confessions.title,
         confessions.content,
         categories.name AS category,
         confessions.created_at,

         (
           SELECT COUNT(*)
           FROM confession_likes
           WHERE confession_id = confessions.id
         ) AS likes_count,

         (
           SELECT COUNT(*)
           FROM confession_comments
           WHERE confession_id = confessions.id
         ) AS comments_count,

         (
           SELECT COUNT(*)
           FROM confession_favorites
           WHERE confession_id = confessions.id
         ) AS favorites_count,

         EXISTS (
           SELECT 1
           FROM confession_likes
           WHERE confession_id = confessions.id
             AND user_id = ?
         ) AS liked,

         EXISTS (
           SELECT 1
           FROM confession_favorites
           WHERE confession_id = confessions.id
             AND user_id = ?
         ) AS favorite

       FROM confessions
       INNER JOIN categories
         ON categories.id = confessions.category_id

       ${where}

       ORDER BY confessions.created_at DESC

       LIMIT ? OFFSET ?`,
      [
        userId,
        userId,
        ...values,
        safeLimit,
        safeOffset
      ]
    );

    response.json(
      rows.map((row) => ({
        ...row,
        likes_count: Number(row.likes_count || 0),
        comments_count: Number(row.comments_count || 0),
        favorites_count: Number(row.favorites_count || 0),
        liked: Boolean(row.liked),
        favorite: Boolean(row.favorite)
      }))
    );
  } catch (error) {
    next(error);
  }
});

router.post('/', requireAuth, async (request, response, next) => {
  try {
    const {
      title,
      content,
      category,
      coachId = null
    } = request.body;

    const cleanTitle = title?.trim();
    const cleanContent = content?.trim();
    const cleanCategory = category?.trim();

    if (
      !cleanTitle ||
      !cleanContent ||
      !cleanCategory
    ) {
      return response.status(400).json({
        error: 'Titre, catégorie et confession sont obligatoires.'
      });
    }

    if (cleanTitle.length > 200) {
      return response.status(400).json({
        error: 'Le titre est limité à 200 caractères.'
      });
    }

    if (cleanContent.length > 10000) {
      return response.status(400).json({
        error: 'La confession est limitée à 10000 caractères.'
      });
    }

    const [categoryRows] = await query(
      `SELECT id
       FROM categories
       WHERE name = ?
       LIMIT 1`,
      [cleanCategory]
    );

    if (!categoryRows.length) {
      return response.status(400).json({
        error: 'Cette catégorie n’existe pas dans la base.'
      });
    }

    let validCoachId = null;

    if (coachId !== null && coachId !== '') {
      const numericCoachId = Number(coachId);

      if (
        !Number.isInteger(numericCoachId) ||
        numericCoachId < 1
      ) {
        return response.status(400).json({
          error: 'Coach invalide.'
        });
      }

      const [coachRows] = await query(
        `SELECT id
         FROM coach_profiles
         WHERE id = ?
           AND status = 'APPROVED'
         LIMIT 1`,
        [numericCoachId]
      );

      if (!coachRows.length) {
        return response.status(400).json({
          error: 'Coach invalide ou indisponible.'
        });
      }

      validCoachId = numericCoachId;
    }

    const [result] = await query(
      `INSERT INTO confessions
        (
          user_id,
          category_id,
          coach_id,
          title,
          content,
          is_anonymous
        )
       VALUES (?, ?, ?, ?, ?, 1)`,
      [
        request.user.id,
        categoryRows[0].id,
        validCoachId,
        cleanTitle,
        cleanContent
      ]
    );

    response.status(201).json({
      id: result.insertId,
      title: cleanTitle,
      content: cleanContent,
      category: cleanCategory,
      likes_count: 0,
      comments_count: 0,
      favorites_count: 0,
      liked: false,
      favorite: false
    });
  } catch (error) {
    next(error);
  }
});

router.get('/mine', requireAuth, async (request, response, next) => {
  try {
    const [rows] = await query(
      `SELECT confessions.id, confessions.title, confessions.content,
              categories.name AS category, confessions.created_at,
              (SELECT COUNT(*) FROM confession_likes WHERE confession_id = confessions.id) AS likes_count,
              (SELECT COUNT(*) FROM confession_comments WHERE confession_id = confessions.id) AS comments_count
       FROM confessions
       INNER JOIN categories ON categories.id = confessions.category_id
       WHERE confessions.user_id = ?
       ORDER BY confessions.created_at DESC`,
      [request.user.id]
    );

    response.json(rows.map((row) => ({
      ...row,
      likes_count: Number(row.likes_count || 0),
      comments_count: Number(row.comments_count || 0)
    })));
  } catch (error) {
    next(error);
  }
});

router.post('/:id/like', requireAuth, async (request, response, next) => {
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

    const [confessionRows] = await query(
      'SELECT id FROM confessions WHERE id = ? LIMIT 1',
      [confessionId]
    );

    if (!confessionRows.length) {
      return response.status(404).json({
        error: 'Confession introuvable.'
      });
    }

    const [existing] = await query(
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
          (confession_id, user_id)
         VALUES (?, ?)`,
        [
          confessionId,
          request.user.id
        ]
      );
    }

    const [[count]] = await query(
      `SELECT COUNT(*) AS likes_count
       FROM confession_likes
       WHERE confession_id = ?`,
      [confessionId]
    );

    response.json({
      liked: !existing.length,
      likes_count: Number(count.likes_count)
    });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/favorite', requireAuth, async (request, response, next) => {
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

    const [confessionRows] = await query(
      'SELECT id FROM confessions WHERE id = ? LIMIT 1',
      [confessionId]
    );

    if (!confessionRows.length) {
      return response.status(404).json({
        error: 'Confession introuvable.'
      });
    }

    const [existing] = await query(
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
          (confession_id, user_id)
         VALUES (?, ?)`,
        [
          confessionId,
          request.user.id
        ]
      );
    }

    response.json({
      favorite: !existing.length
    });
  } catch (error) {
    next(error);
  }
});

router.get('/:id/comments', async (request, response, next) => {
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

    const [rows] = await query(
      `SELECT
         confession_comments.id,
         confession_comments.content,
         confession_comments.created_at,
         users.name AS author_name
       FROM confession_comments
       INNER JOIN users
         ON users.id = confession_comments.user_id
       WHERE confession_comments.confession_id = ?
       ORDER BY confession_comments.created_at ASC`,
      [confessionId]
    );

    response.json(rows);
  } catch (error) {
    next(error);
  }
});

router.post('/:id/comments', requireAuth, async (request, response, next) => {
  try {
    const confessionId =
      Number(request.params.id);

    const content =
      request.body.content?.trim();

    if (
      !Number.isInteger(confessionId) ||
      confessionId < 1 ||
      !content
    ) {
      return response.status(400).json({
        error: 'Confession et commentaire sont obligatoires.'
      });
    }

    if (content.length > 1000) {
      return response.status(400).json({
        error: 'Le commentaire est limité à 1000 caractères.'
      });
    }

    const [confessionRows] = await query(
      'SELECT id FROM confessions WHERE id = ? LIMIT 1',
      [confessionId]
    );

    if (!confessionRows.length) {
      return response.status(404).json({
        error: 'Confession introuvable.'
      });
    }

    const [result] = await query(
      `INSERT INTO confession_comments
        (
          confession_id,
          user_id,
          content
        )
       VALUES (?, ?, ?)`,
      [
        confessionId,
        request.user.id,
        content
      ]
    );

    response.status(201).json({
      id: result.insertId,
      content,
      created_at: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

export default router;