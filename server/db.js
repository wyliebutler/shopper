const Database = require('better-sqlite3');
const path = require('path');

// Use a volume path in production, or local file in dev
const dbPath = process.env.DB_PATH || path.join(__dirname, 'todo.db');
const db = new Database(dbPath);

// Create table
db.exec(`
  CREATE TABLE IF NOT EXISTS stores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    color TEXT DEFAULT '#ffffff',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    text TEXT NOT NULL,
    completed INTEGER DEFAULT 0,
    image_path TEXT,
    store_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE SET NULL
  )
`);

// Migration helper: Add column if it doesn't exist
function addColumnIfNotExists(tableName, columnName, definition) {
    const tableInfo = db.prepare(`PRAGMA table_info(${tableName})`).all();
    const columnExists = tableInfo.some(col => col.name === columnName);
    
    if (!columnExists) {
        console.log(`Adding column ${columnName} to ${tableName}...`);
        db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
    }
}

addColumnIfNotExists('items', 'image_path', 'TEXT');
addColumnIfNotExists('items', 'store_id', 'INTEGER REFERENCES stores(id) ON DELETE SET NULL');

module.exports = db;
