const { Pool } = require('pg');
require('dotenv').config();

let pool = null;

/**
 * 初始化数据库连接池
 */
async function initDatabase() {
  if (pool) return pool;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is required');
  }

  pool = new Pool({
    connectionString,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    max: 10,
    idleTimeoutMillis: 30000,
  });

  // 测试连接
  const client = await pool.connect();
  try {
    await client.query('SELECT NOW()');
    console.log('Database connected successfully');
  } finally {
    client.release();
  }

  return pool;
}

/**
 * 执行查询
 * 返回 { rows, rowCount }
 */
async function query(text, params = []) {
  if (!pool) throw new Error('Database not initialized. Call initDatabase() first.');
  const result = await pool.query(text, params);
  return { rows: result.rows, rowCount: result.rowCount };
}

/**
 * 事务支持
 */
async function transaction(fn) {
  if (!pool) throw new Error('Database not initialized.');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * 兼容 pg 的 getClient
 */
async function getClient() {
  if (!pool) throw new Error('Database not initialized.');
  const client = await pool.connect();
  return {
    query: (text, params) => client.query(text, params),
    release: () => client.release(),
  };
}

module.exports = {
  initDatabase,
  query,
  getClient,
  transaction,
  getPool: () => pool,
  close: async () => {
    if (pool) {
      await pool.end();
      pool = null;
    }
  },
};
