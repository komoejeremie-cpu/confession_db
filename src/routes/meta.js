import { Router } from 'express';

import { query } from '../db.js';

const router = Router();

router.get('/categories', async (_request, response, next) => {
  try {
    const [rows] = await query(
      `SELECT id, name
       FROM categories
       ORDER BY name ASC`
    );

    response.json(rows);
  } catch (error) {
    next(error);
  }
});

export default router;