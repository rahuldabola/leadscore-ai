const express = require('express');
const path = require('path');
const db = require('./db');
const { parseCsv, toCsv } = require('./csv');
const { importLeads, rescoreAll, getConfig } = require('./pipeline');
const { generateDraft } = require('./outreach');

const app = express();
app.use(express.json({ limit: '5mb' }));
app.use(express.text({ type: 'text/csv', limit: '5mb' }));
app.use(express.static(path.join(__dirname, '..', 'public')));

const EXPORT_COLUMNS = [
  'first_name', 'last_name', 'title', 'company', 'company_domain', 'industry',
  'employee_count', 'location', 'email', 'phone', 'linkedin_url', 'seniority',
  'icp_score', 'status', 'valid_email', 'valid_phone',
];

app.post('/api/leads/import', (req, res) => {
  try {
    const rows = typeof req.body === 'string' ? parseCsv(req.body) : req.body;
    if (!Array.isArray(rows) || !rows.length) {
      return res.status(400).json({ error: 'No rows found to import.' });
    }
    const result = importLeads(rows);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/leads', (req, res) => {
  const { minScore, industry, status, search, sort, includeDuplicates } = req.query;
  let query = 'SELECT * FROM leads WHERE 1=1';
  const params = [];

  if (!includeDuplicates) {
    query += ' AND is_duplicate = 0';
  }
  if (minScore) {
    query += ' AND icp_score >= ?';
    params.push(Number(minScore));
  }
  if (industry) {
    query += ' AND industry = ?';
    params.push(industry);
  }
  if (status) {
    query += ' AND status = ?';
    params.push(status);
  }
  if (search) {
    query += ' AND (first_name LIKE ? OR last_name LIKE ? OR company LIKE ? OR email LIKE ?)';
    const s = `%${search}%`;
    params.push(s, s, s, s);
  }

  const sortMap = {
    score_desc: 'icp_score DESC',
    score_asc: 'icp_score ASC',
    name: 'last_name ASC',
    company: 'company ASC',
    recent: 'created_at DESC',
  };
  query += ` ORDER BY ${sortMap[sort] || 'icp_score DESC'}`;

  const rows = db.prepare(query).all(...params);
  res.json(rows.map((r) => ({ ...r, score_breakdown: JSON.parse(r.score_breakdown || '{}') })));
});

app.get('/api/stats', (req, res) => {
  const total = db.prepare('SELECT COUNT(*) c FROM leads WHERE is_duplicate = 0').get().c;
  const avgScore = db.prepare('SELECT AVG(icp_score) a FROM leads WHERE is_duplicate = 0').get().a || 0;
  const hot = db.prepare("SELECT COUNT(*) c FROM leads WHERE is_duplicate = 0 AND icp_score >= 70").get().c;
  const duplicates = db.prepare('SELECT COUNT(*) c FROM leads WHERE is_duplicate = 1').get().c;
  const invalidEmails = db.prepare('SELECT COUNT(*) c FROM leads WHERE is_duplicate = 0 AND valid_email = 0').get().c;
  const byIndustry = db.prepare(`
    SELECT industry, COUNT(*) count, ROUND(AVG(icp_score)) avgScore
    FROM leads WHERE is_duplicate = 0 AND industry != '' GROUP BY industry ORDER BY count DESC
  `).all();
  const byStatus = db.prepare(`
    SELECT status, COUNT(*) count FROM leads WHERE is_duplicate = 0 GROUP BY status
  `).all();

  res.json({
    total,
    avgScore: Math.round(avgScore),
    hot,
    duplicates,
    invalidEmails,
    byIndustry,
    byStatus,
  });
});

app.get('/api/icp-config', (req, res) => {
  const c = getConfig();
  res.json({
    target_industries: JSON.parse(c.target_industries),
    min_employees: c.min_employees,
    max_employees: c.max_employees,
    seniority_weights: JSON.parse(c.seniority_weights),
    weights: JSON.parse(c.weights),
  });
});

app.put('/api/icp-config', (req, res) => {
  const { target_industries, min_employees, max_employees, seniority_weights, weights } = req.body;
  db.prepare(`UPDATE icp_config SET target_industries = ?, min_employees = ?, max_employees = ?,
    seniority_weights = ?, weights = ? WHERE id = 1`).run(
    JSON.stringify(target_industries),
    min_employees,
    max_employees,
    JSON.stringify(seniority_weights),
    JSON.stringify(weights)
  );
  rescoreAll();
  res.json({ ok: true });
});

app.patch('/api/leads/:id', (req, res) => {
  const allowed = ['status', 'notes'];
  const updates = Object.keys(req.body).filter((k) => allowed.includes(k));
  if (!updates.length) return res.status(400).json({ error: 'No valid fields to update.' });
  const setClause = updates.map((k) => `${k} = ?`).join(', ');
  db.prepare(`UPDATE leads SET ${setClause} WHERE id = ?`).run(...updates.map((k) => req.body[k]), req.params.id);
  res.json({ ok: true });
});

app.post('/api/leads/:id/draft', (req, res) => {
  const lead = db.prepare('SELECT * FROM leads WHERE id = ?').get(req.params.id);
  if (!lead) return res.status(404).json({ error: 'Lead not found' });
  const draft = generateDraft(lead);
  db.prepare('UPDATE leads SET outreach_draft = ? WHERE id = ?').run(draft, lead.id);
  res.json({ draft });
});

app.get('/api/leads/export', (req, res) => {
  const { minScore, industry, status } = req.query;
  let query = 'SELECT * FROM leads WHERE is_duplicate = 0';
  const params = [];
  if (minScore) { query += ' AND icp_score >= ?'; params.push(Number(minScore)); }
  if (industry) { query += ' AND industry = ?'; params.push(industry); }
  if (status) { query += ' AND status = ?'; params.push(status); }
  query += ' ORDER BY icp_score DESC';
  const rows = db.prepare(query).all(...params);
  const csv = toCsv(rows, EXPORT_COLUMNS);
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="prioritized_leads.csv"');
  res.send(csv);
});

app.get('/api/import-log', (req, res) => {
  res.json(db.prepare('SELECT * FROM import_log ORDER BY created_at DESC LIMIT 10').all());
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`LeadScore AI running at http://localhost:${PORT}`));
