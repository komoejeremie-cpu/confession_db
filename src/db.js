import mysql from 'mysql2/promise';

export const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'confessions_db',

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
    `
    CREATE TABLE IF NOT EXISTS sessions (
      token CHAR(64) PRIMARY KEY,
      user_id INT NOT NULL,
      expires_at DATETIME NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_sessions_user_id (user_id),
      INDEX idx_sessions_expires_at (expires_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `,

    `
    CREATE TABLE IF NOT EXISTS confession_likes (
      confession_id INT NOT NULL,
      user_id INT NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (confession_id, user_id),
      INDEX idx_likes_user_id (user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `,

    `
    CREATE TABLE IF NOT EXISTS confession_favorites (
      confession_id INT NOT NULL,
      user_id INT NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (confession_id, user_id),
      INDEX idx_favorites_user_id (user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `,

    `
    CREATE TABLE IF NOT EXISTS confession_comments (
      id INT AUTO_INCREMENT PRIMARY KEY,
      confession_id INT NOT NULL,
      user_id INT NOT NULL,
      content VARCHAR(1000) NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_comments_confession_id (confession_id),
      INDEX idx_comments_user_id (user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `
  ];

  for (const statement of statements) {
    await pool.query(statement);
  }
}