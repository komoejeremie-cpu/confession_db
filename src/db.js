import fs from 'node:fs';
import mysql from 'mysql2/promise';

function getSslConfig() {
  // Pour Vercel : certificat fourni directement dans une variable d'environnement
  if (process.env.DB_SSL_CA) {
    return {
      rejectUnauthorized: true,
      ca: process.env.DB_SSL_CA.replace(/\\n/g, '\n')
    };
  }

  // Pour le développement local : certificat dans un fichier
  if (process.env.DB_SSL_CA_PATH) {
    return {
      rejectUnauthorized: true,
      ca: fs.readFileSync(process.env.DB_SSL_CA_PATH)
    };
  }

  return undefined;
}

export const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'confessions_db',

  ssl: getSslConfig(),

  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4'
});

export async function query(text, values = []) {
  return pool.query(text, values);
}

export async function ensureSchema() {
  const statements = [
    `CREATE TABLE IF NOT EXISTS sessions (
      token CHAR(64) NOT NULL,
      user_id INT NOT NULL,
      expires_at DATETIME NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (token),
      KEY user_id (user_id),
      KEY expires_at (expires_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

    `CREATE TABLE IF NOT EXISTS confession_likes (
      confession_id INT NOT NULL,
      user_id INT NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (confession_id, user_id),
      KEY user_id (user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

    `CREATE TABLE IF NOT EXISTS confession_favorites (
      confession_id INT NOT NULL,
      user_id INT NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (confession_id, user_id),
      KEY user_id (user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

    `CREATE TABLE IF NOT EXISTS confession_comments (
      id INT NOT NULL AUTO_INCREMENT,
      confession_id INT NOT NULL,
      user_id INT NOT NULL,
      content VARCHAR(1000) NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY confession_id (confession_id),
      KEY user_id (user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

    `CREATE TABLE IF NOT EXISTS comment_likes (
      comment_id INT NOT NULL,
      user_id INT NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (comment_id, user_id),
      KEY user_id (user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
  ];

  for (const statement of statements) {
    await pool.query(statement);
  }

  const [columns] = await pool.query(`
    SELECT COUNT(*) AS count
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = 'confession_comments'
      AND column_name = 'parent_comment_id'
  `);

  if (Number(columns[0].count) === 0) {
    await pool.query(`
      ALTER TABLE confession_comments
      ADD COLUMN parent_comment_id INT NULL
    `);
  }

  const [indexes] = await pool.query(`
    SELECT COUNT(*) AS count
    FROM information_schema.statistics
    WHERE table_schema = DATABASE()
      AND table_name = 'confession_comments'
      AND index_name = 'parent_comment_id'
  `);

  if (Number(indexes[0].count) === 0) {
    await pool.query(`
      ALTER TABLE confession_comments
      ADD KEY parent_comment_id (parent_comment_id)
    `);
  }
}