import 'dotenv/config';

import express from 'express';
import helmet from 'helmet';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import confessionRoutes from './src/routes/confessions.js';
import coachRoutes from './src/routes/coaches.js';
import authRoutes from './src/routes/auth.js';
import metaRoutes from './src/routes/meta.js';
import adminRoutes from './src/routes/admin.js';

import { ensureSchema, query } from './src/db.js';

const __dirname = path.dirname(
  fileURLToPath(import.meta.url)
);

const app = express();

const port = Number(
  process.env.PORT || 3000
);

/*
|--------------------------------------------------------------------------
| Sécurité
|--------------------------------------------------------------------------
*/

app.use(
  helmet({
    contentSecurityPolicy: false
  })
);

/*
|--------------------------------------------------------------------------
| JSON
|--------------------------------------------------------------------------
*/

app.use(
  express.json({
    limit: '100kb'
  })
);

/*
|--------------------------------------------------------------------------
| Protection de la page admin
|--------------------------------------------------------------------------
*/

app.get(
  '/admin.html',
  async (request, response, next) => {
    try {
      const token = request.headers.cookie
        ?.match(
          /(?:^|;\s*)session=([^;]+)/
        )?.[1];

      if (!token) {
        return response.redirect(
          '/admin-login.html'
        );
      }

      const [rows] = await query(
        `SELECT users.role
         FROM sessions
         INNER JOIN users
           ON users.id = sessions.user_id
         WHERE sessions.token = ?
           AND sessions.expires_at > NOW()
         LIMIT 1`,
        [token]
      );

      if (
        !rows.length ||
        rows[0].role !== 'ADMIN'
      ) {
        return response.redirect(
          '/admin-login.html'
        );
      }

      return response.sendFile(
        path.join(__dirname, 'admin.html')
      );
    } catch (error) {
      next(error);
    }
  }
);

/*
|--------------------------------------------------------------------------
| Fichiers statiques
|--------------------------------------------------------------------------
*/

app.use(
  express.static(__dirname)
);

/*
|--------------------------------------------------------------------------
| Health check
|--------------------------------------------------------------------------
*/

app.get(
  '/api/health',
  (_request, response) => {
    response.json({
      status: 'ok'
    });
  }
);

/*
|--------------------------------------------------------------------------
| Routes API
|--------------------------------------------------------------------------
*/

app.use(
  '/api/confessions',
  confessionRoutes
);

app.use(
  '/api/coaches',
  coachRoutes
);

app.use(
  '/api/admin',
  adminRoutes
);

/*
|--------------------------------------------------------------------------
| Test authentification
|--------------------------------------------------------------------------
*/

app.get(
  '/api/auth/test',
  (_request, response) => {
    response.json({
      status: 'ok',
      message: 'La route auth fonctionne.'
    });
  }
);

app.use(
  '/api/auth',
  authRoutes
);

/*
|--------------------------------------------------------------------------
| Métadonnées
|--------------------------------------------------------------------------
*/

app.use(
  '/api',
  metaRoutes
);

/*
|--------------------------------------------------------------------------
| Route API inconnue
|--------------------------------------------------------------------------
*/

app.use(
  '/api/*splat',
  (_request, response) => {
    response.status(404).json({
      error: 'Route API introuvable.'
    });
  }
);

/*
|--------------------------------------------------------------------------
| Gestion globale des erreurs
|--------------------------------------------------------------------------
*/

app.use(
  (
    error,
    _request,
    response,
    _next
  ) => {
    console.error(error);

    response.status(500).json({
      error:
        'Erreur serveur. Vérifie la connexion à la base de données.'
    });
  }
);

/*
|--------------------------------------------------------------------------
| Préparation de la base de données
|--------------------------------------------------------------------------
|
| On prépare le schéma avant le démarrage local.
| Sur Vercel, l'application est exportée comme fonction
| et Vercel gère le serveur HTTP.
|
*/

let schemaReady = false;
let schemaPromise = null;

async function prepareDatabase() {
  if (schemaReady) {
    return;
  }

  if (!schemaPromise) {
    schemaPromise = ensureSchema()
      .then(() => {
        schemaReady = true;
      })
      .catch((error) => {
        schemaPromise = null;
        throw error;
      });
  }

  await schemaPromise;
}

/*
|--------------------------------------------------------------------------
| Vercel / production
|--------------------------------------------------------------------------
|
| Vercel utilise l'application Express exportée ci-dessous.
|
*/

const handler = async (
  request,
  response
) => {
  try {
    await prepareDatabase();

    return app(
      request,
      response
    );
  } catch (error) {
    console.error(
      'Impossible de préparer la base de données.',
      error
    );

    return response.status(500).json({
      error:
        'Impossible de préparer la base de données.'
    });
  }
};

export default handler;

/*
|--------------------------------------------------------------------------
| Serveur local
|--------------------------------------------------------------------------
|
| Quand on lance :
|
|   npm run dev
|
| ou :
|
|   npm start
|
| le serveur écoute normalement sur localhost:3000.
|
*/

if (
  process.env.VERCEL !== '1'
) {
  prepareDatabase()
    .then(() => {
      const server = app.listen(
        port,
        () => {
          console.log(
            `Confidences disponible sur http://localhost:${port}`
          );
        }
      );

      server.on(
        'error',
        (error) => {
          if (
            error.code === 'EADDRINUSE'
          ) {
            console.error(
              `Le port ${port} est déjà utilisé. Arrête l’autre serveur ou lance avec PORT=3100.`
            );
          } else {
            console.error(
              'Erreur de démarrage du serveur.',
              error
            );
          }

          process.exitCode = 1;
        }
      );
    })
    .catch((error) => {
      console.error(
        'Impossible de préparer la base de données.',
        error
      );

      process.exitCode = 1;
    });
}
