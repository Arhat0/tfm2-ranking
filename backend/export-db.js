/**
 * 导出 SQLite 数据库为 JSON
 * 用法：node export-db.js
 */
const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

async function exportDb() {
  const SQL = await initSqlJs();
  const dbPath = path.join(__dirname, 'tfm2-backup.db');
  const fileBuffer = fs.readFileSync(dbPath);
  const db = new SQL.Database(fileBuffer);

  const tables = ['users', 'player_profiles', 'matches', 'rank_history', 'disputes'];
  const result = {};

  for (const table of tables) {
    try {
      const stmt = db.prepare(`SELECT * FROM ${table}`);
      const rows = [];
      while (stmt.step()) {
        rows.push(stmt.getAsObject());
      }
      stmt.free();
      result[table] = rows;
      console.log(`${table}: ${rows.length} rows`);
    } catch (e) {
      console.log(`${table}: ${e.message}`);
      result[table] = [];
    }
  }

  const outPath = path.join(__dirname, 'tfm2-data-export.json');
  fs.writeFileSync(outPath, JSON.stringify(result, null, 2));
  console.log(`\nExported to ${outPath}`);
  db.close();
}

exportDb().catch(console.error);
