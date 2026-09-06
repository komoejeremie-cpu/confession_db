import 'dotenv/config';

import express from 'express';
import helmet from 'helmet';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import confessionRoutes from './src/routes/confessions.js';
import coachRoutes from './src/routes/coaches.js';
import authRoutes from './src/routes/auth.js';
import metaRoutes from './src/routes/meta.js';

import { ensureSchema } from './src/db.js';

const __dirname =
  path.dirname(fileURLToPath(import.meta.url));

const app = express();
console.log('SERVER.JS CHARGE');
console.log('AUTH ROUTES CHARGEES :', typeof authRoutes);

const port =
  Number(process.env.PORT || 3000);


app.use(
  helmet({
    contentSecurityPolicy: false
  })
);

app.use(
  express.json({
    limit: '100kb'
  })
);

app.use(
  express.static(__dirname)
);

app.get('/api/health', (_request, response) => {
  response.json({
    status: 'ok'
  });
});

app.use(
  '/api/confessions',
  confessionRoutes
);

app.use(
  '/api/coaches',
  coachRoutes
);

app.get('/api/auth/test', (_request, response) => {
  response.json({
    status: 'ok',
    message: 'La route auth fonctionne.'
  });
});
app.use(
  '/api/auth',
  authRoutes
);

app.use(
  '/api',
  metaRoutes
);

app.use(
  '/api/*splat',
  (_request, response) => {
    response.status(404).json({
      error: 'Route API introuvable.'
    });
  }
);

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

ensureSchema()
  .then(() => {
    app.listen(port, () => {
      console.log(
        `Confidences disponible sur http://localhost:${port}`
      );
    });
  })
  .catch((error) => {
    console.error(
      'Impossible de préparer la base de données.',
      error
    );

    process.exitCode = 1;
  });