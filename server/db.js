const { DatabaseSync } = require('node:sqlite');
const path = require('path');

const db = new DatabaseSync(path.join(__dirname, '..', 'leads.db'));
db.exec('PRAGMA journal_mode = WAL');

// better-sqlite3-style transaction helper on top of node:sqlite
db.transaction = (fn) => (arg) => {
  db.exec('BEGIN');
  try {
    const result = fn(arg);
    db.exec('COMMIT');
    return result;
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
};

db.exec(`
CREATE TABLE IF NOT EXISTS leads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  first_name TEXT,
  last_name TEXT,
  title TEXT,
  company TEXT,
  company_domain TEXT,
  industry TEXT,
  employee_count INTEGER,
  location TEXT,
  email TEXT,
  phone TEXT,
  linkedin_url TEXT,
  source TEXT,
  seniority TEXT,
  icp_score INTEGER,
  score_breakdown TEXT,
  valid_email INTEGER,
  valid_phone INTEGER,
  is_duplicate INTEGER DEFAULT 0,
  duplicate_of INTEGER,
  status TEXT DEFAULT 'New',
  outreach_draft TEXT,
  notes TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS icp_config (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  target_industries TEXT,
  min_employees INTEGER,
  max_employees INTEGER,
  seniority_weights TEXT,
  weights TEXT
);

CREATE TABLE IF NOT EXISTS import_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  imported INTEGER,
  duplicates_removed INTEGER,
  invalid_flagged INTEGER,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
`);

const defaultConfig = db.prepare('SELECT * FROM icp_config WHERE id = 1').get();
if (!defaultConfig) {
  db.prepare(`INSERT INTO icp_config (id, target_industries, min_employees, max_employees, seniority_weights, weights)
    VALUES (1, ?, ?, ?, ?, ?)`).run(
    JSON.stringify(['SaaS', 'E-commerce', 'Fintech', 'Healthcare Tech', 'Professional Services']),
    10,
    500,
    JSON.stringify({ 'C-Level': 100, 'VP': 80, 'Director': 65, 'Manager': 45, 'Individual Contributor': 20 }),
    JSON.stringify({ industry: 0.35, companySize: 0.25, seniority: 0.30, dataCompleteness: 0.10 })
  );
}

module.exports = db;
