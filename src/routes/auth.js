import { Router } from 'express';
import {
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual
} from 'node:crypto';
import { promisify } from 'node:util';

import { query } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

const scrypt = promisify(scryptCallback);

function setSessionCookie(response, token) {
  const secure = process.env.NODE_ENV === 'production'
    ? '; Secure'
    : '';

  response.setHeader(
    'Set-Cookie',
    `session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=604800${secure}`
  );
}

function clearSessionCookie(response) {
  response.setHeader(
    'Set-Cookie',
    'session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0'
  );
}

function getSessionToken(request) {
  const cookieHeader = request.headers.cookie || '';

  return cookieHeader
    .match(/(?:^|;\s*)session=([^;]+)/)?.[1] || null;
}

async function createSession(userId, response) {
  const token = randomBytes(32).toString('hex');

  await query(
    `INSERT INTO sessions
      (token, user_id, expires_at)
     VALUES
      (?, ?, DATE_ADD(NOW(), INTERVAL 7 DAY))`,
    [token, userId]
  );

  setSessionCookie(response, token);
}

async function verifyPassword(password, storedHash) {
  if (!storedHash || typeof storedHash !== 'string') {
    return false;
  }

  const [salt, keyHex] = storedHash.split(':');

  if (!salt || !keyHex) {
    return false;
  }

  try {
    const derivedKey = await scrypt(password, salt, 64);
    const storedKey = Buffer.from(keyHex, 'hex');

    if (storedKey.length !== derivedKey.length) {
      return false;
    }

    return timingSafeEqual(storedKey, derivedKey);
  } catch {
    return false;
  }
}

router.post('/register', async (request, response, next) => {
  try {
    const { name, email, password } = request.body;

    const normalizedName = name?.trim();
    const normalizedEmail = email?.trim().toLowerCase();

    if (!normalizedName || !normalizedEmail || !password) {
      return response.status(400).json({
        error: 'Nom, adresse e-mail et mot de passe sont obligatoires.'
      });
    }

    if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
      return response.status(400).json({
        error: 'Adresse e-mail invalide.'
      });
    }

    if (password.length < 8) {
      return response.status(400).json({
        error: 'Le mot de passe doit contenir au moins 8 caractères.'
      });
    }

    const [existingUsers] = await query(
      'SELECT id FROM users WHERE email = ? LIMIT 1',
      [normalizedEmail]
    );

    if (existingUsers.length) {
      return response.status(409).json({
        error: 'Cette adresse e-mail est déjà utilisée.'
      });
    }

    const salt = randomBytes(16).toString('hex');

    const derivedKey = await scrypt(
      password,
      salt,
      64
    );

    const passwordHash =
      `${salt}:${derivedKey.toString('hex')}`;

    const [result] = await query(
      `INSERT INTO users
        (name, email, password, role)
       VALUES
        (?, ?, ?, ?)`,
      [
        normalizedName,
        normalizedEmail,
        passwordHash,
        'USER'
      ]
    );

    await createSession(result.insertId, response);

    response.status(201).json({
      id: result.insertId,
      name: normalizedName,
      email: normalizedEmail,
      role: 'USER'
    });
  } catch (error) {
    next(error);
  }
});

router.get('/profile', requireAuth, async (request, response, next) => {
  try {
    response.json(request.user);
  } catch (error) {
    next(error);
  }
});

router.patch('/profile', requireAuth, async (request, response, next) => {
  try {
    const name = request.body.name?.trim();
    const email = request.body.email?.trim().toLowerCase();

    if (!name || !email || !/^\S+@\S+\.\S+$/.test(email)) {
      return response.status(400).json({ error: 'Nom et adresse e-mail valides obligatoires.' });
    }

    const [existing] = await query(
      'SELECT id FROM users WHERE email = ? AND id <> ? LIMIT 1',
      [email, request.user.id]
    );

    if (existing.length) {
      return response.status(409).json({ error: 'Cette adresse e-mail est déjà utilisée.' });
    }

    await query(
      'UPDATE users SET name = ?, email = ? WHERE id = ?',
      [name, email, request.user.id]
    );

    response.json({ id: request.user.id, name, email, role: request.user.role });
  } catch (error) {
    next(error);
  }
});

router.post('/login', async (request, response, next) => {
  try {
    const normalizedEmail =
      request.body.email?.trim().toLowerCase();

    const password = request.body.password;

    if (!normalizedEmail || !password) {
      return response.status(400).json({
        error: 'Adresse e-mail et mot de passe sont obligatoires.'
      });
    }

    const [rows] = await query(
      `SELECT
         id,
         name,
         email,
         password,
         role
       FROM users
       WHERE email = ?
       LIMIT 1`,
      [normalizedEmail]
    );

    if (
      !rows.length ||
      !(await verifyPassword(
        password,
        rows[0].password
      ))
    ) {
      return response.status(401).json({
        error: 'Adresse e-mail ou mot de passe incorrect.'
      });
    }

    await createSession(
      rows[0].id,
      response
    );

    response.json({
      id: rows[0].id,
      name: rows[0].name,
      email: rows[0].email,
      role: rows[0].role
    });
  } catch (error) {
    next(error);
  }
});

router.post('/logout', async (request, response, next) => {
  try {
    const token = getSessionToken(request);

    if (token) {
      await query(
        'DELETE FROM sessions WHERE token = ?',
        [token]
      );
    }

    clearSessionCookie(response);

    response.status(204).end();
  } catch (error) {
    next(error);
  }
});

router.get('/me', async (request, response, next) => {
  try {
    const token = getSessionToken(request);

    if (!token) {
      return response.status(401).json({
        error: 'Non connecté.'
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
        error: 'Session expirée.'
      });
    }

    response.json(rows[0]);
  } catch (error) {
    next(error);
  }
});

export default router;