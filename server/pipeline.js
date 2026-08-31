const db = require('./db');
const { inferSeniority, inferDomain, isValidEmail, isValidPhone, scoreLead, dedupeKey, fieldCount } = require('./scoring');

function getConfig() {
  return db.prepare('SELECT * FROM icp_config WHERE id = 1').get();
}

function importLeads(rawRows) {
  const config = getConfig();

  const existing = db.prepare('SELECT id, email, last_name, company_domain FROM leads WHERE is_duplicate = 0').all();
  const seen = new Map();
  for (const l of existing) {
    seen.set(dedupeKey(l), { id: l.id, fields: fieldCount(l) });
  }

  const insert = db.prepare(`
    INSERT INTO leads (first_name, last_name, title, company, company_domain, industry, employee_count,
      location, email, phone, linkedin_url, source, seniority, icp_score, score_breakdown,
      valid_email, valid_phone, is_duplicate, duplicate_of, status, notes)
    VALUES (@first_name, @last_name, @title, @company, @company_domain, @industry, @employee_count,
      @location, @email, @phone, @linkedin_url, @source, @seniority, @icp_score, @score_breakdown,
      @valid_email, @valid_phone, @is_duplicate, @duplicate_of, 'New', @notes)
  `);

  let imported = 0;
  let duplicatesRemoved = 0;
  let invalidFlagged = 0;

  const insertMany = db.transaction((rows) => {
    for (const raw of rows) {
      const email = (raw.email || '').trim().toLowerCase() || null;
      const employee_count = raw.employee_count ? parseInt(raw.employee_count, 10) || null : null;
      const company_domain = inferDomain(email, raw.company);
      const seniority = inferSeniority(raw.title);

      const lead = {
        first_name: raw.first_name || '',
        last_name: raw.last_name || '',
        title: raw.title || '',
        company: raw.company || '',
        company_domain,
        industry: raw.industry || '',
        employee_count,
        location: raw.location || '',
        email,
        phone: raw.phone || null,
        linkedin_url: raw.linkedin_url || null,
        source: raw.source || 'csv_import',
        notes: raw.notes || null,
        seniority,
      };

      const key = dedupeKey(lead);
      const dupCandidate = seen.get(key);
      const thisFieldCount = fieldCount(lead);

      const validEmail = isValidEmail(lead.email);
      const validPhone = lead.phone ? isValidPhone(lead.phone) : true;
      if (!validEmail && !lead.phone) invalidFlagged++;

      const { score, breakdown } = scoreLead(lead, config);

      if (dupCandidate && dupCandidate.fields >= thisFieldCount) {
        duplicatesRemoved++;
        insert.run({
          ...lead,
          icp_score: score,
          score_breakdown: JSON.stringify(breakdown),
          valid_email: validEmail ? 1 : 0,
          valid_phone: validPhone ? 1 : 0,
          is_duplicate: 1,
          duplicate_of: dupCandidate.id,
        });
        continue;
      }

      const info = insert.run({
        ...lead,
        icp_score: score,
        score_breakdown: JSON.stringify(breakdown),
        valid_email: validEmail ? 1 : 0,
        valid_phone: validPhone ? 1 : 0,
        is_duplicate: 0,
        duplicate_of: null,
      });
      imported++;
      seen.set(key, { id: info.lastInsertRowid, fields: thisFieldCount });
    }
  });

  insertMany(rawRows);

  db.prepare('INSERT INTO import_log (imported, duplicates_removed, invalid_flagged) VALUES (?, ?, ?)')
    .run(imported, duplicatesRemoved, invalidFlagged);

  return { imported, duplicatesRemoved, invalidFlagged, totalRows: rawRows.length };
}

function rescoreAll() {
  const config = getConfig();
  const rows = db.prepare('SELECT * FROM leads').all();
  const update = db.prepare('UPDATE leads SET icp_score = ?, score_breakdown = ?, seniority = ? WHERE id = ?');
  const tx = db.transaction((rows) => {
    for (const lead of rows) {
      const seniority = inferSeniority(lead.title);
      const { score, breakdown } = scoreLead({ ...lead, seniority }, config);
      update.run(score, JSON.stringify(breakdown), seniority, lead.id);
    }
  });
  tx(rows);
}

module.exports = { importLeads, rescoreAll, getConfig };
