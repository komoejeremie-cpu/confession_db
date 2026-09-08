import { Router } from 'express';
import nodemailer from 'nodemailer';
import {
  createHash,
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual
} from 'node:crypto';
import { promisify } from 'node:util';

import { pool, query } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

const scrypt = promisify(scryptCallback);
const mailTransporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD
  }
});

function hashResetToken(token) {
  return createHash('sha256')
    .update(token)
    .digest('hex');
}

function getAppUrl() {
  return (process.env.APP_URL || 'http://localhost:3000')
    .replace(/\/+$/, '');
}

async function sendPasswordResetEmail({
  email,
  name,
  resetUrl
}) {
  const fromName =
    process.env.SMTP_FROM_NAME || 'Confidences';

  const fromEmail = process.env.SMTP_FROM;

  if (!fromEmail) {
    throw new Error('SMTP_FROM est manquant.');
  }

  await mailTransporter.sendMail({
    from: `"${fromName}" <${fromEmail}>`,
    to: email,
    subject:
      'Réinitialisation de votre mot de passe - Confidences',

    text: [
      `Bonjour ${name || ''},`,
      '',
      'Vous avez demandé la réinitialisation de votre mot de passe.',
      '',
      `Utilisez ce lien pour choisir un nouveau mot de passe : ${resetUrl}`,
      '',
      'Ce lien est valable pendant 1 heure.',
      '',
      'Si vous n’êtes pas à l’origine de cette demande, vous pouvez ignorer cet e-mail.',
      '',
      'L’équipe Confidences'
    ].join('\n'),

    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;max-width:600px;margin:auto">
        <h2>Réinitialisation de votre mot de passe</h2>

        <p>Bonjour ${name || ''},</p>

        <p>
          Vous avez demandé la réinitialisation de votre
          mot de passe sur <strong>Confidences</strong>.
        </p>

        <p>
          Cliquez sur le bouton ci-dessous pour choisir
          un nouveau mot de passe :
        </p>

        <p>
          <a
            href="${resetUrl}"
            style="
              display:inline-block;
              padding:12px 20px;
              background:#6d4aff;
              color:#ffffff;
              text-decoration:none;
              border-radius:8px;
            "
          >
            Réinitialiser mon mot de passe
          </a>
        </p>

        <p>
          Ce lien est valable pendant
          <strong>1 heure</strong>.
        </p>

        <p>
          Si vous n’êtes pas à l’origine de cette demande,
          vous pouvez simplement ignorer cet e-mail.
        </p>

        <p>L’équipe Confidences</p>
      </div>
    `
  });
}

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

export async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const derivedKey = await scrypt(password, salt, 64);
  return `${salt}:${derivedKey.toString('hex')}`;
}

export async function verifyPassword(password, storedHash) {
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
    const {
      name,
      email,
      password,
      passwordConfirmation,
      accountType = 'USER',
      speciality,
      experience,
      bio = ''
    } = request.body;

    const normalizedName = name?.trim();
    const normalizedEmail = email?.trim().toLowerCase();

    if (!normalizedName || !normalizedEmail || !password || !passwordConfirmation) {
      return response.status(400).json({
        error: 'Nom, adresse e-mail et confirmation du mot de passe sont obligatoires.'
      });
    }

    if (password !== passwordConfirmation) {
      return response.status(400).json({
        error: 'Les deux mots de passe ne correspondent pas.'
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

    const role = accountType === 'COACH' ? 'COACH' : 'USER';
    const coachSpeciality = speciality?.trim();
    const coachExperience = Number(experience);

    if (role === 'COACH' && (!coachSpeciality || !Number.isInteger(coachExperience) || coachExperience < 0 || coachExperience > 80)) {
      return response.status(400).json({ error: 'Spécialité et expérience valides obligatoires pour un compte coach.' });
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

    const passwordHash = await hashPassword(password);

    const connection = await pool.getConnection();
    let userId;

    try {
      await connection.beginTransaction();
      const [result] = await connection.execute(
        `INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)`,
        [normalizedName, normalizedEmail, passwordHash, role]
      );
      userId = result.insertId;

      if (role === 'COACH') {
        await connection.execute(
          `INSERT INTO coach_profiles (user_id, speciality, experience, bio, status, rating_avg)
           VALUES (?, ?, ?, ?, 'PENDING', 0.00)`,
          [userId, coachSpeciality, coachExperience, bio.trim()]
        );
      }

      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

    await createSession(userId, response);

    response.status(201).json({
      id: userId,
      name: normalizedName,
      email: normalizedEmail,
      role
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
router.post('/forgot-password', async (request, response, next) => {
  try {
    const normalizedEmail = request.body.email?.trim().toLowerCase();

    const genericResponse = {
      message:
        'Si cette adresse correspond à un compte, un e-mail de réinitialisation a été envoyé.'
    };

    if (!normalizedEmail) {
      return response.json(genericResponse);
    }

    const [users] = await query(
      `
        SELECT id, name, email
        FROM users
        WHERE email = ?
        LIMIT 1
      `,
      [normalizedEmail]
    );

    if (!users.length) {
      return response.json(genericResponse);
    }

    const user = users[0];

    await query(
      'DELETE FROM password_resets WHERE user_id = ?',
      [user.id]
    );

    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = hashResetToken(rawToken);

    await query(
      `
        INSERT INTO password_resets
          (user_id, token_hash, expires_at)
        VALUES
          (?, ?, DATE_ADD(NOW(), INTERVAL 1 HOUR))
      `,
      [user.id, tokenHash]
    );

    const resetUrl =
      `${getAppUrl()}/reset-password.html?token=${encodeURIComponent(rawToken)}`;

    try {
      await sendPasswordResetEmail({
        email: user.email,
        name: user.name,
        resetUrl
      });
    } catch (error) {
      await query(
        'DELETE FROM password_resets WHERE token_hash = ?',
        [tokenHash]
      );

      throw error;
    }

    return response.json(genericResponse);
  } catch (error) {
    next(error);
  }
});
router.post('/reset-password', async (request, response, next) => {
  try {
    const token = request.body.token?.trim();
    const password = request.body.password;
    const passwordConfirmation = request.body.passwordConfirmation;

    if (!token || !password || !passwordConfirmation) {
      return response.status(400).json({
        error: 'Token et nouveau mot de passe obligatoires.'
      });
    }

    if (password !== passwordConfirmation) {
      return response.status(400).json({
        error: 'Les deux mots de passe ne correspondent pas.'
      });
    }

    if (password.length < 8) {
      return response.status(400).json({
        error: 'Le mot de passe doit contenir au moins 8 caractères.'
      });
    }

    const tokenHash = hashResetToken(token);

    const [resets] = await query(
      `
        SELECT id, user_id
        FROM password_resets
        WHERE token_hash = ?
          AND expires_at > NOW()
          AND used_at IS NULL
        LIMIT 1
      `,
      [tokenHash]
    );

    if (!resets.length) {
      return response.status(400).json({
        error: 'Le lien de réinitialisation est invalide ou expiré.'
      });
    }

    const reset = resets[0];
    const passwordHash = await hashPassword(password);

    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      await connection.execute(
        'UPDATE users SET password = ? WHERE id = ?',
        [passwordHash, reset.user_id]
      );

      await connection.execute(
        'DELETE FROM sessions WHERE user_id = ?',
        [reset.user_id]
      );

      await connection.execute(
        'UPDATE password_resets SET used_at = NOW() WHERE id = ?',
        [reset.id]
      );

      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

    return response.json({
      message:
        'Votre mot de passe a été réinitialisé avec succès.'
    });
  } catch (error) {
    next(error);
  }
});

export default router;