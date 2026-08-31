const { createClient } = require('redis');
require('dotenv').config();

let client = null;

async function getRedisClient() {
  if (client && client.isOpen) return client;

  client = createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  });

  client.on('error', (err) => console.error('Redis Client Error:', err));
  client.on('connect', () => console.log('Redis connected'));

  await client.connect();
  return client;
}

module.exports = { getRedisClient };
